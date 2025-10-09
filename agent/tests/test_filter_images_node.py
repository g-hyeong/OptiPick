"""Filter Images 노드 테스트"""

import pytest
from unittest.mock import AsyncMock, patch

from src.graphs.summarize_page.nodes.filter_images_node import (
    FilteredImageIndices,
    filter_images_node,
)
from src.graphs.summarize_page.state import ExtractedImage


@pytest.fixture
def mock_state_with_ocr_results():
    """OCR 결과가 포함된 이미지 상태"""
    return {
        "url": "https://example.com/product",
        "title": "Test Product",
        "texts": [],
        "images": [
            {
                "src": "https://example.com/product-main.jpg",
                "alt": "Product main image",
                "width": 800,
                "height": 600,
                "position": 100,
                "ocr_result": "Premium Quality Laptop, 16GB RAM, 512GB SSD",
            },
            {
                "src": "https://example.com/banner.jpg",
                "alt": "Advertisement banner",
                "width": 1200,
                "height": 200,
                "position": 50,
                "ocr_result": "SALE! Click here for more deals",
            },
            {
                "src": "https://example.com/specs-table.jpg",
                "alt": "Product specifications",
                "width": 600,
                "height": 400,
                "position": 500,
                "ocr_result": "CPU: Intel i7, Display: 15.6 inch, Weight: 1.8kg",
            },
        ],
        "timestamp": 1234567890,
        "valid_images": [],
    }


@pytest.fixture
def mock_state_empty_images():
    """빈 이미지 상태"""
    return {
        "url": "https://example.com/product",
        "title": "Test Product",
        "texts": [],
        "images": [],
        "timestamp": 1234567890,
        "valid_images": [],
    }


@pytest.mark.asyncio
async def test_filter_images_node_empty(mock_state_empty_images):
    """이미지가 없을 때 빈 리스트 반환"""
    result = await filter_images_node(mock_state_empty_images)

    assert "valid_images" in result
    assert result["valid_images"] == []


@pytest.mark.asyncio
async def test_filter_images_node_structure(mock_state_with_ocr_results):
    """반환 구조 확인"""
    # LLM 응답 모킹
    with patch(
        "src.graphs.summarize_page.nodes.filter_images_node.LLMClient"
    ) as MockLLMClient:
        mock_llm = AsyncMock()
        mock_llm.invoke = AsyncMock(
            return_value=FilteredImageIndices(selected_indices=[0, 2])
        )
        MockLLMClient.return_value = mock_llm

        result = await filter_images_node(mock_state_with_ocr_results)

        assert isinstance(result, dict)
        assert "valid_images" in result
        assert isinstance(result["valid_images"], list)


@pytest.mark.asyncio
async def test_filter_images_node_filtering(mock_state_with_ocr_results):
    """LLM이 올바르게 이미지를 필터링하는지 확인"""
    # LLM이 0번과 2번 이미지만 선택하도록 모킹
    with patch(
        "src.graphs.summarize_page.nodes.filter_images_node.LLMClient"
    ) as MockLLMClient:
        mock_llm = AsyncMock()
        mock_llm.invoke = AsyncMock(
            return_value=FilteredImageIndices(selected_indices=[0, 2])
        )
        MockLLMClient.return_value = mock_llm

        result = await filter_images_node(mock_state_with_ocr_results)

        # 2개 이미지만 선택되어야 함
        assert len(result["valid_images"]) == 2

        # 선택된 이미지가 0번과 2번인지 확인
        assert result["valid_images"][0]["src"] == "https://example.com/product-main.jpg"
        assert (
            result["valid_images"][1]["src"] == "https://example.com/specs-table.jpg"
        )


@pytest.mark.asyncio
async def test_filter_images_node_invalid_indices(mock_state_with_ocr_results):
    """LLM이 잘못된 인덱스를 반환해도 안전하게 처리"""
    # LLM이 범위를 벗어난 인덱스를 반환하도록 모킹
    with patch(
        "src.graphs.summarize_page.nodes.filter_images_node.LLMClient"
    ) as MockLLMClient:
        mock_llm = AsyncMock()
        mock_llm.invoke = AsyncMock(
            return_value=FilteredImageIndices(selected_indices=[0, 2, 5, 10])  # 5, 10은 범위 초과
        )
        MockLLMClient.return_value = mock_llm

        result = await filter_images_node(mock_state_with_ocr_results)

        # 유효한 인덱스만 선택되어야 함
        assert len(result["valid_images"]) == 2
        assert result["valid_images"][0]["src"] == "https://example.com/product-main.jpg"
        assert (
            result["valid_images"][1]["src"] == "https://example.com/specs-table.jpg"
        )


@pytest.mark.asyncio
async def test_filter_images_node_error_handling(mock_state_with_ocr_results):
    """LLM 오류 발생 시 모든 이미지 통과"""
    # LLM이 예외를 발생시키도록 모킹
    with patch(
        "src.graphs.summarize_page.nodes.filter_images_node.LLMClient"
    ) as MockLLMClient:
        mock_llm = AsyncMock()
        mock_llm.invoke = AsyncMock(side_effect=Exception("LLM API error"))
        MockLLMClient.return_value = mock_llm

        result = await filter_images_node(mock_state_with_ocr_results)

        # 오류 발생 시 모든 이미지가 통과되어야 함
        assert len(result["valid_images"]) == 3
        assert result["valid_images"] == mock_state_with_ocr_results["images"]


# 실제 LLM API 호출 테스트 (선택적 실행)
@pytest.mark.skip(reason="Requires real API key and slow")
@pytest.mark.asyncio
async def test_filter_images_node_real_llm(mock_state_with_ocr_results):
    """실제 LLM API 호출 테스트 (수동 실행용)

    실행: uv run pytest tests/test_filter_images_node.py::test_filter_images_node_real_llm -v -s
    """
    result = await filter_images_node(mock_state_with_ocr_results)

    assert "valid_images" in result
    assert isinstance(result["valid_images"], list)
    assert len(result["valid_images"]) <= len(mock_state_with_ocr_results["images"])

    # 결과 출력 (디버깅용)
    print(
        f"\nFiltered Images: {len(result['valid_images'])} out of {len(mock_state_with_ocr_results['images'])}"
    )
    for img in result["valid_images"]:
        print(f"  - {img['src']}")
        print(f"    Alt: {img['alt']}")
        print(f"    OCR: {img['ocr_result'][:50]}...")
