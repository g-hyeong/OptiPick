"""OCR 노드 테스트"""

import pytest

from src.graphs.summarize_page.nodes.ocr_node import ocr_node


def test_ocr_node_empty_images(mock_state_empty):
    """이미지 없을 때 빈 리스트 반환"""
    result = ocr_node(mock_state_empty)

    assert "images" in result
    assert result["images"] == []


def test_ocr_node_invalid_images(mock_state_invalid_images):
    """잘못된 URL 이미지는 ocr_result가 빈 문자열"""
    result = ocr_node(mock_state_invalid_images)

    assert "images" in result
    assert isinstance(result["images"], list)
    # 이미지는 반환되지만 ocr_result가 빈 문자열이어야 함
    for img in result["images"]:
        assert "ocr_result" in img
        assert img["ocr_result"] == ""


def test_ocr_node_structure(mock_state_empty):
    """반환 구조 확인"""
    result = ocr_node(mock_state_empty)

    assert isinstance(result, dict)
    assert "images" in result
    assert isinstance(result["images"], list)


# 실제 OCR API 호출 테스트 (선택적 실행)
# @pytest.mark.skip(reason="Requires real API key and slow")
def test_ocr_node_real_api(mock_state_with_images):
    """실제 OCR API 호출 테스트 (수동 실행용)

    실행: uv run pytest tests/test_ocr_node.py::test_ocr_node_real_api -v -s
    """
    result = ocr_node(mock_state_with_images)

    assert "images" in result
    assert len(result["images"]) > 0

    # 결과 구조 확인 - 각 이미지에 ocr_result 필드가 있어야 함
    successful_count = 0
    for img in result["images"]:
        assert "src" in img
        assert "ocr_result" in img
        assert isinstance(img["ocr_result"], str)
        if img["ocr_result"]:
            successful_count += 1

    # 적어도 하나는 성공해야 함
    assert successful_count > 0

    # 결과 출력 (디버깅용)
    print(f"\nOCR Results: {len(result['images'])} images processed, {successful_count} successful")
    for img in result["images"]:
        if img["ocr_result"]:
            print(f"  - {img['src']}: {img['ocr_result'][:50]}...")
