"""OCR 서비스 기본 추상 클래스"""

import asyncio
from abc import ABC, abstractmethod
from typing import List

from src.exceptions.base import ConfigurationError
from src.graphs.summarize_page.state import ExtractedImage
from src.utils.logger import get_logger

logger = get_logger(__name__)


class BaseOCRService(ABC):
    """OCR 서비스 추상 클래스 - 모든 OCR 제공자가 상속해야 함"""

    def __init__(self, settings):
        self.settings = settings
        self._validate_config()

    @abstractmethod
    def _validate_config(self):
        """설정 검증 (fail fast) - 각 구현체에서 구현 필요"""
        pass

    @abstractmethod
    async def perform_ocr(self, image: ExtractedImage) -> str | None:
        """
        단일 이미지 OCR 수행 - 각 구현체에서 구현 필요

        Args:
            image: OCR을 수행할 이미지 정보

        Returns:
            str | None: 추출된 텍스트 또는 None (실패 시)
        """
        pass

    async def process_images(self, images: List[ExtractedImage]) -> List[ExtractedImage]:
        """
        여러 이미지를 병렬로 OCR 처리하고 각 이미지에 ocr_result 필드 추가

        이 메서드는 공통 로직이므로 BaseOCRService에서 구현
        """
        if not images:
            logger.info("  No images to process, skipping OCR")
            return images

        logger.info(
            f"  Processing {len(images)} images (max concurrent: {self.settings.ocr_max_concurrent})"
        )
        semaphore = asyncio.Semaphore(self.settings.ocr_max_concurrent)

        async def bounded_ocr(image: ExtractedImage):
            async with semaphore:
                return await self.perform_ocr(image)

        logger.info(f"Starting OCR for {len(images)} images")

        tasks = [bounded_ocr(img) for img in images]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 이미지에 OCR 결과 추가
        processed_images = []
        successful_count = 0
        failed_count = 0

        for image, result in zip(images, results):
            # 이미지 복사 (원본 보존)
            processed_image = image.copy()

            if isinstance(result, str) and result:
                # OCR 성공
                processed_image["ocr_result"] = result
                successful_count += 1
            elif isinstance(result, Exception):
                # OCR 실패 (예외)
                failed_count += 1
                logger.error(
                    f"OCR task failed with exception for {image['src']}: {result}"
                )
                processed_image["ocr_result"] = ""
            else:
                # OCR 실패 (None)
                failed_count += 1
                processed_image["ocr_result"] = ""

            processed_images.append(processed_image)

        logger.info(f"  OCR completed: {successful_count} success, {failed_count} failed")

        return processed_images
