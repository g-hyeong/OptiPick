"""SummarizePage 그래프 - 페이지 콘텐츠 요약 워크플로우"""

from langgraph.graph import StateGraph, END
from .state import SummarizePageState
from .nodes import ocr_node, filter_images_node


def create_graph() -> StateGraph:
    """
    SummarizePage 그래프 생성

    워크플로우:
    1. START -> ocr_node: 이미지에서 텍스트 추출
    2. ocr_node -> filter_images_node: LLM으로 유용한 이미지 필터링
    3. filter_images_node -> END: 완료

    Returns:
        StateGraph: 컴파일된 그래프
    """
    # StateGraph 생성
    workflow = StateGraph(SummarizePageState)

    # 노드 추가
    workflow.add_node("ocr", ocr_node)
    workflow.add_node("filter_images", filter_images_node)

    # 엣지 정의
    workflow.set_entry_point("ocr")
    workflow.add_edge("ocr", "filter_images")
    workflow.add_edge("filter_images", END)

    # 그래프 컴파일
    graph = workflow.compile()

    return graph


# LangGraph Studio 지원을 위한 export
__all__ = ["create_graph", "SummarizePageState"]
