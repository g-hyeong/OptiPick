"""페이지 검증 노드 - LLM을 사용하여 페이지가 제품 분석에 적합한지 검증"""

from pydantic import BaseModel, Field

from src.config.base import BaseSettings
from src.prompts import validate_page
from src.utils.llm.client import LLMClient
from src.utils.logger import get_logger

from ..state import SummarizePageState

logger = get_logger(__name__)
settings = BaseSettings()


class PageValidationOutput(BaseModel):
    """LLM 출력 - 페이지 검증 결과"""

    is_valid: bool = Field(
        description="페이지가 단일 제품 상세 페이지이면 true, 아니면 false",
        examples=[True, False],
    )
    error_message: str = Field(
        description='부적합한 페이지일 경우 사용자에게 전달할 에러 메시지 (한국어). 적합하면 빈 문자열 ""',
        examples=[
            "",
            "여러 제품이 나열된 페이지입니다. 특정 제품을 선택해주세요",
            "제품 정보를 찾을 수 없습니다",
        ],
    )


async def validate_page_node(state: SummarizePageState) -> dict:
    """
    페이지가 제품 분석에 적합한지 검증하는 노드

    Args:
        state: SummarizePageState

    Returns:
        dict: is_valid_page, validation_error 업데이트
    """
    try:
        url = state["url"]
        title = state["title"]
        raw_texts = state["raw_texts"]

        logger.info(f"━━━ Validate Page Node ━━━")
        logger.info(f"  URL: {url}")
        logger.info(f"  Input: {len(raw_texts)} texts")

        # 입력 데이터 검증
        if not raw_texts:
            logger.warning("  No text data available, marking as invalid")
            return {
                "is_valid_page": False,
                "validation_error": "제품 정보를 찾을 수 없습니다",
            }

        # 1. 프롬프트 구성
        messages = validate_page.build_messages(url, title, raw_texts)

        # 2. LLM 호출 (structured output)
        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.3,  # 검증은 더 결정적이어야 하므로 낮은 temperature
            max_tokens=settings.default_max_tokens,
            timeout=settings.default_llm_timeout,
        )

        result: PageValidationOutput = await llm_client.invoke(
            messages=messages,
            output_format=PageValidationOutput,
        )

        logger.info(f"  Validation Result: {'✓ Valid' if result.is_valid else '✗ Invalid'}")
        if not result.is_valid:
            logger.info(f"  Error Message: {result.error_message}")

        return {
            "is_valid_page": result.is_valid,
            "validation_error": result.error_message if not result.is_valid else "",
        }

    except Exception as e:
        logger.error(f"✗ Validate page node failed: {str(e)}")
        logger.warning("  Fallback: marking page as invalid")
        return {
            "is_valid_page": False,
            "validation_error": "페이지 검증 중 오류가 발생했습니다",
        }
