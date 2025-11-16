"""SummarizePage 그래프 - 페이지 콘텐츠 요약 워크플로우"""

from langgraph.graph import END, StateGraph

from .domain_parsers import get_parser_registry
from .nodes import (
    analyze_product_node,
    domain_parser_node,
    ocr_node,
    parse_content_node,
    validate_page_node,
)
from .state import SummarizePageState


def route_by_domain(state: SummarizePageState) -> str:
    """
    URL을 기반으로 도메인 체크하여 라우팅

    Args:
        state: SummarizePageState

    Returns:
        str: "domain_specific" 또는 "generic"
    """
    url = state.get("url", "")
    registry = get_parser_registry()
    parser = registry.get_parser(url)

    # generic 파서가 아니면 도메인 특화 파서 사용
    if parser.domain_type != "generic":
        return "domain_specific"
    return "generic"


def should_continue_after_parsing(state: SummarizePageState) -> str:
    """
    파싱(validation 또는 domain_parser) 후 워크플로우 계속 여부 결정

    Args:
        state: SummarizePageState

    Returns:
        str: "continue" 또는 "end"
    """
    if not state.get("is_valid_page", False):
        return "end"
    return "continue"


def route_node(state: SummarizePageState) -> dict:
    """라우팅 전용 노드 - state를 변경하지 않음"""
    return {}


def create_graph() -> StateGraph:
    """
    SummarizePage 그래프 생성

    워크플로우:
    1. START -> route: 도메인 체크
    2. route -> (조건부 분기)
        - 특정 도메인 (쿠팡, 네이버 등) -> domain_parser (검증 + 파싱)
        - 일반 페이지 -> parse_content (HTML 파싱)
    3. parse_content -> validate_page (CSV 검증)
    4. validation/domain_parser -> (조건부)
        - 검증 실패 -> END
        - 검증 성공 -> ocr
    5. ocr -> analyze_product: 이미지 OCR 수행
    6. analyze_product -> END: 제품 정보 분석

    Returns:
        StateGraph: 컴파일된 그래프
    """
    # StateGraph 생성
    workflow = StateGraph(SummarizePageState)

    # 노드 추가
    workflow.add_node("route", route_node)
    workflow.add_node("parse_content", parse_content_node)
    workflow.add_node("validate_page", validate_page_node)
    workflow.add_node("domain_parser", domain_parser_node)
    workflow.add_node("ocr", ocr_node)
    workflow.add_node("analyze_product", analyze_product_node)

    # 엣지 정의
    workflow.set_entry_point("route")

    # 1. 도메인 기반 라우팅
    workflow.add_conditional_edges(
        "route",
        route_by_domain,
        {
            "domain_specific": "domain_parser",
            "generic": "parse_content",
        },
    )

    # 2. parse_content -> validate_page (일반 경로)
    workflow.add_edge("parse_content", "validate_page")

    # 3. validation 후 조건부 분기
    workflow.add_conditional_edges(
        "validate_page",
        should_continue_after_parsing,
        {
            "continue": "ocr",
            "end": END,
        },
    )

    # 4. domain_parser 후 조건부 분기
    workflow.add_conditional_edges(
        "domain_parser",
        should_continue_after_parsing,
        {
            "continue": "ocr",
            "end": END,
        },
    )

    # 4. 일반 엣지
    workflow.add_edge("ocr", "analyze_product")
    workflow.add_edge("analyze_product", END)

    # 그래프 컴파일
    graph = workflow.compile()

    return graph


# LangGraph Studio 지원을 위한 export
__all__ = ["create_graph", "SummarizePageState"]
