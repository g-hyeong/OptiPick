"""네이버 브랜드스토어 파싱 헬퍼 함수들

TODO: 실제 파싱 로직 구현 필요

이 파일에는 네이버 브랜드스토어의 HTML 구조에 맞는
데이터 추출 함수들을 구현해야 합니다.

파싱 대상:
1. 제품명
2. 가격
3. 텍스트 설명/특징 배열
4. 이미지 설명 배열
"""

from ...state import ExtractedText, ExtractedImage


def extract_product_name(texts: list[ExtractedText]) -> str:
    """
    제품명 추출

    TODO: 구현 필요
    - 특정 CSS 선택자나 패턴으로 제품명 추출
    - 네이버 브랜드스토어의 HTML 구조 분석 필요

    Args:
        texts: 추출된 텍스트 목록

    Returns:
        str: 제품명
    """
    return "TODO"


def extract_price(texts: list[ExtractedText]) -> str:
    """
    가격 추출

    TODO: 구현 필요
    - 가격 패턴 매칭 (예: "₩1,000", "10,000원")
    - 할인가, 정상가 구분

    Args:
        texts: 추출된 텍스트 목록

    Returns:
        str: 가격
    """
    return "TODO"


def extract_description_texts(texts: list[ExtractedText]) -> list[str]:
    """
    텍스트 설명/특징 배열 추출

    TODO: 구현 필요
    - 제품 상세 설명 영역 식별
    - 특징, 스펙, 사용법 등 텍스트를 배열로 수집
    - 불필요한 마케팅 문구 필터링

    Args:
        texts: 추출된 텍스트 목록

    Returns:
        list[str]: 텍스트 설명/특징 배열
    """
    return ["TODO"]


def extract_description_images(images: list[ExtractedImage]) -> list[ExtractedImage]:
    """
    이미지 설명 배열 추출

    TODO: 구현 필요
    - 제품 설명에 사용되는 이미지들 필터링
    - 썸네일, 배너, 광고 이미지 제외
    - 실제 제품 설명/특징을 보여주는 이미지만 선별

    Args:
        images: 추출된 이미지 목록

    Returns:
        list[ExtractedImage]: 이미지 설명 배열
    """
    return []
