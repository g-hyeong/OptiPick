"""API Request/Response Pydantic 스키마"""

from pydantic import BaseModel, Field


class ExtractedTextSchema(BaseModel):
    """추출된 텍스트"""

    content: str = Field(..., description="텍스트 내용")
    tagName: str = Field(..., description="HTML 태그명")
    position: int = Field(..., description="페이지 상단으로부터 픽셀 거리")


class ExtractedImageSchema(BaseModel):
    """추출된 이미지"""

    src: str = Field(..., description="이미지 URL (절대 경로)")
    alt: str = Field(..., description="대체 텍스트")
    width: int = Field(..., description="너비 (픽셀)")
    height: int = Field(..., description="높이 (픽셀)")
    position: int = Field(..., description="페이지 상단으로부터 픽셀 거리")


class OCRResultSchema(BaseModel):
    """OCR 처리 결과"""

    src: str = Field(..., description="원본 이미지 URL")
    text: str = Field(..., description="추출된 텍스트")


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
    texts: list[ExtractedTextSchema] = Field(
        default_factory=list, description="추출된 텍스트 목록"
    )
    images: list[ExtractedImageSchema] = Field(
        default_factory=list, description="추출된 이미지 목록"
    )
    ocr_results: list[OCRResultSchema] = Field(
        default_factory=list, description="OCR 처리 결과"
    )
    timestamp: int = Field(..., description="추출 시각 (Unix timestamp)")
