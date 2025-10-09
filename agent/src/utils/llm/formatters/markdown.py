"""Markdown 포맷터"""

from typing import Any

from src.exceptions.llm import LLMFormatError
from src.utils.logger import get_logger

from .base import BaseFormatter

logger = get_logger(__name__)


class MarkdownFormatter(BaseFormatter):
    """Markdown 출력 포맷터"""

    def format(self, output: Any) -> str:
        """
        LLM 출력을 Markdown 포맷으로 변환

        Args:
            output: LLM 원본 출력 (문자열 또는 메시지)

        Returns:
            Markdown 형식의 문자열

        Raises:
            LLMFormatError: 포맷 변환 실패시
        """
        try:
            # 문자열 출력인 경우
            if isinstance(output, str):
                formatted = self._format_as_markdown(output)
                logger.debug(
                    "Markdown formatting successful", extra={"output_length": len(output)}
                )
                return formatted

            # BaseMessage 타입인 경우
            if hasattr(output, "content"):
                formatted = self._format_as_markdown(output.content)
                logger.debug(
                    "Markdown formatting successful from message",
                    extra={"content_length": len(output.content)},
                )
                return formatted

            raise LLMFormatError(
                "Unsupported output type for Markdown formatting",
                details={"type": type(output).__name__},
            )

        except Exception as e:
            raise LLMFormatError(
                f"Unexpected error during Markdown formatting: {str(e)}",
                details={"error_type": type(e).__name__, "output": str(output)[:200]},
            )

    def _format_as_markdown(self, text: str) -> str:
        """
        텍스트를 Markdown 코드 블록으로 감싸기

        Args:
            text: 원본 텍스트

        Returns:
            Markdown 코드 블록으로 감싼 텍스트
        """
        # 이미 마크다운 코드 블록으로 감싸져 있는지 확인
        if text.strip().startswith("```") and text.strip().endswith("```"):
            return text

        # 마크다운 코드 블록으로 감싸기
        return f"```markdown\n{text.strip()}\n```"

    def get_format_instructions(self) -> str:
        """
        Markdown 포맷 지시사항 반환

        Returns:
            프롬프트에 추가할 포맷 지시사항
        """
        return (
            "Format your response in valid Markdown syntax. "
            "Use appropriate headers, lists, code blocks, and formatting. "
            "Ensure the output is clean and readable."
        )
