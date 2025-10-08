"""OCR 노드 - 이미지에서 텍스트를 추출"""

import asyncio
from typing import List

import httpx

from src.exceptions.base import ConfigurationError, HTTPError, TimeoutError
from src.utils.logger import get_logger

from ..config import SummarizePageSettings
from ..exceptions import ImageURLError, OCRAPIError, OCRParseError
from ..state import ExtractedImage, OCRResult, SummarizePageState

logger = get_logger(__name__)
settings = SummarizePageSettings()


class OCRService:
    """OCR API 호출 서비스"""

    def __init__(self, settings: SummarizePageSettings):
        self.settings = settings
        self._validate_config()

    def _validate_config(self):
        """설정 검증 (fail fast)"""
        if not self.settings.ocr_api_key:
            raise ConfigurationError(
                "OCR API key is not configured", details={"env_var": "OCR_API_KEY"}
            )

        if self.settings.ocr_max_concurrent <= 0:
            raise ConfigurationError(
                "Invalid concurrency setting",
                details={"value": self.settings.ocr_max_concurrent},
            )

    async def perform_ocr(self, image: ExtractedImage) -> OCRResult | None:
        """단일 이미지 OCR 수행"""
        try:
            # URL 유효성 검증
            if not image["src"].startswith(("http://", "https://")):
                raise ImageURLError(
                    "Invalid image URL format", details={"url": image["src"]}
                )

            params = {
                "apikey": self.settings.ocr_api_key,
                "url": image["src"],
                "language": self.settings.ocr_language,
                "OCREngine": self.settings.ocr_engine,
                "detectOrientation": str(self.settings.ocr_detect_orientation).lower(),
                "scale": str(self.settings.ocr_scale).lower(),
                "isTable": str(self.settings.ocr_is_table).lower(),
            }

            # 재시도 로직
            for attempt in range(self.settings.http_max_retries):
                try:
                    async with httpx.AsyncClient(
                        timeout=self.settings.http_timeout
                    ) as client:
                        response = await client.post(
                            self.settings.ocr_api_endpoint, data=params
                        )
                        response.raise_for_status()
                        result = response.json()

                        return self._parse_ocr_result(result, image["src"])

                except httpx.TimeoutException as e:
                    if attempt == self.settings.http_max_retries - 1:
                        raise TimeoutError(
                            f"OCR request timed out after {self.settings.http_max_retries} attempts",
                            details={
                                "url": image["src"],
                                "timeout": self.settings.http_timeout,
                            },
                        )
                    await asyncio.sleep(2**attempt)

                except httpx.HTTPStatusError as e:
                    if attempt == self.settings.http_max_retries - 1:
                        raise HTTPError(
                            f"HTTP error: {e.response.status_code}",
                            details={
                                "url": image["src"],
                                "status_code": e.response.status_code,
                            },
                        )
                    await asyncio.sleep(2**attempt)

        except ImageURLError as e:
            logger.warning(f"Invalid image URL: {e.message}", extra=e.details)
            return None

        except (TimeoutError, HTTPError) as e:
            logger.error(f"OCR request failed: {e.message}", extra=e.details)
            return None

        except Exception as e:
            logger.error(
                f"Unexpected error during OCR: {str(e)}", extra={"url": image["src"]}
            )
            return None

    def _parse_ocr_result(self, result: dict, image_url: str) -> OCRResult:
        """OCR API 응답 파싱"""
        try:
            ocr_exit_code = result.get("OCRExitCode")

            # 문자열 또는 정수로 올 수 있으므로 문자열로 변환
            ocr_exit_code_str = str(ocr_exit_code)

            # 완전 실패
            if ocr_exit_code_str == "3":
                raise OCRAPIError(
                    "OCR parsing failed for all pages",
                    details={
                        "url": image_url,
                        "error": result.get("ErrorMessage"),
                        "details": result.get("ErrorDetails"),
                    },
                )

            # 부분 성공 또는 완전 성공
            if ocr_exit_code_str in ["1", "2"]:
                parsed_results = result.get("ParsedResults", [])

                if not parsed_results:
                    raise OCRParseError(
                        "No parsed results returned", details={"url": image_url}
                    )

                first_result = parsed_results[0]

                # 개별 페이지 파싱 실패 체크
                if first_result.get("FileParseExitCode") != 1:
                    raise OCRParseError(
                        f"File parse failed: {first_result.get('ErrorMessage')}",
                        details={
                            "url": image_url,
                            "exit_code": first_result.get("FileParseExitCode"),
                            "error_details": first_result.get("ErrorDetails"),
                        },
                    )

                parsed_text = first_result.get("ParsedText", "")

                return OCRResult(src=image_url, text=parsed_text.strip())

            # 알 수 없는 상태
            raise OCRAPIError(
                f"Unknown OCR exit code: {ocr_exit_code}",
                details={"url": image_url, "result": result},
            )

        except (OCRAPIError, OCRParseError) as e:
            logger.error(f"OCR result parsing error: {e.message}", extra=e.details)
            raise

        except Exception as e:
            raise OCRParseError(
                f"Unexpected error parsing OCR result: {str(e)}",
                details={"url": image_url, "result": result},
            )

    async def process_images(self, images: List[ExtractedImage]) -> List[OCRResult]:
        """여러 이미지를 병렬로 OCR 처리"""
        if not images:
            logger.info("No images to process")
            return []

        semaphore = asyncio.Semaphore(self.settings.ocr_max_concurrent)

        async def bounded_ocr(image: ExtractedImage):
            async with semaphore:
                return await self.perform_ocr(image)

        logger.info(f"Starting OCR for {len(images)} images")

        tasks = [bounded_ocr(img) for img in images]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 성공한 결과만 필터링
        successful_results = []
        failed_count = 0

        for result in results:
            if isinstance(result, dict) and "src" in result and "text" in result:
                successful_results.append(result)
            elif isinstance(result, Exception):
                failed_count += 1
                logger.error(f"OCR task failed with exception: {result}")
            elif result is None:
                failed_count += 1

        logger.info(
            f"OCR completed: {len(successful_results)} successful, {failed_count} failed"
        )

        return successful_results


def ocr_node(state: SummarizePageState) -> dict:
    """이미지 리스트를 받아 OCR 수행하는 노드"""
    try:
        images = state["images"]

        # OCR 서비스 초기화 및 실행
        ocr_service = OCRService(settings)
        ocr_results = asyncio.run(ocr_service.process_images(images))

        return {"ocr_results": ocr_results}

    except ConfigurationError as e:
        # 설정 오류는 fail fast
        logger.critical(f"Configuration error: {e.message}", extra=e.details)
        raise

    except Exception as e:
        # 예상치 못한 오류는 로깅 후 빈 결과 반환
        logger.error(f"Unexpected error in OCR node: {str(e)}")
        return {"ocr_results": []}
