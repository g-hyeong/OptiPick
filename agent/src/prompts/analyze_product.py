"""제품 분석 프롬프트 템플릿

LLM을 사용하여 텍스트와 이미지 정보로부터 제품을 분석하기 위한 프롬프트
"""

from typing import List

from ..graphs.summarize_page.state import ExtractedImage, ExtractedText


# ============================================================================
# SYSTEM PROMPT
# ============================================================================

SYSTEM_PROMPT = """You are an expert product analyst specializing in e-commerce and product comparison.

Your task is to analyze product information from web page content (texts and images) and provide a comprehensive, objective, and fact-based product analysis.

# IMPORTANT: ALL TEXT OUTPUT MUST BE IN KOREAN
- All analysis results must be written in Korean (한국어)
- Product names, summaries, features, pros/cons, recommendations must all be in Korean
- Only technical specifications and brand names can remain in English if necessary

# ANALYSIS GUIDELINES:

## 1. Be Fact-Based and Objective
Base your analysis ONLY on the provided information. Do not make assumptions or add external knowledge.

## 2. Handle Missing Information
If specific information is not provided in the input:
- For string fields (product_name, summary, price, recommended_for): return "unknown"
- For list fields (key_features, pros, cons, recommendation_reasons, not_recommended_reasons): return empty array []

## 3. Extraction Priorities
- **Product name:** Look for prominent product titles, H1/H2 headings
- **Price:** Extract exact price with currency symbol (keep original format)
- **Key features:** Technical specifications, product attributes, highlights
- **Pros/Cons:** Customer reviews, expert opinions, comparison points
- **Recommendations:** Target audience mentions, use case descriptions

## 4. Quality Standards
- Be concise but informative
- Use clear, professional language
- Maintain consistency in terminology
- Focus on actionable insights

## 5. Examples of "unknown" Cases
- Product name not clearly stated → "unknown"
- No price information on page → "unknown"
- Cannot determine target audience → "unknown"
- No clear pros/cons mentioned → empty array

# IMPORTANT:
It's better to return "unknown" or empty arrays than to guess or fabricate information.

# OUTPUT FORMAT:
You must return a JSON object with the following structure:
{
  "product_name": "string",
  "summary": "string",
  "price": "string",
  "key_features": ["string"],
  "pros": ["string"],
  "cons": ["string"],
  "recommended_for": "string",
  "recommendation_reasons": ["string"],
  "not_recommended_reasons": ["string"]
}"""


# ============================================================================
# USER PROMPT TEMPLATE
# ============================================================================

def build_user_prompt(texts: List[ExtractedText], images: List[ExtractedImage]) -> str:
    """사용자 프롬프트 생성

    Args:
        texts: 추출된 텍스트 리스트
        images: 추출된 이미지 리스트

    Returns:
        사용자 프롬프트 문자열
    """
    # 텍스트 정보 구조화 (position 순으로 정렬, content와 position만 사용)
    sorted_texts = sorted(texts, key=lambda t: t.get("position", 0))
    text_contents = []
    for text in sorted_texts:
        content = text.get("content", "").strip()
        position = text.get("position", 0)
        if content:
            text_contents.append(f"[pos:{position}] {content}")

    # 이미지 정보 구조화 (alt, position, ocr_result만 사용)
    image_contents = []
    for idx, img in enumerate(images):
        alt = img.get("alt", "").strip()
        ocr = img.get("ocr_result", "").strip()
        position = img.get("position", 0)

        if alt or ocr:
            image_info = f"Image {idx + 1} [pos:{position}]:"
            if alt:
                image_info += f"\n  Alt: {alt}"
            if ocr:
                image_info += f"\n  OCR: {ocr}"
            image_contents.append(image_info)

    return f"""Analyze the following product page information and extract product analysis.

**Text Information:**
{chr(10).join(text_contents) if text_contents else "[No text information available]"}

**Image Information:**
{chr(10).join(image_contents) if image_contents else "[No image information available]"}

Based on the above information, provide a comprehensive product analysis. If any information is missing or unclear, use "unknown" for string fields or empty arrays for list fields."""


# ============================================================================
# PROMPT BUILDER
# ============================================================================

def build_messages(texts: List[ExtractedText], images: List[ExtractedImage]) -> List[dict]:
    """LangChain 메시지 형식으로 프롬프트 구성

    Args:
        texts: 추출된 텍스트 리스트
        images: 추출된 이미지 리스트

    Returns:
        메시지 리스트 [{"role": "system", "content": ...}, {"role": "user", "content": ...}]
    """
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(texts, images)},
    ]
