"""JSON 포맷터"""

import json
from typing import Any, Optional, Type

from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel

from src.exceptions.llm import LLMFormatError
from src.utils.logger import get_logger

from .base import BaseFormatter

logger = get_logger(__name__)


class JsonFormatter(BaseFormatter):
    """JSON 출력 포맷터 (LangChain JsonOutputParser 래퍼)"""

    def __init__(self, pydantic_object: Optional[Type[BaseModel]] = None):
        """
        Args:
            pydantic_object: Pydantic 모델 클래스 (선택). 제공시 스키마 기반 파싱
        """
        self.parser = JsonOutputParser(pydantic_object=pydantic_object)
        self.pydantic_object = pydantic_object

    def format(self, output: Any) -> dict:
        """
        LLM 출력을 JSON으로 파싱

        Args:
            output: LLM 원본 출력 (문자열 또는 메시지)

        Returns:
            파싱된 JSON dict

        Raises:
            LLMFormatError: JSON 파싱 실패시
        """
        try:
            # 문자열 출력인 경우
            if isinstance(output, str):
                result = self.parser.parse(output)
                logger.debug("JSON parsing successful", extra={"output_length": len(output)})
                return result

            # BaseMessage 타입인 경우
            if hasattr(output, "content"):
                result = self.parser.parse(output.content)
                logger.debug(
                    "JSON parsing successful from message",
                    extra={"content_length": len(output.content)},
                )
                return result

            # 이미 dict인 경우
            if isinstance(output, dict):
                logger.debug("Output already in dict format")
                return output

            raise LLMFormatError(
                "Unsupported output type for JSON formatting",
                details={"type": type(output).__name__},
            )

        except json.JSONDecodeError as e:
            raise LLMFormatError(
                "Failed to decode JSON from LLM output",
                details={"error": str(e), "output": str(output)[:200]},
            )

        except Exception as e:
            raise LLMFormatError(
                f"Unexpected error during JSON formatting: {str(e)}",
                details={"error_type": type(e).__name__, "output": str(output)[:200]},
            )

    def get_format_instructions(self) -> str:
        """
        JSON 포맷 지시사항 반환

        Returns:
            프롬프트에 추가할 포맷 지시사항
        """
        return self.parser.get_format_instructions()
