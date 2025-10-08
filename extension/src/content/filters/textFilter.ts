import {
  isElementVisible,
  isExcludedTag,
  matchesExcludedSelector,
  cleanTextContent,
} from '@/utils/domHelpers';

/**
 * 기본 제외 태그 목록
 * 네비게이션, 스크립트, 스타일 등 콘텐츠가 아닌 요소들
 */
const DEFAULT_EXCLUDE_TAGS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'path',
  'meta',
  'link',
  'head',
];

/**
 * 기본 제외 선택자
 * 광고, 네비게이션, 푸터 등
 */
const DEFAULT_EXCLUDE_SELECTORS = [
  'nav',
  'header',
  'footer',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '.advertisement',
  '.ad',
  '.ads',
  '.sidebar',
  '.menu',
  '.navigation',
  '#cookie-notice',
  '#cookie-banner',
];

/**
 * 텍스트가 의미있는 콘텐츠인지 확인
 */
export function isValidText(
  _element: Element,
  text: string,
  minLength: number = 10
): boolean {
  // 빈 텍스트 제거
  const cleanedText = cleanTextContent(text);
  if (cleanedText.length < minLength) {
    return false;
  }

  // 숫자만 있는 텍스트 제거 (페이지 번호 등)
  if (/^\d+$/.test(cleanedText)) {
    return false;
  }

  // 특수문자만 있는 텍스트 제거
  if (/^[^\w\s가-힣]+$/.test(cleanedText)) {
    return false;
  }

  return true;
}

/**
 * 텍스트 요소가 추출 대상인지 확인
 */
export function shouldExtractText(
  element: Element,
  excludeTags: string[] = DEFAULT_EXCLUDE_TAGS,
  excludeSelectors: string[] = DEFAULT_EXCLUDE_SELECTORS
): boolean {
  // 가시성 확인
  if (!isElementVisible(element)) {
    return false;
  }

  // 제외 태그 확인
  if (isExcludedTag(element, excludeTags)) {
    return false;
  }

  // 제외 선택자 확인
  if (matchesExcludedSelector(element, excludeSelectors)) {
    return false;
  }

  return true;
}

/**
 * 텍스트 추출 시 사용할 기본 설정
 */
export const TEXT_FILTER_DEFAULTS = {
  excludeTags: DEFAULT_EXCLUDE_TAGS,
  excludeSelectors: DEFAULT_EXCLUDE_SELECTORS,
  minTextLength: 10,
} as const;
