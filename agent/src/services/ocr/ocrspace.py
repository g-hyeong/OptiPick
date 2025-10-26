"""OcrSpace OCR 서비스 구현체"""

import asyncio

import httpx

from src.exceptions.base import ConfigurationError, HTTPError, TimeoutError
from src.graphs.summarize_page.exceptions import ImageURLError, OCRAPIError, OCRParseError
from src.graphs.summarize_page.state import ExtractedImage
from src.utils.logger import get_logger

from .base import BaseOCRService

logger = get_logger(__name__)


class OcrSpaceService(BaseOCRService):
    """OcrSpace API를 사용하는 OCR 서비스"""

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

    async def perform_ocr(self, image: ExtractedImage) -> str | None:
        """단일 이미지 OCR 수행 - OcrSpace API 사용"""
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
                f"Unexpected error during OCR: {str(e)}",
                extra={
                    "url": image["src"],
                    "error_type": type(e).__name__,
                    "error_detail": str(e),
                },
                exc_info=True,  # 스택 트레이스 포함
            )
            return None

    def _parse_ocr_result(self, result: dict, image_url: str) -> str:
        """OcrSpace API 응답 파싱"""
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

                return parsed_text.strip()

            # OCR API 에러 코드 99: 지원하지 않는 형식 (GIF 등)
            if ocr_exit_code_str == "99":
                logger.debug(f"    OCR unsupported format (likely GIF): {image_url[:50]}...")
                return ""  # 빈 문자열 반환 (스킵 처리)

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
