import type { ExtractedContent, ParserOptions } from '@/types/content';
import { extractPageContent } from './parsers';

/**
 * Content Script 초기화
 */
function init(): void {
  console.log('SmartCompare Content Script loaded');

  // 메시지 리스너 등록
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message, sendResponse);
    // 비동기 응답을 위해 true 반환
    return true;
  });
}

/**
 * 메시지 핸들러
 */
function handleMessage(
  message: any,
  sendResponse: (response?: any) => void
): void {
  try {
    switch (message.type) {
      case 'EXTRACT_CONTENT':
        handleExtractContent(message.options, sendResponse);
        break;

      case 'PING':
        sendResponse({ success: true, message: 'Content script is ready' });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * 콘텐츠 추출 처리
 */
function handleExtractContent(
  options: ParserOptions | undefined,
  sendResponse: (response: any) => void
): void {
  try {
    const content: ExtractedContent = extractPageContent(options);

    console.log('Extracted content:', {
      url: content.url,
      textsCount: content.texts.length,
      imagesCount: content.images.length,
    });

    sendResponse({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('Error extracting content:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract content',
    });
  }
}

// 초기화 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
