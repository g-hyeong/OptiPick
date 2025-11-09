/**
 * Background Service Worker
 * 팝업이 닫혀도 계속 실행되는 분석 작업 처리
 */

import type { ExtractedContent } from '../types/content';
import type { AnalysisTask, StoredProduct, ComparisonTask } from '../types/storage';
import { analyzeProduct, startComparison, continueComparison } from '../utils/api';
import { saveProduct, getProducts } from '../utils/storage';

const TASK_STORAGE_KEY = 'currentTask';
const COMPARISON_TASK_STORAGE_KEY = 'currentComparisonTask';

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

// ========== 비교 작업 관련 Storage 함수 ==========

/**
 * 비교 작업 상태 저장
 */
async function saveComparisonTaskState(task: ComparisonTask | null): Promise<void> {
  await chrome.storage.local.set({ [COMPARISON_TASK_STORAGE_KEY]: task });
}

/**
 * 비교 작업 상태 가져오기
 */
async function getComparisonTaskState(): Promise<ComparisonTask | null> {
  const result = await chrome.storage.local.get(COMPARISON_TASK_STORAGE_KEY);
  return result[COMPARISON_TASK_STORAGE_KEY] || null;
}

/**
 * 비교 작업 상태 업데이트
 */
async function updateComparisonTaskState(
  updates: Partial<ComparisonTask>
): Promise<void> {
  const currentTask = await getComparisonTaskState();
  if (currentTask) {
    const updatedTask = { ...currentTask, ...updates };
    await saveComparisonTaskState(updatedTask);
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

// ========== 비교 작업 실행 함수 ==========

/**
 * 비교 작업 시작 (Step 1 전까지)
 */
async function executeComparisonStart(
  category: string,
  productIds: string[]
): Promise<void> {
  const taskId = generateUUID();

  try {
    // 1. 작업 초기화
    const task: ComparisonTask = {
      taskId,
      category,
      selectedProductIds: productIds,
      userCriteria: [],
      status: 'step1',
      message: '비교 분석을 준비하고 있습니다...',
      startedAt: Date.now(),
    };
    await saveComparisonTaskState(task);

    // 2. 선택된 제품들 가져오기
    const allProducts = await getProducts();
    const selectedProducts = allProducts.filter(p => productIds.includes(p.id));

    if (selectedProducts.length < 2) {
      throw new Error('최소 2개의 제품을 선택해주세요.');
    }

    if (selectedProducts.length > 10) {
      throw new Error('최대 10개까지만 비교할 수 있습니다.');
    }

    // 3. Agent API 호출 (비교 시작)
    const response = await startComparison({
      category,
      products: selectedProducts.map(p => p.fullAnalysis),
    });

    // 4. thread_id 저장 및 Step 1 대기 상태로 전환
    await updateComparisonTaskState({
      threadId: response.thread_id,
      status: 'step1',
      message: '비교할 기준을 입력해주세요.',
    });
  } catch (error) {
    console.error('비교 시작 실패:', error);

    await updateComparisonTaskState({
      status: 'failed',
      message: '비교 시작 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      completedAt: Date.now(),
    });

    // 에러 알림
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '비교 시작 실패',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    });

    // 5초 후 작업 상태 초기화
    setTimeout(async () => {
      await saveComparisonTaskState(null);
    }, 5000);
  }
}

/**
 * 비교 작업 계속 - Step 1 (사용자 기준 입력)
 */
async function continueComparisonStep1(userCriteria: string[]): Promise<void> {
  try {
    const currentTask = await getComparisonTaskState();
    if (!currentTask || !currentTask.threadId) {
      throw new Error('진행 중인 비교 작업이 없습니다.');
    }

    // 1. 사용자 기준 저장
    await updateComparisonTaskState({
      userCriteria,
      status: 'step1',
      message: 'Agent가 비교 기준을 분석하고 있습니다...',
    });

    // 2. Agent API 호출 (사용자 기준 전송)
    const response = await continueComparison(currentTask.threadId, {
      user_input: userCriteria,
    });

    // 3. 추출된 기준 저장 및 Step 2 대기 상태로 전환
    if (response.status === 'waiting_for_priorities' && response.criteria) {
      await updateComparisonTaskState({
        extractedCriteria: response.criteria,
        status: 'step2',
        message: '비교 기준의 우선순위를 설정해주세요.',
      });
    } else {
      throw new Error('예상하지 못한 응답 형식입니다.');
    }
  } catch (error) {
    console.error('Step 1 진행 실패:', error);

    await updateComparisonTaskState({
      status: 'failed',
      message: '기준 분석 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      completedAt: Date.now(),
    });

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '비교 분석 실패',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    });

    setTimeout(async () => {
      await saveComparisonTaskState(null);
    }, 5000);
  }
}

/**
 * 비교 작업 계속 - Step 2 (우선순위 입력)
 */
async function continueComparisonStep2(
  priorities: { [criterion: string]: number }
): Promise<void> {
  try {
    const currentTask = await getComparisonTaskState();
    if (!currentTask || !currentTask.threadId) {
      throw new Error('진행 중인 비교 작업이 없습니다.');
    }

    // 1. 최종 분석 중 상태로 전환
    await updateComparisonTaskState({
      status: 'analyzing',
      message: '제품들을 비교 분석하고 있습니다...',
    });

    // 2. Agent API 호출 (우선순위 전송)
    const response = await continueComparison(currentTask.threadId, {
      user_input: priorities,
    });

    // 3. 최종 리포트 저장
    if (response.status === 'completed' && response.report) {
      // 3-1. 우선순위 배열 생성 (순서대로)
      const prioritiesArray = Object.entries(priorities)
        .sort(([, a], [, b]) => a - b)
        .map(([criterion]) => criterion);

      // 3-2. ComparisonTask 업데이트
      await updateComparisonTaskState({
        report: response.report,
        userPriorities: prioritiesArray,
        status: 'completed',
        message: '비교 분석이 완료되었습니다!',
        completedAt: Date.now(),
      });

      // 3-3. analysisHistory에 저장
      const allProducts = await getProducts();
      const selectedProducts = allProducts.filter((p) =>
        currentTask.selectedProductIds.includes(p.id)
      );

      const historyId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const historyItem = {
        id: historyId,
        date: Date.now(),
        category: currentTask.category,
        productCount: response.report.total_products,
        products: selectedProducts,
        criteria: response.report.user_criteria,
        userPriorities: prioritiesArray,
        reportData: response.report,
      };

      const result = await chrome.storage.local.get('analysisHistory');
      const currentHistory = result.analysisHistory || [];
      const updatedHistory = [historyItem, ...currentHistory];
      await chrome.storage.local.set({ analysisHistory: updatedHistory });

      console.log('[Background] Analysis history saved:', historyId);

      // 4. 알림 표시
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: '비교 분석 완료',
        message: `${response.report.total_products}개 제품 비교가 완료되었습니다.`,
      });

      // 5. 새 탭에서 비교 리포트 열기 (historyId 전달)
      const reportUrl = chrome.runtime.getURL(
        `src/compare-report/index.html?historyId=${historyId}`
      );
      await chrome.tabs.create({ url: reportUrl });

      // 6. 5초 후 작업 상태 초기화
      setTimeout(async () => {
        await saveComparisonTaskState(null);
      }, 5000);
    } else {
      throw new Error('예상하지 못한 응답 형식입니다.');
    }
  } catch (error) {
    console.error('Step 2 진행 실패:', error);

    await updateComparisonTaskState({
      status: 'failed',
      message: '최종 분석 실패',
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      completedAt: Date.now(),
    });

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '비교 분석 실패',
      message: error instanceof Error ? error.message : '알 수 없는 오류',
    });

    setTimeout(async () => {
      await saveComparisonTaskState(null);
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

  // ========== 비교 기능 메시지 핸들러 ==========

  if (message.type === 'START_COMPARISON') {
    const { category, productIds } = message;

    executeComparisonStart(category, productIds)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      });

    return true;
  }

  if (message.type === 'CONTINUE_COMPARISON_STEP1') {
    const { userCriteria } = message;

    continueComparisonStep1(userCriteria)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      });

    return true;
  }

  if (message.type === 'CONTINUE_COMPARISON_STEP2') {
    const { priorities } = message;

    continueComparisonStep2(priorities)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        });
      });

    return true;
  }

  if (message.type === 'GET_COMPARISON_TASK_STATE') {
    getComparisonTaskState()
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
  console.log('OptiPick Extension installed');
  // 초기 작업 상태 초기화
  saveTaskState(null);
});
