"""Chatbot 그래프의 State 정의"""

from typing import TypedDict, Annotated
from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage


class ProductContext(TypedDict):
    """챗봇 컨텍스트로 제공되는 제품 정보"""

    product_name: str  # 제품명
    price: str  # 가격
    raw_content: str  # 원본 텍스트 콘텐츠 (LLM input으로 사용)


class ChatbotState(TypedDict, total=False):
    """
    Chatbot 그래프의 State

    LangGraph의 add_messages reducer를 사용하여 메시지 히스토리 자동 관리
    """

    # 대화 히스토리 (add_messages reducer로 자동 병합)
    messages: Annotated[list[BaseMessage], add_messages]

    # 세션 초기화 시 설정되는 컨텍스트 (immutable)
    products: list[ProductContext]  # 비교 대상 제품들
    category: str  # 제품 카테고리

    # 응답 메타데이터
    sources: list[str]  # 참조한 출처 (제품명 또는 검색 URL)
