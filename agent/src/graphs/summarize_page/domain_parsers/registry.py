"""파서 레지스트리 - 도메인별 파서 선택 및 관리"""

from typing import Optional

from .base import BaseDomainParser


class ParserRegistry:
    """파서 레지스트리 (싱글톤)"""

    def __init__(self):
        self._parsers: list[BaseDomainParser] = []

    def register(self, parser: BaseDomainParser):
        """
        파서 등록

        Args:
            parser: 등록할 파서 인스턴스
        """
        self._parsers.append(parser)

    def get_parser(self, url: str) -> BaseDomainParser:
        """
        URL에 맞는 파서 반환 (매칭 없으면 Generic)

        Args:
            url: 파서를 찾을 URL

        Returns:
            BaseDomainParser: 매칭된 파서 (없으면 GenericParser)
        """
        for parser in self._parsers:
            if parser.can_parse(url):
                return parser

        # Fallback: Generic Parser
        from .generic import GenericParser

        return GenericParser()


# 싱글톤 인스턴스
_registry: Optional[ParserRegistry] = None


def get_parser_registry() -> ParserRegistry:
    """
    파서 레지스트리 싱글톤 인스턴스 반환

    Returns:
        ParserRegistry: 레지스트리 인스턴스
    """
    global _registry
    if _registry is None:
        _registry = ParserRegistry()
        _register_all_parsers(_registry)
    return _registry


def _register_all_parsers(registry: ParserRegistry):
    """
    모든 파서 등록

    Args:
        registry: 파서를 등록할 레지스트리
    """
    # TODO: 도메인 특화 파서들이 구현되면 주석 해제
    # from .naver_brand import NaverBrandParser
    # from .naver_smartstore import NaverSmartstoreParser
    # from .coupang_product import CoupangProductParser

    # registry.register(NaverBrandParser())
    # registry.register(NaverSmartstoreParser())
    # registry.register(CoupangProductParser())

    # 현재는 모든 URL을 Generic Parser로 처리
    pass
