"""CompareProducts 그래프 - HITL 기반 제품 비교 분석 워크플로우"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import CompareProductsState
from .nodes import (
    collect_user_criteria_node,
    analyze_products_node,
    collect_user_priorities_node,
    generate_report_node,
)


def create_graph() -> StateGraph:
    """
    CompareProducts 그래프 생성

    워크플로우:
    1. START -> collect_user_criteria (interrupt): 사용자 기준 입력 대기
    2. collect_user_criteria -> analyze_products: LLM으로 비교 기준 추출
    3. analyze_products -> collect_user_priorities (interrupt): 사용자 우선순위 입력 대기
    4. collect_user_priorities -> generate_report: LLM으로 최종 보고서 생성
    5. generate_report -> END: 완료

    HITL (Human-in-the-Loop):
    - collect_user_criteria: 사용자가 중요 기준 키워드 입력
    - collect_user_priorities: 사용자가 기준별 우선순위 입력

    Returns:
        StateGraph: 컴파일된 그래프 (MemorySaver checkpointer 포함)
    """
    # StateGraph 생성
    workflow = StateGraph(CompareProductsState)

    # 노드 추가
    workflow.add_node("collect_user_criteria", collect_user_criteria_node)
    workflow.add_node("analyze_products", analyze_products_node)
    workflow.add_node("collect_user_priorities", collect_user_priorities_node)
    workflow.add_node("generate_report", generate_report_node)

    # 엣지 정의
    workflow.set_entry_point("collect_user_criteria")
    workflow.add_edge("collect_user_criteria", "analyze_products")
    workflow.add_edge("analyze_products", "collect_user_priorities")
    workflow.add_edge("collect_user_priorities", "generate_report")
    workflow.add_edge("generate_report", END)

    # Checkpointer와 함께 컴파일 (HITL 지원)
    memory = MemorySaver()
    graph = workflow.compile(
        checkpointer=memory,
        interrupt_before=["collect_user_criteria", "collect_user_priorities"],
    )

    return graph


# LangGraph Studio 지원을 위한 export
__all__ = ["create_graph", "CompareProductsState"]
