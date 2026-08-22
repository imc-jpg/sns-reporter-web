import DOMPurify from 'dompurify';

// 브라우저 환경에서 DOMPurify 인스턴스에 인라인 스타일 정제 훅 등록
if (typeof window !== 'undefined' && typeof DOMPurify?.addHook === 'function') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.hasAttribute('style')) {
      const style = node.getAttribute('style') || '';
      const cleaned = style
        .replace(/background(-color|-image|-position|-size|-repeat|-attachment|-origin|-clip)?\s*:\s*[^;"]+;?/gi, '')
        .replace(/color\s*:\s*[^;"]+;?/gi, '')
        .replace(/font-family\s*:\s*[^;"]+;?/gi, '')
        .replace(/font-size\s*:\s*[^;"]+;?/gi, '')
        .replace(/line-height\s*:\s*[^;"]+;?/gi, '')
        .trim();
      if (!cleaned) {
        node.removeAttribute('style');
      } else {
        node.setAttribute('style', cleaned);
      }
    }
    if (node.hasAttribute('bgcolor')) {
      node.removeAttribute('bgcolor');
    }
  });
}

/**
 * 노션, 워드, 한글, 웹페이지 등에서 복사된 HTML의
 * 불필요한 외계 폰트(font-family), 고정 폰트 크기(font-size), 고정 배경색(background, background-color), 고정 글자색(color) 등을 제거하여
 * 시스템 표준 서식과 다크모드에 자연스럽게 녹아들도록 정규화하는 함수
 */
export function normalizeHtmlStyles(html: string): string {
  if (!html) return '';

  return html
    // 1. bgcolor, text 속성 제거 (레거시 HTML 속성)
    .replace(/\s*bgcolor\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*text\s*=\s*["'][^"']*["']/gi, '')
    // 2. 인라인 style 내의 background 관련 속성 제거 (배경 흰색/회색 띠 원천 제거)
    .replace(/background(-color|-image|-position|-size|-repeat|-attachment|-origin|-clip)?\s*:\s*[^;"]+;?/gi, '')
    // 3. 인라인 style 내의 폰트 및 고정 글자색 속성 제거 (다크모드/라이트모드 테마 색상 상속)
    .replace(/font-family\s*:\s*[^;"]+;?/gi, '')
    .replace(/font-size\s*:\s*[^;"]+;?/gi, '')
    .replace(/color\s*:\s*[^;"]+;?/gi, '')
    .replace(/line-height\s*:\s*[^;"]+;?/gi, '')
    // 4. 레거시 <font> 태그 제거 (태그만 벗겨내고 내부 텍스트 유지)
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    // 5. 빈 style 속성 정리 (style="" 또는 style=" ")
    .replace(/\s*style\s*=\s*["']\s*["']/gi, '');
}

/**
 * XSS 방어를 위한 HTML 살균(Sanitize) 및 배경/폰트 서식 정규화 함수
 * @param dirty 위험할 수 있는 원본 HTML 문자열
 * @returns 안전하게 정제되고 서식이 정규화된 HTML 문자열
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  const normalized = normalizeHtmlStyles(dirty);

  if (typeof window === 'undefined') {
    return normalized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/javascript:[^"']*/g, '');
  }

  return DOMPurify.sanitize(normalized, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'div', 'br', 'span', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'del', 's', 'u', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt', 'title'],
    ADD_ATTR: ['target', 'rel'],
  });
}
