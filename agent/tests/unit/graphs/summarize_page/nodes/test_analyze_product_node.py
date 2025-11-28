"""제품 분석 노드 테스트"""

import pytest
from unittest.mock import AsyncMock, patch

from src.graphs.summarize_page.nodes.analyze_product_node import (
    ProductAnalysisOutput,
    analyze_product_node,
    create_default_analysis,
)


@pytest.fixture
def mock_state_with_data():
    """텍스트와 이미지 데이터가 있는 상태"""
    return {
        "url": "https://example.com/product",
        "title": "Amazing Laptop",
        "texts": [
            {"content": "Amazing Laptop Pro 16", "tagName": "h1", "position": 0},
            {
                "content": "The best laptop for professionals",
                "tagName": "p",
                "position": 100,
            },
            {"content": "$2,499", "tagName": "span", "position": 200},
            {
                "content": "16GB RAM, 512GB SSD, Intel i7",
                "tagName": "li",
                "position": 300,
            },
        ],
        "images": [],
        "timestamp": 1234567890,
        "valid_images": [
            {
                "src": "https://example.com/product.jpg",
                "alt": "Product main image",
                "width": 800,
                "height": 600,
                "position": 150,
                "ocr_result": "Premium Quality, Fast Performance",
            }
        ],
        "product_analysis": {},
    }


@pytest.fixture
def mock_state_empty():
    """빈 데이터 상태"""
    return {
        "url": "https://example.com/product",
        "title": "Test Product",
        "texts": [],
        "images": [],
        "timestamp": 1234567890,
        "valid_images": [],
        "product_analysis": {},
    }


@pytest.mark.asyncio
async def test_analyze_product_node_with_data(mock_state_with_data):
    """텍스트와 이미지 데이터가 있을 때 분석 수행"""
    # LLM 응답 모킹
    mock_output = ProductAnalysisOutput(
        product_name="Amazing Laptop Pro 16",
        summary="The best laptop for professionals",
        price="$2,499",
        key_features=["16GB RAM", "512GB SSD", "Intel i7"],
        pros=["Fast performance", "Premium quality"],
        cons=["High price"],
        recommended_for="Professional users",
        recommendation_reasons=["High performance", "Good build quality"],
        not_recommended_reasons=["Too expensive for basic users"],
    )

    with patch(
        "src.graphs.summarize_page.nodes.analyze_product_node.LLMClient"
    ) as MockLLMClient:
        mock_llm = AsyncMock()
        mock_llm.invoke = AsyncMock(return_value=mock_output)
        MockLLMClient.return_value = mock_llm

        result = await analyze_product_node(mock_state_with_data)

        assert "product_analysis" in result
        analysis = result["product_analysis"]

        # 구조 검증
        assert "product_name" in analysis
        assert "summary" in analysis
        assert "price" in analysis
        assert "key_features" in analysis
        assert "pros" in analysis
        assert "cons" in analysis
        assert "recommended_for" in analysis
        assert "recommendation_reasons" in analysis
        assert "not_recommended_reasons" in analysis

        # 값 검증
        assert analysis["product_name"] == "Amazing Laptop Pro 16"
        assert analysis["price"] == "$2,499"
        assert len(analysis["key_features"]) == 3
        assert len(analysis["pros"]) == 2
        assert len(analysis["cons"]) == 1


@pytest.mark.asyncio
async def test_analyze_product_node_empty_data(mock_state_empty):
    """빈 데이터일 때 기본값 반환"""
    result = await analyze_product_node(mock_state_empty)

    assert "product_analysis" in result
    analysis = result["product_analysis"]

    # 기본값 검증
    assert analysis["product_name"] == "unknown"
    assert analysis["summary"] == "unknown"
    assert analysis["price"] == "unknown"
    assert analysis["key_features"] == []
    assert analysis["pros"] == []
    assert analysis["cons"] == []
    assert analysis["recommended_for"] == "unknown"
    assert analysis["recommendation_reasons"] == []
    assert analysis["not_recommended_reasons"] == []


@pytest.mark.asyncio
async def test_analyze_product_node_error_handling(mock_state_with_data):
    """LLM 오류 발생 시 기본값 반환"""
    # LLM이 예외를 발생시키도록 모킹
    with patch(
        "src.graphs.summarize_page.nodes.analyze_product_node.LLMClient"
    ) as MockLLMClient:
        mock_llm = AsyncMock()
        mock_llm.invoke = AsyncMock(side_effect=Exception("LLM API error"))
        MockLLMClient.return_value = mock_llm

        result = await analyze_product_node(mock_state_with_data)

        # 오류 발생 시 기본값이 반환되어야 함
        assert "product_analysis" in result
        analysis = result["product_analysis"]

        assert analysis["product_name"] == "unknown"
        assert analysis["summary"] == "unknown"
        assert analysis["price"] == "unknown"


@pytest.mark.asyncio
async def test_analyze_product_node_partial_data(mock_state_with_data):
    """일부 정보만 있을 때 "unknown"과 빈 배열 처리"""
    # 일부 필드만 채운 LLM 응답 모킹
    mock_output = ProductAnalysisOutput(
        product_name="Amazing Laptop Pro 16",
        summary="unknown",
        price="$2,499",
        key_features=["16GB RAM"],
        pros=[],
        cons=[],
        recommended_for="unknown",
        recommendation_reasons=[],
        not_recommended_reasons=[],
    )

    with patch(
        "src.graphs.summarize_page.nodes.analyze_product_node.LLMClient"
    ) as MockLLMClient:
        mock_llm = AsyncMock()
        mock_llm.invoke = AsyncMock(return_value=mock_output)
        MockLLMClient.return_value = mock_llm

        result = await analyze_product_node(mock_state_with_data)

        analysis = result["product_analysis"]

        # 제공된 정보는 채워져 있고
        assert analysis["product_name"] == "Amazing Laptop Pro 16"
        assert analysis["price"] == "$2,499"
        assert len(analysis["key_features"]) == 1

        # 없는 정보는 "unknown" 또는 빈 배열
        assert analysis["summary"] == "unknown"
        assert analysis["pros"] == []
        assert analysis["cons"] == []
        assert analysis["recommended_for"] == "unknown"


def test_create_default_analysis():
    """기본 분석 결과 생성 함수 테스트"""
    default = create_default_analysis()

    assert default["product_name"] == "unknown"
    assert default["summary"] == "unknown"
    assert default["price"] == "unknown"
    assert default["key_features"] == []
    assert default["pros"] == []
    assert default["cons"] == []
    assert default["recommended_for"] == "unknown"
    assert default["recommendation_reasons"] == []
    assert default["not_recommended_reasons"] == []


# 실제 LLM API 호출 테스트 (선택적 실행)
@pytest.mark.skip(reason="Requires real API key and slow")
@pytest.mark.asyncio
async def test_analyze_product_node_real_llm(mock_state_with_data):
    """실제 LLM API 호출 테스트 (수동 실행용)

    실행: uv run pytest tests/test_analyze_product_node.py::test_analyze_product_node_real_llm -v -s
    """
    result = await analyze_product_node(mock_state_with_data)

    assert "product_analysis" in result
    analysis = result["product_analysis"]

    # 결과 출력 (디버깅용)
    print("\n=== Product Analysis Result ===")
    print(f"Product Name: {analysis['product_name']}")
    print(f"Summary: {analysis['summary']}")
    print(f"Price: {analysis['price']}")
    print(f"Key Features: {analysis['key_features']}")
    print(f"Pros: {analysis['pros']}")
    print(f"Cons: {analysis['cons']}")
    print(f"Recommended For: {analysis['recommended_for']}")
    print(f"Recommendation Reasons: {analysis['recommendation_reasons']}")
    print(f"Not Recommended Reasons: {analysis['not_recommended_reasons']}")

    # 최소한 제품명이나 요약은 추출되어야 함
    assert (
        analysis["product_name"] != "unknown" or analysis["summary"] != "unknown"
    )
