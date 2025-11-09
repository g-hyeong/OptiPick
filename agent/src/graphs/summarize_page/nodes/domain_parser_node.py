"""도메인 파서 노드 - URL에 맞는 도메인별 파서를 선택하여 콘텐츠 파싱"""

from src.utils.logger import get_logger

from ..domain_parsers import get_parser_registry
from ..state import SummarizePageState, ParsedContent

logger = get_logger(__name__)


async def domain_parser_node(state: SummarizePageState) -> dict:
    """
    도메인별 파서를 선택하여 페이지 콘텐츠를 파싱하는 노드

    Args:
        state: SummarizePageState

    Returns:
        dict: parsed_content 업데이트
    """
    try:
        url = state["url"]
        title = state["title"]
        raw_texts = state["raw_texts"]
        images = state["images"]

        logger.info(f"━━━ Domain Parser Node ━━━")
        logger.info(f"  URL: {url}")

        # 1. 파서 레지스트리에서 적절한 파서 선택
        registry = get_parser_registry()
        parser = registry.get_parser(url)

        logger.info(f"  Selected Parser: {parser.domain_type}")
        logger.info(f"  Input: {len(raw_texts)} texts, {len(images)} images")

        # 2. 파서 실행
        parsed_content: ParsedContent = parser.parse(
            url=url, title=title, texts=raw_texts, images=images
        )

        logger.info(f"  Output: domain_type={parsed_content.get('domain_type')}")

        # 3. 파싱 결과 로깅 (도메인별로 다른 필드)
        if parsed_content.get("domain_type") == "generic":
            logger.info(f"    Generic: {len(parsed_content.get('texts', []))} processed texts")
        else:
            logger.info(f"    Product Name: {parsed_content.get('product_name', 'N/A')}")
            logger.info(f"    Price: {parsed_content.get('price', 'N/A')}")
            logger.info(
                f"    Specifications: {len(parsed_content.get('specifications', {}))} items"
            )

        return {"parsed_content": parsed_content}

    except Exception as e:
        logger.error(f"✗ Domain parser node failed: {str(e)}")
        logger.warning("  Fallback: using empty parsed content")

        # Fallback: 빈 generic 파싱 결과 반환
        return {
            "parsed_content": ParsedContent(
                domain_type="generic",
                texts=[],
            )
        }
