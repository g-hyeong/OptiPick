"""도메인별 파서 베이스 클래스 및 인터페이스"""

from abc import ABC, abstractmethod

from ..state import ParsedContent, ExtractedText, ExtractedImage


class BaseDomainParser(ABC):
    """도메인별 파서 베이스 클래스"""

    @abstractmethod
    def can_parse(self, url: str) -> bool:
        """
        이 파서가 해당 URL을 처리할 수 있는지 확인

        Args:
            url: 체크할 URL

        Returns:
            bool: 처리 가능 여부
        """
        pass

    @abstractmethod
    def parse(
        self,
        url: str,
        title: str,
        texts: list[ExtractedText],
        images: list[ExtractedImage],
    ) -> ParsedContent:
        """
        페이지 파싱 로직 실행

        Args:
            url: 페이지 URL
            title: 페이지 제목
            texts: Extension에서 추출한 텍스트 목록
            images: Extension에서 추출한 이미지 목록

        Returns:
            ParsedContent: 파싱 결과
        """
        pass

    @property
    @abstractmethod
    def domain_type(self) -> str:
        """
        도메인 식별자

        Returns:
            str: 도메인 타입 (예: "naver_brand", "generic")
        """
        pass
