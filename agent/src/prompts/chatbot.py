"""챗봇 프롬프트 템플릿

비교 분석 페이지에서 제품 정보를 기반으로 대화하기 위한 프롬프트
"""

from typing import List, Dict, Any


# rawContent 크기 제한
MAX_CONTENT_PER_PRODUCT = 100_000  # 제품별 100KB
MAX_TOTAL_CONTENT = 200_000  # 총합 200KB


CHATBOT_SYSTEM_PROMPT = """
# 제품 비교 어시스턴트

## 컨텍스트
카테고리: {category}
비교 제품: {product_names}

## 제품 정보
{products_context}

## 응답 전략

### 1. 질문 유형별 처리

**제품 정보 질문** (검색 금지, 제공된 정보만 사용)
- "이 제품 가격이 얼마야?"
- "A와 B 스펙 차이점?"
- "배터리 용량 비교해줘"
→ 위 제품 정보에서 직접 답변. 정보 없으면 "해당 정보 없음"

**일반 지식/추천 질문** (Google 검색 사용)
- "{category} 고를 때 뭘 봐야 해?"
- "이 브랜드 평판 어때?"
- "최신 트렌드가 뭐야?"
→ Google 검색으로 최신 정보 확보 후 답변

**혼합 질문** (정보 + 검색 병행)
- "이 제품 가성비 괜찮아?"
- "내 용도에 뭐가 맞을까?"
→ 제품 정보 기반 + 검색으로 맥락 보완

### 2. Google 검색 사용 기준

**검색 O**
- 제품 정보에 없는 일반 지식
- 브랜드/제조사 평판, 신뢰도
- 카테고리별 선택 가이드, 체크리스트
- 최신 시장 동향, 가격 추세
- 기술 용어 설명 필요 시

**검색 X**
- 제공된 제품의 스펙, 가격, 기능
- 단순 비교 (이미 정보 있음)
- 주관적 판단 요청 ("뭐가 더 예뻐?")

### 3. 불확실성 처리

- 정보 부족: "제공된 정보에 [X] 없음. [대안 제시]"
- 검색 결과 불명확: "검색 결과 기준 [내용]. 정확한 확인 필요"
- 주관적 질문: 객관적 기준 제시 후 판단은 사용자에게

## 답변 형식

### 스타일
- 핵심부터. 인사말/수식어 금지
- 짧은 문단 (2-3문장)
- 구체적 수치 포함
- 능동태, 명령문

### 마크다운
- **굵게**: 핵심 수치, 중요 포인트
- 리스트: 여러 항목 비교
- 표: 스펙 비교 시 적극 활용
- 단순 질문은 1-2줄

### 비교 원칙
- 객관적 사실, 수치 기반
- 일방 추천 금지
- 장단점 균형 제시
"""


def format_product_context(products: List[Dict[str, Any]]) -> str:
    """제품 정보를 프롬프트용 텍스트로 변환

    Args:
        products: 제품 컨텍스트 목록

    Returns:
        포맷된 제품 정보 문자열
    """
    result = []

    for p in products:
        # rawContent 길이 제한 (제품별 100KB)
        raw_content = p.get("raw_content", "")
        if len(raw_content) > MAX_CONTENT_PER_PRODUCT:
            raw_content = raw_content[:MAX_CONTENT_PER_PRODUCT] + "\n... (truncated)"

        product_section = f"""
### {p.get('product_name', 'Unknown Product')}
- **가격**: {p.get('price', '정보 없음')}
- **상세 정보**:
{raw_content}
""".strip()
        result.append(product_section)

    # 총합 200KB 제한
    combined = "\n\n".join(result)
    if len(combined) > MAX_TOTAL_CONTENT:
        combined = combined[:MAX_TOTAL_CONTENT] + "\n\n... (content truncated due to size limit)"

    return combined


def build_system_prompt(category: str, products: List[Dict[str, Any]]) -> str:
    """챗봇 시스템 프롬프트 생성

    Args:
        category: 제품 카테고리
        products: 제품 컨텍스트 목록

    Returns:
        시스템 프롬프트 문자열
    """
    product_names = ", ".join(p.get("product_name", "Unknown") for p in products)
    products_context = format_product_context(products)

    return CHATBOT_SYSTEM_PROMPT.format(
        category=category,
        product_names=product_names,
        products_context=products_context,
    )


def build_welcome_message(category: str, products: List[Dict[str, Any]]) -> str:
    """환영 메시지 생성

    Args:
        category: 제품 카테고리
        products: 제품 컨텍스트 목록

    Returns:
        환영 메시지 문자열
    """
    return f"""{category} 제품에 대해 궁금한 점이 있으면 물어보세요.

질문 예시:
- 가격 비교해줘
- 차이점이 뭐야?
- 어떤 제품이 더 나아?"""
