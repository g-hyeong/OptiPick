"""공통 설정"""

from pydantic_settings import BaseSettings as PydanticBaseSettings, SettingsConfigDict


class BaseSettings(PydanticBaseSettings):
    """프로젝트 전체 공통 설정"""

    # OCR API 설정
    ocr_api_key: str
    ocr_api_endpoint: str = "https://api.ocr.space/parse/image"

    # HTTP 설정
    http_timeout: int = 30
    http_max_retries: int = 3

    # 로깅 설정
    log_level: str = "INFO"
    log_format: str = "%(asctime)s | %(name)s | %(levelname)s | %(message)s"

    # LLM 기본 설정
    default_llm_provider: str = "openai"
    default_llm_model: str = "gpt-4o"
    default_temperature: float = 0.7
    default_max_tokens: int = 2048
    default_llm_timeout: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
