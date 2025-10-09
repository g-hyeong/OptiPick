"""SummarizePage 그래프의 State 정의"""

from typing import TypedDict


class ExtractedText(TypedDict):
    """추출된 텍스트"""
    content: str  # 텍스트 내용
    tagName: str  # HTML 태그명
    position: int  # 페이지 상단으로부터 픽셀 거리


class ExtractedImage(TypedDict, total=False):
    """추출된 이미지"""
    src: str  # 이미지 URL (절대 경로)
    alt: str  # 대체 텍스트
    width: int  # 너비 (픽셀)
    height: int  # 높이 (픽셀)
    position: int  # 페이지 상단으로부터 픽셀 거리
    ocr_result: str  # OCR로 추출된 텍스트 (optional)


class SummarizePageState(TypedDict):
    """SummarizePage 그래프의 State"""
    # Extension으로부터 받는 입력
    url: str
    title: str
    texts: list[ExtractedText]
    images: list[ExtractedImage]
    timestamp: int

    # 필터링된 유효한 이미지들
    valid_images: list[ExtractedImage]
