"""FastAPI 서버 엔트리포인트"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.utils.logger import get_logger

from .routers import summarize_page

logger = get_logger(__name__)

# FastAPI app 생성
app = FastAPI(
    title="SmartCompare Agent API",
    description="LangGraph-based agent for product analysis",
    version="0.1.0",
)

# CORS 설정 (Extension 통신용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Production에서는 특정 origin으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 글로벌 예외 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """전역 예외 핸들러"""
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={"path": request.url.path, "method": request.method},
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "smartcompare-agent"}


# 라우터 등록
app.include_router(summarize_page.router)


# 서버 시작 로깅
@app.on_event("startup")
async def startup_event():
    """서버 시작 시 실행"""
    logger.info("SmartCompare Agent API server started")


@app.on_event("shutdown")
async def shutdown_event():
    """서버 종료 시 실행"""
    logger.info("SmartCompare Agent API server shutdown")
