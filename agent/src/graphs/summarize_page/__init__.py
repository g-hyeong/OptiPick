"""SummarizePage 그래프 - 페이지 콘텐츠 요약 워크플로우"""

from langgraph.graph import StateGraph, END
from .state import SummarizePageState
from .nodes import (
    validate_page_node,
    domain_parser_node,
    ocr_node,
    filter_images_node,
    analyze_product_node,
)


def should_continue_after_validation(state: SummarizePageState) -> str:
    """
    페이지 검증 후 워크플로우 계속 여부 결정

    Args:
        state: SummarizePageState

    Returns:
        str: "continue" 또는 "end"
    """
    if not state.get("is_valid_page", False):
        return "end"
    return "continue"


def create_graph() -> StateGraph:
    """
    SummarizePage 그래프 생성

    워크플로우:
    1. START -> validate_page: 페이지 적합성 검증
    2. validate_page -> (조건부)
        - 검증 실패 시 -> END (에러 메시지 포함)
        - 검증 성공 시 -> domain_parser
    3. domain_parser -> ocr: 도메인별 콘텐츠 파싱
    4. ocr -> filter_images: 이미지에서 텍스트 추출
    5. filter_images -> analyze_product: LLM으로 유용한 이미지 필터링
    6. analyze_product -> END: 제품 정보 분석

    Returns:
        StateGraph: 컴파일된 그래프
    """
    # StateGraph 생성
    workflow = StateGraph(SummarizePageState)

    # 노드 추가
    workflow.add_node("validate_page", validate_page_node)
    workflow.add_node("domain_parser", domain_parser_node)
    workflow.add_node("ocr", ocr_node)
    workflow.add_node("filter_images", filter_images_node)
    workflow.add_node("analyze_product", analyze_product_node)

    # 엣지 정의
    workflow.set_entry_point("validate_page")

    # 조건부 엣지: 검증 결과에 따라 분기
    workflow.add_conditional_edges(
        "validate_page",
        should_continue_after_validation,
        {
            "continue": "domain_parser",
            "end": END,
        },
    )

    # 일반 엣지
    workflow.add_edge("domain_parser", "ocr")
    workflow.add_edge("ocr", "filter_images")
    workflow.add_edge("filter_images", "analyze_product")
    workflow.add_edge("analyze_product", END)

    # 그래프 컴파일
    graph = workflow.compile()

    return graph


# LangGraph Studio 지원을 위한 export
__all__ = ["create_graph", "SummarizePageState"]
