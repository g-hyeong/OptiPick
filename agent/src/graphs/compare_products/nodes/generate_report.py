"""최종 비교 보고서 생성 노드"""

from pydantic import BaseModel, Field

from src.config.base import BaseSettings
from src.utils.llm.client import LLMClient
from src.utils.logger import get_logger
from src.prompts.compare_products import build_generate_report_messages
from ..state import CompareProductsState, ProductComparison

logger = get_logger(__name__)
settings = BaseSettings()


# ============================================================================
# Pydantic Output Model
# ============================================================================


class ProductComparisonOutput(BaseModel):
    """개별 제품 비교 결과"""

    product_name: str = Field(..., description="제품명")
    criteria_scores: dict[str, float] = Field(..., description="기준별 점수 (0-100)")
    criteria_specs: dict[str, str] = Field(
        default_factory=dict, description="기준별 실제 스펙 값 (예: 'RAM: 16GB DDR5', '무게: 1.4kg')"
    )
    strengths: list[str] = Field(..., description="강점")
    weaknesses: list[str] = Field(..., description="약점")


class ComparisonReportOutput(BaseModel):
    """최종 비교 보고서"""

    category: str = Field(..., description="카테고리")
    total_products: int = Field(..., description="총 제품 수")
    user_criteria: list[str] = Field(..., description="사용자 입력 기준")
    user_priorities: dict[str, int] = Field(..., description="사용자 우선순위")
    products: list[ProductComparisonOutput] = Field(..., description="제품 목록")
    summary: str = Field(..., description="전체 요약")
    recommendation: str = Field(..., description="최종 추천")


# ============================================================================
# Node Function
# ============================================================================


async def generate_report_node(state: CompareProductsState) -> dict:
    """
    최종 비교 보고서를 생성하는 노드

    사용자 우선순위와 제품 데이터를 바탕으로,
    LLM을 사용하여 사용자 맞춤형 제품 비교 보고서를 생성합니다.

    Args:
        state: CompareProductsState

    Returns:
        comparison_report: ComparisonReport - 최종 비교 보고서
    """
    logger.info("━━━ Generate Report Node ━━━")

    try:
        # State에서 데이터 추출
        category = state.get("category", "Unknown")
        user_priorities = state.get("user_priorities", {})
        products = state.get("products", [])
        user_criteria = state.get("user_criteria", [])

        logger.info(f"  Category: {category}")
        logger.info(f"  User priorities: {len(user_priorities)} criteria")
        logger.info(f"  Products to compare: {len(products)}")

        if not products or not user_priorities:
            logger.error("  Insufficient data for report generation")
            return {"comparison_report": None}

        # LLM 클라이언트 초기화
        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.5,  # 창의적인 설명 생성
        )

        # 프롬프트 생성
        messages = build_generate_report_messages(
            category=category, user_priorities=user_priorities, products=products
        )

        # LLM 호출
        logger.info("  Calling LLM to generate comparison report...")
        result = await llm_client.invoke(
            messages=messages, output_format=ComparisonReportOutput
        )

        # ComparisonReport로 변환
        comparison_report = {
            "category": result.category,
            "total_products": result.total_products,
            "user_criteria": result.user_criteria,
            "user_priorities": result.user_priorities,
            "products": [
                {
                    "product_name": p.product_name,
                    "criteria_scores": p.criteria_scores,
                    "criteria_specs": p.criteria_specs,
                    "strengths": p.strengths,
                    "weaknesses": p.weaknesses,
                }
                for p in result.products
            ],
            "summary": result.summary,
            "recommendation": result.recommendation,
        }

        # 결과 로깅
        logger.info(f"  Report generated successfully")
        logger.info(f"  Products evaluated: {len(result.products)}")
        logger.info(f"  Summary: {result.summary[:100]}...")

        return {"comparison_report": comparison_report}

    except Exception as e:
        logger.error(f"  Failed to generate report: {str(e)}")
        # Fallback: 간단한 보고서 생성
        fallback_report = {
            "category": state.get("category", "Unknown"),
            "total_products": len(state.get("products", [])),
            "user_criteria": state.get("user_criteria", []),
            "user_priorities": state.get("user_priorities", {}),
            "products": [],
            "summary": "Report generation failed. Please try again.",
            "recommendation": "Unable to generate recommendation at this time.",
        }
        logger.warning("  Using fallback report")
        return {"comparison_report": fallback_report}
