"""API Request/Response Pydantic 스키마"""

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
    valid_images: list[ExtractedImageSchema] = Field(
        default_factory=list, description="유효한 이미지 목록 (OCR 결과 포함)"
    )
    product_analysis: ProductAnalysisSchema = Field(
        ..., description="제품 분석 결과"
    )
    timestamp: int = Field(..., description="추출 시각 (Unix timestamp)")
