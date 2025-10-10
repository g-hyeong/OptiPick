"""실제 상품 데이터를 사용한 Graph 테스트 (OCR 제외)

OCR API 호출을 피하고 filter_images_node와 analyze_product_node만 테스트
"""

import pytest

from src.graphs.summarize_page.nodes.analyze_product_node import analyze_product_node
from src.graphs.summarize_page.nodes.filter_images_node import filter_images_node


@pytest.mark.asyncio
async def test_filter_images_with_real_data(mock_real_product_data):
    """실제 상품 데이터로 filter_images_node 테스트"""
    # OCR 결과가 이미 포함된 상태
    state = mock_real_product_data.copy()

    result = await filter_images_node(state)

    # 결과 검증
    assert "valid_images" in result
    assert isinstance(result["valid_images"], list)

    print(f"\n=== Filter Images Result ===")
    print(f"Total images: {len(state['images'])}")
    print(f"Valid images: {len(result['valid_images'])}")
    print(f"Filter rate: {len(result['valid_images']) / len(state['images']) * 100:.1f}%")

    # 선택된 이미지들 출력
    for idx, img in enumerate(result["valid_images"]):
        print(f"\nImage {idx + 1}:")
        print(f"  Alt: {img.get('alt', 'N/A')}")
        print(f"  OCR: {img.get('ocr_result', 'N/A')}")
        print(f"  Position: {img.get('position')}")


@pytest.mark.asyncio
async def test_analyze_product_with_real_data(mock_real_product_data):
    """실제 상품 데이터로 analyze_product_node 테스트"""
    # 1. filter_images_node 실행
    state = mock_real_product_data.copy()
    filter_result = await filter_images_node(state)

    # 2. state 업데이트
    state["valid_images"] = filter_result["valid_images"]

    # 3. analyze_product_node 실행
    analysis_result = await analyze_product_node(state)

    # 결과 검증
    assert "product_analysis" in analysis_result
    product = analysis_result["product_analysis"]

    # 필수 필드 확인
    assert "product_name" in product
    assert "summary" in product
    assert "price" in product
    assert "key_features" in product
    assert "pros" in product
    assert "cons" in product
    assert "recommended_for" in product

    # 결과 출력
    print(f"\n=== Product Analysis Result ===")
    print(f"Product Name: {product['product_name']}")
    print(f"Summary: {product['summary']}")
    print(f"Price: {product['price']}")
    print(f"\nKey Features ({len(product['key_features'])}):")
    for idx, feature in enumerate(product["key_features"], 1):
        print(f"  {idx}. {feature}")
    print(f"\nPros ({len(product['pros'])}):")
    for idx, pro in enumerate(product["pros"], 1):
        print(f"  {idx}. {pro}")
    print(f"\nCons ({len(product['cons'])}):")
    for idx, con in enumerate(product["cons"], 1):
        print(f"  {idx}. {con}")
    print(f"\nRecommended For: {product['recommended_for']}")


@pytest.mark.asyncio
async def test_full_pipeline_with_real_data(mock_real_product_data):
    """실제 데이터로 전체 파이프라인 테스트 (OCR 제외)"""
    state = mock_real_product_data.copy()

    # 1. Filter images
    print("\n=== Step 1: Filter Images ===")
    filter_result = await filter_images_node(state)
    state["valid_images"] = filter_result["valid_images"]

    print(f"Filtered {len(filter_result['valid_images'])} images from {len(state['images'])}")

    # 2. Analyze product
    print("\n=== Step 2: Analyze Product ===")
    analysis_result = await analyze_product_node(state)
    state["product_analysis"] = analysis_result["product_analysis"]

    product = state["product_analysis"]
    print(f"Analysis complete: {product['product_name']}")

    # 최종 검증
    assert state["product_analysis"]["product_name"] != "unknown"
    assert len(state["valid_images"]) > 0

    print("\n=== Pipeline Complete ===")
    print(f"✓ Images filtered: {len(state['valid_images'])}")
    print(f"✓ Product analyzed: {product['product_name']}")
    print(f"✓ Features extracted: {len(product['key_features'])}")
