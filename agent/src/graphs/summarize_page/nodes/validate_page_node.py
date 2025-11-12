"""페이지 검증 노드 - LLM을 사용하여 페이지가 제품 분석에 적합한지 검증"""

from datetime import datetime
from pathlib import Path

from src.config.base import BaseSettings
from src.prompts import validate_page
from src.prompts.validate_page import ValidationResult
from src.utils.html_parser import HTMLContentExtractor
from src.utils.llm.client import LLMClient
from src.utils.logger import get_logger

from ..state import ParsedContent, SummarizePageState

logger = get_logger(__name__)
settings = BaseSettings()

# logs 디렉토리 경로 (agent/logs/)
LOGS_DIR = Path(__file__).parent.parent.parent.parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)


async def validate_page_node(state: SummarizePageState) -> dict:
    """
    페이지가 제품 분석에 적합한지 검증하는 노드 (검증 전용)

    1. LLM으로 페이지 검증 (is_valid, error_message만 반환)
    2. 유효한 경우, HTMLContentExtractor로 texts와 images 추출
    3. ParsedContent에 저장하여 다음 노드로 전달

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

        # 디버깅: Readability로 추출된 HTML을 logs/YYYY-MM-DD/parsed.html에 저장
        today = datetime.now().strftime("%Y-%m-%d")
        date_dir = LOGS_DIR / today
        date_dir.mkdir(exist_ok=True)

        parsed_html_path = date_dir / "parsed.html"
        with open(parsed_html_path, "w", encoding="utf-8") as f:
            f.write(f"<!-- URL: {url} -->\n")
            f.write(f"<!-- Title: {title} -->\n")
            f.write(f"<!-- Timestamp: {datetime.now().isoformat()} -->\n\n")
            f.write(html_body)
        logger.info(f"  Saved parsed HTML to: {parsed_html_path}")

        # 입력 데이터 검증
        if not html_body or len(html_body.strip()) < 100:
            logger.warning("  HTML body too short or empty, marking as invalid")
            return {
                "is_valid_page": False,
                "validation_error": "제품 정보를 찾을 수 없습니다",
            }

        # 1. LLM으로 페이지 검증
        messages = validate_page.build_messages(url, title, html_body)

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
                "is_valid_page": False,
                "validation_error": result.error_message,
            }

        # 2. 유효한 경우: HTMLContentExtractor로 texts와 images 추출
        logger.info("  Extracting texts and images using HTMLContentExtractor...")

        texts = HTMLContentExtractor.extract_texts(
            html_body=html_body,
            min_length=10,
            base_url=url,
        )

        images = HTMLContentExtractor.extract_images(
            html_body=html_body,
            base_url=url,
            min_width=100,
            min_height=100,
        )

        logger.info(f"  Extracted: {len(texts)} texts, {len(images)} images")

        # 3. ParsedContent 구성
        parsed_content = ParsedContent(
            domain_type="generic",
            texts=texts,
        )

        return {
            "is_valid_page": True,
            "validation_error": "",
            "parsed_content": parsed_content,
            "images": images,  # State에 images 직접 저장
        }

    except Exception as e:
        logger.error(f"✗ Validate page node failed: {str(e)}")
        logger.warning("  Fallback: marking page as invalid")
        return {
            "is_valid_page": False,
            "validation_error": "페이지 검증 중 오류가 발생했습니다",
        }
