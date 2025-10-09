"""이미지 필터링 노드 - LLM을 사용하여 상품 정보로 유용한 이미지만 선별"""

from typing import List

from pydantic import BaseModel, Field

from src.config.base import BaseSettings
from src.utils.llm.client import LLMClient
from src.utils.logger import get_logger

from ..state import ExtractedImage, SummarizePageState

logger = get_logger(__name__)
settings = BaseSettings()


class ImageInfo(BaseModel):
    """LLM에 전달할 이미지 정보"""

    index: int = Field(description="이미지 순번 (0부터 시작)")
    alt: str = Field(description="이미지 대체 텍스트 (alt attribute)")
    ocr_result: str = Field(description="OCR로 추출된 텍스트")


class FilteredImageIndices(BaseModel):
    """LLM 응답 - 선택된 이미지 인덱스 목록"""

    selected_indices: List[int] = Field(
        description="상품 정보로 유용한 이미지의 인덱스 목록",
        examples=[[0, 2, 5, 7]],
    )


def build_filter_prompt(images_info: List[ImageInfo]) -> List[dict]:
    """이미지 필터링을 위한 프롬프트 구성"""

    # System prompt
    system_prompt = """You are an expert at identifying product-relevant images for e-commerce and product comparison.

Your task is to analyze a list of images (with their alt text and OCR-extracted text) and select ONLY the images that contain useful product information.

**Select images that contain:**
- Product photos (main product images, product variations, colors, angles)
- Product specifications or technical details
- Product features or benefits information
- Price information, deals, or discounts
- Size charts, dimension diagrams
- Ingredient lists or nutritional information
- Customer reviews with product photos
- Product comparison charts or tables

**DO NOT select images that are:**
- Decorative or purely aesthetic elements (backgrounds, patterns, ornaments)
- Navigation icons or UI elements (arrows, hamburger menus, shopping cart icons)
- Generic stock photos unrelated to the specific product
- Advertisement banners for unrelated products
- Social media icons or share buttons
- Author photos or profile pictures (unless it's a product creator/brand story)
- Empty or placeholder images
- Images with no meaningful text or product representation

**Decision criteria:**
1. Relevance: Does this image help understand the product better?
2. Information value: Does it contain specifications, features, or visual details about the product?
3. Uniqueness: Is this information not already available in text form?

Be selective but thorough. When in doubt, prefer including the image if it might help a user make a purchasing decision."""

    # User prompt with structured data
    images_json = [img.model_dump() for img in images_info]

    user_prompt = f"""Analyze the following images and select the indices of images that are relevant for product information.

Images data:
{images_json}

Return ONLY the indices of images that contain useful product information."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


async def filter_images_node(state: SummarizePageState) -> dict:
    """LLM을 사용하여 상품 정보로 유용한 이미지만 선별하는 노드"""
    try:
        images = state["images"]
        logger.info(f"Filter images node started with {len(images)} images")

        # 이미지가 없으면 빈 리스트 반환
        if not images:
            logger.info("No images to filter")
            return {"valid_images": []}

        # 1. 이미지 정보 구조화 (index 부여)
        images_info = []
        for idx, img in enumerate(images):
            images_info.append(
                ImageInfo(
                    index=idx,
                    alt=img.get("alt", ""),
                    ocr_result=img.get("ocr_result", ""),
                )
            )

        # 2. LLM 프롬프트 구성
        messages = build_filter_prompt(images_info)

        # 3. LLM 호출 (structured output)
        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.3,  # 일관성 있는 판단을 위해 낮은 temperature
            max_tokens=settings.default_max_tokens,
            timeout=settings.default_llm_timeout,
        )

        logger.info(
            "Invoking LLM for image filtering",
            extra={
                "provider": settings.default_llm_provider,
                "model": settings.default_llm_model,
                "total_images": len(images),
            },
        )

        result: FilteredImageIndices = await llm_client.invoke(
            messages=messages,
            output_format=FilteredImageIndices,
        )

        # 4. 유효한 인덱스만 필터링 (범위 검증)
        valid_indices = [
            idx for idx in result.selected_indices if 0 <= idx < len(images)
        ]

        # 5. 선택된 이미지들만 추출
        valid_images = [images[idx] for idx in valid_indices]

        logger.info(
            f"Image filtering completed",
            extra={
                "total_images": len(images),
                "selected_images": len(valid_images),
                "selected_indices": valid_indices,
                "filter_rate": f"{len(valid_images) / len(images) * 100:.1f}%"
                if images
                else "N/A",
            },
        )

        return {"valid_images": valid_images}

    except Exception as e:
        # 예상치 못한 오류 발생 시 모든 이미지 통과
        logger.error(
            f"Unexpected error in filter images node: {str(e)}, passing all images through"
        )
        return {"valid_images": state["images"]}
