"""제품 분석 노드 - LLM을 사용하여 텍스트와 이미지 정보로부터 제품 분석 수행"""

from typing import List

from pydantic import BaseModel, Field

from src.config.base import BaseSettings
from src.prompts import analyze_product
from src.utils.llm.client import LLMClient
from src.utils.logger import get_logger

from ..state import ExtractedImage, ExtractedText, ProductAnalysis, SummarizePageState

logger = get_logger(__name__)
settings = BaseSettings()


class ProductAnalysisOutput(BaseModel):
    """LLM 출력 - 제품 분석 결과"""

    product_name: str = Field(
        description='제품명. 정보가 없으면 "unknown" 반환',
        examples=["Apple MacBook Pro 16-inch M3 Max"],
    )
    summary: str = Field(
        description='제품에 대한 간단한 요약 (1-2문장). 정보가 없으면 "unknown" 반환',
        examples=[
            "High-performance laptop for professional creators with M3 Max chip and 16-inch Liquid Retina XDR display"
        ],
    )
    price: str = Field(
        description='가격 정보 (통화 기호 포함). 정보가 없으면 "unknown" 반환',
        examples=["$3,499", "2,500,000원", "unknown"],
    )
    key_features: List[str] = Field(
        description="제품의 주요 특징 목록. 정보가 없으면 빈 배열 반환",
        examples=[
            [
                "M3 Max chip with 16-core CPU",
                "48GB unified memory",
                "16.2-inch Liquid Retina XDR display",
                "Up to 22 hours battery life",
            ]
        ],
    )
    pros: List[str] = Field(
        description="제품의 장점 목록. 정보가 없으면 빈 배열 반환",
        examples=[
            [
                "Exceptional performance for video editing and 3D rendering",
                "Stunning display quality",
                "Long battery life",
            ]
        ],
    )
    cons: List[str] = Field(
        description="제품의 단점 목록. 정보가 없으면 빈 배열 반환",
        examples=[["High price point", "Limited port selection", "Heavy weight"]],
    )
    recommended_for: str = Field(
        description='제품을 추천하는 대상. 정보가 없거나 판단이 어려우면 "unknown" 반환',
        examples=[
            "Professional video editors, 3D artists, and developers who need maximum performance"
        ],
    )
    recommendation_reasons: List[str] = Field(
        description="추천하는 이유 목록. 정보가 없으면 빈 배열 반환",
        examples=[
            [
                "Industry-leading performance",
                "Professional-grade display",
                "Excellent build quality",
            ]
        ],
    )
    not_recommended_reasons: List[str] = Field(
        description="비추천하는 이유 목록. 정보가 없으면 빈 배열 반환",
        examples=[
            [
                "Overkill for basic tasks",
                "High cost",
                "Limited upgradeability",
            ]
        ],
    )




def create_default_analysis() -> ProductAnalysis:
    """기본 분석 결과 생성 (오류 발생 시 사용)"""
    return ProductAnalysis(
        product_name="unknown",
        summary="unknown",
        price="unknown",
        key_features=[],
        pros=[],
        cons=[],
        recommended_for="unknown",
        recommendation_reasons=[],
        not_recommended_reasons=[],
    )


async def analyze_product_node(state: SummarizePageState) -> dict:
    """텍스트와 이미지 정보를 분석하여 제품 분석 결과를 생성하는 노드"""
    try:
        texts = state["texts"]
        valid_images = state["valid_images"]

        logger.info(f"━━━ Analyze Product Node ━━━")
        logger.info(f"  Input: {len(texts)} texts, {len(valid_images)} images")

        # 입력 데이터 검증
        if not texts and not valid_images:
            logger.warning("  No data available, returning default analysis")
            return {"product_analysis": create_default_analysis()}

        # 1. 프롬프트 구성
        messages = analyze_product.build_messages(texts, valid_images)

        # 2. LLM 호출 (structured output)
        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.5,
            max_tokens=settings.default_max_tokens,
            timeout=settings.default_llm_timeout,
        )

        result: ProductAnalysisOutput = await llm_client.invoke(
            messages=messages,
            output_format=ProductAnalysisOutput,
        )

        # 3. Pydantic 모델을 TypedDict로 변환
        product_analysis: ProductAnalysis = {
            "product_name": result.product_name,
            "summary": result.summary,
            "price": result.price,
            "key_features": result.key_features,
            "pros": result.pros,
            "cons": result.cons,
            "recommended_for": result.recommended_for,
            "recommendation_reasons": result.recommendation_reasons,
            "not_recommended_reasons": result.not_recommended_reasons,
        }

        logger.info(
            f"  Output: {result.product_name[:50]}{'...' if len(result.product_name) > 50 else ''}"
        )
        logger.debug(
            f"    Price: {result.price}, Features: {len(result.key_features)}, "
            f"Pros: {len(result.pros)}, Cons: {len(result.cons)}"
        )

        return {"product_analysis": product_analysis}

    except Exception as e:
        logger.error(f"✗ Analyze product node failed: {str(e)}")
        logger.warning("  Fallback: returning default analysis")
        return {"product_analysis": create_default_analysis()}
