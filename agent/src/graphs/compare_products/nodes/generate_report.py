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
    criteria_specs: dict[str, str] = Field(
        default_factory=dict, description="기준별 실제 스펙 값 또는 요약 (예: '16GB DDR5', '1.4kg', '우수함')"
    )
    criteria_details: dict[str, list[str]] = Field(
        default_factory=dict, description="정성적 기준의 상세 정보 (리뷰 코멘트 등)"
    )


class ComparisonReportOutput(BaseModel):
    """최종 비교 보고서"""

    category: str = Field(..., description="카테고리")
    total_products: int = Field(..., description="총 제품 수")
    user_criteria: list[str] = Field(..., description="사용자가 입력한 기준")
    unavailable_criteria: list[str] = Field(
        default_factory=list, description="제품 데이터에서 추출 불가능한 사용자 기준"
    )
    criteria_importance: dict[str, int] = Field(
        default_factory=dict, description="Agent가 도출한 기준의 중요도 (1-10)"
    )
    products: list[ProductComparisonOutput] = Field(..., description="제품 목록")
    summary: str = Field(..., description="종합평")


# ============================================================================
# Node Function
# ============================================================================


async def generate_report_node(state: CompareProductsState) -> dict:
    """
    최종 비교 보고서를 생성하는 노드

    사용자 기준과 제품 데이터를 바탕으로,
    LLM을 사용하여 제품 비교 보고서를 생성합니다.

    Args:
        state: CompareProductsState

    Returns:
        comparison_report: ComparisonReport - 최종 비교 보고서
    """
    logger.info("━━━ Generate Report Node ━━━")

    try:
        # State에서 데이터 추출
        category = state.get("category", "Unknown")
        user_criteria = state.get("user_criteria", [])
        extracted_criteria = state.get("extracted_criteria", [])
        products = state.get("products", [])

        logger.info(f"  Category: {category}")
        logger.info(f"  User criteria: {len(user_criteria)} keywords")
        logger.info(f"  Extracted criteria: {len(extracted_criteria)} criteria")
        logger.info(f"  Products to compare: {len(products)}")

        if not products or not extracted_criteria:
            logger.error("  Insufficient data for report generation")
            return {"comparison_report": None}

        # LLM 클라이언트 초기화
        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.3,  # 객관적인 스펙 추출
        )

        # 프롬프트 생성
        messages = build_generate_report_messages(
            category=category,
            user_criteria=user_criteria,
            criteria=extracted_criteria,
            products=products
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
            "unavailable_criteria": result.unavailable_criteria,
            "criteria_importance": result.criteria_importance,
            "products": [
                {
                    "product_name": p.product_name,
                    "criteria_specs": p.criteria_specs,
                    "criteria_details": p.criteria_details,
                }
                for p in result.products
            ],
            "summary": result.summary,
        }

        # 결과 로깅
        logger.info(f"  Report generated successfully")
        logger.info(f"  Products evaluated: {len(result.products)}")
        logger.info(f"  Unavailable criteria: {len(result.unavailable_criteria)}")
        logger.info(f"  Summary: {result.summary[:100]}...")

        return {"comparison_report": comparison_report}

    except Exception as e:
        logger.error(f"  Failed to generate report: {str(e)}")
        # Fallback: 간단한 보고서 생성
        fallback_report = {
            "category": state.get("category", "Unknown"),
            "total_products": len(state.get("products", [])),
            "user_criteria": state.get("user_criteria", []),
            "unavailable_criteria": [],
            "criteria_importance": {},
            "products": [],
            "summary": "Report generation failed. Please try again.",
        }
        logger.warning("  Using fallback report")
        return {"comparison_report": fallback_report}
