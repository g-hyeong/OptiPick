"""서버 실행 스크립트"""

import uvicorn


def main():
    """FastAPI 서버 실행"""
    uvicorn.run(
        "src.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    main()
