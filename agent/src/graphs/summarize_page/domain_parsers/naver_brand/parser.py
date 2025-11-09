"""네이버 브랜드스토어 파서"""

from ..base import BaseDomainParser
from ...state import ParsedContent, ExtractedText, ExtractedImage


class NaverBrandParser(BaseDomainParser):
    """네이버 브랜드스토어 파서 (brand.naver.com)"""

    @property
    def domain_type(self) -> str:
        return "naver_brand"

    def can_parse(self, url: str) -> bool:
        """brand.naver.com URL 확인"""
        return "brand.naver.com" in url

    def parse(
        self,
        url: str,
        title: str,
        html_body: str,
    ) -> ParsedContent:
        """
        네이버 브랜드스토어 페이지 파싱

        TODO: 실제 파싱 로직 구현 필요
        - BeautifulSoup으로 HTML 파싱
        - CSS 선택자를 사용하여 네이버 브랜드스토어 특화 정보 추출
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
        # product_name = soup.select_one('...').get_text() if soup.select_one('...') else "TODO"
        # price = soup.select_one('...').get_text() if soup.select_one('...') else "TODO"
        # ...

        return ParsedContent(
            domain_type=self.domain_type,
            product_name="TODO",
            price="TODO",
            description_texts=["TODO"],
            description_images=[],
        )
