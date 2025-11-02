import type { ComparisonTask } from '@/types/storage';
import type { ComparisonReportData } from '@/types/content';

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

    const report = task.report;

    // HTML 렌더링
    appDiv.innerHTML = renderReportHTML(report);

  } catch (error) {
    console.error('결과 로드 실패:', error);
    appDiv.innerHTML = '<div class="error">결과 로드에 실패했습니다.</div>';
  }
}

/**
 * 리포트 HTML 생성
 */
function renderReportHTML(report: ComparisonReportData): string {
  return `
    <div class="container">
      <!-- 헤더 -->
      <div class="header">
        <h1>SmartCompare 비교 분석 결과</h1>
        <div class="header-info">
          카테고리: ${report.category} | 총 ${report.total_products}개 제품 비교
        </div>
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
          ${report.ranked_products.map(product => renderProductCard(product)).join('')}
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
  `;
}

/**
 * 제품 카드 렌더링
 */
function renderProductCard(product: any): string {
  return `
    <div class="product-card rank-${product.rank}">
      <div class="product-rank rank-${product.rank}">${product.rank}위</div>
      <div class="product-name">${product.product_name}</div>
      <div class="product-score">${product.score.toFixed(1)}점</div>

      <div class="criteria-list">
        ${Object.entries(product.criteria_scores).map(([criterion, value]) => `
          <div class="criteria-item">
            <span class="criteria-label">${criterion}</span>
            <span class="criteria-value">${value}</span>
          </div>
        `).join('')}
      </div>

      <div class="strengths-weaknesses">
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
    </div>
  `;
}

/**
 * 비교표 렌더링
 */
function renderComparisonTable(report: ComparisonReportData): string {
  // 첫 번째 제품의 기준을 사용
  if (report.ranked_products.length === 0) return '';

  const criteria = Object.keys(report.ranked_products[0].criteria_scores);

  return `
    <div class="section">
      <div class="section-title">📋 기준별 비교</div>
      <table class="comparison-table">
        <thead>
          <tr>
            <th>기준</th>
            ${report.ranked_products.map(p => `<th>${p.product_name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${criteria.map(criterion => `
            <tr>
              <td><strong>${criterion}</strong></td>
              ${report.ranked_products.map(p => `
                <td>${p.criteria_scores[criterion] || '-'}</td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * 페이지 로드 시 렌더링
 */
document.addEventListener('DOMContentLoaded', renderReport);
