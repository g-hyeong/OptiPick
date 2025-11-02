import type { AnalysisTask, StoredProduct, ComparisonTask } from '@/types/storage';
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
const categoryFilters = document.getElementById(
  'categoryFilters'
) as HTMLDivElement;
const productDetailTab = document.getElementById(
  'productDetailTab'
) as HTMLDivElement;
const detailContent = document.getElementById(
  'detailContent'
) as HTMLDivElement;
const backBtn = document.getElementById('backBtn') as HTMLButtonElement;

// 비교 탭 DOM 요소
const compareCategorySelect = document.getElementById('compareCategorySelect') as HTMLSelectElement;
const compareProductsList = document.getElementById('compareProductsList') as HTMLDivElement;
const selectedCount = document.getElementById('selectedCount') as HTMLDivElement;
const selectAllBtn = document.getElementById('selectAllBtn') as HTMLButtonElement;

// Step 1
const compareStep1 = document.getElementById('compareStep1') as HTMLDivElement;
const step1NextBtn = document.getElementById('step1NextBtn') as HTMLButtonElement;

// Step 2
const compareStep2 = document.getElementById('compareStep2') as HTMLDivElement;
const criteriaInput = document.getElementById('criteriaInput') as HTMLInputElement;
const criteriaChips = document.getElementById('criteriaChips') as HTMLDivElement;
const step2BackBtn = document.getElementById('step2BackBtn') as HTMLButtonElement;
const step2NextBtn = document.getElementById('step2NextBtn') as HTMLButtonElement;
const compareStep2Result = document.getElementById('compareStep2Result') as HTMLDivElement;

// Step 3
const compareStep3 = document.getElementById('compareStep3') as HTMLDivElement;

// Step 4
const compareStep4 = document.getElementById('compareStep4') as HTMLDivElement;
const selectedPriorities = document.getElementById('selectedPriorities') as HTMLDivElement;
const selectedPriorityCount = document.getElementById('selectedPriorityCount') as HTMLSpanElement;
const availableCriteria = document.getElementById('availableCriteria') as HTMLDivElement;
const step4BackBtn = document.getElementById('step4BackBtn') as HTMLButtonElement;
const step4NextBtn = document.getElementById('step4NextBtn') as HTMLButtonElement;
const compareStep4Result = document.getElementById('compareStep4Result') as HTMLDivElement;

// Step 5
const compareStep5 = document.getElementById('compareStep5') as HTMLDivElement;

/**
 * 작업 상태 폴링 인터벌
 */
let taskPollingInterval: number | null = null;
let comparisonTaskPollingInterval: number | null = null;

/**
 * 현재 상태
 */
let selectedCategory: string | null = null; // null이면 전체 보기
let currentView: 'list' | 'detail' = 'list';

// 비교 탭 상태
let currentCompareStep = 1;
let selectedProductIds: string[] = [];
let userCriteriaList: string[] = [];
let userPrioritiesList: string[] = [];
let extractedCriteriaList: string[] = [];

/**
 * Popup 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initAnalyzeTab();
  initProductDetailTab();
  initCompareTab();
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
        | 'products'
        | 'compare';
      switchTab(tab);
    });
  });
}

/**
 * 탭 전환
 */
function switchTab(tab: 'analyze' | 'products' | 'compare', preSelectedCategory?: string): void {
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
  const compareTab = document.getElementById('compareTab');

  if (tab === 'analyze') {
    analyzTab?.classList.remove('hidden');
    productsTab?.classList.add('hidden');
    compareTab?.classList.add('hidden');
    productDetailTab.classList.add('hidden');
    currentView = 'list';
  } else if (tab === 'compare') {
    analyzTab?.classList.add('hidden');
    productsTab?.classList.add('hidden');
    compareTab?.classList.remove('hidden');
    productDetailTab.classList.add('hidden');
    currentView = 'list';

    // 카테고리 pre-select가 있으면 설정
    if (preSelectedCategory) {
      compareCategorySelect.value = preSelectedCategory;
      loadCompareProducts();
    }
  } else {
    // products 탭
    analyzTab?.classList.add('hidden');
    compareTab?.classList.add('hidden');
    if (currentView === 'list') {
      productsTab?.classList.remove('hidden');
      productDetailTab.classList.add('hidden');
    } else {
      productsTab?.classList.add('hidden');
      productDetailTab.classList.remove('hidden');
    }
    // 제품 목록 탭으로 전환 시 목록 새로고침
    if (currentView === 'list') {
      loadProductsList();
    }
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
 * 제품 상세보기 탭 초기화
 */
function initProductDetailTab(): void {
  backBtn.addEventListener('click', () => {
    currentView = 'list';
    switchTab('products');
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
      categoryFilters.innerHTML = '';
      return;
    }

    // 카테고리 필터 렌더링 (products 전달)
    renderCategoryFilters(categories, products);

    // 선택된 카테고리에 따라 제품 필터링
    const filteredProducts = selectedCategory
      ? products.filter((p) => p.category === selectedCategory)
      : products;

    if (filteredProducts.length === 0) {
      productsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div>선택한 카테고리에 제품이 없습니다.</div>
        </div>
      `;
      return;
    }

    renderProductsList(filteredProducts);
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
 * 카테고리 필터 렌더링
 */
function renderCategoryFilters(categories: string[], products: StoredProduct[]): void {
  const allChip = `
    <div class="category-filter-item">
      <div class="category-chip ${selectedCategory === null ? 'active' : ''}" data-category="">
        전체
      </div>
    </div>
  `;

  const categoryChips = categories
    .map((category) => {
      // 카테고리별 제품 개수 계산
      const categoryProducts = products.filter(p => p.category === category);
      const count = categoryProducts.length;
      const canCompare = count >= 2;

      return `
    <div class="category-filter-item">
      <div class="category-chip ${selectedCategory === category ? 'active' : ''}" data-category="${category}">
        ${category}
      </div>
      ${canCompare ? `<button class="category-compare-btn" data-category="${category}" title="${category} 카테고리 제품 비교">비교</button>` : ''}
    </div>
  `;
    })
    .join('');

  categoryFilters.innerHTML = allChip + categoryChips;

  // 필터 클릭 이벤트
  categoryFilters.querySelectorAll('.category-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const category = (chip as HTMLElement).dataset.category || null;
      selectedCategory = category;
      loadProductsList();
    });
  });

  // 비교 버튼 클릭 이벤트
  categoryFilters.querySelectorAll('.category-compare-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // 버블링 방지
      const category = (btn as HTMLElement).dataset.category!;
      switchTab('compare', category);
    });
  });
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
 * 제품 목록 렌더링 (단일 카테고리 또는 전체)
 */
function renderProductsList(products: StoredProduct[]): void {
  const productCards = products
    .map((product) => renderProductCard(product))
    .join('');

  productsContainer.innerHTML = `
    <div class="product-list">
      ${productCards}
    </div>
  `;

  // 이벤트 리스너 등록
  attachProductEventListeners();
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
          <button class="btn-small btn-secondary open-page-btn" data-url="${product.url}" onclick="event.stopPropagation()">
            페이지 열기
          </button>
          <button class="btn-small btn-danger delete-product-btn" data-product-id="${product.id}" onclick="event.stopPropagation()">
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
  // 제품 카드 클릭 (상세보기)
  document.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const productId = (card as HTMLElement).dataset.productId;
      if (productId) {
        await showProductDetail(productId);
      }
    });
  });

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
 * 제품 상세보기 표시
 */
async function showProductDetail(productId: string): Promise<void> {
  const products = await getProducts();
  const product = products.find((p) => p.id === productId);

  if (!product) {
    alert('제품을 찾을 수 없습니다.');
    return;
  }

  // 상세보기 렌더링
  renderProductDetail(product);

  // 뷰 전환
  currentView = 'detail';
  document.getElementById('productsTab')?.classList.add('hidden');
  productDetailTab.classList.remove('hidden');
}

/**
 * 제품 상세보기 렌더링
 */
function renderProductDetail(product: StoredProduct): void {
  const thumbnail = product.thumbnailUrl
    ? `<img src="${product.thumbnailUrl}" class="detail-thumbnail" alt="${product.title}" />`
    : '';

  const keyFeatures = product.fullAnalysis.key_features.length
    ? `<ul class="detail-list">
        ${product.fullAnalysis.key_features.map((f) => `<li>${f}</li>`).join('')}
       </ul>`
    : '<div class="detail-value">정보 없음</div>';

  const pros = product.fullAnalysis.pros.length
    ? `<ul class="detail-list">
        ${product.fullAnalysis.pros.map((p) => `<li>${p}</li>`).join('')}
       </ul>`
    : '<div class="detail-value">정보 없음</div>';

  const cons = product.fullAnalysis.cons.length
    ? `<ul class="detail-list">
        ${product.fullAnalysis.cons.map((c) => `<li>${c}</li>`).join('')}
       </ul>`
    : '<div class="detail-value">정보 없음</div>';

  const recommendationReasons = product.fullAnalysis.recommendation_reasons.length
    ? `<ul class="detail-list">
        ${product.fullAnalysis.recommendation_reasons.map((r) => `<li>${r}</li>`).join('')}
       </ul>`
    : '<div class="detail-value">정보 없음</div>';

  const notRecommendedReasons = product.fullAnalysis.not_recommended_reasons.length
    ? `<ul class="detail-list">
        ${product.fullAnalysis.not_recommended_reasons.map((r) => `<li>${r}</li>`).join('')}
       </ul>`
    : '<div class="detail-value">정보 없음</div>';

  detailContent.innerHTML = `
    ${thumbnail}

    <div class="detail-section">
      <div class="detail-section-title">기본 정보</div>
      <div class="detail-field">
        <div class="detail-label">제품명</div>
        <div class="detail-value">${product.fullAnalysis.product_name}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">가격</div>
        <div class="detail-value" style="color: #007aff; font-weight: 600; font-size: 16px;">${product.fullAnalysis.price}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">요약</div>
        <div class="detail-value">${product.fullAnalysis.summary}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">카테고리</div>
        <div class="detail-value">${product.category}</div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">주요 특징</div>
      ${keyFeatures}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">장점</div>
      ${pros}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">단점</div>
      ${cons}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">추천 대상</div>
      <div class="detail-value">${product.fullAnalysis.recommended_for}</div>
    </div>

    <div class="detail-section">
      <div class="detail-section-title">추천 이유</div>
      ${recommendationReasons}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">비추천 이유</div>
      ${notRecommendedReasons}
    </div>

    <div class="detail-section">
      <div class="detail-section-title">원본 페이지</div>
      <button class="btn-small btn-secondary" onclick="chrome.tabs.create({ url: '${product.url}' })">
        페이지 열기
      </button>
      <button class="btn-small btn-danger" onclick="(async () => {
        if (confirm('이 제품을 삭제하시겠습니까?')) {
          await chrome.storage.local.get('products').then(async (result) => {
            const products = result.products || { products: [] };
            products.products = products.products.filter(p => p.id !== '${product.id}');
            await chrome.storage.local.set({ products });
            window.location.reload();
          });
        }
      })()">
        삭제
      </button>
    </div>
  `;
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
  stopComparisonTaskPolling();
});

// ========== 비교 탭 함수 ==========

/**
 * 비교 탭 초기화
 */
function initCompareTab(): void {
  // 카테고리 선택 시 제품 목록 업데이트
  compareCategorySelect.addEventListener('change', handleCategoryChange);

  // Step 1 버튼들
  selectAllBtn.addEventListener('click', toggleSelectAll);
  step1NextBtn.addEventListener('click', handleStep1Next);

  // Step 2 버튼들
  criteriaInput.addEventListener('keydown', handleCriteriaKeydown);
  step2BackBtn.addEventListener('click', () => goToStep(1));
  step2NextBtn.addEventListener('click', handleStep2Next);

  // Step 4 버튼들
  step4BackBtn.addEventListener('click', () => goToStep(2));
  step4NextBtn.addEventListener('click', handleStep4Next);

  // 카테고리 로드
  loadCompareCategories();

  // 초기 상태 설정
  goToStep(1);
}

/**
 * 비교용 카테고리 로드
 */
async function loadCompareCategories(): Promise<void> {
  const categories = await getCategories();

  compareCategorySelect.innerHTML = '<option value="">카테고리 선택</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    compareCategorySelect.appendChild(option);
  });
}

/**
 * 단계 전환
 */
function goToStep(step: number): void {
  currentCompareStep = step;

  // 모든 단계 숨기기
  [compareStep1, compareStep2, compareStep3, compareStep4, compareStep5].forEach(el => {
    el.classList.remove('active');
  });

  // 현재 단계 표시
  if (step === 1) compareStep1.classList.add('active');
  else if (step === 2) compareStep2.classList.add('active');
  else if (step === 3) compareStep3.classList.add('active');
  else if (step === 4) compareStep4.classList.add('active');
  else if (step === 5) compareStep5.classList.add('active');

  // 진행 표시기 업데이트
  updateProgressIndicator(step);
}

/**
 * 진행 표시기 업데이트
 */
function updateProgressIndicator(step: number): void {
  const progressSteps = document.querySelectorAll('.progress-step');
  progressSteps.forEach((el, index) => {
    if (index + 1 <= step && step <= 3) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

/**
 * 카테고리 변경 처리
 */
async function handleCategoryChange(): Promise<void> {
  await loadCompareProducts();
}

/**
 * 비교할 제품 목록 로드
 */
async function loadCompareProducts(): Promise<void> {
  const category = compareCategorySelect.value;

  if (!category) {
    compareProductsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">카테고리를 선택해주세요</div>';
    selectedProductIds = [];
    updateSelectedCount();
    return;
  }

  const products = await getProducts();
  const filteredProducts = products.filter(p => p.category === category);

  if (filteredProducts.length === 0) {
    compareProductsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">이 카테고리에 제품이 없습니다</div>';
    selectedProductIds = [];
    updateSelectedCount();
    return;
  }

  // 전체 선택 기본값
  selectedProductIds = filteredProducts.map(p => p.id);

  compareProductsList.innerHTML = filteredProducts.map(product => `
    <div class="product-checkbox-item">
      <input type="checkbox" id="product-${product.id}" value="${product.id}" checked />
      <label for="product-${product.id}" class="product-checkbox-label">
        ${product.title} (${product.price})
      </label>
    </div>
  `).join('');

  // 체크박스 이벤트 리스너
  compareProductsList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const productId = target.value;

      if (target.checked) {
        if (!selectedProductIds.includes(productId)) {
          selectedProductIds.push(productId);
        }
      } else {
        selectedProductIds = selectedProductIds.filter(id => id !== productId);
      }

      updateSelectedCount();
    });
  });

  updateSelectedCount();
}

/**
 * 전체 선택/해제 토글
 */
function toggleSelectAll(): void {
  const checkboxes = compareProductsList.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);

  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
    const productId = cb.value;

    if (cb.checked) {
      if (!selectedProductIds.includes(productId)) {
        selectedProductIds.push(productId);
      }
    } else {
      selectedProductIds = selectedProductIds.filter(id => id !== productId);
    }
  });

  selectAllBtn.textContent = allChecked ? '전체 선택' : '전체 해제';
  updateSelectedCount();
}

/**
 * 선택된 제품 수 업데이트
 */
function updateSelectedCount(): void {
  const count = selectedProductIds.length;
  selectedCount.textContent = `${count}개 선택됨`;

  // 전체 선택 버튼 텍스트 업데이트
  const checkboxes = compareProductsList.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
  const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
  selectAllBtn.textContent = allChecked ? '전체 해제' : '전체 선택';

  // Step 1 다음 버튼 활성화 조건: 2~10개
  const isValid = count >= 2 && count <= 10;
  step1NextBtn.disabled = !isValid;
}

/**
 * Step 1: 다음 버튼
 */
function handleStep1Next(): void {
  if (selectedProductIds.length < 2 || selectedProductIds.length > 10) {
    return;
  }
  goToStep(2);
}

/**
 * Step 2: 기준 입력 엔터 처리
 */
function handleCriteriaKeydown(e: KeyboardEvent): void {
  // 한글 입력 중(composing) 엔터는 무시 (조합 완료만 수행)
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    const value = criteriaInput.value.trim();
    if (value && !userCriteriaList.includes(value)) {
      addCriterion(value);
      criteriaInput.value = '';
    }
  }
}

/**
 * 기준 추가
 */
function addCriterion(criterion: string): void {
  userCriteriaList.push(criterion);
  renderCriteriaChips();
  updateStep2NextBtn();
}

/**
 * 기준 삭제
 */
function removeCriterion(criterion: string): void {
  userCriteriaList = userCriteriaList.filter(c => c !== criterion);
  renderCriteriaChips();
  updateStep2NextBtn();
}

/**
 * 기준 chip 렌더링
 */
function renderCriteriaChips(): void {
  criteriaChips.innerHTML = userCriteriaList.map(criterion => `
    <div class="criterion-chip">
      ${criterion}
      <button class="remove-btn" data-criterion="${criterion}">×</button>
    </div>
  `).join('');

  // 삭제 버튼 이벤트
  criteriaChips.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const criterion = (e.target as HTMLElement).dataset.criterion!;
      removeCriterion(criterion);
    });
  });
}

/**
 * Step 2 다음 버튼 활성화 업데이트
 */
function updateStep2NextBtn(): void {
  step2NextBtn.disabled = userCriteriaList.length === 0;
}

/**
 * Step 2: 다음 버튼 (Agent 호출)
 */
async function handleStep2Next(): Promise<void> {
  if (userCriteriaList.length === 0) {
    return;
  }

  try {
    const category = compareCategorySelect.value;

    // Step 3 (로딩) 표시
    goToStep(3);

    // Background에 비교 시작 메시지 전송
    await chrome.runtime.sendMessage({
      type: 'START_COMPARISON',
      category,
      productIds: selectedProductIds
    });

    // 작업 상태 폴링 시작
    startComparisonTaskPolling();

  } catch (error) {
    console.error('비교 시작 실패:', error);
    compareStep2Result.className = 'result-message error';
    compareStep2Result.textContent = error instanceof Error ? error.message : '비교 시작 실패';
    goToStep(2);
  }
}

/**
 * 비교 작업 상태 폴링 시작
 */
function startComparisonTaskPolling(): void {
  stopComparisonTaskPolling();

  comparisonTaskPollingInterval = window.setInterval(async () => {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_COMPARISON_TASK_STATE'
    });

    if (response.success && response.task) {
      updateComparisonTaskUI(response.task);
    }
  }, 500);
}

/**
 * 비교 작업 상태 폴링 중지
 */
function stopComparisonTaskPolling(): void {
  if (comparisonTaskPollingInterval !== null) {
    clearInterval(comparisonTaskPollingInterval);
    comparisonTaskPollingInterval = null;
  }
}

/**
 * 비교 작업 UI 업데이트
 */
function updateComparisonTaskUI(task: ComparisonTask): void {
  if (task.status === 'step1') {
    // Step 1 완료 -> 자동으로 사용자 기준 전송
    setTimeout(async () => {
      await chrome.runtime.sendMessage({
        type: 'CONTINUE_COMPARISON_STEP1',
        userCriteria: userCriteriaList
      });
    }, 100);

  } else if (task.status === 'step2' && task.extractedCriteria) {
    // Step 4로 전환 (우선순위 선택)
    stopComparisonTaskPolling();
    extractedCriteriaList = task.extractedCriteria;
    goToStep(4);
    renderAvailableCriteria();

  } else if (task.status === 'analyzing') {
    // Step 5 (최종 분석 중)
    if (currentCompareStep !== 5) {
      goToStep(5);
    }

  } else if (task.status === 'completed') {
    stopComparisonTaskPolling();
    // 결과는 자동으로 새 탭에서 열림

  } else if (task.status === 'failed') {
    stopComparisonTaskPolling();
    compareStep4Result.className = 'result-message error';
    compareStep4Result.textContent = task.error || '비교 실패';
    goToStep(4);
  }
}

/**
 * Step 4: 추출된 기준 렌더링
 */
function renderAvailableCriteria(): void {
  availableCriteria.innerHTML = extractedCriteriaList.map(criterion => `
    <div class="available-criterion-chip" data-criterion="${criterion}">
      ${criterion}
    </div>
  `).join('');

  // 기준 클릭 이벤트
  availableCriteria.querySelectorAll('.available-criterion-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const criterion = (e.target as HTMLElement).dataset.criterion!;
      handleCriterionClick(criterion);
    });
  });
}

/**
 * Step 4: 기준 클릭 처리
 */
function handleCriterionClick(criterion: string): void {
  if (userPrioritiesList.includes(criterion)) {
    // 이미 선택됨 -> 제거
    userPrioritiesList = userPrioritiesList.filter(c => c !== criterion);
  } else {
    // 선택 추가 (최대 5개)
    if (userPrioritiesList.length < 5) {
      userPrioritiesList.push(criterion);
    }
  }

  updateSelectedPriorities();
}

/**
 * Step 4: 선택된 우선순위 업데이트
 */
function updateSelectedPriorities(): void {
  selectedPriorityCount.textContent = userPrioritiesList.length.toString();

  if (userPrioritiesList.length === 0) {
    selectedPriorities.innerHTML = '<div class="empty-priority-state">아래에서 기준을 선택하세요</div>';
  } else {
    selectedPriorities.innerHTML = userPrioritiesList.map((criterion, index) => `
      <div class="priority-chip" data-criterion="${criterion}">
        <span class="priority-number">${index + 1}</span>
        ${criterion}
      </div>
    `).join('');

    // 클릭 시 제거
    selectedPriorities.querySelectorAll('.priority-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const criterion = (e.currentTarget as HTMLElement).dataset.criterion!;
        handleCriterionClick(criterion);
      });
    });
  }

  // available criteria 업데이트 (선택된 것 disabled)
  availableCriteria.querySelectorAll('.available-criterion-chip').forEach(chip => {
    const criterion = (chip as HTMLElement).dataset.criterion!;
    if (userPrioritiesList.includes(criterion)) {
      chip.classList.add('disabled');
    } else {
      chip.classList.remove('disabled');
    }
  });

  // Step 4 다음 버튼 활성화 조건: 1~5개
  step4NextBtn.disabled = userPrioritiesList.length === 0;
}

/**
 * Step 4: 최종 분석 버튼
 */
async function handleStep4Next(): Promise<void> {
  if (userPrioritiesList.length === 0) {
    return;
  }

  try {
    // 우선순위를 객체로 변환 (기존 API 호환)
    const priorities: { [key: string]: number } = {};
    userPrioritiesList.forEach((criterion, index) => {
      priorities[criterion] = index + 1;
    });

    // Step 5 (로딩) 표시
    goToStep(5);

    await chrome.runtime.sendMessage({
      type: 'CONTINUE_COMPARISON_STEP2',
      priorities
    });

    startComparisonTaskPolling();

  } catch (error) {
    console.error('최종 분석 실패:', error);
    compareStep4Result.className = 'result-message error';
    compareStep4Result.textContent = error instanceof Error ? error.message : '최종 분석 실패';
    goToStep(4);
  }
}
