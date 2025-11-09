"""SummarizePage 그래프의 State 정의"""

from typing import TypedDict


class ExtractedText(TypedDict):
    """추출된 텍스트"""
    content: str  # 텍스트 내용
    tagName: str  # HTML 태그명
    position: float  # 페이지 상단으로부터 픽셀 거리


class ExtractedImage(TypedDict, total=False):
    """추출된 이미지"""
    src: str  # 이미지 URL (절대 경로)
    alt: str  # 대체 텍스트
    width: float  # 너비 (픽셀)
    height: float  # 높이 (픽셀)
    position: float  # 페이지 상단으로부터 픽셀 거리
    ocr_result: str  # OCR로 추출된 텍스트 (optional)


class ParsedContent(TypedDict, total=False):
    """파싱된 콘텐츠 (도메인별로 다른 구조)"""
    domain_type: str  # "naver_brand" | "naver_smartstore" | "coupang" | "generic"

    # 도메인 특화 파서 (구조화된 데이터)
    product_name: str  # 제품명
    price: str  # 가격
    description_texts: list[str]  # 텍스트 설명/특징 배열
    description_images: list[ExtractedImage]  # 이미지 설명 배열

    # generic 파서 (원본 데이터)
    texts: list[ExtractedText]


class ProductAnalysis(TypedDict):
    """제품 분석 결과"""
    product_name: str  # 제품명
    summary: str  # 간단 요약
    price: str  # 가격
    key_features: list[str]  # 주요 특징
    pros: list[str]  # 장점
    cons: list[str]  # 단점
    recommended_for: str  # 추천 대상
    recommendation_reasons: list[str]  # 추천 이유
    not_recommended_reasons: list[str]  # 비추천 이유


class SummarizePageState(TypedDict):
    """SummarizePage 그래프의 State"""
    # Extension으로부터 받는 입력
    url: str
    title: str
    raw_texts: list[ExtractedText]  # texts → raw_texts로 변경
    images: list[ExtractedImage]
    timestamp: int

    # 페이지 검증 결과
    is_valid_page: bool
    validation_error: str

    # 도메인별 파싱 결과
    parsed_content: ParsedContent

    # 필터링된 유효한 이미지들
    valid_images: list[ExtractedImage]

    # 제품 분석 결과
    product_analysis: ProductAnalysis
