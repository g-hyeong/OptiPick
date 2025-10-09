"""SummarizePage 그래프 라우터"""

import time

from fastapi import APIRouter, HTTPException

from src.exceptions.base import ConfigurationError
from src.graphs.summarize_page import create_graph
from src.utils.logger import get_logger

from ..schemas import ProductAnalysisSchema, SummarizePageRequest, SummarizePageResponse

logger = get_logger(__name__)
router = APIRouter(prefix="/graphs", tags=["graphs"])


@router.post("/summarize-page", response_model=SummarizePageResponse)
async def execute_summarize_page(request: SummarizePageRequest):
    """
    SummarizePage 그래프 실행

    워크플로우:
    1. OCR: 이미지에서 텍스트 추출
    2. 이미지 필터링: LLM으로 유용한 이미지 선별
    3. 제품 분석: 텍스트와 이미지 정보로 제품 분석 수행

    Returns:
        - valid_images: OCR 결과가 포함된 유효한 이미지 목록
        - product_analysis: 제품 분석 결과
    """
    start_time = time.time()

    try:
        logger.info(
            "SummarizePage graph execution started",
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

        # 실행 결과 상세 로깅
        valid_images = result.get("valid_images", [])
        product_analysis = result.get("product_analysis", {})

        # 디버그: 유효한 이미지 정보 로깅
        logger.debug(
            "Valid images after filtering",
            extra={
                "total_images": len(request.images),
                "valid_images_count": len(valid_images),
                "filter_rate": f"{len(valid_images) / len(request.images) * 100:.1f}%"
                if request.images
                else "N/A",
            },
        )

        # 디버그: 각 유효 이미지의 OCR 결과 로깅
        for idx, img in enumerate(valid_images):
            ocr_text = img.get("ocr_result", "")
            logger.debug(
                f"Valid image #{idx + 1}",
                extra={
                    "src": img.get("src", "")[:100],  # URL 길이 제한
                    "alt": img.get("alt", "")[:100],
                    "ocr_result_length": len(ocr_text),
                    "ocr_result_preview": ocr_text[:200] if ocr_text else "[empty]",
                },
            )

        # 제품 분석 결과 로깅
        execution_time = time.time() - start_time
        logger.info(
            "SummarizePage graph execution completed",
            extra={
                "url": request.url,
                "valid_images_count": len(valid_images),
                "product_name": product_analysis.get("product_name", "unknown"),
                "has_price": product_analysis.get("price") != "unknown",
                "features_count": len(product_analysis.get("key_features", [])),
                "pros_count": len(product_analysis.get("pros", [])),
                "cons_count": len(product_analysis.get("cons", [])),
                "execution_time_seconds": round(execution_time, 2),
            },
        )

        # 디버그: 제품 분석 상세 정보
        logger.debug(
            "Product analysis details",
            extra={
                "product_name": product_analysis.get("product_name"),
                "summary": product_analysis.get("summary", "")[:200],
                "price": product_analysis.get("price"),
                "key_features": product_analysis.get("key_features", []),
                "recommended_for": product_analysis.get("recommended_for"),
            },
        )

        # Response 생성
        return SummarizePageResponse(
            url=result["url"],
            title=result["title"],
            valid_images=valid_images,
            product_analysis=ProductAnalysisSchema(**product_analysis),
            timestamp=result["timestamp"],
        )

    except ConfigurationError as e:
        logger.critical(f"Configuration error: {e.message}", extra=e.details)
        raise HTTPException(
            status_code=500, detail=f"Configuration error: {e.message}"
        )

    except Exception as e:
        logger.error(
            f"Unexpected error in graph execution: {str(e)}",
            extra={"error_type": type(e).__name__},
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
