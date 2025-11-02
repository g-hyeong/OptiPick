"""제품 분석 및 비교 기준 추출 노드"""

from pydantic import BaseModel, Field

from src.config.base import BaseSettings
from src.utils.llm.client import LLMClient
from src.utils.logger import get_logger
from src.prompts.compare_products import build_analyze_products_messages
from ..state import CompareProductsState

logger = get_logger(__name__)
settings = BaseSettings()


# ============================================================================
# Pydantic Output Model
# ============================================================================


class ExtractedCriteriaOutput(BaseModel):
    """LLM이 추출한 비교 기준"""

    criteria: list[str] = Field(..., description="비교 가능한 기준 목록")


# ============================================================================
# Node Function
# ============================================================================


async def analyze_products_node(state: CompareProductsState) -> dict:
    """
    제품들을 분석하여 비교 가능한 기준을 추출하는 노드

    사용자가 입력한 기준 키워드와 제품 데이터를 바탕으로,
    LLM을 사용하여 실제로 비교 가능한 모든 기준을 추출합니다.

    Args:
        state: CompareProductsState

    Returns:
        extracted_criteria: list[str] - 추출된 비교 기준 목록
    """
    logger.info("━━━ Analyze Products Node ━━━")

    try:
        # State에서 데이터 추출
        category = state.get("category", "Unknown")
        user_criteria = state.get("user_criteria", [])
        products = state.get("products", [])

        logger.info(f"  Category: {category}")
        logger.info(f"  User criteria: {len(user_criteria)} items")
        logger.info(f"  Products to analyze: {len(products)}")

        if not products:
            logger.error("  No products to analyze")
            return {"extracted_criteria": []}

        # LLM 클라이언트 초기화
        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.3,  # 일관성 중시
        )

        # 프롬프트 생성
        messages = build_analyze_products_messages(
            category=category, user_criteria=user_criteria, products=products
        )

        # LLM 호출
        logger.info("  Calling LLM to extract comparison criteria...")
        result = await llm_client.invoke(
            messages=messages, output_format=ExtractedCriteriaOutput
        )

        # 결과 추출
        extracted_criteria = result.criteria

        logger.info(f"  Extracted criteria: {len(extracted_criteria)} items")
        for idx, criterion in enumerate(extracted_criteria, 1):
            logger.info(f"    {idx}. {criterion}")

        return {"extracted_criteria": extracted_criteria}

    except Exception as e:
        logger.error(f"  Failed to analyze products: {str(e)}")
        # Fallback: 사용자 입력 기준만 사용
        fallback_criteria = state.get("user_criteria", [])
        logger.warning(f"  Using fallback criteria: {fallback_criteria}")
        return {"extracted_criteria": fallback_criteria}
