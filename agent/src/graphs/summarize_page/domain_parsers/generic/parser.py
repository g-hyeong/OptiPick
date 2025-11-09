"""일반 페이지 파서 (Fallback)"""

from ..base import BaseDomainParser
from ...state import ParsedContent, ExtractedText
from src.utils.html_parser import HTMLContentExtractor


class GenericParser(BaseDomainParser):
    """일반 페이지 파서 - 특정 도메인에 매칭되지 않는 페이지"""

    @property
    def domain_type(self) -> str:
        return "generic"

    def can_parse(self, url: str) -> bool:
        """항상 True 반환 (fallback 파서)"""
        return True

    def parse(
        self,
        url: str,
        title: str,
        html_body: str,
    ) -> ParsedContent:
        """
        일반 페이지 파싱

        HTML body에서 텍스트와 이미지를 추출하여 반환

        전략:
        - HTMLContentExtractor를 사용하여 HTML 파싱
        - h1, h2, h3 태그만 tagName 유지 (섹션 구분용)
        - 나머지 태그는 tagName 제거 (토큰 절약)
        - position은 모두 유지 (LLM이 레이아웃 파악)

        Args:
            url: 페이지 URL
            title: 페이지 제목
            html_body: 정제된 HTML body

        Returns:
            ParsedContent: 파싱 결과
        """
        # HTML에서 텍스트 추출
        texts = HTMLContentExtractor.extract_texts(
            html_body=html_body,
            min_length=10,
            base_url=url
        )

        # tagName 필터링 (중요 태그만 유지)
        processed_texts: list[ExtractedText] = []
        for text in texts:
            tag_name = text.get("tagName", "")

            if tag_name in ["h1", "h2", "h3"]:
                # 중요 태그는 tagName 유지
                processed_texts.append(text)
            else:
                # 나머지는 content와 position만 유지
                processed_texts.append(
                    ExtractedText(
                        content=text["content"],
                        tagName="",  # 빈 문자열로 설정
                        position=text["position"],
                    )
                )

        return ParsedContent(domain_type=self.domain_type, texts=processed_texts)
