import type { ExtractedContent } from '@/types/content';
import { extractMainContent } from '@/utils/readability';

/**
 * Readability.js로 페이지의 메인 콘텐츠 추출
 *
 * - 광고, 네비게이션, 사이드바 등 자동 제거
 * - Agent로 전송되는 데이터 크기 감소
 * - 파싱 정확도 향상
 */
export function extractPageContent(): ExtractedContent {
  const { title, content } = extractMainContent();

  return {
    url: window.location.href,
    title,
    html_body: content, // Readability + DOMPurify로 정제된 HTML
    timestamp: Date.now(),
  };
}
