import DOMPurify from 'dompurify';

/**
 * 모든 표준 HTML5 태그 목록
 * DOMPurify는 화이트리스트 방식만 지원하므로, 가능한 모든 태그를 포함
 */
const ALL_HTML_TAGS = [
  // 구조 및 레이아웃
  'div', 'span', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav',
  'form', 'fieldset', 'legend', 'details', 'summary', 'dialog',
  // 텍스트
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i', 'u', 'mark',
  'small', 'del', 'ins', 'sub', 'sup', 'blockquote', 'pre', 'code', 'kbd', 'samp',
  'var', 'cite', 'dfn', 'abbr', 'time', 'address', 'q', 's', 'wbr', 'bdi', 'bdo',
  'ruby', 'rt', 'rp',
  // 리스트
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'menu',
  // 테이블
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'col', 'colgroup',
  // 이미지 및 미디어
  'img', 'picture', 'source', 'figure', 'figcaption', 'map', 'area',
  // 폼 요소
  'input', 'button', 'select', 'option', 'optgroup', 'textarea', 'label', 'output',
  'progress', 'meter', 'datalist',
  // 링크 및 임베드
  'a', 'template', 'slot',
  // 기타 유용한 태그
  'hr', 'br', 'data', 'noembed',
];

/**
 * HTML 정제 설정
 *
 * 전략: 최대한 많은 태그 허용 + 보안 위험 태그만 금지
 * - 모든 이커머스 사이트의 다양한 태그 구조 지원
 * - XSS 방지를 위해 script, style, iframe 등만 제거
 */
const SANITIZE_CONFIG = {
  // 허용할 태그: 거의 모든 HTML5 태그
  ALLOWED_TAGS: ALL_HTML_TAGS,

  // 금지할 태그 목록 (보안 및 불필요 요소만)
  FORBID_TAGS: [
    'script',   // JavaScript 실행 방지 (보안)
    'style',    // CSS는 분석에 불필요
    'iframe',   // 외부 프레임 제거 (보안)
    'object',   // Flash 등 레거시 플러그인 (보안)
    'embed',    // 외부 콘텐츠 삽입 (보안)
    'applet',   // Java 애플릿 (보안)
    'link',     // 외부 리소스 링크
    'meta',     // 메타 태그
    'base',     // Base URL
    'noscript', // JavaScript 비활성화 시 메시지
  ],

  // 허용할 속성: class, id, data-*, src, alt 등 대부분 허용
  ALLOWED_ATTR: [
    'class', 'id', 'name', 'type', 'value', 'placeholder',
    'src', 'alt', 'href', 'title',
    'data-*', 'aria-*', 'role',
    'srcset', 'sizes', 'width', 'height', 'loading',
    'colspan', 'rowspan', 'headers', 'scope',
    'for', 'form', 'action', 'method',
    'selected', 'checked', 'disabled', 'readonly', 'required',
    'min', 'max', 'step', 'pattern', 'maxlength', 'minlength',
    'target', 'rel', 'download',
  ],

  // 금지할 속성 목록 (보안 관련 이벤트 핸들러만)
  FORBID_ATTR: [
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
    'onkeydown', 'onkeyup', 'onfocus', 'onblur', 'onchange',
    'onsubmit', 'onreset', 'oninput', 'oninvalid', 'onselect',
    'ondblclick', 'onmousedown', 'onmouseup', 'onmousemove',
    'onwheel', 'ondrag', 'ondrop', 'oncopy', 'onpaste',
  ],

  // 요소 내용은 유지 (태그는 제거해도 텍스트는 보존)
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
