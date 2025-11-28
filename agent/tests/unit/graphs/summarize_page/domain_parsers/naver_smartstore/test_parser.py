"""NaverSmartstoreParser 테스트

Usage:
    uv run pytest tests/unit/graphs/summarize_page/domain_parsers/naver_smartstore/test_parser.py -v
"""

import json
from pathlib import Path

import pytest

from src.graphs.summarize_page.domain_parsers.naver_smartstore.parser import NaverSmartstoreParser


# Fixtures 경로
FIXTURES_DIR = Path(__file__).parents[5] / "fixtures" / "html"
NAVER_SMARTSTORE_HTML = FIXTURES_DIR / "naver_smart_store_product.html"
# 파싱 결과 저장 경로
OUTPUT_DIR = Path(__file__).parent
PARSED_RESULT_JSON = OUTPUT_DIR / "parsed_result.json"


@pytest.fixture
def parser() -> NaverSmartstoreParser:
    return NaverSmartstoreParser()


@pytest.fixture
def html_content() -> str:
    if not NAVER_SMARTSTORE_HTML.exists():
        pytest.skip(f"Fixture not found: {NAVER_SMARTSTORE_HTML}")
    return NAVER_SMARTSTORE_HTML.read_text(encoding="utf-8")


class TestNaverSmartstoreParser:
    """NaverSmartstoreParser 테스트"""

    def test_can_parse_smartstore_naver_url(self, parser: NaverSmartstoreParser):
        """smartstore.naver.com URL을 파싱할 수 있어야 함"""
        assert parser.can_parse("https://smartstore.naver.com/melkin/products/123")
        assert parser.can_parse("https://smartstore.naver.com/samsung/products/456")

    def test_cannot_parse_other_urls(self, parser: NaverSmartstoreParser):
        """다른 URL은 파싱하지 않아야 함"""
        assert not parser.can_parse("https://brand.naver.com/test/products/123")
        assert not parser.can_parse("https://www.coupang.com/vp/products/123")
        assert not parser.can_parse("https://www.google.com")

    def test_domain_type(self, parser: NaverSmartstoreParser):
        """domain_type이 naver_smartstore여야 함"""
        assert parser.domain_type == "naver_smartstore"

    def test_parse_returns_parsed_content(
        self, parser: NaverSmartstoreParser, html_content: str
    ):
        """parse()가 ParsedContent를 반환해야 함"""
        result = parser.parse(
            url="https://smartstore.naver.com/test/products/123",
            title="Test Title",
            html_body=html_content,
        )

        # 추출 결과 로그
        print(f"\n  domain_type: {result.get('domain_type')}")
        print(f"  product_name: {result.get('product_name')}")
        print(f"  price: {result.get('price')}")

        desc_texts = result.get("description_texts", [])
        print(f"  description_texts: {len(desc_texts)} items")
        if desc_texts:
            content = desc_texts[0].get("content", "")
            print(f"    [0]: {content[:100]}..." if len(content) > 100 else f"    [0]: {content}")

        # 파싱 결과 JSON 저장
        PARSED_RESULT_JSON.write_text(
            json.dumps(result, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        print(f"\n  Saved to: {PARSED_RESULT_JSON}")

        assert result["domain_type"] == "naver_smartstore"
        assert isinstance(result.get("product_name"), str)
        assert isinstance(result.get("price"), str)
        assert isinstance(result.get("description_texts"), list)
        assert isinstance(result.get("description_images"), list)

    def test_parse_extracts_images(
        self, parser: NaverSmartstoreParser, html_content: str
    ):
        """상품 이미지가 추출되어야 함"""
        result = parser.parse(
            url="https://smartstore.naver.com/test/products/123",
            title="Test Title",
            html_body=html_content,
        )

        images = result.get("description_images", [])

        # 이미지 추출 결과 로그
        print(f"\n  description_images: {len(images)} items")
        for i, img in enumerate(images[:5]):
            src = img.get("src", "")
            print(f"    [{i}]: {src[:80]}...")

        assert len(images) > 0
