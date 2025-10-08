import type { ExtractedContent, ParserOptions } from '@/types/content';
import { extractTexts } from './textParser';
import { extractImages } from './imageParser';

/**
 * 페이지의 모든 콘텐츠 추출
 */
export function extractPageContent(
  options: ParserOptions = {}
): ExtractedContent {
  return {
    url: window.location.href,
    title: document.title,
    texts: extractTexts(options),
    images: extractImages(options),
    timestamp: Date.now(),
  };
}

// 개별 파서 export
export { extractTexts } from './textParser';
export { extractImages } from './imageParser';
