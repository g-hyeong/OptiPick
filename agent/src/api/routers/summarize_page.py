"""SummarizePage 그래프 라우터"""

import time

from fastapi import APIRouter, HTTPException

from src.exceptions.base import ConfigurationError
from src.graphs.summarize_page import create_graph
from src.utils.logger import get_logger

from ..schemas import SummarizePageRequest, SummarizePageResponse

logger = get_logger(__name__)
router = APIRouter(prefix="/graphs", tags=["graphs"])


@router.post("/summarize-page", response_model=SummarizePageResponse)
async def execute_summarize_page(request: SummarizePageRequest):
    """
    SummarizePage 그래프 실행

    - Extension에서 추출한 페이지 데이터를 받아 OCR 처리 수행
    - 이미지에서 텍스트를 추출하여 반환
    """
    start_time = time.time()

    try:
        logger.info(
            f"SummarizePage graph execution started",
            extra={
                "url": request.url,
                "title": request.title,
                "text_count": len(request.texts),
                "image_count": len(request.images),
            },
        )

        # Request → State 변환
        state_input = {
            "url": request.url,
            "title": request.title,
            "texts": [text.model_dump() for text in request.texts],
            "images": [image.model_dump() for image in request.images],
            "timestamp": request.timestamp,
        }

        # 그래프 실행
        graph = create_graph()
        result = await graph.ainvoke(state_input)

        # 실행 시간 로깅
        execution_time = time.time() - start_time
        logger.info(
            f"SummarizePage graph execution completed",
            extra={
                "url": request.url,
                "ocr_results_count": len(result.get("ocr_results", [])),
                "execution_time_seconds": round(execution_time, 2),
            },
        )

        # Response 생성
        return SummarizePageResponse(
            url=result["url"],
            title=result["title"],
            texts=[text for text in result["texts"]],
            images=[image for image in result["images"]],
            ocr_results=[ocr for ocr in result.get("ocr_results", [])],
            timestamp=result["timestamp"],
        )

    except ConfigurationError as e:
        logger.critical(f"Configuration error: {e.message}", extra=e.details)
        raise HTTPException(status_code=500, detail=f"Configuration error: {e.message}")

    except Exception as e:
        logger.error(f"Unexpected error in graph execution: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
        )
