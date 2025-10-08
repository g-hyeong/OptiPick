"""SummarizePage 그래프 전용 예외"""

from src.exceptions.base import ExternalAPIError, ValidationError


class OCRError(ExternalAPIError):
    """OCR 처리 관련 오류"""

    pass


class OCRAPIError(OCRError):
    """OCR API 응답 오류"""

    pass


class OCRParseError(OCRError):
    """OCR 결과 파싱 오류"""

    pass


class ImageValidationError(ValidationError):
    """이미지 유효성 검증 실패"""

    pass


class ImageURLError(ImageValidationError):
    """이미지 URL 형식 오류"""

    pass
