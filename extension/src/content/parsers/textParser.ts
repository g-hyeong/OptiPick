import type { ExtractedText, ParserOptions } from '@/types/content';
import { cleanTextContent, getElementPosition } from '@/utils/domHelpers';
import {
  shouldExtractText,
  isValidText,
  TEXT_FILTER_DEFAULTS,
} from '../filters/textFilter';

/**
 * 텍스트가 포함된 주요 태그들
 */
const TEXT_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'span',
  'div',
  'article',
  'section',
  'li',
  'td',
  'th',
  'blockquote',
  'pre',
  'code',
  'label',
  'a',
];

/**
 * DOM에서 텍스트 추출
 */
export function extractTexts(options: ParserOptions = {}): ExtractedText[] {
  const {
    minTextLength = TEXT_FILTER_DEFAULTS.minTextLength,
    excludeTags = TEXT_FILTER_DEFAULTS.excludeTags,
    excludeSelectors = TEXT_FILTER_DEFAULTS.excludeSelectors,
  } = options;

  const extractedTexts: ExtractedText[] = [];
  const processedElements = new Set<Element>();

  // 각 텍스트 태그별로 순회
  TEXT_TAGS.forEach((tag) => {
    const elements = document.querySelectorAll(tag);

    elements.forEach((element) => {
      // 이미 처리된 요소는 건너뛰기
      if (processedElements.has(element)) {
        return;
      }

      // 추출 대상인지 확인
      if (!shouldExtractText(element, excludeTags, excludeSelectors)) {
        return;
      }

      // 직접적인 텍스트 노드만 추출 (자식 요소의 텍스트 제외)
      const textContent = getDirectTextContent(element);
      if (!textContent) {
        return;
      }

      // 텍스트 유효성 검사
      if (!isValidText(element, textContent, minTextLength)) {
        return;
      }

      extractedTexts.push({
        content: cleanTextContent(textContent),
        tagName: element.tagName.toLowerCase(),
        position: getElementPosition(element),
      });

      processedElements.add(element);
    });
  });

  return extractedTexts.sort((a, b) => a.position - b.position);
}

/**
 * 요소의 직접적인 텍스트 내용만 추출 (자식 요소 제외)
 */
function getDirectTextContent(element: Element): string {
  let text = '';

  // 자식 노드 순회
  element.childNodes.forEach((node) => {
    // 텍스트 노드만 추출
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    }
  });

  return text.trim();
}
