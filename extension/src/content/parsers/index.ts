import type { ExtractedContent } from '@/types/content';
import { sanitizeHTML } from '@/utils/htmlSanitizer';

/**
 * 페이지의 HTML body 추출
 */
export function extractPageContent(): ExtractedContent {
  return {
    url: window.location.href,
    title: document.title,
    html_body: sanitizeHTML(document.body.innerHTML),
    timestamp: Date.now(),
  };
}
