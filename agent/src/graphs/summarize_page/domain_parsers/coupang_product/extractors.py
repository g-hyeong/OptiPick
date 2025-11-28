"""쿠팡 상품 파싱 헬퍼 함수들

HTML에서 제품 정보를 추출하는 함수들
- product_name: h1.product-title
- price: div.price-amount 또는 div.final-price-amount
- review: div.product-review 안의 텍스트들
- images: div.product-detail-content 안의 img들
"""

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from ...state import ExtractedText, ExtractedImage


def extract_product_name(soup: BeautifulSoup, title: str) -> str:
    """
    제품명 추출

    전략:
    1. h1.product-title 태그
    2. Fallback: 페이지 title

    Args:
        soup: BeautifulSoup 객체
        title: 페이지 제목

    Returns:
        str: 제품명
    """
    # h1.product-title에서 추출
    h1 = soup.find("h1", class_="product-title")
    if h1:
        text = h1.get_text(strip=True)
        if text:
            return text

    return title


def extract_price(soup: BeautifulSoup) -> str:
    """
    가격 추출

    전략:
    1. div.final-price-amount (최종 할인가)
    2. div.price-amount (일반 가격)

    Args:
        soup: BeautifulSoup 객체

    Returns:
        str: 가격 문자열 (예: "1,990원")
    """
    # final-price-amount 우선
    price_elem = soup.find("div", class_="final-price-amount")
    if not price_elem:
        price_elem = soup.find("div", class_="price-amount")

    if price_elem:
        text = price_elem.get_text(strip=True)
        if text:
            return text

    return ""


def extract_thumbnail(soup: BeautifulSoup, base_url: str) -> str:
    """
    대표 이미지(썸네일) URL 추출

    전략:
    1. alt="Product image" 속성을 가진 img 태그

    Args:
        soup: BeautifulSoup 객체
        base_url: 기준 URL

    Returns:
        str: 썸네일 이미지 URL
    """
    product_img = soup.find("img", alt="Product image")
    if product_img:
        src = product_img.get("src") or product_img.get("data-src")
        if src:
            return urljoin(base_url, src)

    return ""


def extract_review_texts(soup: BeautifulSoup) -> list[ExtractedText]:
    """
    리뷰 텍스트 추출

    span.twc-bg-white 요소에서 리뷰 본문 텍스트 추출
    br 태그는 공백으로 치환

    Args:
        soup: BeautifulSoup 객체

    Returns:
        list[ExtractedText]: 리뷰 텍스트 배열
    """
    texts: list[ExtractedText] = []
    seen_texts: set[str] = set()
    position = 0

    # span.twc-bg-white 요소들에서 리뷰 본문 추출
    review_spans = soup.find_all("span", class_="twc-bg-white")

    for span in review_spans:
        # br 태그를 공백으로 치환
        for br in span.find_all("br"):
            br.replace_with(" ")

        text = span.get_text(strip=True)
        # 연속 공백 정리
        text = re.sub(r"\s+", " ", text)

        # 20자 이상의 텍스트만 리뷰로 간주
        if text and len(text) > 20 and text not in seen_texts:
            seen_texts.add(text)
            texts.append(
                ExtractedText(
                    content=text,
                    tagName="review",
                    position=float(position),
                )
            )
            position += 1

    return texts


def extract_description_images(soup: BeautifulSoup, base_url: str) -> list[ExtractedImage]:
    """
    제품 상세 설명 이미지 추출

    div.product-detail-content 안의 img 태그들 추출

    Args:
        soup: BeautifulSoup 객체
        base_url: 기준 URL

    Returns:
        list[ExtractedImage]: 상세 설명 이미지 배열
    """
    images: list[ExtractedImage] = []
    seen_urls: set[str] = set()

    detail_content = soup.find("div", class_="product-detail-content")
    if not detail_content:
        return images

    idx = 0
    for img in detail_content.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""

        # base64 이미지 제외
        if src.startswith("data:"):
            continue

        # 중복 제외
        if src in seen_urls:
            continue

        seen_urls.add(src)
        absolute_url = urljoin(base_url, src)

        images.append(
            ExtractedImage(
                src=absolute_url,
                alt=img.get("alt", ""),
                width=parse_dimension(img.get("width")),
                height=parse_dimension(img.get("height")),
                position=float(idx),
            )
        )
        idx += 1

    return images


def parse_dimension(value: str | None) -> float:
    """
    이미지 크기 문자열을 float로 변환

    Args:
        value: 크기 값 (예: "100", "100px")

    Returns:
        float: 숫자 값
    """
    if not value:
        return 0.0
    try:
        return float(re.sub(r"[^\d.]", "", str(value)) or 0)
    except ValueError:
        return 0.0
