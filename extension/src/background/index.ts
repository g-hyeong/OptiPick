/**
 * Background Service Worker
 */

// 익스텐션 설치 시
chrome.runtime.onInstalled.addListener(() => {
  console.log('SmartCompare Extension installed');
});

// Content Script와의 통신 중계
chrome.runtime.onMessage.addListener((message) => {
  console.log('Background received message:', message.type);

  // 필요시 API 서버와의 통신 로직을 여기에 추가
  // 현재는 단순 로깅만 수행

  return false;
});
