"""쿠팡 상품 파서"""

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

        파싱 전략:
        CSS selector 기반 직접 파싱으로 제품명, 가격, 썸네일, 리뷰 추출
        이미지는 div.product-detail-content 하위에서 추출

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
            f"CoupangProductParser: product_name={product_name[:30] if product_name else ''}..., price={price}"
        )

        return ParsedContent(
            domain_type=self.domain_type,
            product_name=product_name,
            price=price,
            thumbnail=thumbnail,
            description_texts=description_texts,
            description_images=description_images,
        )
