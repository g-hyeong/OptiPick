"""LLM 클라이언트 - multi-provider LLM 호출을 위한 통합 인터페이스"""

import time
from typing import Any, Dict, List, Optional, Type, Union

from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage
from pydantic import BaseModel

from src.exceptions.llm import LLMConfigurationError, LLMInvocationError, LLMProviderError
from src.utils.logger import get_logger

from .formatters import get_formatter

logger = get_logger(__name__)


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

        try:
            start_time = time.time()

            # Pydantic 모델을 직접 전달한 경우 - with_structured_output 사용
            if isinstance(output_format, type) and issubclass(output_format, BaseModel):
                logger.info(
                    "Invoking LLM with structured output",
                    extra={
                        "provider": self.provider,
                        "model": self.model_name,
                        "pydantic_model": output_format.__name__,
                    },
                )

                structured_model = self._model.with_structured_output(output_format)
                result = await structured_model.ainvoke(messages, **invoke_options)

                elapsed = time.time() - start_time
                logger.info(
                    "LLM invocation successful (structured)",
                    extra={
                        "provider": self.provider,
                        "model": self.model_name,
                        "elapsed_seconds": round(elapsed, 2),
                    },
                )

                return result

            # 일반 호출
            logger.info(
                "Invoking LLM",
                extra={
                    "provider": self.provider,
                    "model": self.model_name,
                    "output_format": output_format,
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

            logger.info(
                "LLM invocation successful",
                extra={
                    "provider": self.provider,
                    "model": self.model_name,
                    "elapsed_seconds": round(elapsed, 2),
                    **usage_metadata,
                },
            )

            # 출력 포맷 적용
            return self._apply_format(response, output_format)

        except Exception as e:
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
