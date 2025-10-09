"""제품 분석 노드 - LLM을 사용하여 텍스트와 이미지 정보로부터 제품 분석 수행"""

from typing import List

from pydantic import BaseModel, Field

from src.config.base import BaseSettings
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


def build_analysis_prompt(
    texts: List[ExtractedText], images: List[ExtractedImage]
) -> List[dict]:
    """제품 분석을 위한 프롬프트 구성"""

    # System prompt
    system_prompt = """You are an expert product analyst specializing in e-commerce and product comparison.

Your task is to analyze product information from web page content (texts and images) and provide a comprehensive, objective, and fact-based product analysis.

**Analysis Guidelines:**

1. **Be fact-based and objective**: Base your analysis ONLY on the provided information. Do not make assumptions or add external knowledge.

2. **Handle missing information**: If specific information is not provided in the input:
   - For string fields (product_name, summary, price, recommended_for): return "unknown"
   - For list fields (key_features, pros, cons, recommendation_reasons, not_recommended_reasons): return empty array []

3. **Extraction priorities**:
   - Product name: Look for prominent product titles, H1/H2 headings
   - Price: Extract exact price with currency symbol (keep original format)
   - Key features: Technical specifications, product attributes, highlights
   - Pros/Cons: Customer reviews, expert opinions, comparison points
   - Recommendations: Target audience mentions, use case descriptions

4. **Quality standards**:
   - Be concise but informative
   - Use clear, professional language
   - Maintain consistency in terminology
   - Focus on actionable insights

5. **Examples of "unknown" cases**:
   - Product name not clearly stated → "unknown"
   - No price information on page → "unknown"
   - Cannot determine target audience → "unknown"
   - No clear pros/cons mentioned → empty array

Remember: It's better to return "unknown" or empty arrays than to guess or fabricate information."""

    # 텍스트 정보 구조화 (position 순으로 정렬)
    sorted_texts = sorted(texts, key=lambda t: t.get("position", 0))
    text_contents = []
    for text in sorted_texts:
        tag = text.get("tagName", "p")
        content = text.get("content", "").strip()
        if content:
            text_contents.append(f"[{tag}] {content}")

    # 이미지 정보 구조화
    image_contents = []
    for idx, img in enumerate(images):
        alt = img.get("alt", "").strip()
        ocr = img.get("ocr_result", "").strip()

        if alt or ocr:
            image_info = f"Image {idx + 1}:"
            if alt:
                image_info += f"\n  Alt text: {alt}"
            if ocr:
                image_info += f"\n  OCR text: {ocr}"
            image_contents.append(image_info)

    # User prompt
    user_prompt = f"""Analyze the following product page information and extract product analysis.

**Text Information:**
{chr(10).join(text_contents) if text_contents else "[No text information available]"}

**Image Information:**
{chr(10).join(image_contents) if image_contents else "[No image information available]"}

Based on the above information, provide a comprehensive product analysis. If any information is missing or unclear, use "unknown" for string fields or empty arrays for list fields."""

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


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

        logger.info(
            f"Analyze product node started",
            extra={
                "text_count": len(texts),
                "image_count": len(valid_images),
            },
        )

        # 입력 데이터 검증
        if not texts and not valid_images:
            logger.warning("No text or image data available for analysis")
            return {"product_analysis": create_default_analysis()}

        # 1. 프롬프트 구성
        messages = build_analysis_prompt(texts, valid_images)

        # 2. LLM 호출 (structured output)
        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.5,  # 창의성과 일관성의 균형
            max_tokens=settings.default_max_tokens,
            timeout=settings.default_llm_timeout,
        )

        logger.info(
            "Invoking LLM for product analysis",
            extra={
                "provider": settings.default_llm_provider,
                "model": settings.default_llm_model,
            },
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
            "Product analysis completed",
            extra={
                "product_name": result.product_name,
                "has_price": result.price != "unknown",
                "features_count": len(result.key_features),
                "pros_count": len(result.pros),
                "cons_count": len(result.cons),
            },
        )

        return {"product_analysis": product_analysis}

    except Exception as e:
        # 예상치 못한 오류 발생 시 기본값 반환
        logger.error(
            f"Unexpected error in analyze product node: {str(e)}, returning default analysis"
        )
        return {"product_analysis": create_default_analysis()}
