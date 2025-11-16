"""HTML 파싱 노드 - HTML에서 texts와 images를 추출"""

from datetime import datetime
from pathlib import Path

from src.utils.html_parser import HTMLContentExtractor
from src.utils.logger import get_logger

from ..state import ParsedContent, SummarizePageState

logger = get_logger(__name__)

# logs 디렉토리 경로 (agent/logs/)
LOGS_DIR = Path(__file__).parent.parent.parent.parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)


async def parse_content_node(state: SummarizePageState) -> dict:
    """
    HTML body에서 texts와 images를 추출하는 노드

    HTMLContentExtractor를 사용하여:
    - texts: Leaf node 방식으로 추출 (중복 자동 제거)
    - images: 모든 이미지 추출

    Args:
        state: SummarizePageState

    Returns:
        dict: parsed_content, images 업데이트
    """
    try:
        url = state["url"]
        title = state["title"]
        html_body = state["html_body"]

        logger.info(f"━━━ Parse Content Node ━━━")
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

        # 1. texts 추출 (Leaf Node 방식)
        texts = HTMLContentExtractor.extract_texts(
            html_body=html_body,
            min_length=0,  # 길이 제한 제거하여 가격 등 짧은 텍스트 포함
            base_url=url,
        )

        # 2. images 추출
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
            "parsed_content": parsed_content,
            "images": images,
        }

    except Exception as e:
        logger.error(f"✗ Parse content node failed: {str(e)}")
        logger.warning("  Fallback: marking page as invalid")
        return {
            "is_valid_page": False,
            "validation_error": "페이지 파싱 중 오류가 발생했습니다",
        }
