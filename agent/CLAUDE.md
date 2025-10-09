# Agent (SmartCompare)

## 개요
LangGraph 기반 Agent 서버. FastAPI를 통해 REST API를 제공하며, LLM을 활용한 상품 분석 및 비교 워크플로우를 실행합니다.

## 기술 스택
- **Python 3.11+** (uv 패키지 매니저)
- **LangGraph**: 워크플로우 그래프 오케스트레이션
- **LangChain**: LLM 호출 및 통합
- **FastAPI**: REST API 서버
- **Pydantic**: 데이터 검증 및 설정 관리

## 프로젝트 구조

```
agent/
├── src/
│   ├── api/                    # FastAPI 서버 및 라우터
│   │   ├── main.py            # FastAPI 앱 정의
│   │   ├── server.py          # 서버 실행 엔트리포인트
│   │   ├── schemas.py         # API Request/Response 스키마
│   │   └── routers/           # API 엔드포인트 라우터
│   │
│   ├── graphs/                # LangGraph 워크플로우 정의
│   │   └── summarize_page/    # 페이지 요약 그래프
│   │       ├── config.py      # 그래프별 설정
│   │       ├── state.py       # State 정의 (TypedDict)
│   │       ├── nodes/         # 그래프 노드 (각 처리 단위)
│   │       └── exceptions.py  # 그래프별 예외
│   │
│   ├── config/                # 공통 설정
│   │   └── base.py            # BaseSettings (환경변수 로드)
│   │
│   ├── exceptions/            # 예외 정의
│   │   ├── base.py            # BaseException
│   │   └── llm.py             # LLM 관련 예외
│   │
│   ├── utils/                 # 유틸리티
│   │   ├── logger.py          # 로거 설정
│   │   └── llm/               # LLM 호출 유틸
│   │       ├── client.py      # LLMClient (multi-provider)
│   │       └── formatters/    # 출력 포맷터 (json/markdown/csv)
│   │
│   ├── prompts/               # LLM 프롬프트 템플릿
│   ├── tools/                 # LangChain Tool 정의
│   ├── chains/                # LangChain Chain 정의
│   └── models/                # Pydantic 모델 (공통 데이터 구조)
│
└── tests/                     # 테스트
    ├── unit/                  # 단위 테스트
    ├── integration/           # 통합 테스트
    └── conftest.py            # pytest 설정
```

## 핵심 개념

### 1. LangGraph 워크플로우
각 비즈니스 로직은 `graphs/` 하위에 독립적인 그래프로 구현됩니다.

**그래프 구성 요소:**
- **State**: TypedDict 기반 상태 정의 (`state.py`)
- **Nodes**: 각 처리 단위 함수 (`nodes/`)
- **Config**: 그래프별 설정 (`config.py`, BaseSettings 상속)
- **Exceptions**: 그래프별 예외 (`exceptions.py`)

**예시: summarize_page 그래프**
```python
# state.py - 상태 정의
class SummarizePageState(TypedDict):
    url: str
    texts: list[ExtractedText]
    images: list[ExtractedImage]
    ocr_results: list[OCRResult]

# nodes/ocr_node.py - 노드 구현
async def ocr_node(state: SummarizePageState) -> dict:
    # 이미지에서 텍스트 추출
    return {"ocr_results": results}
```

### 2. LLM 호출 (utils/llm)

**LLMClient**: multi-provider LLM 통합 클라이언트
- `init_chat_model` 기반 (OpenAI, Anthropic, Google 등)
- 출력 포맷 자동 처리 (json/markdown/csv)
- Pydantic structured output 지원

**기본 설정:**
- Provider: `google_genai`
- Model: `gemini-2.5-flash`
- Temperature: `0.7`

**사용 예시:**
```python
from src.utils.llm import LLMClient

# 기본 사용
llm = LLMClient(provider="google_genai", model="gemini-2.5-flash")
result = await llm.invoke(
    messages=[{"role": "user", "content": "..."}],
    output_format="json"
)

# Pydantic structured output
from pydantic import BaseModel

class Summary(BaseModel):
    title: str
    key_points: list[str]

result = await llm.invoke(messages=[...], output_format=Summary)
```

### 3. 설정 관리 (config/)

**BaseSettings**: Pydantic Settings 기반
- `.env` 파일에서 환경변수 자동 로드
- 타입 안전성 보장
- 그래프별 설정은 BaseSettings 상속

**필수 환경변수:**
```bash
# Google AI (Gemini)
GOOGLE_API_KEY=your_api_key

# OCR API
OCR_API_KEY=your_ocr_key
```

### 4. 예외 처리 (exceptions/)

**계층 구조:**
```
BaseException (base.py)
├── ConfigurationError
├── HTTPError
├── TimeoutError
└── LLMError (llm.py)
    ├── LLMProviderError
    ├── LLMInvocationError
    ├── LLMFormatError
    └── LLMConfigurationError
```

**예외 사용 원칙:**
- `details` dict로 상세 정보 전달
- 로깅과 함께 사용 (`logger.error(e.message, extra=e.details)`)
- Fail fast: 설정 오류는 즉시 raise

### 5. API 스키마 (api/schemas.py)

**Request/Response 스키마:**
- Pydantic BaseModel 기반
- FastAPI 자동 문서화 및 검증
- Graph State와 분리 (변환 필요)

**변환 패턴:**
```python
# Request → State
state = SummarizePageState(**request.model_dump())

# State → Response
response = SummarizePageResponse(**state)
```

## 개발 가이드

### 새로운 그래프 추가

1. `graphs/` 하위에 디렉토리 생성
2. 필수 파일 작성:
   - `state.py`: State 정의 (TypedDict)
   - `config.py`: 그래프별 설정 (BaseSettings 상속)
   - `nodes/`: 노드 함수들
   - `exceptions.py`: 그래프별 예외
3. `api/routers/`에 라우터 추가
4. `api/schemas.py`에 Request/Response 스키마 추가

### 노드 작성 가이드

```python
async def example_node(state: YourState) -> dict:
    """노드 설명"""
    try:
        # 1. State에서 필요한 데이터 추출
        input_data = state["key"]

        # 2. 비즈니스 로직 처리
        result = await process(input_data)

        # 3. 로깅
        logger.info("Processing completed", extra={"count": len(result)})

        # 4. State 업데이트를 위한 dict 반환
        return {"output_key": result}

    except SpecificError as e:
        logger.error(f"Error: {e.message}", extra=e.details)
        raise
```

### LLM 호출 패턴

```python
from src.config.base import BaseSettings
from src.utils.llm import LLMClient

settings = BaseSettings()

# 설정 기반 초기화
llm = LLMClient(
    provider=settings.default_llm_provider,
    model=settings.default_llm_model,
    temperature=settings.default_temperature
)

# JSON 출력
result = await llm.invoke(
    messages=[{"role": "user", "content": prompt}],
    output_format="json"
)

# Structured output (권장)
result = await llm.invoke(
    messages=[{"role": "user", "content": prompt}],
    output_format=YourPydanticModel
)
```

## 실행

```bash
# 개발 서버
uv run agent-server

# 또는
uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

## 테스트

```bash
# 전체 테스트
uv run pytest

# 특정 테스트
uv run pytest tests/test_ocr_node.py -v
```

## 주의사항

### 코드 스타일
- **주석**: 한글 (명확성 우선)
- **로그/에러 메시지**: 영문 (범용성)
- **이모지**: 사용 금지

### 아키텍처 원칙
- **책임 분리**: Graph ↔ Node ↔ Service 명확히 구분
- **유지보수성 > 가독성 > Clean Code**
- **최소 변경**: 문제 해결에 필요한 최소한의 수정만
- **Fail Fast**: 설정 오류는 초기화 시점에 검증

### LLM 사용
- `LLMClient` 사용 (직접 LangChain 호출 지양)
- Structured output 활용 (타입 안전성)
- 토큰 사용량 로깅 확인
