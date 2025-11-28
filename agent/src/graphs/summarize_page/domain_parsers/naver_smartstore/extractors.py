"""네이버 스마트스토어 파싱 헬퍼 함수들

HTML에서 제품 정보를 추출하는 함수들
- naver_brand와 동일한 구조 (product_name, price, review)
- 이미지는 div#INTRODUCE 하위에서 추출
"""

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from ...state import ExtractedText, ExtractedImage


def extract_product_name(soup: BeautifulSoup, title: str) -> str:
    """
    제품명 추출

    전략:
    1. div#content 내부의 첫 번째 h3 태그 (상품명 영역)
    2. Fallback: 페이지 title

    Args:
        soup: BeautifulSoup 객체
        title: 페이지 제목

    Returns:
        str: 제품명
    """
    # div#content 내부의 첫 번째 h3 태그에서 상품명 추출
    content = soup.find(id="content")
    if content:
        h3 = content.find("h3")
        if h3:
            text = h3.get_text(strip=True)
            if text and len(text) > 5:
                return text

    # Fallback: 페이지 title에서 스토어명 제거
    if title and " : " in title:
        return title.split(" : ")[0].strip()

    return title


def extract_price(soup: BeautifulSoup) -> str:
    """
    가격 추출

    전략:
    1. "상품 가격" 라벨 다음의 숫자 + 원 조합
    2. HTML에서 정규표현식으로 가격 패턴 추출

    Args:
        soup: BeautifulSoup 객체

    Returns:
        str: 가격 문자열 (예: "22,000원")
    """
    # 1. "상품 가격" blind 라벨 다음의 형제 요소에서 추출
    price_label = soup.find("span", class_="blind", string="상품 가격")
    if price_label:
        price_num = ""
        for sibling in price_label.find_next_siblings():
            text = sibling.get_text(strip=True)
            if text.replace(",", "").isdigit():
                price_num = text
            elif text == "원" and price_num:
                return f"{price_num}원"

    # 2. HTML 문자열에서 정규표현식으로 추출
    html_str = str(soup)
    price_pattern = re.compile(r'>(\d{1,3}(?:,\d{3})+|\d+)</span><span[^>]*>원<')
    match = price_pattern.search(html_str)
    if match:
        return f"{match.group(1)}원"

    return ""


def extract_thumbnail(soup: BeautifulSoup, base_url: str) -> str:
    """
    대표 이미지(썸네일) URL 추출

    전략:
    1. alt="대표이미지" 속성을 가진 img 태그

    Args:
        soup: BeautifulSoup 객체
        base_url: 기준 URL

    Returns:
        str: 썸네일 이미지 URL
    """
    img = soup.find("img", alt="대표이미지")
    if img:
        src = img.get("src") or img.get("data-src")
        if src:
            return urljoin(base_url, src)

    return ""


def extract_review_texts(soup: BeautifulSoup) -> list[ExtractedText]:
    """
    리뷰 텍스트 추출

    #REVIEW 영역 기반으로 리뷰 추출 (안정적인 ID 사용)
    각 리뷰 li에서 가장 긴 텍스트 블록만 추출 (실제 리뷰 내용)

    Args:
        soup: BeautifulSoup 객체

    Returns:
        list[ExtractedText]: 리뷰 텍스트 배열
    """
    texts: list[ExtractedText] = []
    seen_texts: set[str] = set()
    position = 0

    review_section = soup.find(id="REVIEW")
    if not review_section:
        return texts

    review_items = review_section.find_all("li")

    for item in review_items:
        longest_text = ""
        for element in item.find_all(["div", "span"]):
            if element.find(["div", "span"]) is None:
                text = element.get_text(strip=True)
                if text and len(text) > len(longest_text):
                    longest_text = text

        # 20자 이상의 텍스트만 리뷰로 간주
        # 안내 문구는 제외
        if (
            longest_text
            and len(longest_text) > 20
            and longest_text not in seen_texts
            and "점수화하여 정렬" not in longest_text
        ):
            seen_texts.add(longest_text)
            texts.append(
                ExtractedText(
                    content=longest_text,
                    tagName="review",
                    position=float(position),
                )
            )
            position += 1

    return texts


def extract_description_images(soup: BeautifulSoup, base_url: str) -> list[ExtractedImage]:
    """
    제품 상세 설명 이미지 추출

    XPath: //*[@id="INTRODUCE"]/div/div[5]/div 계층까지의 이미지만 추출
    (상세 설명 상단 이미지만 추출, 하단 광고/추가 콘텐츠 제외)

    Args:
        soup: BeautifulSoup 객체
        base_url: 기준 URL

    Returns:
        list[ExtractedImage]: 상세 설명 이미지 배열
    """
    images: list[ExtractedImage] = []
    seen_urls: set[str] = set()

    introduce = soup.find(id="INTRODUCE")
    if not introduce:
        return images

    # XPath: //*[@id="INTRODUCE"]/div/div[5]/div 에 해당하는 컨테이너 찾기
    # INTRODUCE > div (첫 번째 직계 자식) > div[5] (5번째 div, 1-indexed) > div
    target_container = None
    first_div = introduce.find("div", recursive=False)
    if first_div:
        child_divs = first_div.find_all("div", recursive=False)
        if len(child_divs) >= 5:
            fifth_div = child_divs[4]  # 0-indexed이므로 4
            target_container = fifth_div.find("div", recursive=False)

    # target_container가 없으면 빈 결과 반환
    if not target_container:
        return images

    idx = 0
    for img in target_container.find_all("img"):
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
