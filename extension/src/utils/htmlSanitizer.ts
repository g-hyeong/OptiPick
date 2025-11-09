import DOMPurify from 'dompurify';

/**
 * HTML 정제 설정
 */
const SANITIZE_CONFIG = {
  // 허용할 태그 목록
  ALLOWED_TAGS: [
    // 구조 태그
    'div',
    'section',
    'article',
    'main',
    'aside',
    'header',
    'footer',
    'nav',
    // 텍스트 태그
    'p',
    'span',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'mark',
    'small',
    'del',
    'ins',
    'sub',
    'sup',
    'blockquote',
    'pre',
    'code',
    // 리스트
    'ul',
    'ol',
    'li',
    'dl',
    'dt',
    'dd',
    // 테이블
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'caption',
    // 이미지 및 미디어
    'img',
    'picture',
    'source',
    'figure',
    'figcaption',
    // 링크
    'a',
    // 기타
    'label',
    'time',
    'address',
  ],

  // 허용할 속성 목록
  ALLOWED_ATTR: [
    'class',
    'id',
    'src',
    'alt',
    'href',
    'title',
    'data-*', // data 속성 허용
    'srcset',
    'sizes',
    'width',
    'height',
    'loading',
  ],

  // 요소 내용은 유지
  KEEP_CONTENT: true,

  // 상대 URL을 절대 URL로 변환하지 않음 (Agent에서 처리)
  WHOLE_DOCUMENT: false,
};

/**
 * HTML body를 정제하여 Agent로 전송 가능한 형태로 변환
 *
 * @param html - 원본 HTML 문자열 (document.body.innerHTML)
 * @returns 정제된 HTML 문자열
 */
export function sanitizeHTML(html: string): string {
  // DOMPurify로 XSS 방지 및 불필요한 요소 제거
  const cleaned = DOMPurify.sanitize(html, SANITIZE_CONFIG);

  // 추가 후처리: 연속된 공백 정리 및 불필요한 줄바꿈 제거
  return cleaned
    .replace(/\s+/g, ' ') // 연속된 공백을 하나로
    .replace(/>\s+</g, '><') // 태그 사이 공백 제거
    .trim();
}

/**
 * 현재 페이지의 body HTML을 정제하여 반환
 *
 * @returns 정제된 HTML body
 */
export function getCurrentPageHTML(): string {
  return sanitizeHTML(document.body.innerHTML);
}
