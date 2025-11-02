"""CompareProducts 그래프 테스트"""

import pytest

from src.graphs.compare_products import create_graph


@pytest.fixture
def sample_products():
    """테스트용 제품 데이터"""
    return [
        {
            "product_name": "맥북 프로 16인치",
            "summary": "M3 Max 칩셋을 탑재한 고성능 노트북",
            "price": "3,590,000원",
            "key_features": [
                "M3 Max 칩셋",
                "16GB 통합 메모리",
                "512GB SSD",
                "16.2인치 Liquid Retina XDR 디스플레이",
                "배터리 최대 22시간",
            ],
            "pros": ["강력한 성능", "뛰어난 디스플레이", "긴 배터리 수명"],
            "cons": ["높은 가격", "무거운 무게 (2.15kg)"],
            "recommended_for": "영상 편집, 3D 작업 등 고성능이 필요한 전문가",
            "recommendation_reasons": ["최고 수준의 처리 성능", "전문가용 디스플레이"],
            "not_recommended_reasons": ["예산이 제한적인 경우", "휴대성을 중시하는 경우"],
        },
        {
            "product_name": "LG 그램 17",
            "summary": "17인치 대화면에 초경량 디자인의 노트북",
            "price": "2,290,000원",
            "key_features": [
                "인텔 13세대 Core i7",
                "16GB RAM",
                "512GB NVMe SSD",
                "17인치 WQXGA 디스플레이",
                "배터리 최대 19.5시간",
                "무게 1.35kg",
            ],
            "pros": ["매우 가벼움", "대화면", "긴 배터리 수명"],
            "cons": ["성능이 맥북보다 낮음", "디스플레이 색재현율 다소 부족"],
            "recommended_for": "이동이 잦은 비즈니스 사용자, 대화면 필요한 업무용",
            "recommendation_reasons": ["17인치 화면에도 1.35kg의 경량", "휴대성과 화면 크기 양립"],
            "not_recommended_reasons": ["고성능 작업이 필요한 경우", "정확한 색재현이 중요한 경우"],
        },
        {
            "product_name": "삼성 갤럭시북4 Pro",
            "summary": "AI 기능과 AMOLED 디스플레이를 탑재한 프리미엄 노트북",
            "price": "2,090,000원",
            "key_features": [
                "인텔 Core Ultra 7",
                "16GB LPDDR5X RAM",
                "512GB SSD",
                "16인치 AMOLED 디스플레이",
                "배터리 최대 21시간",
                "AI 가속기 탑재",
            ],
            "pros": ["뛰어난 AMOLED 디스플레이", "AI 기능", "합리적인 가격"],
            "cons": ["키보드 타건감 호불호", "발열이 다소 있음"],
            "recommended_for": "AI 기능 활용하는 사용자, 선명한 화면 선호하는 사용자",
            "recommendation_reasons": ["AMOLED 디스플레이의 선명함", "AI 기능으로 생산성 향상"],
            "not_recommended_reasons": ["발열에 민감한 경우", "키보드 타건감을 중시하는 경우"],
        },
    ]


def test_graph_creation():
    """그래프 생성 테스트"""
    graph = create_graph()
    assert graph is not None
    # Checkpointer가 설정되어 있는지 확인
    assert graph.checkpointer is not None


@pytest.mark.asyncio
async def test_graph_hitl_flow(sample_products):
    """HITL 전체 플로우 테스트 (첫 번째 interrupt까지)

    실행: uv run pytest tests/test_compare_products.py::test_graph_hitl_flow -v -s
    """
    graph = create_graph()
    thread_id = "test-session-1"
    config = {"configurable": {"thread_id": thread_id}}

    # 1단계: 그래프 시작 (첫 번째 interrupt까지)
    state_input = {
        "category": "노트북",
        "products": sample_products,
    }

    result = await graph.ainvoke(state_input, config)

    # 첫 번째 interrupt 지점에서 중단되었는지 확인
    state = await graph.aget_state(config)
    assert state.next is not None  # 다음 노드가 있음 (중단됨)
    assert "collect_user_criteria" in state.next  # collect_user_criteria에서 대기 중

    print("\n=== 1단계: 첫 번째 interrupt 도달 ===")
    print(f"다음 노드: {state.next}")
    print(f"현재 State 키: {list(result.keys())}")

    # 2단계: 사용자 기준 입력 후 재개
    user_criteria = ["성능", "배터리", "무게", "가격"]
    result = await graph.ainvoke({"user_criteria": user_criteria}, config)

    # analyze_products 노드 실행 후 두 번째 interrupt에서 중단
    state = await graph.aget_state(config)
    assert "extracted_criteria" in result  # 비교 기준이 추출되었는지
    assert len(result["extracted_criteria"]) > 0

    print("\n=== 2단계: 비교 기준 추출 완료 ===")
    print(f"사용자 입력 기준: {user_criteria}")
    print(f"추출된 비교 기준: {result['extracted_criteria']}")
    print(f"다음 노드: {state.next}")

    # 두 번째 interrupt 지점 확인
    if state.next:
        assert "collect_user_priorities" in state.next

    # 3단계: 우선순위 입력 후 최종 완료
    extracted_criteria = result["extracted_criteria"]
    user_priorities = {criterion: idx + 1 for idx, criterion in enumerate(extracted_criteria[:5])}

    result = await graph.ainvoke({"user_priorities": user_priorities}, config)

    # 최종 보고서 생성 확인
    assert "comparison_report" in result
    report = result["comparison_report"]

    assert report is not None
    assert report["category"] == "노트북"
    assert report["total_products"] == 3
    assert len(report["ranked_products"]) == 3
    assert report["ranked_products"][0]["rank"] == 1  # 1위 제품 존재

    print("\n=== 3단계: 최종 보고서 생성 완료 ===")
    print(f"카테고리: {report['category']}")
    print(f"총 제품 수: {report['total_products']}")
    print(f"\n순위:")
    for product in report["ranked_products"]:
        print(f"  {product['rank']}위: {product['product_name']} (점수: {product['score']})")
    print(f"\n최종 추천:")
    print(f"  {report['recommendation'][:200]}...")

    # 그래프 완료 확인
    final_state = await graph.aget_state(config)
    assert final_state.next == ()  # 다음 노드 없음 (완료)


@pytest.mark.skip(reason="Requires real LLM API and takes time")
@pytest.mark.asyncio
async def test_graph_with_real_llm(sample_products):
    """실제 LLM을 사용한 End-to-End 테스트

    실행: uv run pytest tests/test_compare_products.py::test_graph_with_real_llm -v -s
    """
    graph = create_graph()
    thread_id = "real-test-session"
    config = {"configurable": {"thread_id": thread_id}}

    # 전체 플로우 실행
    print("\n=== 실제 LLM 테스트 시작 ===")

    # 1. 그래프 시작
    state_input = {"category": "노트북", "products": sample_products}
    await graph.ainvoke(state_input, config)

    # 2. 사용자 기준 입력
    user_criteria = ["성능", "배터리 수명", "무게", "가격", "디스플레이"]
    result = await graph.ainvoke({"user_criteria": user_criteria}, config)

    extracted_criteria = result.get("extracted_criteria", [])
    print(f"\n추출된 비교 기준: {extracted_criteria}")

    # 3. 우선순위 입력
    user_priorities = {
        extracted_criteria[0]: 1,
        extracted_criteria[1]: 2,
        extracted_criteria[2]: 3,
    }
    result = await graph.ainvoke({"user_priorities": user_priorities}, config)

    # 4. 결과 검증
    report = result["comparison_report"]

    print(f"\n=== 최종 보고서 ===")
    print(f"카테고리: {report['category']}")
    print(f"총 제품 수: {report['total_products']}\n")

    for product in report["ranked_products"]:
        print(f"{product['rank']}위: {product['product_name']}")
        print(f"  점수: {product['score']}")
        print(f"  강점: {', '.join(product['strengths'][:2])}")
        print(f"  약점: {', '.join(product['weaknesses'][:2])}\n")

    print(f"최종 추천:\n{report['recommendation']}\n")

    # 검증
    assert len(report["ranked_products"]) == 3
    assert all(p["rank"] in [1, 2, 3] for p in report["ranked_products"])
    assert report["summary"] != ""
    assert report["recommendation"] != ""
