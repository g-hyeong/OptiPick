"""도메인 파서 노드 - URL에 맞는 도메인별 파서를 선택하여 콘텐츠 파싱"""

from src.utils.logger import get_logger

from ..domain_parsers import get_parser_registry
from ..state import SummarizePageState, ParsedContent

logger = get_logger(__name__)


async def domain_parser_node(state: SummarizePageState) -> dict:
    """
    도메인 특화 파서를 사용하여 페이지 콘텐츠를 검증하고 파싱하는 노드

    Args:
        state: SummarizePageState

    Returns:
        dict: is_valid_page, validation_error, parsed_content 업데이트
    """
    try:
        url = state["url"]
        title = state["title"]
        html_body = state["html_body"]

        logger.info(f"━━━ Domain Parser Node ━━━")
        logger.info(f"  URL: {url}")
        logger.info(f"  HTML body length: {len(html_body)} chars")

        # 1. 파서 레지스트리에서 적절한 파서 선택
        registry = get_parser_registry()
        parser = registry.get_parser(url)

        logger.info(f"  Selected Parser: {parser.domain_type}")

        # 2. 파서 실행
        parsed_content: ParsedContent = parser.parse(
            url=url, title=title, html_body=html_body
        )

        logger.info(f"  Output: domain_type={parsed_content.get('domain_type')}")

        # 3. 파싱 결과 로깅 (도메인별로 다른 필드)
        logger.info(f"    Product Name: {parsed_content.get('product_name', 'N/A')}")
        logger.info(f"    Price: {parsed_content.get('price', 'N/A')}")
        logger.info(
            f"    Description texts: {len(parsed_content.get('description_texts', []))} items"
        )
        logger.info(
            f"    Description images: {len(parsed_content.get('description_images', []))} items"
        )

        # 4. 도메인 특화 파서는 검증을 통과한 것으로 간주
        # description_images를 images 필드로도 전달 (OCR 노드에서 사용)
        return {
            "is_valid_page": True,
            "validation_error": "",
            "parsed_content": parsed_content,
            "images": parsed_content.get("description_images", []),
        }

    except Exception as e:
        logger.error(f"✗ Domain parser node failed: {str(e)}")
        logger.warning("  Fallback: marking as invalid")

        # Fallback: 검증 실패 처리
        return {
            "is_valid_page": False,
            "validation_error": "도메인 파서 처리 중 오류가 발생했습니다",
        }
