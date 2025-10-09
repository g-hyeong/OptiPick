"""CSV 포맷터"""

from typing import Any, List

from langchain_core.output_parsers import CommaSeparatedListOutputParser

from src.exceptions.llm import LLMFormatError
from src.utils.logger import get_logger

from .base import BaseFormatter

logger = get_logger(__name__)


class CsvFormatter(BaseFormatter):
    """CSV(comma-separated list) 출력 포맷터 (LangChain CommaSeparatedListOutputParser 래퍼)"""

    def __init__(self):
        self.parser = CommaSeparatedListOutputParser()

    def format(self, output: Any) -> List[str]:
        """
        LLM 출력을 comma-separated list로 파싱

        Args:
            output: LLM 원본 출력 (문자열 또는 메시지)

        Returns:
            파싱된 문자열 리스트

        Raises:
            LLMFormatError: CSV 파싱 실패시
        """
        try:
            # 문자열 출력인 경우
            if isinstance(output, str):
                result = self.parser.parse(output)
                logger.debug(
                    "CSV parsing successful",
                    extra={"output_length": len(output), "items_count": len(result)},
                )
                return result

            # BaseMessage 타입인 경우
            if hasattr(output, "content"):
                result = self.parser.parse(output.content)
                logger.debug(
                    "CSV parsing successful from message",
                    extra={"content_length": len(output.content), "items_count": len(result)},
                )
                return result

            # 이미 리스트인 경우
            if isinstance(output, list):
                logger.debug("Output already in list format", extra={"items_count": len(output)})
                return [str(item) for item in output]

            raise LLMFormatError(
                "Unsupported output type for CSV formatting",
                details={"type": type(output).__name__},
            )

        except Exception as e:
            raise LLMFormatError(
                f"Unexpected error during CSV formatting: {str(e)}",
                details={"error_type": type(e).__name__, "output": str(output)[:200]},
            )

    def get_format_instructions(self) -> str:
        """
        CSV 포맷 지시사항 반환

        Returns:
            프롬프트에 추가할 포맷 지시사항
        """
        return self.parser.get_format_instructions()
