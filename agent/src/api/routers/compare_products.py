"""CompareProducts 그래프 라우터"""

import uuid
import time

from fastapi import APIRouter, HTTPException

from src.exceptions.base import ConfigurationError
from src.graphs.compare_products import create_graph
from src.utils.logger import get_logger

from ..schemas import (
    CompareProductsStartRequest,
    CompareProductsStartResponse,
    CompareProductsContinueRequest,
    CompareProductsContinueResponse,
    ComparisonReportSchema,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/graphs", tags=["graphs"])


@router.post("/compare-products/start", response_model=CompareProductsStartResponse)
async def start_compare_products(request: CompareProductsStartRequest):
    """
    CompareProducts 그래프 시작

    워크플로우:
    1. 그래프 생성 및 초기 실행
    2. 첫 번째 interrupt 지점(collect_user_criteria)에서 중단
    3. thread_id와 질문을 반환

    Returns:
        - thread_id: 세션 ID
        - status: "waiting_for_criteria"
        - question: 사용자에게 보여줄 질문
    """
    start_time = time.time()
    thread_id = str(uuid.uuid4())

    try:
        logger.info(
            "CompareProducts graph start requested",
            extra={
                "thread_id": thread_id,
                "category": request.category,
                "product_count": len(request.products),
            },
        )

        # Request → State 변환
        state_input = {
            "category": request.category,
            "products": [product.model_dump() for product in request.products],
        }

        # 그래프 생성
        graph = create_graph()

        # Config 생성 (thread_id 포함)
        config = {"configurable": {"thread_id": thread_id}}

        # 그래프 실행 (첫 번째 interrupt까지)
        logger.info(f"Starting graph execution (thread_id: {thread_id})")
        result = await graph.ainvoke(state_input, config)

        # 첫 번째 interrupt 지점: collect_user_criteria
        # 사용자에게 기준 입력 요청
        question = "제품을 선택할 때 가장 중요한 기준을 입력해주세요. (예: 배터리 수명, 가격, 무게)"

        execution_time = time.time() - start_time
        logger.info(
            "CompareProducts graph started and waiting for user criteria",
            extra={
                "thread_id": thread_id,
                "execution_time_seconds": round(execution_time, 2),
            },
        )

        return CompareProductsStartResponse(
            thread_id=thread_id, status="waiting_for_criteria", question=question
        )

    except ConfigurationError as e:
        logger.critical(f"Configuration error: {e.message}", extra=e.details)
        raise HTTPException(status_code=500, detail=f"Configuration error: {e.message}")

    except Exception as e:
        logger.error(
            f"Unexpected error in graph start: {str(e)}",
            extra={"error_type": type(e).__name__, "thread_id": thread_id},
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post(
    "/compare-products/{thread_id}/continue",
    response_model=CompareProductsContinueResponse,
)
async def continue_compare_products(
    thread_id: str, request: CompareProductsContinueRequest
):
    """
    CompareProducts 그래프 재개

    사용자 입력을 받아 중단된 그래프를 재개합니다.

    Case 1: 첫 번째 재개 (user_criteria 입력)
    - user_input: list[str] (예: ["배터리", "가격", "무게"])
    - analyze_products 노드 실행
    - collect_user_priorities에서 다시 중단
    - 추출된 criteria와 질문 반환

    Case 2: 두 번째 재개 (user_priorities 입력)
    - user_input: dict[str, int] (예: {"배터리": 1, "가격": 2})
    - generate_report 노드 실행
    - 최종 보고서 반환

    Returns:
        - status: "waiting_for_priorities" | "completed"
        - criteria: 추출된 비교 기준 (Case 1)
        - report: 최종 보고서 (Case 2)
    """
    start_time = time.time()

    try:
        logger.info(
            "CompareProducts graph continue requested",
            extra={
                "thread_id": thread_id,
                "user_input_type": type(request.user_input).__name__,
            },
        )

        # 그래프 생성
        graph = create_graph()

        # Config 생성
        config = {"configurable": {"thread_id": thread_id}}

        # 현재 그래프 상태 확인
        current_state = await graph.aget_state(config)

        if current_state is None:
            logger.error(f"No state found for thread_id: {thread_id}")
            raise HTTPException(status_code=404, detail="Session not found")

        logger.info(
            f"Current graph state",
            extra={
                "thread_id": thread_id,
                "next_node": current_state.next,
            },
        )

        # 사용자 입력 타입에 따라 State 업데이트 준비
        user_input = request.user_input

        # Case 1: user_criteria 입력 (list)
        if isinstance(user_input, list):
            logger.info(f"User criteria received: {', '.join(user_input)}")
            update_state = {"user_criteria": user_input}

        # Case 2: user_priorities 입력 (dict)
        elif isinstance(user_input, dict):
            logger.info(f"User priorities received: {len(user_input)} criteria")
            for criterion, priority in sorted(user_input.items(), key=lambda x: x[1]):
                logger.info(f"  {priority}위: {criterion}")
            update_state = {"user_priorities": user_input}

        else:
            logger.error(f"Invalid user_input type: {type(user_input)}")
            raise HTTPException(
                status_code=400,
                detail="user_input must be list (criteria) or dict (priorities)",
            )

        # 그래프 재개
        logger.info(f"Resuming graph execution (thread_id: {thread_id})")
        result = await graph.ainvoke(update_state, config)

        # 재개 후 상태 확인
        new_state = await graph.aget_state(config)

        # Case 1 응답: 다음 interrupt 대기 (waiting_for_priorities)
        if new_state.next and "collect_user_priorities" in new_state.next:
            extracted_criteria = result.get("extracted_criteria", [])
            question = f"다음 기준의 우선순위를 입력해주세요 (1위가 가장 중요): {', '.join(extracted_criteria)}"

            execution_time = time.time() - start_time
            logger.info(
                "Graph waiting for user priorities",
                extra={
                    "thread_id": thread_id,
                    "criteria_count": len(extracted_criteria),
                    "execution_time_seconds": round(execution_time, 2),
                },
            )

            return CompareProductsContinueResponse(
                status="waiting_for_priorities",
                question=question,
                criteria=extracted_criteria,
            )

        # Case 2 응답: 최종 완료 (completed)
        else:
            comparison_report = result.get("comparison_report")

            if not comparison_report:
                logger.error("Comparison report not found in final state")
                raise HTTPException(
                    status_code=500, detail="Failed to generate comparison report"
                )

            execution_time = time.time() - start_time
            logger.info(
                "CompareProducts graph completed",
                extra={
                    "thread_id": thread_id,
                    "total_products": comparison_report.get("total_products", 0),
                    "top_product": comparison_report.get("ranked_products", [{}])[
                        0
                    ].get("product_name", "unknown"),
                    "execution_time_seconds": round(execution_time, 2),
                },
            )

            return CompareProductsContinueResponse(
                status="completed",
                report=ComparisonReportSchema(**comparison_report),
            )

    except HTTPException:
        raise

    except ConfigurationError as e:
        logger.critical(f"Configuration error: {e.message}", extra=e.details)
        raise HTTPException(status_code=500, detail=f"Configuration error: {e.message}")

    except Exception as e:
        logger.error(
            f"Unexpected error in graph continue: {str(e)}",
            extra={"error_type": type(e).__name__, "thread_id": thread_id},
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
