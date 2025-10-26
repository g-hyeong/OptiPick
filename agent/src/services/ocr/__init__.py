"""OCR 서비스 팩토리"""

from src.exceptions.base import ConfigurationError
from src.utils.logger import get_logger

from .base import BaseOCRService
from .clova import ClovaOCRService
from .ocrspace import OcrSpaceService

logger = get_logger(__name__)


def get_ocr_service(settings) -> BaseOCRService:
    """
    설정에 따라 적절한 OCR 서비스 인스턴스를 반환

    Args:
        settings: SummarizePageSettings 인스턴스

    Returns:
        BaseOCRService: OCR 서비스 인스턴스

    Raises:
        ConfigurationError: 지원하지 않는 OCR provider인 경우
    """
    ocr_provider = getattr(settings, "ocr_provider", "clova").lower()

    if ocr_provider == "clova":
        logger.info("Using Clova OCR service")
        return ClovaOCRService(settings)
    elif ocr_provider == "ocrspace":
        logger.info("Using OcrSpace OCR service")
        return OcrSpaceService(settings)
    else:
        raise ConfigurationError(
            f"Unsupported OCR provider: {ocr_provider}",
            details={
                "provider": ocr_provider,
                "supported_providers": ["clova", "ocrspace"],
            },
        )


__all__ = ["BaseOCRService", "ClovaOCRService", "OcrSpaceService", "get_ocr_service"]
