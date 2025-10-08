"""테스트용 Mock 데이터 fixtures"""

import pytest


@pytest.fixture
def mock_extracted_image():
    """정상 이미지 URL"""
    return {
        "src": "https://shop-phinf.pstatic.net/20240227_120/1709015287763vDIH1_JPEG/%EC%B6%94%EA%B0%80%EC%98%B5%EC%85%98_1_06.jpg?type=w860",
        "alt": "Solar cell image",
        "width": 500,
        "height": 500,
        "position": 100,
    }


@pytest.fixture
def mock_invalid_image():
    """잘못된 URL"""
    return {
        "src": "invalid-url-format",
        "alt": "",
        "width": 100,
        "height": 100,
        "position": 0,
    }


@pytest.fixture
def mock_multiple_images(mock_extracted_image):
    """여러 이미지"""
    return [
        mock_extracted_image,
        {
            "src": "https://shop-phinf.pstatic.net/20240227_120/1709015287763vDIH1_JPEG/%EC%B6%94%EA%B0%80%EC%98%B5%EC%85%98_1_06.jpg?type=w860",
            "alt": "Second image",
            "width": 300,
            "height": 300,
            "position": 200,
        },
        {
            "src": "https://shop-phinf.pstatic.net/20240227_120/1709015287763vDIH1_JPEG/%EC%B6%94%EA%B0%80%EC%98%B5%EC%85%98_1_06.jpg?type=w860",
            "alt": "Third image",
            "width": 400,
            "height": 400,
            "position": 300,
        },
    ]


@pytest.fixture
def mock_extracted_text():
    """샘플 텍스트"""
    return {"content": "Sample text content", "tagName": "p", "position": 50}


@pytest.fixture
def mock_state_empty():
    """빈 State"""
    return {
        "url": "https://shop-phinf.pstatic.net/20240227_120/1709015287763vDIH1_JPEG/%EC%B6%94%EA%B0%80%EC%98%B5%EC%85%98_1_06.jpg?type=w860",
        "title": "Test Page",
        "texts": [],
        "images": [],
        "timestamp": 1234567890,
    }


@pytest.fixture
def mock_state_with_images(mock_multiple_images, mock_extracted_text):
    """이미지와 텍스트가 있는 State"""
    return {
        "url": "https://shop-phinf.pstatic.net/20250619_234/175031338649118zvR_JPEG/delivery_excider_01.jpg?type=w860",
        "title": "Product Page",
        "texts": [mock_extracted_text],
        "images": mock_multiple_images,
        "timestamp": 1234567890,
    }


@pytest.fixture
def mock_state_invalid_images(mock_invalid_image):
    """잘못된 이미지가 있는 State"""
    return {
        "url": "https://example.com",
        "title": "Test Page",
        "texts": [],
        "images": [mock_invalid_image],
        "timestamp": 1234567890,
    }
