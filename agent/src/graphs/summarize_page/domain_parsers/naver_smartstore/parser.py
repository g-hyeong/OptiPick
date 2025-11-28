"""네이버 스마트스토어 파서"""

import logging

from bs4 import BeautifulSoup

from ..base import BaseDomainParser
from ...state import ParsedContent
from .extractors import (
    extract_product_name,
    extract_price,
    extract_thumbnail,
    extract_review_texts,
    extract_description_images,
)

logger = logging.getLogger(__name__)


class NaverSmartstoreParser(BaseDomainParser):
    """네이버 스마트스토어 파서 (smartstore.naver.com)"""

    @property
    def domain_type(self) -> str:
        return "naver_smartstore"

    def can_parse(self, url: str) -> bool:
        """smartstore.naver.com URL 확인"""
        return "smartstore.naver.com" in url

    def parse(
        self,
        url: str,
        title: str,
        html_body: str,
    ) -> ParsedContent:
        """
        네이버 스마트스토어 페이지 파싱

        파싱 전략:
        CSS selector 기반 직접 파싱으로 제품명, 가격, 썸네일, 리뷰 추출
        이미지는 div#content 하위에서 추출

        Args:
            url: 페이지 URL
            title: 페이지 제목
            html_body: HTML body

        Returns:
            ParsedContent: 파싱 결과
        """
        soup = BeautifulSoup(html_body, "lxml")

        # 각 필드 추출
        product_name = extract_product_name(soup, title)
        price = extract_price(soup)
        thumbnail = extract_thumbnail(soup, url)
        description_texts = extract_review_texts(soup)
        description_images = extract_description_images(soup, url)

        logger.info(
            f"NaverSmartstoreParser: product_name={product_name[:30] if product_name else ''}..., price={price}"
        )

        return ParsedContent(
            domain_type=self.domain_type,
            product_name=product_name,
            price=price,
            thumbnail=thumbnail,
            description_texts=description_texts,
            description_images=description_images,
        )
