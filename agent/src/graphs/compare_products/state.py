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
    rank: int  # 우선순위 기반 순위
    score: float  # 종합 점수
    criteria_scores: dict[str, str]  # 각 기준별 평가
    strengths: list[str]  # 강점
    weaknesses: list[str]  # 약점


class ComparisonReport(TypedDict):
    """최종 비교 보고서"""

    category: str  # 카테고리
    total_products: int  # 총 제품 수
    user_criteria: list[str]  # 사용자가 입력한 기준
    user_priorities: dict[str, int]  # 사용자가 입력한 우선순위
    ranked_products: list[ProductComparison]  # 순위별 제품 목록
    summary: str  # 전체 요약
    recommendation: str  # 최종 추천 및 이유


class CompareProductsState(TypedDict, total=False):
    """CompareProducts 그래프의 State"""

    # Extension으로부터 받는 입력
    category: str  # 제품 카테고리
    products: list[ProductAnalysis]  # 비교할 제품 목록

    # 1단계: 사용자가 입력한 중요 기준 키워드
    user_criteria: list[str]  # 예: ["배터리 수명", "가격", "무게"]

    # 2단계: LLM이 제품들로부터 추출한 비교 가능한 기준들
    extracted_criteria: list[str]  # LLM이 분석하여 추출한 모든 비교 기준

    # 3단계: 사용자가 입력한 기준별 우선순위
    user_priorities: dict[str, int]  # 예: {"배터리 수명": 1, "가격": 2, "무게": 3}

    # 최종 출력
    comparison_report: ComparisonReport  # 최종 비교 보고서
