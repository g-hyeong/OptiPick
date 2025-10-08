# SmartCompare Extension

Chrome Extension for extracting web page content (text, images) for LLM analysis.

## 프로젝트 구조

```
extension/
├── src/
│   ├── content/              # Content Script (페이지에 주입)
│   │   ├── index.ts          # 진입점, 메시지 핸들러
│   │   ├── parsers/          # 콘텐츠 추출 로직
│   │   │   ├── index.ts      # 통합 인터페이스
│   │   │   ├── textParser.ts # 텍스트 추출
│   │   │   └── imageParser.ts # 이미지 추출 (img, srcset, background-image 등)
│   │   └── filters/          # 필터링 로직
│   │       ├── index.ts      # 통합 인터페이스
│   │       ├── textFilter.ts # 유효한 텍스트 검증
│   │       └── imageFilter.ts # 유효한 이미지 검증
│   ├── popup/                # Popup UI
│   │   ├── index.html        # UI 레이아웃
│   │   └── popup.ts          # UI 로직, Content Script 통신
│   ├── background/           # Background Service Worker
│   │   └── index.ts          # 백그라운드 이벤트 처리
│   ├── types/                # TypeScript 타입 정의
│   │   └── content.ts        # 추출 데이터 스키마
│   └── utils/                # 공통 유틸리티
│       └── domHelpers.ts     # DOM 조작 헬퍼 함수
├── public/                   # 정적 리소스
├── dist/                     # 빌드 결과물 (Git 제외)
├── manifest.json             # Chrome Extension 설정
├── package.json              # npm 설정
├── tsconfig.json             # TypeScript 설정
└── vite.config.ts            # Vite 빌드 설정
```

## 추출 데이터 스키마

### 전체 구조
```typescript
interface ExtractedContent {
  url: string;              // 페이지 URL
  title: string;            // 페이지 제목
  texts: ExtractedText[];
  images: ExtractedImage[];
  timestamp: number;        // 추출 시점 (Unix timestamp)
}
```

### 텍스트
```typescript
interface ExtractedText {
  content: string;          // 텍스트 내용
  tagName: string;          // HTML 태그명 (h1, p, span 등)
  position: number;         // 페이지 상단으로부터 픽셀 거리
}
```

**추출 대상:**
- h1, h2, h3, h4, h5, h6, p, span, div, article, section, li, td, th, blockquote, pre, code, label, a

**필터링:**
- 최소 길이: 10자
- 제외: nav, header, footer, 광고, 숨겨진 요소
- 숫자/특수문자만 있는 텍스트 제거

### 이미지
```typescript
interface ExtractedImage {
  src: string;              // 이미지 URL (절대 경로)
  alt: string;              // 대체 텍스트
  width: number;            // 너비 (픽셀)
  height: number;           // 높이 (픽셀)
  position: number;         // 페이지 상단으로부터 픽셀 거리
}
```

**추출 소스:**
1. `<img src="...">` - 기본 이미지
2. `<img srcset="...">` - 반응형 이미지
3. `<picture><source srcset="...">` - picture 태그
4. CSS `background-image: url(...)` - 배경 이미지
5. Lazy loading 속성 (`data-src`, `data-lazy-src`, `data-original`)

**필터링:**
- 최소 크기: 100x100px
- 제외: 아이콘, 로고, SVG, 1x1 추적 픽셀, 극단적 비율 이미지
- 중복 URL 제거

## 개발 가이드

### 빌드
```bash
npm install
npm run build
```

빌드 결과물: `dist/` 폴더

### 크롬 익스텐션 로드
1. `chrome://extensions/` 이동
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `dist/` 폴더 선택

### 테스트
1. 웹페이지 방문
2. 페이지 새로고침 (F5) - Content Script 주입
3. 익스텐션 아이콘 클릭
4. "Extract Content" 버튼 클릭
5. 결과 확인 (콘솔에서 전체 JSON 확인 가능)

### 코드 수정 후 재로드
```bash
npm run build
```
크롬 익스텐션 페이지에서 새로고침 버튼 클릭

## 통신 구조

### Content Script ↔ Popup
```typescript
// Popup → Content Script
chrome.tabs.sendMessage(tabId, {
  type: 'EXTRACT_CONTENT',
  options: {
    minTextLength: 10,
    minImageSize: { width: 100, height: 100 }
  }
});

// Content Script → Popup
sendResponse({
  success: true,
  data: ExtractedContent
});
```

### 메시지 타입
- `PING`: Content Script 상태 확인
- `EXTRACT_CONTENT`: 콘텐츠 추출 요청

## 주요 설계 원칙

### LLM 친화적 데이터
- **position**: 페이지 레이아웃 구조 파악 (위에서 아래로 정렬)
- **tagName**: 텍스트 중요도 판단 (h1 > p)
- **width/height**: 이미지 크기로 메인/서브 구분
- **alt**: 이미지 내용 설명

### 확장 가능한 구조
- Parser/Filter 패턴으로 새로운 콘텐츠 타입 추가 용이
- 각 모듈 독립적으로 관리
- 타입 안전성 보장 (TypeScript)

### 성능 최적화
- 중복 제거 (Set 사용)
- 불필요한 요소 필터링
- 효율적인 DOM 순회

## 향후 확장 가능성

현재 구조로 추가 가능한 기능:
- 비디오 추출 (`<video>` 태그)
- 링크 추출 (`<a href>`)
- 메타데이터 추출 (og:image, description 등)
- 구조화된 데이터 (JSON-LD)
- 테이블 데이터 추출
- 폼 필드 정보
- 스크린샷 캡처
