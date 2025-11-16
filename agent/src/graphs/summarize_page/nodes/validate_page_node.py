"""페이지 검증 노드 - LLM을 사용하여 texts CSV로 페이지가 제품 분석에 적합한지 검증"""

from src.config.base import BaseSettings
from src.prompts import validate_page
from src.prompts.validate_page import ValidationResult
from src.utils.llm.client import LLMClient
from src.utils.logger import get_logger

from ..state import SummarizePageState

logger = get_logger(__name__)
settings = BaseSettings()


async def validate_page_node(state: SummarizePageState) -> dict:
    """
    페이지가 제품 분석에 적합한지 검증하는 노드 (CSV 입력 방식)

    parse_content_node에서 추출된 texts를 CSV 형식으로 LLM에 전달하여
    단일 제품 상세 페이지인지 검증합니다.

    Args:
        state: SummarizePageState (parsed_content 필요)

    Returns:
        dict: is_valid_page, validation_error 업데이트
    """
    try:
        url = state["url"]
        title = state["title"]
        parsed_content = state.get("parsed_content", {})
        texts = parsed_content.get("texts", [])

        logger.info(f"━━━ Validate Page Node ━━━")
        logger.info(f"  URL: {url}")
        logger.info(f"  Input: {len(texts)} texts")

        # 입력 데이터 검증
        if not texts or len(texts) < 3:
            logger.warning("  Too few texts, marking as invalid")
            return {
                "is_valid_page": False,
                "validation_error": "제품 정보를 찾을 수 없습니다",
            }

        # LLM으로 페이지 검증 (CSV 입력)
        messages = validate_page.build_messages(url, title, texts)

        llm_client = LLMClient(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
            temperature=0.3,  # 검증은 결정적이어야 하므로 낮은 temperature
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
