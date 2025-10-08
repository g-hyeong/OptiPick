import {
  isElementVisible,
  matchesExcludedSelector,
} from '@/utils/domHelpers';

/**
 * 기본 제외 선택자 (아이콘, 로고 등)
 */
const DEFAULT_EXCLUDE_SELECTORS = [
  '.icon',
  '.logo',
  '[role="presentation"]',
  '[aria-hidden="true"]',
  '.avatar',
  '.thumbnail',
  'nav img',
  'header img',
  'footer img',
];

/**
 * 기본 최소 이미지 크기
 */
const DEFAULT_MIN_SIZE = {
  width: 100,
  height: 100,
};

/**
 * 이미지가 유효한 콘텐츠 이미지인지 확인
 */
export function isValidImage(
  img: HTMLImageElement,
  minSize = DEFAULT_MIN_SIZE
): boolean {
  // src 속성 확인
  if (!img.src || img.src.startsWith('data:image/svg')) {
    return false;
  }

  // 크기 확인
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (width < minSize.width || height < minSize.height) {
    return false;
  }

  // 1x1 추적 픽셀 제거
  if (width === 1 && height === 1) {
    return false;
  }

  // 너무 가로로 긴 이미지 제거 (배너 등)
  const aspectRatio = width / height;
  if (aspectRatio > 10 || aspectRatio < 0.1) {
    return false;
  }

  return true;
}

/**
 * 이미지 요소가 추출 대상인지 확인
 */
export function shouldExtractImage(
  img: HTMLImageElement,
  excludeSelectors: string[] = DEFAULT_EXCLUDE_SELECTORS
): boolean {
  // 가시성 확인
  if (!isElementVisible(img)) {
    return false;
  }

  // 제외 선택자 확인
  if (matchesExcludedSelector(img, excludeSelectors)) {
    return false;
  }

  // 배경 이미지 역할 확인
  const role = img.getAttribute('role');
  if (role === 'presentation' || role === 'none') {
    return false;
  }

  return true;
}

/**
 * 이미지 추출 시 사용할 기본 설정
 */
export const IMAGE_FILTER_DEFAULTS = {
  excludeSelectors: DEFAULT_EXCLUDE_SELECTORS,
  minSize: DEFAULT_MIN_SIZE,
} as const;
