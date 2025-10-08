import {
  isElementVisible,
  matchesExcludedSelector,
} from '@/utils/domHelpers';

/**
 * 기본 제외 선택자
 */
const DEFAULT_EXCLUDE_SELECTORS = [
  'nav video',
  'header video',
  'footer video',
  '.advertisement video',
];

/**
 * 기본 최소 비디오 크기
 */
const DEFAULT_MIN_SIZE = {
  width: 200,
  height: 150,
};

/**
 * 비디오가 유효한 콘텐츠 비디오인지 확인
 */
export function isValidVideo(
  video: HTMLVideoElement,
  minSize = DEFAULT_MIN_SIZE
): boolean {
  // src 또는 source 태그 확인
  const hasSrc = video.src || video.querySelector('source');
  if (!hasSrc) {
    return false;
  }

  // 크기 확인
  const width = video.videoWidth || video.width || video.clientWidth;
  const height = video.videoHeight || video.height || video.clientHeight;

  if (width < minSize.width || height < minSize.height) {
    return false;
  }

  return true;
}

/**
 * 비디오 요소가 추출 대상인지 확인
 */
export function shouldExtractVideo(
  video: HTMLVideoElement,
  excludeSelectors: string[] = DEFAULT_EXCLUDE_SELECTORS
): boolean {
  // 가시성 확인
  if (!isElementVisible(video)) {
    return false;
  }

  // 제외 선택자 확인
  if (matchesExcludedSelector(video, excludeSelectors)) {
    return false;
  }

  return true;
}

/**
 * 비디오 추출 시 사용할 기본 설정
 */
export const VIDEO_FILTER_DEFAULTS = {
  excludeSelectors: DEFAULT_EXCLUDE_SELECTORS,
  minSize: DEFAULT_MIN_SIZE,
} as const;
