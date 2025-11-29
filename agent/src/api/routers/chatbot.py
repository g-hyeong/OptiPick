"""Chatbot 그래프 라우터"""

import json
import uuid
import time
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessage

from src.exceptions.base import ConfigurationError
from src.graphs.chatbot import create_graph, get_checkpointer
from src.prompts.chatbot import build_welcome_message
from src.utils.logger import get_logger

from ..schemas import (
    ChatbotStartRequest,
    ChatbotStartResponse,
    ChatbotMessageRequest,
    ChatbotMessageResponse,
    ChatbotHistoryResponse,
    ChatMessageSchema,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/graphs", tags=["graphs"])


@router.post("/chatbot/start", response_model=ChatbotStartResponse)
async def start_chatbot(request: ChatbotStartRequest):
    """
    챗봇 세션 시작

    제품 컨텍스트를 초기화하고 thread_id를 생성합니다.

    Returns:
        - thread_id: 세션 ID
        - welcome_message: 환영 메시지
    """
    start_time = time.time()
    thread_id = str(uuid.uuid4())

    try:
        logger.info(
            "Chatbot session start requested",
            extra={
                "thread_id": thread_id,
                "category": request.category,
                "product_count": len(request.products),
            },
        )

        # 그래프 생성
        graph = create_graph()

        # Config 생성 (thread_id 포함)
        config = {"configurable": {"thread_id": thread_id}}

        # 제품 컨텍스트를 State에 저장
        products_context = [product.model_dump() for product in request.products]

        # 초기 상태 설정 (빈 메시지로 그래프 실행하여 state 초기화)
        initial_state = {
            "messages": [],
            "products": products_context,
            "category": request.category,
            "sources": [],
        }

        # State 업데이트 (checkpointer에 초기 상태 저장)
        await graph.aupdate_state(config, initial_state)

        # 환영 메시지 생성
        welcome_message = build_welcome_message(request.category, products_context)

        execution_time = time.time() - start_time
        logger.info(
            "Chatbot session started",
            extra={
                "thread_id": thread_id,
                "execution_time_seconds": round(execution_time, 2),
            },
        )

        return ChatbotStartResponse(
            thread_id=thread_id,
            welcome_message=welcome_message,
        )

    except ConfigurationError as e:
        logger.critical(f"Configuration error: {e.message}", extra=e.details)
        raise HTTPException(status_code=500, detail=f"Configuration error: {e.message}")

    except Exception as e:
        logger.error(
            f"Unexpected error in chatbot start: {str(e)}",
            extra={"error_type": type(e).__name__, "thread_id": thread_id},
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/chatbot/{thread_id}/message", response_model=ChatbotMessageResponse)
async def send_message(thread_id: str, request: ChatbotMessageRequest):
    """
    챗봇 메시지 전송 (일반 응답)

    사용자 메시지를 처리하고 응답을 반환합니다.

    Returns:
        - response: 챗봇 응답
        - sources: 참조한 출처 목록
    """
    start_time = time.time()

    try:
        logger.info(
            "Chatbot message received",
            extra={
                "thread_id": thread_id,
                "message_length": len(request.message),
            },
        )

        # 그래프 생성
        graph = create_graph()

        # Config 생성
        config = {"configurable": {"thread_id": thread_id}}

        # 현재 상태 확인
        current_state = await graph.aget_state(config)

        if current_state is None or not current_state.values:
            logger.error(f"No state found for thread_id: {thread_id}")
            raise HTTPException(status_code=404, detail="Session not found")

        # 사용자 메시지를 HumanMessage로 변환하여 그래프 실행
        result = await graph.ainvoke(
            {"messages": [HumanMessage(content=request.message)]},
            config,
        )

        # 응답 추출
        messages = result.get("messages", [])
        sources = result.get("sources", [])

        # 마지막 AI 메시지 찾기
        response_content = ""
        for msg in reversed(messages):
            if isinstance(msg, AIMessage):
                response_content = msg.content
                break

        if not response_content:
            response_content = "응답을 생성하지 못했습니다."

        execution_time = time.time() - start_time
        logger.info(
            "Chatbot message processed",
            extra={
                "thread_id": thread_id,
                "response_length": len(response_content),
                "sources_count": len(sources),
                "execution_time_seconds": round(execution_time, 2),
            },
        )

        return ChatbotMessageResponse(
            response=response_content,
            sources=sources,
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error in chatbot message: {str(e)}",
            extra={"error_type": type(e).__name__, "thread_id": thread_id},
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/chatbot/{thread_id}/stream")
async def stream_message(
    thread_id: str,
    message: str = Query(..., description="사용자 메시지"),
):
    """
    챗봇 스트리밍 응답 (SSE)

    사용자 메시지를 처리하고 토큰 단위로 스트리밍 응답합니다.

    Returns:
        SSE 스트림
        - type: "token" | "done"
        - content: 토큰 내용 (token) 또는 빈 문자열 (done)
        - sources: 참조 출처 (done 시에만)
    """

    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            logger.info(
                "Chatbot streaming started",
                extra={
                    "thread_id": thread_id,
                    "message_length": len(message),
                },
            )

            # 그래프 생성
            graph = create_graph()

            # Config 생성
            config = {"configurable": {"thread_id": thread_id}}

            # 현재 상태 확인
            current_state = await graph.aget_state(config)

            if current_state is None or not current_state.values:
                yield f"data: {json.dumps({'type': 'error', 'content': 'Session not found'})}\n\n"
                return

            # 스트리밍 응답 생성
            collected_content = ""
            sources = []

            async for event in graph.astream_events(
                {"messages": [HumanMessage(content=message)]},
                config,
                version="v2",
            ):
                event_type = event.get("event", "")

                # LLM 토큰 스트리밍
                if event_type == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        token = chunk.content
                        collected_content += token
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

                # 그래프 노드 완료 시 sources 추출
                elif event_type == "on_chain_end":
                    output = event.get("data", {}).get("output", {})
                    if isinstance(output, dict) and "sources" in output:
                        sources = output.get("sources", [])

            # 완료 이벤트 전송
            final_state = await graph.aget_state(config)
            if final_state and final_state.values:
                sources = final_state.values.get("sources", sources)

            yield f"data: {json.dumps({'type': 'done', 'content': '', 'sources': sources})}\n\n"

            logger.info(
                "Chatbot streaming completed",
                extra={
                    "thread_id": thread_id,
                    "response_length": len(collected_content),
                    "sources_count": len(sources),
                },
            )

        except Exception as e:
            logger.error(
                f"Streaming error: {str(e)}",
                extra={"error_type": type(e).__name__, "thread_id": thread_id},
            )
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chatbot/{thread_id}/history", response_model=ChatbotHistoryResponse)
async def get_history(thread_id: str):
    """
    대화 히스토리 조회

    Returns:
        - messages: 메시지 목록
    """
    try:
        logger.info(
            "Chatbot history requested",
            extra={"thread_id": thread_id},
        )

        # 그래프 생성
        graph = create_graph()

        # Config 생성
        config = {"configurable": {"thread_id": thread_id}}

        # 현재 상태 조회
        current_state = await graph.aget_state(config)

        if current_state is None or not current_state.values:
            raise HTTPException(status_code=404, detail="Session not found")

        # 메시지 변환
        messages = current_state.values.get("messages", [])
        chat_messages = []

        for msg in messages:
            if isinstance(msg, HumanMessage):
                chat_messages.append(
                    ChatMessageSchema(role="user", content=msg.content)
                )
            elif isinstance(msg, AIMessage):
                chat_messages.append(
                    ChatMessageSchema(role="assistant", content=msg.content)
                )

        logger.info(
            "Chatbot history retrieved",
            extra={
                "thread_id": thread_id,
                "message_count": len(chat_messages),
            },
        )

        return ChatbotHistoryResponse(messages=chat_messages)

    except HTTPException:
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error in chatbot history: {str(e)}",
            extra={"error_type": type(e).__name__, "thread_id": thread_id},
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/chatbot/{thread_id}")
async def end_chatbot(thread_id: str):
    """
    챗봇 세션 종료

    세션 메모리를 정리합니다 (선택적).

    Returns:
        - status: "ended"
    """
    try:
        logger.info(
            "Chatbot session end requested",
            extra={"thread_id": thread_id},
        )

        # 현재는 MemorySaver가 자동으로 관리하므로 별도 정리 불필요
        # 향후 Redis 등으로 전환 시 여기서 세션 삭제 처리

        return {"status": "ended", "thread_id": thread_id}

    except Exception as e:
        logger.error(
            f"Unexpected error in chatbot end: {str(e)}",
            extra={"error_type": type(e).__name__, "thread_id": thread_id},
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
