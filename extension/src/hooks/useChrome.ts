import { useCallback } from "react";

/**
 * Chrome API 래퍼 Hook
 */
export function useChrome() {
  // Storage 읽기
  const getStorage = useCallback(async <T = any>(keys: string | string[]): Promise<T> => {
    return chrome.storage.local.get(keys) as Promise<T>;
  }, []);

  // Storage 쓰기
  const setStorage = useCallback(async (items: { [key: string]: any }): Promise<void> => {
    return chrome.storage.local.set(items);
  }, []);

  // Storage 삭제
  const removeStorage = useCallback(async (keys: string | string[]): Promise<void> => {
    return chrome.storage.local.remove(keys);
  }, []);

  // Background worker에 메시지 전송
  const sendMessage = useCallback(async <T = any>(message: any): Promise<T> => {
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
    getStorage,
    setStorage,
    removeStorage,
    sendMessage,
    getCurrentTab,
    openTab,
  };
}
