"""커스텀 로거"""

import logging
import sys
from typing import Optional


class CustomFormatter(logging.Formatter):
    """색상이 있는 커스텀 포맷터"""

    # ANSI 색상 코드
    COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        """로그 레코드 포맷팅"""
        # 색상 추가
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"

        # 기본 포맷 적용
        formatted = super().format(record)

        # levelname 원래대로 복원 (다음 핸들러를 위해)
        record.levelname = levelname

        return formatted


def get_logger(
    name: str,
    level: str = "INFO",
    format_string: Optional[str] = None,
    use_color: bool = True,
) -> logging.Logger:
    """
    커스텀 로거 생성

    Args:
        name: 로거 이름 (보통 __name__ 사용)
        level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_string: 로그 포맷 문자열
        use_color: 색상 사용 여부

    Returns:
        logging.Logger: 설정된 로거
    """
    logger = logging.getLogger(name)

    # 이미 핸들러가 있으면 재사용
    if logger.handlers:
        return logger

    logger.setLevel(level)

    # 콘솔 핸들러 생성
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    # 포맷 설정
    if format_string is None:
        format_string = (
            "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
        )

    if use_color:
        formatter = CustomFormatter(format_string, datefmt="%Y-%m-%d %H:%M:%S")
    else:
        formatter = logging.Formatter(format_string, datefmt="%Y-%m-%d %H:%M:%S")

    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 상위 로거로 전파 방지 (중복 로그 방지)
    logger.propagate = False

    return logger


def configure_logging(level: str = "INFO", format_string: Optional[str] = None):
    """
    전역 로깅 설정

    Args:
        level: 로그 레벨
        format_string: 로그 포맷 문자열
    """
    if format_string is None:
        format_string = (
            "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
        )

    logging.basicConfig(
        level=level,
        format=format_string,
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
