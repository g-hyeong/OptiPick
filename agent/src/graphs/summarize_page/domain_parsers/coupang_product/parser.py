"""쿠팡 상품 파서"""

from ..base import BaseDomainParser
from ...state import ParsedContent, ExtractedText, ExtractedImage


class CoupangProductParser(BaseDomainParser):
    """쿠팡 상품 파서 (coupang.com/vp/products)"""

    @property
    def domain_type(self) -> str:
        return "coupang"

    def can_parse(self, url: str) -> bool:
        """coupang.com/vp/products URL 확인"""
        return "coupang.com" in url and "/vp/products" in url

    def parse(
        self,
        url: str,
        title: str,
        texts: list[ExtractedText],
        images: list[ExtractedImage],
    ) -> ParsedContent:
        """
        쿠팡 상품 페이지 파싱

        TODO: 실제 파싱 로직 구현 필요
        - extractors.py의 헬퍼 함수들을 사용하여 구현
        - 제품명, 가격, 텍스트 설명/특징, 이미지 설명 추출

        Args:
            url: 페이지 URL
            title: 페이지 제목
            texts: Extension에서 추출한 텍스트 목록
            images: Extension에서 추출한 이미지 목록

        Returns:
            ParsedContent: 파싱 결과
        """
        # TODO: 실제 파싱 로직 구현
        # from .extractors import (
        #     extract_product_name,
        #     extract_price,
        #     extract_description_texts,
        #     extract_description_images,
        # )

        return ParsedContent(
            domain_type=self.domain_type,
            product_name="TODO",
            price="TODO",
            description_texts=["TODO"],
            description_images=[],
        )
