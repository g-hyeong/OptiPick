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
