"""SummarizePage 그래프 테스트"""

import pytest

from src.graphs.summarize_page import create_graph


def test_graph_creation():
    """그래프 생성 확인"""
    graph = create_graph()
    assert graph is not None


def test_graph_invoke_empty(mock_state_empty):
    """빈 State로 실행"""
    graph = create_graph()
    result = graph.invoke(mock_state_empty)

    assert "ocr_results" in result
    assert result["ocr_results"] == []


def test_graph_invoke_structure(mock_state_empty):
    """그래프 실행 후 State 구조 확인"""
    graph = create_graph()
    result = graph.invoke(mock_state_empty)

    # 입력 필드 유지
    assert result["url"] == mock_state_empty["url"]
    assert result["title"] == mock_state_empty["title"]
    assert result["texts"] == mock_state_empty["texts"]
    assert result["images"] == mock_state_empty["images"]
    assert result["timestamp"] == mock_state_empty["timestamp"]

    # OCR 결과 추가
    assert "ocr_results" in result
    assert isinstance(result["ocr_results"], list)


# 실제 그래프 실행 테스트 (선택적 실행)
@pytest.mark.skip(reason="Requires real API key and slow")
def test_graph_invoke_real(mock_state_with_images):
    """실제 그래프 실행 (수동 실행용)

    실행: uv run pytest tests/test_summarize_page.py::test_graph_invoke_real -v -s
    """
    graph = create_graph()
    result = graph.invoke(mock_state_with_images)

    assert "ocr_results" in result
    assert len(result["ocr_results"]) > 0

    # 결과 출력
    print(f"\nGraph execution completed:")
    print(f"  - Input images: {len(mock_state_with_images['images'])}")
    print(f"  - OCR results: {len(result['ocr_results'])}")
