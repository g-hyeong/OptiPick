"""챗봇 메인 노드 - LLM 호출 및 응답 생성"""

import os
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI, HarmBlockThreshold, HarmCategory

from src.config.base import BaseSettings
from src.utils.logger import get_logger
from src.prompts.chatbot import build_system_prompt
from ..state import ChatbotState

logger = get_logger(__name__)
settings = BaseSettings()


def _create_llm_with_search() -> ChatGoogleGenerativeAI:
    """Google Search grounding이 활성화된 Gemini LLM 생성

    Returns:
        ChatGoogleGenerativeAI 인스턴스
    """
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables")

    # Safety filters 해제
    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }

    return ChatGoogleGenerativeAI(
        model=settings.default_llm_model,
        api_key=google_api_key,
        temperature=0.7,
        safety_settings=safety_settings,
    )


def _extract_sources_from_response(response: Any) -> list[str]:
    """LLM 응답에서 출처 정보 추출

    Gemini Google Search grounding 사용 시 groundingMetadata에서 출처 추출

    Args:
        response: LLM 응답 객체

    Returns:
        출처 URL 또는 제목 목록
    """
    sources = []

    # grounding_metadata 확인 (Gemini 검색 결과)
    if hasattr(response, "response_metadata"):
        metadata = response.response_metadata
        grounding_metadata = metadata.get("grounding_metadata", {})

        # 검색 결과에서 출처 추출
        search_entry_point = grounding_metadata.get("search_entry_point", {})
        web_search_queries = grounding_metadata.get("web_search_queries", [])

        # grounding_chunks에서 URL 추출
        grounding_chunks = grounding_metadata.get("grounding_chunks", [])
        for chunk in grounding_chunks:
            web_info = chunk.get("web", {})
            if "uri" in web_info:
                sources.append(web_info["uri"])
            elif "title" in web_info:
                sources.append(web_info["title"])

        # grounding_supports에서도 추출 시도
        grounding_supports = grounding_metadata.get("grounding_supports", [])
        for support in grounding_supports:
            for chunk_idx in support.get("grounding_chunk_indices", []):
                if chunk_idx < len(grounding_chunks):
                    chunk = grounding_chunks[chunk_idx]
                    web_info = chunk.get("web", {})
                    if "uri" in web_info and web_info["uri"] not in sources:
                        sources.append(web_info["uri"])

    return sources[:5]  # 최대 5개 출처만 반환


async def chat_node(state: ChatbotState) -> dict:
    """
    챗봇 메인 노드 - 사용자 메시지에 대한 응답 생성

    Gemini LLM을 사용하여 제품 정보 기반 답변을 생성합니다.
    필요시 Google Search grounding을 통해 웹 검색 결과를 활용합니다.

    Args:
        state: ChatbotState (messages, products, category 포함)

    Returns:
        messages: 새로운 AI 메시지
        sources: 참조한 출처 목록
    """
    logger.info("━━━ Chat Node ━━━")

    try:
        # State에서 데이터 추출
        messages = state.get("messages", [])
        products = state.get("products", [])
        category = state.get("category", "제품")

        logger.info(f"  Category: {category}")
        logger.info(f"  Products: {len(products)}")
        logger.info(f"  Messages: {len(messages)}")

        if not messages:
            logger.warning("  No messages to process")
            return {
                "messages": [AIMessage(content="무엇이든 물어보세요!")],
                "sources": [],
            }

        # 시스템 프롬프트 생성
        system_prompt = build_system_prompt(category, products)
        logger.debug(f"  System prompt length: {len(system_prompt)} chars")

        # 메시지 목록 구성 (시스템 프롬프트 + 대화 히스토리)
        full_messages = [SystemMessage(content=system_prompt)] + list(messages)

        # 대화 히스토리 길이 제한 (최근 20개 메시지만 유지)
        MAX_HISTORY = 20
        if len(full_messages) > MAX_HISTORY + 1:  # +1 for system message
            full_messages = [full_messages[0]] + full_messages[-(MAX_HISTORY):]
            logger.info(f"  Trimmed messages to {len(full_messages)}")

        # LLM 생성 (Google Search grounding 포함)
        llm = _create_llm_with_search()

        # Google Search tool 추가
        # Gemini 2.0 이상에서는 google_search tool 사용
        try:
            from google.ai.generativelanguage_v1beta.types import Tool as GenAITool

            tools = [GenAITool(google_search={})]
            logger.info("  Google Search grounding enabled")
        except ImportError:
            logger.warning("  Google Search grounding not available, using LLM only")
            tools = None

        # LLM 호출
        logger.info("  Calling LLM...")
        if tools:
            response = await llm.ainvoke(full_messages, tools=tools)
        else:
            response = await llm.ainvoke(full_messages)

        # 응답 내용 추출
        response_content = response.content if hasattr(response, "content") else str(response)
        logger.info(f"  Response length: {len(response_content)} chars")

        # 출처 추출
        sources = _extract_sources_from_response(response)
        if sources:
            logger.info(f"  Sources: {len(sources)} items")
            for src in sources:
                logger.debug(f"    - {src}")

        # 제품명을 출처에 추가 (제품 정보 기반 답변인 경우)
        product_names = [p.get("product_name", "") for p in products]
        for name in product_names:
            if name and name.lower() in response_content.lower():
                if name not in sources:
                    sources.append(name)

        return {
            "messages": [AIMessage(content=response_content)],
            "sources": sources[:10],  # 최대 10개
        }

    except Exception as e:
        logger.error(f"  Chat node failed: {str(e)}", exc_info=True)
        error_message = "죄송합니다. 응답 생성 중 오류가 발생했습니다. 다시 시도해 주세요."
        return {
            "messages": [AIMessage(content=error_message)],
            "sources": [],
        }
