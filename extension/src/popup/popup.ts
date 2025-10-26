import type {
  ExtractedContent,
  ProductAnalysisResponse,
} from '@/types/content';
import type { StoredProduct } from '@/types/storage';
import { analyzeProduct } from '@/utils/api';
import {
  saveProduct,
  getProducts,
  getCategories,
  deleteProduct,
} from '@/utils/storage';

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
 * Popup 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initAnalyzeTab();
  loadProductsList();
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
    if (e.key === 'Enter') {
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

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = '분석 중...';
  showAnalyzeResult('페이지 분석 중입니다...', 'info');

  try {
    // 1. 현재 페이지 콘텐츠 추출
    const content = await extractContent();

    // 2. 제품 분석
    const analysisResult = await analyzeProduct(content);

    // 3. 저장
    await saveAnalysisResult(category, content, analysisResult);

    // 4. 성공 메시지 표시
    showAnalyzeResult(
      `분석 완료! "${analysisResult.product_analysis.product_name}" 제품이 저장되었습니다.`,
      'success'
    );

    // 5. 입력 초기화
    categoryInput.value = '';

    // 6. 제품 목록 탭으로 전환 (1초 후)
    setTimeout(() => {
      switchTab('products');
    }, 1000);
  } catch (error) {
    console.error('분석 실패:', error);
    showAnalyzeResult(
      `분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      'error'
    );
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '현재 페이지 상품 분석';
  }
}

/**
 * Content Script 준비 확인
 */
async function ensureContentScriptReady(tabId: number): Promise<void> {
  try {
    // PING 메시지로 content script 확인
    await chrome.tabs.sendMessage(tabId, { type: 'PING' });
  } catch (error) {
    // Content script가 없으면 동적으로 주입
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });

    // Content script 로드 대기 (최대 2초)
    let retries = 10;
    while (retries > 0) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        return; // 성공
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
        retries--;
      }
    }

    throw new Error(
      '페이지 준비에 실패했습니다. 페이지를 새로고침한 후 다시 시도해주세요.'
    );
  }
}

/**
 * 현재 탭에서 콘텐츠 추출
 */
async function extractContent(): Promise<ExtractedContent> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    throw new Error('활성 탭을 찾을 수 없습니다.');
  }

  // Content script 준비 확인
  await ensureContentScriptReady(tab.id);

  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'EXTRACT_CONTENT',
    options: {
      minTextLength: 10,
      minImageSize: { width: 100, height: 100 },
    },
  });

  if (!response.success) {
    throw new Error(response.error || '콘텐츠 추출에 실패했습니다.');
  }

  return response.data;
}

/**
 * 분석 결과 저장
 */
async function saveAnalysisResult(
  category: string,
  content: ExtractedContent,
  analysisResult: ProductAnalysisResponse
): Promise<void> {
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
  const productCards = products.map((product) => renderProductCard(product)).join('');

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
