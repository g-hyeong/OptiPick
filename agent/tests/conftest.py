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


@pytest.fixture
def mock_real_product_data():
    """실제 상품 페이지 데이터 (카파 알람시계)

    OCR API 호출 없이 filter_images_node와 analyze_product_node를 테스트하기 위한 fixture
    """
    return {
        "url": "https://smartstore.naver.com/kappa1/products/4433781062",
        "title": "카파시계 KAPPA 무소음 자명종 트윈벨 알람시계 클래식 화이트 디자인 탁상시계 : 카파클락",
        "timestamp": 1728518400,
        "texts": [
            {"content": "네이버플러스 스토어 홈", "tagName": "span", "position": -1},
            {
                "content": "대한민국 대표 벽/탁상시계 브랜드 카파시계, KAPPA 본사 직영 온라인 스토어 입니다.",
                "tagName": "p",
                "position": 59,
            },
            {"content": "관심고객수 16,533", "tagName": "div", "position": 59},
            {
                "content": "카파 무소음 클래식 시끄러운 자명종 알람시계 탁상시계 T917 v2",
                "tagName": "h3",
                "position": 463,
            },
            {"content": "총 5점 중 4.77점", "tagName": "span", "position": 333},
            {"content": "AA사이즈 건전지 1개 기본제공", "tagName": "div", "position": 1014},
            {"content": "오늘 바로 발송됩니다.", "tagName": "p", "position": 1095.5},
            {"content": "16:00 까지 결제 시", "tagName": "span", "position": 1096.5},
            {
                "content": "시계가 진짜 예뻐요~~ 배송 짱 빠르게 받았구요 포장 뜯었는데 처음 든 생각은 손잡이 녹 잘슬 것 같다 였어요ㅋㅋㅋ 근데 꺼내보니 너무 예쁜 거 있죠?? 예뻐서 선택했지만 실물이 더 만족스럽습니다ㅎㅎㅎ 알람시계 처음 써보는데 조작은 간단하고 알람 소리는 엄청 시끄러워서 효과는 확실할 것 같아요.",
                "tagName": "span",
                "position": 1682,
            },
            {
                "content": "올리브그린이랑 화이트 두개 주문했어요 색상도 이쁘고 좋네요 알람소리도 커서 좋아요 늦잠잘수가 없겠네요 쨍하게 시끄러운소리가아니라 좀 부드러운 소리라 귀는 덜 아플듯 합니다 무소음이라 했는데 조용한곳에서는 바늘 지나는 소리가 들리긴하지만 신경쓰일정도는 아니에요",
                "tagName": "span",
                "position": 1800,
            },
            {
                "content": "카파 시끄러운 자명종 탁상시계 무소음 알람시계 T917",
                "tagName": "td",
                "position": 3183.5,
            },
            {
                "content": "AA사이즈 건전지 1개 기본제공",
                "tagName": "td",
                "position": 3183.5,
            },
            {"content": "중국산(신영정밀(주))", "tagName": "td", "position": 3222.5},
            {
                "content": "무소음, 저소음, 알람설정",
                "tagName": "td",
                "position": 3341.5,
            },
            {
                "content": "믿을 수 있는 카파 정품! 본사 직배송 상품!",
                "tagName": "span",
                "position": 8809.5,
            },
            {
                "content": "소리없이 조용히 움직이는 무브먼트로",
                "tagName": "span",
                "position": 8849.5,
            },
            {
                "content": "침실에서도, 공부방에서도 OK!",
                "tagName": "span",
                "position": 8878.296875,
            },
        ],
        "images": [
            {
                "src": "https://shop-phinf.pstatic.net/20240221_186/1708503560037cVIPu_JPEG/109639343742150118_36609737.jpg?type=m510",
                "alt": "대표이미지",
                "width": 510,
                "height": 510,
                "position": 429,
                "ocr_result": "KAPPA 무소음 클래식 알람시계",
            },
            {
                "src": "https://shop-phinf.pstatic.net/20240830_232/1725009670068UVJQ7_JPEG/7609239839907486_1267916781.jpg?type=f220_220",
                "alt": "@카파 심플 무소음 탁상시계 모던 인테리어 전자음 알람시계 T925",
                "width": 220,
                "height": 220,
                "position": 1925.5,
                "ocr_result": "T925 모던 디자인",
            },
            {
                "src": "https://shop-phinf.pstatic.net/20231106_200/1699263835494DgdvT_JPEG/intro.jpg?type=w860",
                "alt": "",
                "width": 860,
                "height": 752,
                "position": 3521,
                "ocr_result": "카파 브랜드 소개",
            },
            {
                "src": "https://shop-phinf.pstatic.net/20240219_79/17083345718557b6dR_JPEG/T917_1_01.jpg?type=w860",
                "alt": "",
                "width": 860,
                "height": 1512,
                "position": 4340,
                "ocr_result": "T917 제품 상세 스펙",
            },
            {
                "src": "https://phinf.pstatic.net/checkout.phinf/20230328_188/1679989345049lQI9L_JPEG/image.jpg?type=f300_300",
                "alt": "review_image",
                "width": 300,
                "height": 300,
                "position": 35353.71875,
                "ocr_result": "",
            },
        ],
    }
