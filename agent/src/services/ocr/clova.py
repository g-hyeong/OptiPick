"""Naver Clova OCR 서비스 구현체"""

import asyncio
import time

import httpx

from src.exceptions.base import ConfigurationError, HTTPError, TimeoutError
from src.graphs.summarize_page.exceptions import ImageURLError, OCRAPIError, OCRParseError
from src.graphs.summarize_page.state import ExtractedImage
from src.utils.logger import get_logger

from .base import BaseOCRService

logger = get_logger(__name__)


class ClovaOCRService(BaseOCRService):
    """Naver Clova OCR API를 사용하는 OCR 서비스"""

    def _validate_config(self):
        """설정 검증 (fail fast)"""
        if not self.settings.clova_secret_key:
            raise ConfigurationError(
                "Clova OCR secret key is not configured",
                details={"env_var": "CLOVA_SECRET_KEY"},
            )

        if not self.settings.clova_invoke_url:
            raise ConfigurationError(
                "Clova OCR invoke URL is not configured",
                details={"env_var": "CLOVA_INVOKE_URL"},
            )

        if self.settings.ocr_max_concurrent <= 0:
            raise ConfigurationError(
                "Invalid concurrency setting",
                details={"value": self.settings.ocr_max_concurrent},
            )

    async def perform_ocr(self, image: ExtractedImage) -> str | None:
        """단일 이미지 OCR 수행 - Clova OCR API V2 사용"""
        try:
            # URL 유효성 검증
            if not image["src"].startswith(("http://", "https://")):
                raise ImageURLError(
                    "Invalid image URL format", details={"url": image["src"]}
                )

            # Clova OCR API V2 요청 바디
            request_body = {
                "images": [
                    {
                        "format": self._detect_image_format(image["src"]),
                        "name": "image",
                        "url": image["src"],
                    }
                ],
                "lang": self.settings.clova_lang,
                "requestId": f"ocr_{int(time.time() * 1000)}",
                "resultType": "string",
                "timestamp": int(time.time() * 1000),
                "version": "V2",
            }

            # 요청 헤더
            headers = {
                "Content-Type": "application/json",
                "X-OCR-SECRET": self.settings.clova_secret_key,
            }

            # 재시도 로직
            for attempt in range(self.settings.http_max_retries):
                try:
                    async with httpx.AsyncClient(
                        timeout=self.settings.http_timeout
                    ) as client:
                        response = await client.post(
                            self.settings.clova_invoke_url,
                            json=request_body,
                            headers=headers,
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
                                "response_text": e.response.text,
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

    def _detect_image_format(self, url: str) -> str:
        """
        이미지 URL에서 포맷 추출

        Args:
            url: 이미지 URL

        Returns:
            str: 이미지 포맷 (jpg, png, gif 등)
        """
        url_lower = url.lower()

        if url_lower.endswith(".jpg") or url_lower.endswith(".jpeg"):
            return "jpg"
        elif url_lower.endswith(".png"):
            return "png"
        elif url_lower.endswith(".gif"):
            return "gif"
        elif url_lower.endswith(".bmp"):
            return "bmp"
        elif url_lower.endswith(".tiff") or url_lower.endswith(".tif"):
            return "tiff"
        else:
            # 기본값
            return "jpg"

    def _parse_ocr_result(self, result: dict, image_url: str) -> str:
        """
        Clova OCR API V2 응답 파싱

        응답 구조 예시:
        {
            "version": "V2",
            "requestId": "...",
            "timestamp": ...,
            "images": [
                {
                    "uid": "...",
                    "name": "image",
                    "inferResult": "SUCCESS",
                    "message": "...",
                    "fields": [
                        {
                            "inferText": "추출된 텍스트",
                            "inferConfidence": 0.99,
                            ...
                        },
                        ...
                    ]
                }
            ]
        }

        Args:
            result: Clova OCR API 응답 JSON
            image_url: 이미지 URL

        Returns:
            str: 추출된 텍스트 (공백으로 결합)
        """
        try:
            images = result.get("images", [])

            if not images:
                raise OCRParseError(
                    "No images in response", details={"url": image_url, "result": result}
                )

            first_image = images[0]
            infer_result = first_image.get("inferResult")

            # 성공 여부 확인
            if infer_result != "SUCCESS":
                # GIF 등 지원하지 않는 포맷은 조용히 스킵
                error_message = first_image.get("message", "Unknown error")
                if "unsupported" in error_message.lower() or "gif" in image_url.lower():
                    logger.debug(
                        f"    OCR unsupported format (likely GIF): {image_url[:50]}..."
                    )
                    return ""

                raise OCRAPIError(
                    f"OCR inference failed: {error_message}",
                    details={
                        "url": image_url,
                        "inferResult": infer_result,
                        "message": error_message,
                    },
                )

            # 텍스트 추출
            fields = first_image.get("fields", [])

            if not fields:
                # 텍스트가 없는 이미지는 빈 문자열 반환
                logger.debug(f"    No text found in image: {image_url[:50]}...")
                return ""

            # 모든 필드의 inferText를 추출하여 결합
            extracted_texts = [
                field.get("inferText", "").strip()
                for field in fields
                if field.get("inferText")
            ]

            # 공백으로 결합 (줄바꿈 유지를 위해 \n 사용 가능)
            combined_text = " ".join(extracted_texts)

            return combined_text.strip()

        except (OCRAPIError, OCRParseError) as e:
            logger.error(f"OCR result parsing error: {e.message}", extra=e.details)
            raise

        except Exception as e:
            raise OCRParseError(
                f"Unexpected error parsing OCR result: {str(e)}",
                details={"url": image_url, "result": result},
            )
