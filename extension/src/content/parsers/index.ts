import type { ExtractedContent } from '@/types/content';
import { sanitizeHTML } from '@/utils/htmlSanitizer';

/**
 * 페이지의 body 콘텐츠 추출
 *
 * - DOMPurify로 XSS 방지 정제
 * - Agent에서 도메인별 파서로 상세 파싱 처리
 */
export function extractPageContent(): ExtractedContent {
  // og:image 메타 태그에서 대표 이미지 추출
  const ogImage =
    document.querySelector('meta[property="og:image"]')?.getAttribute('content') || undefined;

  return {
    url: window.location.href,
    title: document.title,
    html_body: sanitizeHTML(document.body.innerHTML),
    og_image: ogImage,
    timestamp: Date.now(),
  };
}
