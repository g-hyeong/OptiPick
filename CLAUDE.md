# SmartCompare Project

## 프로젝트 개요
LLM을 활용하여 특정 군집 내 상품들을 지능적으로 비교 및 분석하는 Chrome Extension 기반 시스템

## 아키텍처

### 주요 컴포넌트
- **Extension**: Chrome Extension (TypeScript + React + Vite)
  - 사용자 인터랙션 처리
  - 웹페이지 데이터 추출 (Content Script)
  - Spring Boot API와 통신

- **API Server**: Spring Boot + Gradle
  - Extension 요청 라우팅
  - Agent 및 Data Pipeline 오케스트레이션
  - 비즈니스 로직 처리

- **Agent**: LangGraph + FastAPI (uv Python)
  - LLM 기반 상품 분석 및 비교
  - VectorDB 직접 연동 (실시간 검색, 소규모 write)
  - LangGraph 워크플로우 실행

- **Data Pipeline**: uv Python
  - Spring Boot 트리거 기반 실행
  - VectorDB 대규모 write 작업 (bulk embedding, update)
  - 데이터 전처리 및 임베딩 생성

### 통신 구조
```
Extension → Spring Boot API → Agent (FastAPI)
                            → Data Pipeline

Agent → VectorDB (read, 소규모 write)
Data Pipeline → VectorDB (대규모 write)
```

## 프로젝트 구조
```
SmartCompare/
├── extension/              # Chrome Extension
├── api-server/             # Spring Boot API
├── agent/                  # LangGraph Agent
├── data-pipeline/          # Data Processing & Embedding
├── shared/schemas/         # 공통 API 스키마
└── docker-compose.yml      # 로컬 개발 환경
```

## 기술 스택
- **Frontend**: TypeScript, React, Vite
- **Backend**: Spring Boot, Gradle
- **Agent**: Python (uv), LangGraph, FastAPI
- **Data Pipeline**: Python (uv)
- **Infrastructure**: Docker, PostgreSQL, Redis, VectorDB

## 개발 원칙
- 각 컴포넌트는 독립적으로 실행 가능
- 명확한 책임 분리 (Extension ↔ API ↔ Agent ↔ Data Pipeline)
- VectorDB 작업은 규모에 따라 Agent와 Data Pipeline으로 분리
