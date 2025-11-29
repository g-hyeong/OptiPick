/**
 * Background Service Worker
 * 팝업이 닫혀도 계속 실행되는 분석 작업 처리
 */

import type { ExtractedContent } from '../types/content';
import type { AnalysisTask, StoredProduct, ComparisonTask, AnalysisHistoryItem } from '../types/storage';
import { analyzeProduct, startComparison, continueComparison } from '../utils/api';
import { saveProduct, getProducts, updateProduct } from '../utils/storage';
import { generateUUID } from '../utils/storage';
import { db, migrateFromChromeStorage } from '../db';

// 임시 데이터 (DB에 저장하지 않음)
let duplicateCheckData: {
  duplicateProduct: StoredProduct;
  extractedContent: ExtractedContent;
} | null = null;

/**
 * URL 정규화 (쿼리 파라미터 제거)
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * URL 기반 중복 제품 검색
 */
async function findDuplicateProduct(url: string): Promise<StoredProduct | null> {
  const normalizedUrl = normalizeUrl(url);
  const products = await getProducts();
  return products.find((p) => normalizeUrl(p.url) === normalizedUrl) || null;
}

// ========== 분석 작업 Task 상태 관리 ==========

/**
 * 현재 작업 상태 저장
 */
async function saveTaskState(task: AnalysisTask | null): Promise<void> {
  await db.currentTask.clear();
  if (task) {
    await db.currentTask.add(task);
  }
}

/**
 * 현재 작업 상태 가져오기
 */
async function getTaskState(): Promise<AnalysisTask | null> {
  const tasks = await db.currentTask.toArray();
  return tasks[0] || null;
}

/**
 * 작업 상태 업데이트
 */
async function updateTaskState(updates: Partial<AnalysisTask>): Promise<void> {
  const currentTask = await getTaskState();
  if (currentTask) {
    await db.currentTask.update(currentTask.taskId, updates);
  }
}

// ========== 비교 작업 Task 상태 관리 ==========

/**
 * 비교 작업 상태 저장
 */
async function saveComparisonTaskState(task: ComparisonTask | null): Promise<void> {
  await db.currentComparisonTask.clear();
  if (task) {
    await db.currentComparisonTask.add(task);
  }
}

/**
 * 비교 작업 상태 가져오기
 */
async function getComparisonTaskState(): Promise<ComparisonTask | null> {
  const tasks = await db.currentComparisonTask.toArray();
  return tasks[0] || null;
}

/**
 * 비교 작업 상태 업데이트
 */
async function updateComparisonTaskState(updates: Partial<ComparisonTask>): Promise<void> {
  const currentTask = await getComparisonTaskState();
  if (currentTask) {
    await db.currentComparisonTask.update(currentTask.taskId, updates);
  }
}

// ========== 콘텐츠 추출 ==========

/**
 * Content Script에서 콘텐츠 추출
 */
async function extractContentFromTab(tabId: number): Promise<ExtractedContent> {
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
    throw new Error(response.error || 'Content extraction failed');
  }

  return response.data;
}

// ========== 분석 작업 실행 ==========

/**
 * 분석 작업 실행
 */
async function executeAnalysisTask(category: string, tabId: number): Promise<void> {
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

    // 3. 중복 체크
    const duplicate = await findDuplicateProduct(content.url);

    if (duplicate) {
      // 중복 발견: 메모리에 임시 저장
      duplicateCheckData = {
        duplicateProduct: duplicate,
        extractedContent: content,
      };

      await updateTaskState({
        url: content.url,
        title: content.title,
        status: 'waiting_duplicate_choice' as AnalysisTask['status'],
        message: '중복된 제품이 발견되었습니다. 어떻게 하시겠습니까?',
      });
      return;
    }

    await updateTaskState({
      url: content.url,
      title: content.title,
      status: 'analyzing',
      message: '제품을 분석하고 있습니다...',
    });

    // 4. 제품 분석
    const analysisResult = await analyzeProduct(content);

    await updateTaskState({
      status: 'saving',
      message: '분석 결과를 저장하고 있습니다...',
    });

    // 5. 저장
    const product: Omit<StoredProduct, 'id' | 'addedAt'> = {
      category,
      url: content.url,
      title: content.title,
      price: analysisResult.product_analysis.price,
      summary: analysisResult.product_analysis.summary,
      thumbnailUrl: analysisResult.thumbnail || analysisResult.valid_images[0]?.src,
      fullAnalysis: analysisResult.product_analysis,
      rawContent: analysisResult.llm_input_content,
    };

    await saveProduct(product);

    // 6. 완료
    await updateTaskState({
      status: 'completed',
      message: `분석 완료! "${analysisResult.product_analysis.product_name}" 제품이 저장되었습니다.`,
      completedAt: Date.now(),
    });

    // 7. 알림 표시
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '제품 분석 완료',
      message: `"${analysisResult.product_analysis.product_name}" 제품이 저장되었습니다.`,
    });

    // 8. 3초 후 작업 상태 초기화
    setTimeout(async () => {
      await saveTaskState(null);
    }, 3000);
  } catch (error) {
    console.error('Analysis task failed:', error);

    await updateTaskState({
      status: 'failed',
      message: '분석 실패',
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: Date.now(),
    });

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '제품 분석 실패',
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    setTimeout(async () => {
      await saveTaskState(null);
    }, 5000);
  }
}

// ========== 비교 작업 실행 ==========

/**
 * 비교 작업 시작
 */
async function executeComparisonStart(category: string, productIds: string[]): Promise<void> {
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
    const selectedProducts = allProducts.filter((p) => productIds.includes(p.id));

    if (selectedProducts.length < 2) {
      throw new Error('최소 2개의 제품을 선택해주세요.');
    }

    if (selectedProducts.length > 10) {
      throw new Error('최대 10개까지만 비교할 수 있습니다.');
    }

    // 3. Agent API 호출 (비교 시작)
    const response = await startComparison({
      category,
      products: selectedProducts.map((p) => p.fullAnalysis),
    });

    // 4. thread_id 저장 및 Step 1 대기 상태로 전환
    await updateComparisonTaskState({
      threadId: response.thread_id,
      status: 'step1',
      message: '비교할 기준을 입력해주세요.',
    });
  } catch (error) {
    console.error('Comparison start failed:', error);

    await updateComparisonTaskState({
      status: 'failed',
      message: '비교 시작 실패',
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: Date.now(),
    });

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '비교 시작 실패',
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    setTimeout(async () => {
      await saveComparisonTaskState(null);
    }, 5000);
  }
}

/**
 * 비교 작업 계속 - 사용자 기준 입력 및 분석 완료
 */
async function submitComparisonCriteria(userCriteria: string[]): Promise<void> {
  try {
    const currentTask = await getComparisonTaskState();
    if (!currentTask || !currentTask.threadId) {
      throw new Error('진행 중인 비교 작업이 없습니다.');
    }

    // 1. 사용자 기준 저장 및 분석 중 상태로 전환
    await updateComparisonTaskState({
      userCriteria,
      status: 'analyzing',
      message: '제품들을 비교 분석하고 있습니다...',
    });

    // 2. Agent API 호출
    const response = await continueComparison(currentTask.threadId, {
      user_input: userCriteria,
    });

    // 3. 최종 리포트 저장
    if (response.status === 'completed' && response.report) {
      // 3-1. ComparisonTask 업데이트
      await updateComparisonTaskState({
        report: response.report,
        status: 'completed',
        message: '비교 분석이 완료되었습니다!',
        completedAt: Date.now(),
      });

      // 3-2. analysisHistory에 저장 (정규화: productIds만 저장)
      const historyId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const historyItem: AnalysisHistoryItem = {
        id: historyId,
        date: Date.now(),
        category: currentTask.category,
        productCount: response.report.total_products,
        productIds: currentTask.selectedProductIds, // 정규화
        criteria: response.report.user_criteria,
        reportData: response.report,
        isFavorite: false,
      };

      await db.analysisHistory.add(historyItem);
      console.log('[Background] Analysis history saved:', historyId);

      // 4. 알림 표시
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: '비교 분석 완료',
        message: `${response.report.total_products}개 제품 비교가 완료되었습니다.`,
      });

      // 5. 새 탭에서 비교 리포트 열기
      const reportUrl = chrome.runtime.getURL(`src/compare-report/index.html?historyId=${historyId}`);
      await chrome.tabs.create({ url: reportUrl });

      // 6. 5초 후 작업 상태 초기화
      setTimeout(async () => {
        await saveComparisonTaskState(null);
      }, 5000);
    } else {
      throw new Error('예상하지 못한 응답 형식입니다.');
    }
  } catch (error) {
    console.error('Comparison analysis failed:', error);

    await updateComparisonTaskState({
      status: 'failed',
      message: '비교 분석 실패',
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: Date.now(),
    });

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-128.png',
      title: '비교 분석 실패',
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    setTimeout(async () => {
      await saveComparisonTaskState(null);
    }, 5000);
  }
}

// ========== 중복 처리 ==========

/**
 * 중복 제품 선택 처리
 */
async function handleDuplicateChoice(choice: 'update' | 'save_new' | 'cancel'): Promise<void> {
  try {
    const currentTask = await getTaskState();
    if (!currentTask || (currentTask.status as string) !== 'waiting_duplicate_choice') {
      throw new Error('중복 선택 대기 중인 작업이 없습니다.');
    }

    if (!duplicateCheckData) {
      throw new Error('중복 데이터가 없습니다.');
    }

    const { duplicateProduct, extractedContent: content } = duplicateCheckData;

    if (choice === 'cancel') {
      duplicateCheckData = null;
      await updateTaskState({
        status: 'failed',
        message: '사용자가 취소했습니다.',
        completedAt: Date.now(),
      });

      setTimeout(async () => {
        await saveTaskState(null);
      }, 3000);
      return;
    }

    // 제품 분석
    await updateTaskState({
      status: 'analyzing',
      message: '제품을 분석하고 있습니다...',
    });

    const analysisResult = await analyzeProduct(content);

    if (choice === 'update') {
      // 업데이트: 기존 제품 정보 갱신
      await updateTaskState({
        status: 'saving',
        message: '기존 제품을 업데이트하고 있습니다...',
      });

      await updateProduct(duplicateProduct.id, {
        title: content.title,
        price: analysisResult.product_analysis.price,
        summary: analysisResult.product_analysis.summary,
        thumbnailUrl: analysisResult.thumbnail || analysisResult.valid_images[0]?.src,
        fullAnalysis: analysisResult.product_analysis,
        rawContent: analysisResult.llm_input_content,
      });

      await updateTaskState({
        status: 'completed',
        message: `제품 정보가 업데이트되었습니다: "${analysisResult.product_analysis.product_name}"`,
        completedAt: Date.now(),
      });

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: '제품 업데이트 완료',
        message: `"${analysisResult.product_analysis.product_name}" 제품이 업데이트되었습니다.`,
      });
    } else if (choice === 'save_new') {
      // 새로 저장
      await updateTaskState({
        status: 'saving',
        message: '새 제품으로 저장하고 있습니다...',
      });

      const product: Omit<StoredProduct, 'id' | 'addedAt'> = {
        category: currentTask.category,
        url: content.url,
        title: content.title,
        price: analysisResult.product_analysis.price,
        summary: analysisResult.product_analysis.summary,
        thumbnailUrl: analysisResult.thumbnail || analysisResult.valid_images[0]?.src,
        fullAnalysis: analysisResult.product_analysis,
        rawContent: analysisResult.llm_input_content,
      };

      await saveProduct(product);

      await updateTaskState({
        status: 'completed',
        message: `새 제품으로 저장되었습니다: "${analysisResult.product_analysis.product_name}"`,
        completedAt: Date.now(),
      });

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-128.png',
        title: '제품 저장 완료',
        message: `"${analysisResult.product_analysis.product_name}" 제품이 저장되었습니다.`,
      });
    }

    duplicateCheckData = null;

    setTimeout(async () => {
      await saveTaskState(null);
    }, 3000);
  } catch (error) {
    console.error('Duplicate choice handling failed:', error);
    duplicateCheckData = null;

    await updateTaskState({
      status: 'failed',
      message: '처리 실패',
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: Date.now(),
    });

    setTimeout(async () => {
      await saveTaskState(null);
    }, 5000);
  }
}

// ========== 메시지 리스너 ==========

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_ANALYSIS') {
    const { category, tabId } = message;

    executeAnalysisTask(category, tabId)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    return true;
  }

  if (message.type === 'GET_TASK_STATE') {
    getTaskState()
      .then((task) => {
        sendResponse({ success: true, task });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (message.type === 'GET_DUPLICATE_DATA') {
    sendResponse({
      success: true,
      data: duplicateCheckData,
    });
    return true;
  }

  if (message.type === 'DUPLICATE_CHOICE') {
    const { choice } = message;

    handleDuplicateChoice(choice)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
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
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    return true;
  }

  if (message.type === 'SUBMIT_COMPARISON_CRITERIA') {
    const { userCriteria } = message;

    submitComparisonCriteria(userCriteria)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
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

// ========== Extension 설치/시작 시 ==========

chrome.runtime.onInstalled.addListener(async () => {
  console.log('OptiPick Extension installed');

  // 마이그레이션 실행
  try {
    await migrateFromChromeStorage();
  } catch (error) {
    console.error('Migration failed on install:', error);
  }

  // 초기 작업 상태 초기화
  await saveTaskState(null);
  await saveComparisonTaskState(null);
});

// Service Worker 시작 시 마이그레이션 확인
migrateFromChromeStorage().catch((error) => {
  console.error('Migration failed on startup:', error);
});
