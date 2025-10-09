"""포매터 기본 추상 클래스"""

from abc import ABC, abstractmethod
from typing import Any


class BaseFormatter(ABC):
    """출력 포맷 처리를 위한 기본 추상 클래스"""

    @abstractmethod
    def format(self, output: Any) -> Any:
        """
        LLM 출력을 특정 포맷으로 변환

        Args:
            output: LLM의 원본 출력

        Returns:
            포맷이 적용된 출력
        """
        pass

    @abstractmethod
    def get_format_instructions(self) -> str:
        """
        프롬프트에 추가할 포맷 지시사항 반환

        Returns:
            포맷 지시사항 문자열
        """
        pass
