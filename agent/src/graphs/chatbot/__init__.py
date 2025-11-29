"""Chatbot 그래프 - 제품 비교 페이지 챗봇 워크플로우"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import ChatbotState, ProductContext
from .nodes import chat_node

# 모듈 레벨 싱글톤 Checkpointer
# 모든 그래프 인스턴스가 동일한 메모리를 공유하여 thread_id로 상태 추적 가능
_CHECKPOINTER = MemorySaver()


def create_graph() -> StateGraph:
    """
    Chatbot 그래프 생성

    워크플로우:
    1. START -> chat_node: 사용자 메시지 처리 및 응답 생성
    2. chat_node -> END: 완료

    특징:
    - 단일 노드 구조: LLM이 자체적으로 제품 정보/웹 검색 판단
    - MemorySaver: 세션 기반 대화 히스토리 유지
    - Google Search grounding: 일반 지식 질문 시 웹 검색 활용

    Returns:
        StateGraph: 컴파일된 그래프 (MemorySaver checkpointer 포함)
    """
    # StateGraph 생성
    workflow = StateGraph(ChatbotState)

    # 노드 추가
    workflow.add_node("chat", chat_node)

    # 엣지 정의
    workflow.set_entry_point("chat")
    workflow.add_edge("chat", END)

    # Checkpointer와 함께 컴파일
    graph = workflow.compile(checkpointer=_CHECKPOINTER)

    return graph


def get_checkpointer() -> MemorySaver:
    """싱글톤 checkpointer 반환 (API에서 상태 조회용)"""
    return _CHECKPOINTER


# LangGraph Studio 지원을 위한 export
__all__ = ["create_graph", "get_checkpointer", "ChatbotState", "ProductContext"]
