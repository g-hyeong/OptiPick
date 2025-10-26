"""LLM 클라이언트 - multi-provider LLM 호출을 위한 통합 인터페이스"""

import json
import os
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Type, Union

import json_repair
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, ValidationError

from src.exceptions.llm import LLMConfigurationError, LLMInvocationError, LLMProviderError
from src.utils.logger import get_logger

from .formatters import get_formatter

# .env 파일 로드
load_dotenv()

# Google gRPC ALTS 경고 억제
os.environ["GRPC_VERBOSITY"] = "ERROR"
os.environ["GRPC_TRACE"] = ""

logger = get_logger(__name__)

# Logs 디렉토리 경로
LOGS_DIR = Path(__file__).parents[3] / "logs"


def _save_llm_log(log_data: Dict[str, Any]) -> None:
    """
    LLM input/output을 로그 파일로 저장

    Args:
        log_data: 저장할 로그 데이터
    """
    try:
        # 날짜별 디렉토리 생성
        today = datetime.now().strftime("%Y-%m-%d")
        log_dir = LOGS_DIR / today
        log_dir.mkdir(parents=True, exist_ok=True)

        # 파일명: timestamp_requestId.json
        timestamp = datetime.now().strftime("%H%M%S")
        request_id = log_data.get("request_id", "unknown")
        filename = f"{timestamp}_{request_id[:8]}.json"

        log_file = log_dir / filename

        # JSON으로 저장
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, ensure_ascii=False, indent=2)

        logger.debug(f"Saved LLM log to {log_file}")

    except Exception as e:
        # 로그 저장 실패는 메인 작업에 영향 주지 않음
        logger.warning(f"Failed to save LLM log: {str(e)}")


class LLMClient:
    """
    Multi-provider LLM 호출 클라이언트

    init_chat_model을 래핑하여 OpenAI, Anthropic 등 다양한 provider 지원
    """

    def __init__(
        self,
        provider: str,
        model: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[float] = None,
        **kwargs,
    ):
        """
        Args:
            provider: 모델 제공자 (예: "openai", "anthropic", "google")
            model: 모델 이름 (예: "gpt-4o", "claude-3-opus-20240229")
            temperature: 샘플링 온도 (0.0 ~ 1.0)
            max_tokens: 최대 출력 토큰 수
            timeout: 요청 타임아웃 (초)
            **kwargs: 기타 모델별 옵션
        """
        self.provider = provider
        self.model_name = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout
        self.extra_options = kwargs

        self._model: Optional[BaseChatModel] = None
        self._initialize_model()

    def _initialize_model(self):
        """모델 초기화 (fail fast)"""
        try:
            # init_chat_model 파라미터 구성
            init_params = {
                "model": self.model_name,
                "model_provider": self.provider,
            }

            # Google Gemini의 경우 API 키 명시적 전달 + Safety Settings 해제
            if self.provider == "google_genai":
                google_api_key = os.getenv("GOOGLE_API_KEY")
                if not google_api_key:
                    raise LLMConfigurationError(
                        "GOOGLE_API_KEY not found in environment variables",
                        details={"provider": self.provider}
                    )
                init_params["api_key"] = google_api_key

                # Safety filters 전부 해제
                from langchain_google_genai import HarmBlockThreshold, HarmCategory
                init_params["safety_settings"] = {
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }

            # 선택적 파라미터 추가
            if self.temperature is not None:
                init_params["temperature"] = self.temperature
            if self.max_tokens is not None:
                init_params["max_tokens"] = self.max_tokens
            if self.timeout is not None:
                init_params["timeout"] = self.timeout

            # 기타 옵션 추가
            init_params.update(self.extra_options)

            logger.info(
                "Initializing LLM client",
                extra={
                    "provider": self.provider,
                    "model": self.model_name,
                    "temperature": self.temperature,
                    "max_tokens": self.max_tokens,
                },
            )

            self._model = init_chat_model(**init_params)

        except ValueError as e:
            # provider 또는 model 오류
            raise LLMProviderError(
                f"Failed to initialize model: {str(e)}",
                details={
                    "provider": self.provider,
                    "model": self.model_name,
                    "error": str(e),
                },
            )

        except Exception as e:
            raise LLMConfigurationError(
                f"Unexpected error during model initialization: {str(e)}",
                details={
                    "provider": self.provider,
                    "model": self.model_name,
                    "error_type": type(e).__name__,
                },
            )

    async def invoke(
        self,
        messages: Union[List[Dict[str, str]], List[BaseMessage]],
        output_format: Optional[Union[str, Type[BaseModel]]] = None,
        **invoke_options,
    ) -> Any:
        """
        LLM 호출 및 출력 포맷 적용

        Args:
            messages: 입력 메시지 리스트
                - Dict 형식: [{"role": "user", "content": "..."}]
                - BaseMessage 형식도 지원
            output_format: 출력 포맷
                - None: 원본 텍스트 반환
                - "json", "markdown", "csv": 해당 포맷 적용
                - Pydantic 클래스: with_structured_output() 사용
            **invoke_options: 호출 시점 옵션 (temperature 오버라이드 등)

        Returns:
            포맷이 적용된 LLM 출력
                - output_format=None: str
                - output_format="json": dict
                - output_format="csv": List[str]
                - output_format="markdown": str
                - output_format=PydanticModel: PydanticModel 인스턴스

        Raises:
            LLMInvocationError: LLM 호출 실패
        """
        if not self._model:
            raise LLMConfigurationError("Model not initialized")

        # 고유 요청 ID 생성
        request_id = str(uuid.uuid4())

        # 로그 데이터 초기화
        log_data = {
            "request_id": request_id,
            "timestamp": datetime.now().isoformat(),
            "provider": self.provider,
            "model": self.model_name,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "output_format": output_format.__name__ if isinstance(output_format, type) else output_format,
            "input": {
                "messages": [
                    {
                        "role": msg.get("role", "unknown") if isinstance(msg, dict) else getattr(msg, "type", "unknown"),
                        "content": str(msg.get("content", "")) if isinstance(msg, dict) else str(getattr(msg, "content", ""))
                    }
                    for msg in messages
                ],
                "messages_count": len(messages),
                "prompt_chars": sum(len(str(msg.get("content", ""))) for msg in messages) if messages else 0
            }
        }

        try:
            start_time = time.time()

            # Pydantic 모델을 직접 전달한 경우 - 직접 JSON 파싱 수행
            if isinstance(output_format, type) and issubclass(output_format, BaseModel):
                # 프롬프트 크기 계산
                prompt_size = log_data["input"]["prompt_chars"]
                logger.info(
                    f"▶ LLM Request: {output_format.__name__}",
                    extra={
                        "model": f"{self.provider}/{self.model_name}",
                        "prompt_chars": f"{prompt_size:,}",
                        "messages_count": len(messages),
                        "request_id": request_id,
                    },
                )

                # LLM 호출 (with_structured_output 사용하지 않음)
                raw_response = await self._model.ainvoke(messages, **invoke_options)
                raw_content = raw_response.content if hasattr(raw_response, 'content') else str(raw_response)

                elapsed = time.time() - start_time

                # 로그 데이터에 응답 추가
                log_data["output"] = {
                    "raw_content": raw_content,
                    "content_length": len(raw_content) if raw_content else 0
                }
                log_data["elapsed_seconds"] = round(elapsed, 2)

                # 빈 응답 체크
                if not raw_content or raw_content.strip() == "":
                    logger.error(
                        f"✗ LLM returned EMPTY response",
                        extra={
                            "provider": self.provider,
                            "model": self.model_name,
                            "prompt_size": f"{prompt_size:,} chars",
                            "elapsed": f"{round(elapsed, 2)}s",
                            "response_type": type(raw_response).__name__,
                            "request_id": request_id,
                        },
                    )
                    log_data["status"] = "error"
                    log_data["error"] = "Empty response"
                    _save_llm_log(log_data)

                    raise LLMInvocationError(
                        "LLM returned empty response",
                        details={
                            "provider": self.provider,
                            "model": self.model_name,
                            "prompt_size": prompt_size,
                        },
                    )

                logger.debug(
                    f"  LLM response received ({round(elapsed, 2)}s)",
                    extra={"content_length": len(raw_content), "request_id": request_id},
                )

                # JSON 파싱 시도
                try:
                    # 1. 먼저 표준 JSON 파싱 시도
                    parsed_json = json.loads(raw_content)
                    logger.debug("  JSON parsing: OK")
                    log_data["output"]["json_parsing"] = "success"
                except json.JSONDecodeError as e:
                    logger.warning(
                        f"  JSON parsing failed (line {e.lineno}, col {e.colno}), attempting repair..."
                    )
                    log_data["output"]["json_parsing"] = "failed_initial"

                    try:
                        # 2. json-repair로 복구 시도
                        repaired_content = json_repair.repair_json(raw_content)
                        parsed_json = json.loads(repaired_content)
                        logger.info("  JSON repair: SUCCESS")
                        log_data["output"]["json_parsing"] = "repaired"
                    except Exception as repair_error:
                        logger.error(
                            f"✗ JSON repair FAILED: {str(repair_error)}",
                            extra={"raw_content_preview": raw_content[:200], "request_id": request_id},
                        )
                        log_data["status"] = "error"
                        log_data["error"] = f"JSON parsing failed: {str(repair_error)}"
                        _save_llm_log(log_data)

                        raise LLMInvocationError(
                            f"Failed to parse LLM response as JSON: {str(repair_error)}",
                            details={
                                "provider": self.provider,
                                "model": self.model_name,
                                "raw_content": raw_content[:500],
                            },
                        )

                log_data["output"]["parsed_json"] = parsed_json

                # 3. Pydantic 모델로 변환 시도
                try:
                    result = output_format(**parsed_json)
                    logger.debug("  Pydantic validation: OK")
                    log_data["output"]["pydantic_validation"] = "success"
                except ValidationError as e:
                    # 필드별 에러 상세 로깅
                    missing_fields = []
                    invalid_fields = []

                    for error in e.errors():
                        field = ".".join(str(loc) for loc in error["loc"])
                        error_type = error["type"]

                        if error_type == "missing":
                            missing_fields.append(field)
                        else:
                            invalid_fields.append(f"{field} ({error_type})")

                    logger.error(
                        f"✗ Pydantic validation FAILED",
                        extra={
                            "missing": missing_fields,
                            "invalid": invalid_fields,
                            "received_keys": list(parsed_json.keys()) if isinstance(parsed_json, dict) else "not_a_dict",
                            "request_id": request_id,
                        },
                    )
                    log_data["status"] = "error"
                    log_data["error"] = {
                        "type": "validation_error",
                        "missing_fields": missing_fields,
                        "invalid_fields": invalid_fields
                    }
                    log_data["output"]["pydantic_validation"] = "failed"
                    _save_llm_log(log_data)

                    raise LLMInvocationError(
                        f"LLM response validation failed: missing={missing_fields}, invalid={invalid_fields}",
                        details={
                            "provider": self.provider,
                            "model": self.model_name,
                            "validation_errors": e.errors(),
                        },
                    )

                logger.info(
                    f"✓ LLM Response: {output_format.__name__} ({round(elapsed, 2)}s)",
                    extra={"request_id": request_id}
                )

                # 성공 로그 저장
                log_data["status"] = "success"
                log_data["output"]["result_summary"] = {
                    "model_name": output_format.__name__,
                    "fields_count": len(parsed_json) if isinstance(parsed_json, dict) else 0
                }
                _save_llm_log(log_data)

                return result

            # 일반 호출
            logger.info(
                "Invoking LLM",
                extra={
                    "provider": self.provider,
                    "model": self.model_name,
                    "output_format": output_format,
                    "request_id": request_id,
                },
            )

            response = await self._model.ainvoke(messages, **invoke_options)

            elapsed = time.time() - start_time

            # 토큰 사용량 로깅 (가능한 경우)
            usage_metadata = {}
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                usage_metadata = {
                    "input_tokens": response.usage_metadata.get("input_tokens"),
                    "output_tokens": response.usage_metadata.get("output_tokens"),
                    "total_tokens": response.usage_metadata.get("total_tokens"),
                }

            # 응답 내용 추가
            response_content = response.content if hasattr(response, 'content') else str(response)
            log_data["output"] = {
                "content": response_content,
                "content_length": len(response_content) if response_content else 0,
                "usage": usage_metadata
            }
            log_data["elapsed_seconds"] = round(elapsed, 2)
            log_data["status"] = "success"

            logger.info(
                "LLM invocation successful",
                extra={
                    "provider": self.provider,
                    "model": self.model_name,
                    "elapsed_seconds": round(elapsed, 2),
                    "request_id": request_id,
                    **usage_metadata,
                },
            )

            # 성공 로그 저장
            _save_llm_log(log_data)

            # 출력 포맷 적용
            return self._apply_format(response, output_format)

        except Exception as e:
            # 에러 로그 저장
            if "status" not in log_data:
                log_data["status"] = "error"
                log_data["error"] = {
                    "type": type(e).__name__,
                    "message": str(e)
                }
                _save_llm_log(log_data)

            raise LLMInvocationError(
                f"LLM invocation failed: {str(e)}",
                details={
                    "provider": self.provider,
                    "model": self.model_name,
                    "error_type": type(e).__name__,
                    "error": str(e),
                },
            )

    def _apply_format(
        self, response: BaseMessage, output_format: Optional[str]
    ) -> Union[str, dict, list]:
        """
        응답에 포맷 적용

        Args:
            response: LLM 응답 메시지
            output_format: 적용할 포맷 (None, "json", "markdown", "csv")

        Returns:
            포맷이 적용된 출력
        """
        # 포맷 없음 - 원본 텍스트 반환
        if output_format is None:
            return response.content

        # 포매터 적용
        formatter = get_formatter(output_format)
        if formatter:
            return formatter.format(response)

        # 이 경로는 발생하지 않아야 함 (get_formatter가 예외 발생)
        return response.content

    def get_format_instructions(self, output_format: str) -> str:
        """
        특정 포맷에 대한 지시사항 반환 (프롬프트에 추가용)

        Args:
            output_format: 포맷 타입 ("json", "markdown", "csv")

        Returns:
            프롬프트에 추가할 포맷 지시사항
        """
        formatter = get_formatter(output_format)
        if formatter:
            return formatter.get_format_instructions()
        return ""
