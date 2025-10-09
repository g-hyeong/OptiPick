"""LLM 관련 예외"""

from .base import AgentBaseException


class LLMError(AgentBaseException):
    """LLM 관련 기본 예외"""


class LLMProviderError(LLMError):
    """지원하지 않는 provider"""


class LLMInvocationError(LLMError):
    """LLM 호출 중 발생한 오류"""


class LLMFormatError(LLMError):
    """출력 포맷 파싱 실패"""


class LLMConfigurationError(LLMError):
    """LLM 설정 오류"""
