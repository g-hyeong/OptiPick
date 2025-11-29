/**
 * Chrome API 래퍼 Hook
 *
 * Storage 관련 함수는 IndexedDB (Dexie)로 마이그레이션되었습니다.
 * - 제품 관련: useProducts hook
 * - 히스토리 관련: useAnalysisHistory hook
 * - 템플릿 관련: useTemplates hook
 * - 카테고리 관련: useCategories hook
 */
import { useCallback } from 'react';

export function useChrome() {
  // Background worker에 메시지 전송
  const sendMessage = useCallback(async <T = unknown>(message: unknown): Promise<T> => {
    return chrome.runtime.sendMessage(message);
  }, []);

  // 현재 탭 가져오기
  const getCurrentTab = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }, []);

  // 새 탭 열기
  const openTab = useCallback(async (url: string) => {
    return chrome.tabs.create({ url });
  }, []);

  return {
    sendMessage,
    getCurrentTab,
    openTab,
  };
}
