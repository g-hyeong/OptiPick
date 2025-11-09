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
        html_body: str,
    ) -> ParsedContent:
        """
        쿠팡 상품 페이지 파싱

        TODO: 실제 파싱 로직 구현 필요
        - BeautifulSoup으로 HTML 파싱
        - CSS 선택자를 사용하여 쿠팡 특화 정보 추출
        - 제품명, 가격, 텍스트 설명/특징, 이미지 설명 추출

        Args:
            url: 페이지 URL
            title: 페이지 제목
            html_body: 정제된 HTML body

        Returns:
            ParsedContent: 파싱 결과
        """
        # TODO: 실제 파싱 로직 구현
        # from bs4 import BeautifulSoup
        # soup = BeautifulSoup(html_body, 'lxml')
        #
        # product_name = soup.select_one('.prod-buy-header__title').get_text() if soup.select_one('.prod-buy-header__title') else "TODO"
        # price = soup.select_one('.total-price').get_text() if soup.select_one('.total-price') else "TODO"
        # ...

        return ParsedContent(
            domain_type=self.domain_type,
            product_name="TODO",
            price="TODO",
            description_texts=["TODO"],
            description_images=[],
        )
