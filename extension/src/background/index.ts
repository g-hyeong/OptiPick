/**
 * Background Service Worker
 * 팝업이 닫혀도 계속 실행되는 분석 작업 처리
 */

import type { ExtractedContent } from '../types/content';
import type { AnalysisTask, StoredProduct } from '../types/storage';
import { analyzeProduct } from '../utils/api';
import { saveProduct } from '../utils/storage';

const TASK_STORAGE_KEY = 'currentTask';

/**
 * UUID 생성
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 현재 작업 상태 저장
 */
async function saveTaskState(task: AnalysisTask | null): Promise<void> {
  await chrome.storage.local.set({ [TASK_STORAGE_KEY]: task });
}

/**
 * 현재 작업 상태 가져오기
 */
async function getTaskState(): Promise<AnalysisTask | null> {
  const result = await chrome.storage.local.get(TASK_STORAGE_KEY);
  return result[TASK_STORAGE_KEY] || null;
}

/**
 * 작업 상태 업데이트
 */
async function updateTaskState(
  updates: Partial<AnalysisTask>
): Promise<void> {
  const currentTask = await getTaskState();
  if (currentTask) {
    const updatedTask = { ...currentTask, ...updates };
    await saveTaskState(updatedTask);
  }
}

/**
 * Content Script에서 콘텐츠 추출
 */
async function extractContentFromTab(
  tabId: number
): Promise<ExtractedContent> {
  // Content Script 준비 확인
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch {
    // Content script 없으면 주입
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });

    // 로드 대기
    let retries = 10;
    while (retries > 0) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
        retries--;
      }
    }
  }

  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'EXTRACT_CONTENT',
    options: {
      minTextLength: 10,
      minImageSize: { width: 100, height: 100 },
    },
  });

  if (!response.success) {
    throw new Error(response.error || '콘텐츠 추출 실패');
  }

  return response.data;
}

/**
 * 분석 작업 실행
 */
async function executeAnalysisTask(
  category: string,
  tabId: number
): Promise<void> {
  const taskId = generateUUID();

  try {
    // 1. 작업 초기화
    const task: AnalysisTask = {
      taskId,
      category,
      url: '',
      title: '',
      status: 'extracting',
      message: '페이지 정보를 추출하고 있습니다...',
      startedAt: Date.now(),
    };
    await saveTaskState(task);

    // 2. 콘텐츠 추출
    const content = await extractContentFromTab(tabId);

    await updateTaskState({
      url: content.url,
      title: content.title,
      status: 'analyzing',
      message: '제품을 분석하고 있습니다...',
    });

    // 3. 제품 분석
    const analysisResult = await analyzeProduct(content);

    await updateTaskState({
      status: 'saving',
      message: '분석 결과를 저장하고 있습니다...',
    });

    // 4. 저장
    const product: Omit<StoredProduct, 'id' | 'addedAt'> = {
      category,
      url: content.url,
      title: content.title,
      price: analysisResult.product_analysis.price,
      summary: analysisResult.product_analysis.summary,
      thumbnailUrl: analysisResult.valid_images[0]?.src,
      fullAnalysis: analysisResult.product_analysis,
    };

    await saveProduct(product);

    // 5. 완료
    await updateTaskState({
      status: 'completed',
      message: `분석 완료! "${analysisResult.product_analysis.product_name}" 제품이 저장되었습니다.`,
      completedAt: Date.now(),
    });

    // 6. 알림 표시
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '제품 분석 완료',
      message: `"${analysisResult.product_analysis.product_name}" 제품이 저장되었습니다.`,
    });

    // 7. 3초 후 작업 상태 초기화
    setTimeout(async () => {
      await saveTaskState(null);
    }, 3000);
  } catch (error) {
    console.error('분석 작업 실패:', error);

    await updateTaskState({
      status: 'failed',
      message: '분석 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      completedAt: Date.now(),
    });

    // 에러 알림
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '제품 분석 실패',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    });

    // 5초 후 작업 상태 초기화
    setTimeout(async () => {
      await saveTaskState(null);
    }, 5000);
  }
}

/**
 * 메시지 리스너
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_ANALYSIS') {
    const { category, tabId } = message;

    // 비동기 작업 시작
    executeAnalysisTask(category, tabId)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      });

    // 비동기 응답을 위해 true 반환
    return true;
  }

  if (message.type === 'GET_TASK_STATE') {
    // 현재 작업 상태 조회
    getTaskState()
      .then((task) => {
        sendResponse({ success: true, task });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  return false;
});

/**
 * Extension 설치 시
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('SmartCompare Extension installed');
  // 초기 작업 상태 초기화
  saveTaskState(null);
});
