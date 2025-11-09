"""페이지 검증 노드 - LLM을 사용하여 페이지가 제품 분석에 적합한지 검증하고 메인 제품 정보 추출"""

from src.config.base import BaseSettings
from src.prompts import validate_page
from src.prompts.validate_page import ValidationResult
from src.utils.html_parser import HTMLContentExtractor
from src.utils.llm.client import LLMClient
from src.utils.logger import get_logger

from ..state import ExtractedImage, ExtractedText, ParsedContent, SummarizePageState

logger = get_logger(__name__)
settings = BaseSettings()


async def validate_page_node(state: SummarizePageState) -> dict:
    """
    페이지가 제품 분석에 적합한지 검증하고 메인 제품 정보를 추출하는 노드

    Args:
        state: SummarizePageState

    Returns:
        dict: is_valid_page, validation_error, parsed_content 업데이트
    """
    try:
        url = state["url"]
        title = state["title"]
        html_body = state["html_body"]

        logger.info(f"━━━ Validate Page Node ━━━")
        logger.info(f"  URL: {url}")
        logger.info(f"  HTML body length: {len(html_body)} chars")

        # HTML에서 텍스트와 이미지 추출
        texts = HTMLContentExtractor.extract_texts(
            html_body=html_body, min_length=10, base_url=url
        )
        images = HTMLContentExtractor.extract_images(html_body=html_body, base_url=url)

        logger.info(f"  Extracted: {len(texts)} texts, {len(images)} images")

        # 입력 데이터 검증
        if not texts:
            logger.warning("  No text data available, marking as invalid")
            return {
                "is_valid_page": False,
                "validation_error": "제품 정보를 찾을 수 없습니다",
            }

        # 1. 프롬프트 구성
        messages = validate_page.build_messages(url, title, texts, images)

        # 2. LLM 호출 (structured output)
        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.3,  # 검증은 더 결정적이어야 하므로 낮은 temperature
            max_tokens=settings.default_max_tokens,
            timeout=settings.default_llm_timeout,
        )

        result: ValidationResult = await llm_client.invoke(
            messages=messages,
            output_format=ValidationResult,
        )

        logger.info(
            f"  Validation Result: {'✓ Valid' if result.is_valid else '✗ Invalid'}"
        )
        if not result.is_valid:
            logger.info(f"  Error Message: {result.error_message}")
            return {
                "is_valid_page": False,
                "validation_error": result.error_message,
            }

        # 유효한 경우: ValidationResult → ParsedContent 변환
        logger.info(f"  Product Name: {result.product_name}")
        logger.info(f"  Price: {result.price}")
        logger.info(
            f"  Extracted: {len(result.description_texts)} texts, {len(result.description_images)} images"
        )

        # Pydantic 모델 → TypedDict 변환
        parsed_texts: list[ExtractedText] = [
            ExtractedText(
                content=text.content,
                tagName=text.tagName,
                position=text.position,
            )
            for text in result.description_texts
        ]

        parsed_images: list[ExtractedImage] = [
            ExtractedImage(
                src=img.src,
                alt=img.alt,
                width=img.width,
                height=img.height,
                position=img.position,
            )
            for img in result.description_images
        ]

        parsed_content = ParsedContent(
            domain_type="generic",
            product_name=result.product_name,
            price=result.price,
            description_texts=parsed_texts,
            description_images=parsed_images,
        )

        return {
            "is_valid_page": True,
            "validation_error": "",
            "parsed_content": parsed_content,
        }

    except Exception as e:
        logger.error(f"✗ Validate page node failed: {str(e)}")
        logger.warning("  Fallback: marking page as invalid")
        return {
            "is_valid_page": False,
            "validation_error": "페이지 검증 중 오류가 발생했습니다",
        }
