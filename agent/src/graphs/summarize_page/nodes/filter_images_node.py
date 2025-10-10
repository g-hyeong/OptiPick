"""이미지 필터링 노드 - LLM을 사용하여 상품 정보로 유용한 이미지만 선별"""

from typing import List

from pydantic import BaseModel, Field

from src.config.base import BaseSettings
from src.prompts import filter_images
from src.utils.llm.client import LLMClient
from src.utils.logger import get_logger

from ..state import ExtractedImage, SummarizePageState

logger = get_logger(__name__)
settings = BaseSettings()


class FilteredImageIndices(BaseModel):
    """LLM 응답 - 선택된 이미지 인덱스 목록"""

    selected_indices: List[int] = Field(
        description="상품 정보로 유용한 이미지의 인덱스 목록",
        examples=[[0, 2, 5, 7]],
    )


async def filter_images_node(state: SummarizePageState) -> dict:
    """LLM을 사용하여 상품 정보로 유용한 이미지만 선별하는 노드"""
    try:
        images = state["images"]
        logger.info(f"━━━ Filter Images Node ━━━")
        logger.info(f"  Input: {len(images)} images")

        # 이미지가 없으면 빈 리스트 반환
        if not images:
            logger.info("  No images to filter, skipping")
            return {"valid_images": []}

        # 1. 이미지 정보 구조화 (index 부여)
        images_info = []
        for idx, img in enumerate(images):
            images_info.append(
                filter_images.ImageInfo(
                    index=idx,
                    alt=img.get("alt", ""),
                    ocr_result=img.get("ocr_result", ""),
                )
            )

        # 2. LLM 프롬프트 구성
        messages = filter_images.build_messages(images_info)

        # 3. LLM 호출 (structured output)
        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.3,
            max_tokens=settings.default_max_tokens,
            timeout=settings.default_llm_timeout,
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

        filter_rate = len(valid_images) / len(images) * 100 if images else 0
        logger.info(
            f"  Output: {len(valid_images)}/{len(images)} images selected ({filter_rate:.0f}%)"
        )

        return {"valid_images": valid_images}

    except Exception as e:
        logger.error(f"✗ Filter images node failed: {str(e)}")
        logger.warning("  Fallback: passing all images through")
        return {"valid_images": state["images"]}
