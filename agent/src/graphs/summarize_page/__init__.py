"""SummarizePage 그래프 - 페이지 콘텐츠 요약 워크플로우"""

from langgraph.graph import StateGraph, END
from .state import SummarizePageState
from .nodes import ocr_node


def create_graph() -> StateGraph:
    """
    SummarizePage 그래프 생성

    워크플로우:
    1. START -> ocr_node: 이미지에서 텍스트 추출
    2. ocr_node -> END: 완료

    Returns:
        StateGraph: 컴파일된 그래프
    """
    # StateGraph 생성
    workflow = StateGraph(SummarizePageState)

    # 노드 추가
    workflow.add_node("ocr", ocr_node)

    # 엣지 정의
    workflow.set_entry_point("ocr")
    workflow.add_edge("ocr", END)

    # 그래프 컴파일
    graph = workflow.compile()

    return graph


# LangGraph Studio 지원을 위한 export
__all__ = ["create_graph", "SummarizePageState"]
