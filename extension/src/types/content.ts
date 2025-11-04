/**
 * 추출된 텍스트 요소
 */
export interface ExtractedText {
  content: string;
  tagName: string;
  position: number;
}

/**
 * 추출된 이미지 요소
 */
export interface ExtractedImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  position: number;
}

/**
 * 페이지에서 추출된 전체 콘텐츠
 */
export interface ExtractedContent {
  /** 페이지 URL */
  url: string;
  /** 페이지 제목 */
  title: string;
  /** 추출된 텍스트 목록 */
  texts: ExtractedText[];
  /** 추출된 이미지 목록 */
  images: ExtractedImage[];
  /** 추출 시점 */
  timestamp: number;
}

/**
 * 파서 설정 옵션
 */
export interface ParserOptions {
  /** 최소 텍스트 길이 (기본값: 10) */
  minTextLength?: number;
  /** 최소 이미지 크기 (기본값: 100x100) */
  minImageSize?: {
    width: number;
    height: number;
  };
  /** 제외할 태그 목록 */
  excludeTags?: string[];
  /** 제외할 CSS 선택자 */
  excludeSelectors?: string[];
}

/**
 * 상품 분석 API 요청
 */
export interface ProductAnalysisRequest {
  url: string;
  title: string;
  timestamp: number;
  texts: ExtractedText[];
  images: ExtractedImage[];
}

/**
 * OCR 결과를 포함한 이미지
 */
export interface ValidatedImage extends ExtractedImage {
  ocr_result: string;
}

/**
 * 상품 분석 결과
 */
export interface ProductAnalysis {
  product_name: string;
  summary: string;
  price: string;
  key_features: string[];
  pros: string[];
  cons: string[];
  recommended_for: string;
  recommendation_reasons: string[];
  not_recommended_reasons: string[];
}

/**
 * 상품 분석 API 응답
 */
export interface ProductAnalysisResponse {
  url: string;
  title: string;
  valid_images: ValidatedImage[];
  product_analysis: ProductAnalysis;
  timestamp: number;
}

// ========== 비교 기능 관련 타입 ==========

/**
 * 제품 비교 정보 (Agent로부터 받는 데이터)
 */
export interface ProductComparison {
  product_name: string;
  criteria_scores: { [criterion: string]: number }; // 0-100 점수
  strengths: string[];
  weaknesses: string[];
}

/**
 * 순위가 계산된 제품 정보 (Extension에서 계산)
 */
export interface RankedProduct extends ProductComparison {
  rank: number;
  score: number; // 우선순위 기반 최종 점수
}

/**
 * 비교 분석 리포트
 */
export interface ComparisonReportData {
  category: string;
  total_products: number;
  user_criteria: string[];
  user_priorities: { [criterion: string]: number };
  products: ProductComparison[]; // rank 없음, Extension에서 계산
  summary: string;
  recommendation: string;
}

/**
 * 비교 시작 API 요청
 */
export interface ComparisonStartRequest {
  category: string;
  products: ProductAnalysis[];
}

/**
 * 비교 시작 API 응답
 */
export interface ComparisonStartResponse {
  thread_id: string;
  status: string;
  question: string;
}

/**
 * 비교 계속 API 요청
 */
export interface ComparisonContinueRequest {
  user_input: string[] | { [criterion: string]: number };
}

/**
 * 비교 계속 API 응답
 */
export interface ComparisonContinueResponse {
  status: string;
  question?: string;
  criteria?: string[];
  report?: ComparisonReportData;
}
