import type { ComparisonTask } from '@/types/storage';
import type { ComparisonReportData } from '@/types/content';

let currentTask: ComparisonTask | null = null;
let selectedProductsForComparison: string[] = [];

/**
 * 비교 결과 렌더링
 */
async function renderReport(): Promise<void> {
  const appDiv = document.getElementById('app')!;

  try {
    // Storage에서 비교 작업 상태 가져오기
    const result = await chrome.storage.local.get('currentComparisonTask');
    const task: ComparisonTask | null = result.currentComparisonTask;

    if (!task || !task.report) {
      appDiv.innerHTML = '<div class="error">비교 결과를 찾을 수 없습니다.</div>';
      return;
    }

    currentTask = task;
    const report = task.report;

    // 기본 선택: 1위와 2위
    if (report.ranked_products.length >= 2) {
      selectedProductsForComparison = [
        report.ranked_products[0].product_name,
        report.ranked_products[1].product_name
      ];
    }

    // HTML 렌더링
    appDiv.innerHTML = renderReportHTML(report, task.userPriorities);

    // 이벤트 리스너 등록
    attachEventListeners();

  } catch (error) {
    console.error('결과 로드 실패:', error);
    appDiv.innerHTML = '<div class="error">결과 로드에 실패했습니다.</div>';
  }
}

/**
 * 리포트 HTML 생성
 */
function renderReportHTML(report: ComparisonReportData, userPriorities?: string[]): string {
  return `
    <div class="container">
      <!-- 헤더 -->
      <div class="header">
        <h1>SmartCompare 비교 분석 결과</h1>
        <div class="header-info">
          카테고리: ${report.category} | 총 ${report.total_products}개 제품 비교
        </div>

        ${userPriorities && userPriorities.length > 0 ? `
          <div class="priority-badges">
            <strong>선택한 우선순위:</strong>
            ${userPriorities.map((priority, index) => `
              <div class="priority-badge">
                <span class="priority-num">${index + 1}</span>
                ${priority}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- 요약 -->
      <div class="section">
        <div class="section-title">📊 요약</div>
        <div class="summary-box">${report.summary}</div>
      </div>

      <!-- 순위별 제품 -->
      <div class="section">
        <div class="section-title">🏆 순위별 제품</div>
        <div class="product-cards">
          ${report.ranked_products.map(product => renderProductCard(product, userPriorities)).join('')}
        </div>
      </div>

      <!-- 기준별 비교표 -->
      ${renderComparisonTable(report)}

      <!-- 최종 추천 -->
      <div class="section">
        <div class="recommendation-box">
          <h3>💡 최종 추천</h3>
          <div>${report.recommendation}</div>
        </div>
      </div>
    </div>

    <!-- 모달 -->
    <div class="modal" id="productModal">
      <div class="modal-content">
        <button class="modal-close" id="modalClose">×</button>
        <div id="modalBody"></div>
      </div>
    </div>
  `;
}

/**
 * 제품 카드 렌더링 (축소 모드)
 */
function renderProductCard(product: any, userPriorities?: string[]): string {
  // 우선순위 기준 표시 (상위 3개만)
  const priorityCriteria = userPriorities ?
    userPriorities.slice(0, 3).filter(p => p in product.criteria_scores) :
    Object.keys(product.criteria_scores).slice(0, 3);

  return `
    <div class="product-card rank-${product.rank}" data-product-id="${product.rank}">
      <div class="product-rank rank-${product.rank}">${product.rank}위</div>
      <div class="product-name">${product.product_name}</div>
      <div class="product-score">${product.score.toFixed(1)}점</div>

      <div class="criteria-list">
        ${priorityCriteria.map((criterion: string) => `
          <div class="criteria-item">
            <span class="criteria-label">${criterion}</span>
            <span class="criteria-value">${product.criteria_scores[criterion] || '-'}</span>
          </div>
        `).join('')}
      </div>

      <button class="view-details-btn">자세히 보기</button>
    </div>
  `;
}

/**
 * 제품 상세 정보 (모달용)
 */
function renderProductDetail(product: any, userPriorities?: string[]): string {
  return `
    <div class="product-rank rank-${product.rank}">${product.rank}위</div>
    <div class="product-name" style="font-size: 22px; margin-bottom: 12px;">${product.product_name}</div>
    <div class="product-score" style="font-size: 32px;">${product.score.toFixed(1)}점</div>

    <div class="criteria-list" style="margin-top: 20px;">
      <h3 style="font-size: 16px; margin-bottom: 12px;">기준별 점수</h3>
      ${Object.entries(product.criteria_scores).map(([criterion, value]) => {
        const isPriority = userPriorities && userPriorities.includes(criterion);
        return `
          <div class="criteria-item">
            <span class="criteria-label">${criterion} ${isPriority ? '⭐' : ''}</span>
            <span class="criteria-value">${value}</span>
          </div>
        `;
      }).join('')}
    </div>

    <div class="strengths-weaknesses" style="margin-top: 24px;">
      ${product.strengths.length > 0 ? `
        <div class="strengths">
          <div class="strengths-title">강점</div>
          <ul>
            ${product.strengths.map((s: string) => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${product.weaknesses.length > 0 ? `
        <div class="weaknesses">
          <div class="weaknesses-title">약점</div>
          <ul>
            ${product.weaknesses.map((w: string) => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * 비교표 렌더링
 */
function renderComparisonTable(report: ComparisonReportData): string {
  if (report.ranked_products.length === 0) return '';

  return `
    <div class="section" id="comparisonSection">
      <div class="section-title">📋 기준별 비교</div>

      <!-- 제품 선택 UI -->
      <div class="product-selector">
        <div class="product-selector-title">비교할 제품 선택 (2~3개)</div>
        <div class="product-chips">
          ${report.ranked_products.map(p => `
            <div class="product-chip ${selectedProductsForComparison.includes(p.product_name) ? 'selected' : ''}"
                 data-product-name="${p.product_name}">
              ${p.product_name}
            </div>
          `).join('')}
        </div>
      </div>

      <table class="comparison-table" id="comparisonTable">
        <!-- 동적 업데이트 -->
      </table>
    </div>
  `;
}

/**
 * 비교표 테이블 업데이트
 */
function updateComparisonTable(userPriorities?: string[]): void {
  if (!currentTask?.report) return;

  const report = currentTask.report;
  const selectedProducts = report.ranked_products.filter(p =>
    selectedProductsForComparison.includes(p.product_name)
  );

  if (selectedProducts.length === 0) return;

  const criteria = Object.keys(selectedProducts[0].criteria_scores);

  const tableHTML = `
    <thead>
      <tr>
        <th>기준</th>
        ${selectedProducts.map(p => `<th>${p.product_name}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${criteria.map(criterion => {
        const isPriority = userPriorities && userPriorities.includes(criterion);
        return `
          <tr>
            <td><strong>${criterion} ${isPriority ? '⭐' : ''}</strong></td>
            ${selectedProducts.map(p => `
              <td>${p.criteria_scores[criterion] || '-'}</td>
            `).join('')}
          </tr>
        `;
      }).join('')}
    </tbody>
  `;

  const table = document.getElementById('comparisonTable');
  if (table) {
    table.innerHTML = tableHTML;
  }
}

/**
 * 이벤트 리스너 등록
 */
function attachEventListeners(): void {
  // 제품 카드 클릭 - 모달 열기
  document.querySelectorAll('.view-details-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = (e.target as HTMLElement).closest('.product-card');
      const productId = parseInt(card?.getAttribute('data-product-id') || '1');
      openProductModal(productId);
    });
  });

  // 모달 닫기
  const modalClose = document.getElementById('modalClose');
  const modal = document.getElementById('productModal');

  modalClose?.addEventListener('click', () => {
    modal?.classList.remove('active');
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // 제품 선택 chip 클릭
  document.querySelectorAll('.product-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const productName = (chip as HTMLElement).dataset.productName!;
      toggleProductSelection(productName);
    });
  });

  // 초기 테이블 렌더링
  updateComparisonTable(currentTask?.userPriorities);
}

/**
 * 제품 모달 열기
 */
function openProductModal(productRank: number): void {
  if (!currentTask?.report) return;

  const product = currentTask.report.ranked_products.find(p => p.rank === productRank);
  if (!product) return;

  const modalBody = document.getElementById('modalBody');
  const modal = document.getElementById('productModal');

  if (modalBody && modal) {
    modalBody.innerHTML = renderProductDetail(product, currentTask.userPriorities);
    modal.classList.add('active');
  }
}

/**
 * 제품 선택 토글
 */
function toggleProductSelection(productName: string): void {
  const index = selectedProductsForComparison.indexOf(productName);

  if (index > -1) {
    // 이미 선택됨 -> 제거 (최소 2개는 유지)
    if (selectedProductsForComparison.length > 2) {
      selectedProductsForComparison.splice(index, 1);
    }
  } else {
    // 선택 추가 (최대 3개)
    if (selectedProductsForComparison.length < 3) {
      selectedProductsForComparison.push(productName);
    }
  }

  // UI 업데이트
  document.querySelectorAll('.product-chip').forEach(chip => {
    const name = (chip as HTMLElement).dataset.productName!;
    if (selectedProductsForComparison.includes(name)) {
      chip.classList.add('selected');
    } else {
      chip.classList.remove('selected');
    }
  });

  // 테이블 업데이트
  updateComparisonTable(currentTask?.userPriorities);
}

/**
 * 페이지 로드 시 렌더링
 */
document.addEventListener('DOMContentLoaded', renderReport);
