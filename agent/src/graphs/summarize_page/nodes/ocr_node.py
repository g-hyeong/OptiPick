"""OCR 노드 - 이미지에서 텍스트를 추출"""

from src.exceptions.base import ConfigurationError
from src.services.ocr import get_ocr_service
from src.utils.html_parser import HTMLContentExtractor
from src.utils.logger import get_logger

from ..config import SummarizePageSettings
from ..state import SummarizePageState

logger = get_logger(__name__)
settings = SummarizePageSettings()


async def ocr_node(state: SummarizePageState) -> dict:
    """HTML에서 이미지를 추출하고 OCR 수행하는 노드"""
    try:
        # HTML에서 이미지 추출
        html_body = state["html_body"]
        url = state["url"]
        images = HTMLContentExtractor.extract_images(
            html_body=html_body, base_url=url
        )

        logger.info(f"━━━ OCR Node ━━━")
        logger.info(f"  HTML body length: {len(html_body)} chars")
        logger.info(f"  Extracted: {len(images)} images")

        # OCR 서비스 팩토리를 사용하여 적절한 서비스 인스턴스 생성
        ocr_service = get_ocr_service(settings)
        processed_images = await ocr_service.process_images(images)

        # 통계 로깅
        ocr_texts = [
            img.get("ocr_result", "")
            for img in processed_images
            if img.get("ocr_result")
        ]
        total_chars = sum(len(text) for text in ocr_texts)
        logger.info(
            f"OCR extraction completed",
            extra={
                "total_images": len(images),
                "successful_extractions": len(ocr_texts),
                "total_characters": total_chars,
                "avg_chars_per_image": total_chars // len(ocr_texts) if ocr_texts else 0,
            },
        )

        return {"images": processed_images}

    except ConfigurationError as e:
        # 설정 오류는 fail fast
        logger.critical(f"Configuration error: {e.message}", extra=e.details)
        raise

    except Exception as e:
        # 예상치 못한 오류는 로깅 후 빈 이미지 반환
        logger.error(f"Unexpected error in OCR node: {str(e)}")
        return {"images": []}
