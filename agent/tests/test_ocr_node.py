"""OCR 노드 테스트"""

import pytest

from src.graphs.summarize_page.nodes.ocr_node import ocr_node


def test_ocr_node_empty_images(mock_state_empty):
    """이미지 없을 때 빈 리스트 반환"""
    result = ocr_node(mock_state_empty)

    assert "ocr_results" in result
    assert result["ocr_results"] == []


def test_ocr_node_invalid_images(mock_state_invalid_images):
    """잘못된 URL 이미지는 스킵"""
    result = ocr_node(mock_state_invalid_images)

    assert "ocr_results" in result
    assert result["ocr_results"] == []  # 잘못된 URL은 스킵됨


def test_ocr_node_structure(mock_state_empty):
    """반환 구조 확인"""
    result = ocr_node(mock_state_empty)

    assert isinstance(result, dict)
    assert "ocr_results" in result
    assert isinstance(result["ocr_results"], list)


# 실제 OCR API 호출 테스트 (선택적 실행)
# @pytest.mark.skip(reason="Requires real API key and slow")
def test_ocr_node_real_api(mock_state_with_images):
    """실제 OCR API 호출 테스트 (수동 실행용)

    실행: uv run pytest tests/test_ocr_node.py::test_ocr_node_real_api -v -s
    """
    result = ocr_node(mock_state_with_images)

    assert "ocr_results" in result
    # 적어도 하나는 성공해야 함
    assert len(result["ocr_results"]) > 0

    # 결과 구조 확인
    for ocr_result in result["ocr_results"]:
        assert "src" in ocr_result
        assert "text" in ocr_result
        assert isinstance(ocr_result["text"], str)

    # 결과 출력 (디버깅용)
    print(f"\nOCR Results: {len(result['ocr_results'])} images processed")
    for r in result["ocr_results"]:
        print(f"  - {r['src']}: {r['text'][:50]}...")
