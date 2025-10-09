"""포매터 모듈 및 팩토리"""

from typing import Optional, Type

from pydantic import BaseModel

from src.exceptions.llm import LLMFormatError

from .base import BaseFormatter
from .csv import CsvFormatter
from .json import JsonFormatter
from .markdown import MarkdownFormatter

__all__ = [
    "BaseFormatter",
    "JsonFormatter",
    "MarkdownFormatter",
    "CsvFormatter",
    "get_formatter",
]


def get_formatter(
    output_format: Optional[str] = None, pydantic_object: Optional[Type[BaseModel]] = None
) -> Optional[BaseFormatter]:
    """
    output_format에 따라 적절한 포매터 반환

    Args:
        output_format: 출력 포맷 ("json", "markdown", "csv", None)
        pydantic_object: JSON 포맷 사용 시 Pydantic 모델 (선택)

    Returns:
        적절한 포매터 인스턴스, output_format이 None이면 None 반환

    Raises:
        LLMFormatError: 지원하지 않는 포맷인 경우
    """
    if output_format is None:
        return None

    format_lower = output_format.lower()

    if format_lower == "json":
        return JsonFormatter(pydantic_object=pydantic_object)
    elif format_lower == "markdown":
        return MarkdownFormatter()
    elif format_lower == "csv":
        return CsvFormatter()
    else:
        raise LLMFormatError(
            f"Unsupported output format: {output_format}",
            details={
                "supported_formats": ["json", "markdown", "csv"],
                "provided_format": output_format,
            },
        )
