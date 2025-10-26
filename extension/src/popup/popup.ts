import type { AnalysisTask, StoredProduct } from '@/types/storage';
import { getProducts, getCategories, deleteProduct } from '@/utils/storage';

/**
 * DOM 요소
 */
const categoryInput = document.getElementById(
  'categoryInput'
) as HTMLInputElement;
const analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
const analyzeResult = document.getElementById('analyzeResult') as HTMLDivElement;
const productsContainer = document.getElementById(
  'productsContainer'
) as HTMLDivElement;

/**
 * 작업 상태 폴링 인터벌
 */
let taskPollingInterval: number | null = null;

/**
 * Popup 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initAnalyzeTab();
  loadProductsList();
  checkAndRestoreTaskState();
});

/**
 * 탭 전환 초기화
 */
function initTabs(): void {
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = (btn as HTMLButtonElement).dataset.tab as
        | 'analyze'
        | 'products';
      switchTab(tab);
    });
  });
}

/**
 * 탭 전환
 */
function switchTab(tab: 'analyze' | 'products'): void {
  // 탭 버튼 활성화 상태 변경
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    if ((btn as HTMLButtonElement).dataset.tab === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 탭 컨텐츠 표시/숨김
  const analyzTab = document.getElementById('analyzeTab');
  const productsTab = document.getElementById('productsTab');

  if (tab === 'analyze') {
    analyzTab?.classList.remove('hidden');
    productsTab?.classList.add('hidden');
  } else {
    analyzTab?.classList.add('hidden');
    productsTab?.classList.remove('hidden');
    // 제품 목록 탭으로 전환 시 목록 새로고침
    loadProductsList();
  }
}

/**
 * 분석 탭 초기화
 */
function initAnalyzeTab(): void {
  analyzeBtn.addEventListener('click', handleAnalyze);

  // Enter 키로도 분석 시작
  categoryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !analyzeBtn.disabled) {
      handleAnalyze();
    }
  });
}

/**
 * 분석 버튼 클릭 핸들러
 */
async function handleAnalyze(): Promise<void> {
  const category = categoryInput.value.trim();

  // 카테고리 입력 검증
  if (!category) {
    showAnalyzeResult('카테고리를 입력해주세요.', 'error');
    categoryInput.focus();
    return;
  }

  // 현재 활성 탭 가져오기
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    showAnalyzeResult('활성 탭을 찾을 수 없습니다.', 'error');
    return;
  }

  // Background에게 분석 작업 시작 요청
  chrome.runtime.sendMessage(
    {
      type: 'START_ANALYSIS',
      category,
      tabId: tab.id,
    },
    (response) => {
      if (response && response.success) {
        // 작업 시작 성공 - 상태 폴링 시작
        startTaskPolling();
      } else {
        showAnalyzeResult(
          `작업 시작 실패: ${response?.error || '알 수 없는 오류'}`,
          'error'
        );
      }
    }
  );
}

/**
 * 작업 상태 확인 및 복원
 */
async function checkAndRestoreTaskState(): Promise<void> {
  chrome.runtime.sendMessage({ type: 'GET_TASK_STATE' }, (response) => {
    if (response && response.success && response.task) {
      const task: AnalysisTask = response.task;

      // 진행 중이거나 최근 완료된 작업이 있으면 표시
      if (
        task.status !== 'idle' &&
        (!task.completedAt || Date.now() - task.completedAt < 5000)
      ) {
        updateUIFromTask(task);

        // 진행 중인 작업이면 폴링 시작
        if (!task.completedAt) {
          startTaskPolling();
        }
      }
    }
  });
}

/**
 * 작업 상태 폴링 시작
 */
function startTaskPolling(): void {
  // 기존 폴링 중지
  if (taskPollingInterval !== null) {
    clearInterval(taskPollingInterval);
  }

  // 500ms마다 작업 상태 확인
  taskPollingInterval = window.setInterval(() => {
    chrome.runtime.sendMessage({ type: 'GET_TASK_STATE' }, (response) => {
      if (response && response.success) {
        const task: AnalysisTask | null = response.task;

        if (task) {
          updateUIFromTask(task);

          // 작업 완료 시 폴링 중지
          if (task.status === 'completed' || task.status === 'failed') {
            stopTaskPolling();

            // 완료 시 제품 목록 새로고침
            if (task.status === 'completed') {
              setTimeout(() => {
                switchTab('products');
              }, 2000);
            }
          }
        } else {
          // 작업 없으면 폴링 중지
          stopTaskPolling();
        }
      }
    });
  }, 500);
}

/**
 * 작업 상태 폴링 중지
 */
function stopTaskPolling(): void {
  if (taskPollingInterval !== null) {
    clearInterval(taskPollingInterval);
    taskPollingInterval = null;
  }
}

/**
 * 작업 상태에 따라 UI 업데이트
 */
function updateUIFromTask(task: AnalysisTask): void {
  // 카테고리 입력 필드에 복원
  if (categoryInput.value === '') {
    categoryInput.value = task.category;
  }

  // 버튼 상태 업데이트
  const isInProgress =
    task.status !== 'completed' && task.status !== 'failed';
  analyzeBtn.disabled = isInProgress;

  if (isInProgress) {
    analyzeBtn.textContent = '분석 중...';
  } else {
    analyzeBtn.textContent = '현재 페이지 상품 분석';
  }

  // 메시지 표시
  let messageType: 'info' | 'success' | 'error';
  if (task.status === 'completed') {
    messageType = 'success';
  } else if (task.status === 'failed') {
    messageType = 'error';
  } else {
    messageType = 'info';
  }

  showAnalyzeResult(
    task.error ? `${task.message}: ${task.error}` : task.message,
    messageType
  );
}

/**
 * 분석 결과 메시지 표시
 */
function showAnalyzeResult(
  message: string,
  type: 'info' | 'success' | 'error'
): void {
  analyzeResult.textContent = message;
  analyzeResult.className = `analyze-result ${type}`;
}

/**
 * 제품 목록 로드 및 렌더링
 */
async function loadProductsList(): Promise<void> {
  try {
    const products = await getProducts();
    const categories = await getCategories();

    if (products.length === 0) {
      renderEmptyState();
      return;
    }

    renderProductsList(products, categories);
  } catch (error) {
    console.error('제품 목록 로드 실패:', error);
    productsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div>제품 목록을 불러올 수 없습니다.</div>
      </div>
    `;
  }
}

/**
 * 빈 상태 렌더링
 */
function renderEmptyState(): void {
  productsContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📦</div>
      <div>저장된 제품이 없습니다.</div>
      <div style="font-size: 12px; margin-top: 8px; color: #bbb;">
        [분석] 탭에서 상품을 분석하고 저장해보세요.
      </div>
    </div>
  `;
}

/**
 * 제품 목록 렌더링 (카테고리별 그룹핑)
 */
function renderProductsList(
  products: StoredProduct[],
  categories: string[]
): void {
  const html = categories
    .map((category) => {
      const categoryProducts = products.filter((p) => p.category === category);
      return renderCategoryGroup(category, categoryProducts);
    })
    .join('');

  productsContainer.innerHTML = html;

  // 이벤트 리스너 등록
  attachProductEventListeners();
}

/**
 * 카테고리 그룹 렌더링
 */
function renderCategoryGroup(
  category: string,
  products: StoredProduct[]
): string {
  const productCards = products
    .map((product) => renderProductCard(product))
    .join('');

  return `
    <div class="category-group">
      <div class="category-header">
        <div class="category-name">${category}</div>
        <div class="category-count">${products.length}개</div>
      </div>
      <div class="product-list">
        ${productCards}
      </div>
    </div>
  `;
}

/**
 * 제품 카드 렌더링
 */
function renderProductCard(product: StoredProduct): string {
  const thumbnail = product.thumbnailUrl
    ? `<img src="${product.thumbnailUrl}" class="product-thumbnail" alt="${product.title}" />`
    : `<div class="product-thumbnail placeholder">이미지 없음</div>`;

  return `
    <div class="product-card" data-product-id="${product.id}">
      ${thumbnail}
      <div class="product-info">
        <div class="product-title">${product.title}</div>
        <div class="product-price">${product.price}</div>
        <div class="product-summary">${product.summary}</div>
        <div class="product-actions">
          <button class="btn-small btn-secondary open-page-btn" data-url="${product.url}">
            페이지 열기
          </button>
          <button class="btn-small btn-danger delete-product-btn" data-product-id="${product.id}">
            삭제
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 제품 이벤트 리스너 등록
 */
function attachProductEventListeners(): void {
  // 페이지 열기 버튼
  document.querySelectorAll('.open-page-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = (btn as HTMLButtonElement).dataset.url;
      if (url) {
        chrome.tabs.create({ url });
      }
    });
  });

  // 삭제 버튼
  document.querySelectorAll('.delete-product-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const productId = (btn as HTMLButtonElement).dataset.productId;
      if (productId) {
        await handleDeleteProduct(productId);
      }
    });
  });
}

/**
 * 제품 삭제 핸들러
 */
async function handleDeleteProduct(productId: string): Promise<void> {
  const confirmed = confirm('이 제품을 삭제하시겠습니까?');

  if (!confirmed) {
    return;
  }

  try {
    await deleteProduct(productId);
    await loadProductsList(); // 목록 새로고침
  } catch (error) {
    console.error('제품 삭제 실패:', error);
    alert('제품 삭제에 실패했습니다.');
  }
}

/**
 * Popup 닫힐 때 폴링 정리
 */
window.addEventListener('beforeunload', () => {
  stopTaskPolling();
});
