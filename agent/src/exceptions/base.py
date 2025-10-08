"""공통 예외 클래스"""


class AgentBaseException(Exception):
    """모든 Agent 예외의 기본 클래스"""

    def __init__(self, message: str, details: dict | None = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

    def __str__(self) -> str:
        if self.details:
            return f"{self.message} | Details: {self.details}"
        return self.message


class ConfigurationError(AgentBaseException):
    """설정 관련 오류"""

    pass


class ExternalAPIError(AgentBaseException):
    """외부 API 호출 실패"""

    pass


class HTTPError(ExternalAPIError):
    """HTTP 요청 실패"""

    pass


class TimeoutError(ExternalAPIError):
    """요청 타임아웃"""

    pass


class ValidationError(AgentBaseException):
    """데이터 검증 실패"""

    pass
