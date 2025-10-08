"""SummarizePage 그래프 설정"""

from src.config.base import BaseSettings


class SummarizePageSettings(BaseSettings):
    """SummarizePage 그래프 전용 설정 (BaseSettings 상속)"""

    # OCR 엔진 설정
    ocr_engine: int = 2  # Engine 2: 자동 언어 감지, 복잡한 배경 인식 우수
    ocr_language: str = "auto"  # 자동 언어 감지 (한글/영어 혼재 대응)
    ocr_detect_orientation: bool = True  # 이미지 회전 자동 감지
    ocr_is_table: bool = True  # 테이블 구조 인식 모드 (스펙표/가격표 줄바꿈 보존)
    ocr_scale: bool = False  # 업스케일링 비활성화 (처리 속도 우선)

    # 병렬 처리 설정
    ocr_max_concurrent: int = 5  # 동시 OCR 요청 최대 개수
