"""API Request/Response Pydantic 스키마"""

from typing import Optional
from pydantic import BaseModel, Field


class ExtractedTextSchema(BaseModel):
    """추출된 텍스트"""

    content: str = Field(..., description="텍스트 내용")
    tagName: str = Field(..., description="HTML 태그명")
    position: float = Field(..., description="페이지 상단으로부터 픽셀 거리")


class ExtractedImageSchema(BaseModel):
    """추출된 이미지"""

    src: str = Field(..., description="이미지 URL (절대 경로)")
    alt: str = Field(..., description="대체 텍스트")
    width: float = Field(..., description="너비 (픽셀)")
    height: float = Field(..., description="높이 (픽셀)")
    position: float = Field(..., description="페이지 상단으로부터 픽셀 거리")
    ocr_result: str = Field(default="", description="OCR로 추출된 텍스트 (optional)")


class ProductAnalysisSchema(BaseModel):
    """제품 분석 결과"""

    product_name: str = Field(..., description="제품명")
    summary: str = Field(..., description="간단 요약")
    price: str = Field(..., description="가격")
    key_features: list[str] = Field(default_factory=list, description="주요 특징")
    pros: list[str] = Field(default_factory=list, description="장점")
    cons: list[str] = Field(default_factory=list, description="단점")
    recommended_for: str = Field(..., description="추천 대상")
    recommendation_reasons: list[str] = Field(
        default_factory=list, description="추천 이유"
    )
    not_recommended_reasons: list[str] = Field(
        default_factory=list, description="비추천 이유"
    )


class SummarizePageRequest(BaseModel):
    """SummarizePage 그래프 요청"""

    url: str = Field(..., description="페이지 URL")
    title: str = Field(..., description="페이지 제목")
    texts: list[ExtractedTextSchema] = Field(
        default_factory=list, description="추출된 텍스트 목록"
    )
    images: list[ExtractedImageSchema] = Field(
        default_factory=list, description="추출된 이미지 목록"
    )
    timestamp: int = Field(..., description="추출 시각 (Unix timestamp)")


class SummarizePageResponse(BaseModel):
    """SummarizePage 그래프 응답"""

    url: str = Field(..., description="페이지 URL")
    title: str = Field(..., description="페이지 제목")
    error: Optional[str] = Field(None, description="에러 메시지 (검증 실패 시)")
    valid_images: list[ExtractedImageSchema] = Field(
        default_factory=list, description="유효한 이미지 목록 (OCR 결과 포함)"
    )
    product_analysis: Optional[ProductAnalysisSchema] = Field(
        None, description="제품 분석 결과 (검증 실패 시 None)"
    )
    timestamp: int = Field(..., description="추출 시각 (Unix timestamp)")


# ========== CompareProducts 관련 스키마 ==========


class ProductComparisonSchema(BaseModel):
    """비교 결과 내 개별 제품 정보"""

    product_name: str = Field(..., description="제품명")
    criteria_scores: dict[str, float] = Field(..., description="각 기준별 점수 (0-100)")
    criteria_specs: dict[str, str] = Field(
        default_factory=dict, description="각 기준별 실제 스펙 값 (예: '16GB DDR5', '1.4kg')"
    )
    strengths: list[str] = Field(default_factory=list, description="강점")
    weaknesses: list[str] = Field(default_factory=list, description="약점")


class ComparisonReportSchema(BaseModel):
    """최종 비교 보고서"""

    category: str = Field(..., description="제품 카테고리")
    total_products: int = Field(..., description="총 제품 수")
    user_criteria: list[str] = Field(..., description="사용자가 입력한 기준")
    user_priorities: dict[str, int] = Field(..., description="사용자가 입력한 우선순위")
    products: list[ProductComparisonSchema] = Field(
        ..., description="제품 목록 (순위 없음, Extension에서 계산)"
    )
    summary: str = Field(..., description="전체 요약")
    recommendation: str = Field(..., description="최종 추천 및 이유")


class CompareProductsStartRequest(BaseModel):
    """CompareProducts 그래프 시작 요청"""

    category: str = Field(..., description="제품 카테고리")
    products: list[ProductAnalysisSchema] = Field(..., description="비교할 제품 목록")


class CompareProductsStartResponse(BaseModel):
    """CompareProducts 그래프 시작 응답"""

    thread_id: str = Field(..., description="세션 ID")
    status: str = Field(..., description="현재 상태")
    question: str = Field(..., description="사용자에게 보여줄 질문")


class CompareProductsContinueRequest(BaseModel):
    """CompareProducts 그래프 재개 요청"""

    user_input: dict | list = Field(
        ..., description="사용자 입력 (1단계: list[str], 2단계: dict[str, int])"
    )


class CompareProductsContinueResponse(BaseModel):
    """CompareProducts 그래프 재개 응답"""

    status: str = Field(..., description="현재 상태")
    question: str | None = Field(None, description="다음 질문 (있는 경우)")
    criteria: list[str] | None = Field(None, description="추출된 비교 기준 (2단계 전)")
    report: ComparisonReportSchema | None = Field(None, description="최종 보고서 (완료 시)")
