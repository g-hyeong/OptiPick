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
        parsed_content = state["parsed_content"]
        images = state.get("images", [])  # OCR 결과가 포함된 이미지
        domain_type = parsed_content.get("domain_type", "generic")

        logger.info(f"━━━ Analyze Product Node ━━━")
        logger.info(f"  Domain Type: {domain_type}")

        # 1. parsed_content에서 텍스트 추출
        if domain_type == "generic":
            # Generic 파서: texts 필드 사용
            texts = parsed_content.get("texts", [])
            logger.info(f"  Input (Generic): {len(texts)} texts, {len(images)} images")
        else:
            # 도메인 특화 파서: 구조화된 데이터를 ExtractedText 형태로 변환
            texts = []

            # 제품명 추가 (h1 태그로)
            product_name = parsed_content.get("product_name", "")
            if product_name and product_name != "TODO":
                texts.append(
                    {"content": f"제품명: {product_name}", "tagName": "h1", "position": 0}
                )

            # 가격 추가 (h2 태그로)
            price = parsed_content.get("price", "")
            if price and price != "TODO":
                texts.append({"content": f"가격: {price}", "tagName": "h2", "position": 100})

            # 텍스트 설명/특징 추가
            # description_texts는 이제 list[ExtractedText] 형식
            description_texts = parsed_content.get("description_texts", [])
            texts.extend(description_texts)

            # 도메인 특화 파서의 경우 images는 이미 OCR이 수행된 상태
            # parsed_content의 description_images와 state의 images는 동일

            logger.info(
                f"  Input (Domain-specific): {len(texts)} structured texts, {len(images)} images"
            )

        # 입력 데이터 검증
        if not texts and not images:
            logger.warning("  No data available, returning default analysis")
            return {"product_analysis": create_default_analysis()}

        # 2. 프롬프트 구성
        messages = analyze_product.build_messages(texts, images)

        # 3. LLM 호출 (structured output)
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

        # 4. Pydantic 모델을 TypedDict로 변환
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
