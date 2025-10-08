/**
 * 요소가 실제로 화면에 보이는지 확인
 */
export function isElementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  // display: none 또는 visibility: hidden 확인
  const style = window.getComputedStyle(element);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0'
  ) {
    return false;
  }

  // 요소의 크기 확인
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  return true;
}

/**
 * 요소의 고유 CSS 선택자 생성
 */
export function getElementSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className) {
      const classes = Array.from(current.classList)
        .filter((cls) => cls.trim().length > 0)
        .slice(0, 2) // 최대 2개 클래스만 사용
        .join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;

    // 경로가 너무 길어지지 않도록 제한
    if (path.length >= 5) {
      break;
    }
  }

  return path.join(' > ');
}

/**
 * 요소의 페이지 내 위치 계산 (상단으로부터의 거리)
 */
export function getElementPosition(element: Element): number {
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return rect.top + scrollTop;
}

/**
 * 특정 태그 목록에 포함되는지 확인
 */
export function isExcludedTag(element: Element, excludeTags: string[]): boolean {
  return excludeTags.includes(element.tagName.toLowerCase());
}

/**
 * 특정 선택자와 일치하는지 확인
 */
export function matchesExcludedSelector(
  element: Element,
  excludeSelectors: string[]
): boolean {
  return excludeSelectors.some((selector) => {
    try {
      return element.matches(selector) || element.closest(selector) !== null;
    } catch {
      // 잘못된 선택자는 무시
      return false;
    }
  });
}

/**
 * 절대 URL로 변환
 */
export function toAbsoluteUrl(url: string, baseUrl?: string): string {
  try {
    return new URL(url, baseUrl || window.location.href).href;
  } catch {
    return url;
  }
}

/**
 * 요소의 텍스트 내용 정리 (공백 제거, 트림)
 */
export function cleanTextContent(text: string): string {
  return text
    .replace(/\s+/g, ' ') // 연속된 공백을 하나로
    .trim();
}
