import { Readability } from '@mozilla/readability';
import { sanitizeHTML } from './htmlSanitizer';

/**
 * Readability로 추출된 메인 콘텐츠
 */
export interface ReadableContent {
  title: string;
  content: string; // 정제된 HTML
  textContent: string; // 순수 텍스트
}

/**
 * Mozilla Readability.js를 사용하여 페이지의 메인 콘텐츠만 추출
 *
 * - 광고, 네비게이션, 사이드바 등 노이즈 자동 제거
 * - 실패 시 전체 body로 fallback
 * - DOMPurify로 추가 정제하여 보안 유지
 *
 * @returns ReadableContent 객체
 */
export function extractMainContent(): ReadableContent {
  try {
    // Readability는 원본 document를 수정하므로 clone 필요
    const documentClone = document.cloneNode(true) as Document;

    const reader = new Readability(documentClone, {
      // 최소 콘텐츠 길이 (너무 짧은 페이지 거부)
      charThreshold: 500,
      // 디버그 모드 (개발 시 유용)
      debug: false,
    });

    const article = reader.parse();

    if (!article) {
      console.warn('Readability failed to parse, falling back to full body');
      return getFallbackContent();
    }

    console.log('Readability extracted:', {
      title: article.title,
      contentLength: article.content.length,
      textLength: article.textContent.length,
    });

    return {
      title: article.title || document.title,
      content: sanitizeHTML(article.content), // DOMPurify로 추가 정제
      textContent: article.textContent,
    };
  } catch (error) {
    console.error('Readability error:', error);
    console.warn('Falling back to full body');
    return getFallbackContent();
  }
}

/**
 * Readability 실패 시 fallback: 전체 body 사용
 */
function getFallbackContent(): ReadableContent {
  return {
    title: document.title,
    content: sanitizeHTML(document.body.innerHTML),
    textContent: document.body.innerText,
  };
}
