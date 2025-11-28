import type { ExtractedContent } from '@/types/content';
import { sanitizeHTML } from '@/utils/htmlSanitizer';

/**
 * 페이지의 body 콘텐츠 추출
 *
 * - DOMPurify로 XSS 방지 정제
 * - Agent에서 도메인별 파서로 상세 파싱 처리
 */
export function extractPageContent(): ExtractedContent {
  return {
    url: window.location.href,
    title: document.title,
    html_body: sanitizeHTML(document.body.innerHTML),
    timestamp: Date.now(),
  };
}
