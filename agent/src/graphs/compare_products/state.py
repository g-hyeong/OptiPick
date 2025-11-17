"""CompareProducts 그래프의 State 정의"""

from typing import TypedDict


class ProductAnalysis(TypedDict):
    """개별 제품 분석 결과 (Extension으로부터 받는 데이터)"""

    product_name: str  # 제품명
    summary: str  # 간단 요약
    price: str  # 가격
    key_features: list[str]  # 주요 특징
    pros: list[str]  # 장점
    cons: list[str]  # 단점
    recommended_for: str  # 추천 대상
    recommendation_reasons: list[str]  # 추천 이유
    not_recommended_reasons: list[str]  # 비추천 이유


class ProductComparison(TypedDict):
    """비교 결과 내 개별 제품 정보"""

    product_name: str  # 제품명
    criteria_specs: dict[str, str]  # 각 기준별 실제 스펙 값 또는 요약
    criteria_details: dict[str, list[str]]  # 정성적 기준의 상세 정보


class ComparisonReport(TypedDict):
    """최종 비교 보고서"""

    category: str  # 카테고리
    total_products: int  # 총 제품 수
    user_criteria: list[str]  # 사용자가 입력한 기준
    unavailable_criteria: list[str]  # 추출 불가능한 사용자 기준
    criteria_importance: dict[str, int]  # Agent가 도출한 기준의 중요도 (1-10)
    products: list[ProductComparison]  # 제품 목록
    summary: str  # 종합평


class CompareProductsState(TypedDict, total=False):
    """CompareProducts 그래프의 State"""

    # Extension으로부터 받는 입력
    category: str  # 제품 카테고리
    products: list[ProductAnalysis]  # 비교할 제품 목록

    # 1단계: 사용자가 입력한 중요 기준 키워드
    user_criteria: list[str]  # 예: ["배터리", "가격", "무게"]

    # 2단계: LLM이 제품들로부터 추출한 비교 가능한 기준들
    extracted_criteria: list[str]  # LLM이 분석하여 추출한 모든 비교 기준

    # 최종 출력
    comparison_report: ComparisonReport  # 최종 비교 보고서
