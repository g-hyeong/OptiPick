/**
 * 비교 리포트 상태 관리 Hook (IndexedDB via Dexie)
 */
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/db';
import type { ComparisonTask, StoredProduct } from '@/types/storage';
import type { ComparisonReportData, ProductComparison } from '@/types/content';

export interface CompareState {
  report: ComparisonReportData | null;
  products: StoredProduct[];
  visibleProducts: string[];
  visibleCriteria: string[];
  productOrder: string[];
  criteriaOrder: string[];
  loading: boolean;
  error: string | null;
}

export interface CompareActions {
  toggleProduct: (name: string) => void;
  toggleCriterion: (name: string) => void;
  reorderProducts: (newOrder: string[]) => void;
  reorderCriteria: (newOrder: string[]) => void;
  hideProduct: (name: string) => void;
  showProduct: (name: string) => void;
  getProductData: (name: string) => ProductComparison | undefined;
  getProductInfo: (name: string) => StoredProduct | undefined;
  isUserCriterion: (criterion: string) => boolean;
  getCriteriaImportance: (criterion: string) => number | undefined;
}

// 모든 기준 추출 (사용자 기준 + Agent 기준)
function getAllCriteria(report: ComparisonReportData): string[] {
  const criteriaSet = new Set<string>();

  // 사용자 기준 (unavailable 제외)
  report.user_criteria.filter((c) => !report.unavailable_criteria.includes(c)).forEach((c) => criteriaSet.add(c));

  // Agent 도출 기준
  Object.keys(report.criteria_importance).forEach((c) => criteriaSet.add(c));

  return Array.from(criteriaSet);
}

// 기준 정렬: 사용자 기준 먼저, 그 다음 중요도 순
function getOrderedCriteria(report: ComparisonReportData): string[] {
  const userCriteria = report.user_criteria.filter((c) => !report.unavailable_criteria.includes(c));

  const agentCriteria = Object.entries(report.criteria_importance)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([c]) => c);

  return [...userCriteria, ...agentCriteria];
}

export function useCompareState(historyId?: string | null): {
  state: CompareState;
  actions: CompareActions;
  orderedVisibleProducts: string[];
  orderedVisibleCriteria: string[];
  hiddenProducts: string[];
} {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ComparisonReportData | null>(null);
  const [products, setProducts] = useState<StoredProduct[]>([]);
  const [visibleProducts, setVisibleProducts] = useState<string[]>([]);
  const [visibleCriteria, setVisibleCriteria] = useState<string[]>([]);
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [criteriaOrder, setCriteriaOrder] = useState<string[]>([]);

  // 데이터 로드
  useEffect(() => {
    loadReport();
  }, [historyId]);

  const loadReport = async () => {
    try {
      let reportData: ComparisonReportData;
      let loadedProducts: StoredProduct[] = [];

      if (historyId) {
        // 히스토리에서 로드
        console.log('[useCompareState] Loading from history:', historyId);
        const historyItem = await db.analysisHistory.get(historyId);

        if (!historyItem || !historyItem.reportData) {
          throw new Error('히스토리를 찾을 수 없습니다');
        }

        reportData = historyItem.reportData;

        // 정규화된 productIds로 제품 조회
        if (historyItem.productIds && historyItem.productIds.length > 0) {
          const fetchedProducts = await db.products.where('id').anyOf(historyItem.productIds).toArray();
          // ID 순서 유지
          const productMap = new Map(fetchedProducts.map((p) => [p.id, p]));
          loadedProducts = historyItem.productIds.map((id) => productMap.get(id)).filter((p): p is StoredProduct => !!p);
        }
      } else {
        // 현재 작업에서 로드
        const tasks = await db.currentComparisonTask.toArray();
        const task: ComparisonTask | null = tasks[0] || null;

        if (!task || !task.report) {
          throw new Error('비교 결과를 찾을 수 없습니다');
        }

        reportData = task.report;

        // 선택된 제품들 가져오기
        if (task.selectedProductIds && task.selectedProductIds.length > 0) {
          const fetchedProducts = await db.products.where('id').anyOf(task.selectedProductIds).toArray();
          const productMap = new Map(fetchedProducts.map((p) => [p.id, p]));
          loadedProducts = task.selectedProductIds.map((id) => productMap.get(id)).filter((p): p is StoredProduct => !!p);
        }
      }

      // 기존 데이터 호환성
      if (!reportData.unavailable_criteria) {
        reportData.unavailable_criteria = [];
      }
      if (!reportData.criteria_importance) {
        reportData.criteria_importance = {};
      }

      // 초기 상태 설정
      const productNames = reportData.products.map((p) => p.product_name);
      const allCriteria = getAllCriteria(reportData);
      const orderedCriteria = getOrderedCriteria(reportData);

      setReport(reportData);
      setProducts(loadedProducts);
      setVisibleProducts(productNames);
      setVisibleCriteria(allCriteria);
      setProductOrder(productNames);
      setCriteriaOrder(orderedCriteria);
      setLoading(false);
    } catch (err) {
      console.error('[useCompareState] Failed to load report:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setLoading(false);
    }
  };

  // 제품 토글
  const toggleProduct = useCallback((productName: string) => {
    setVisibleProducts((prev) => (prev.includes(productName) ? prev.filter((p) => p !== productName) : [...prev, productName]));
  }, []);

  // 기준 토글
  const toggleCriterion = useCallback((criterion: string) => {
    setVisibleCriteria((prev) => (prev.includes(criterion) ? prev.filter((c) => c !== criterion) : [...prev, criterion]));
  }, []);

  // 제품 순서 변경
  const reorderProducts = useCallback((newOrder: string[]) => {
    setProductOrder(newOrder);
  }, []);

  // 기준 순서 변경
  const reorderCriteria = useCallback((newOrder: string[]) => {
    setCriteriaOrder(newOrder);
  }, []);

  // 제품 숨기기
  const hideProduct = useCallback((productName: string) => {
    setVisibleProducts((prev) => prev.filter((p) => p !== productName));
  }, []);

  // 제품 보이기
  const showProduct = useCallback((productName: string) => {
    setVisibleProducts((prev) => (prev.includes(productName) ? prev : [...prev, productName]));
  }, []);

  // 제품 비교 데이터 가져오기
  const getProductData = useCallback(
    (productName: string): ProductComparison | undefined => {
      return report?.products.find((p) => p.product_name === productName);
    },
    [report]
  );

  // 저장된 제품 정보 가져오기
  const getProductInfo = useCallback(
    (productName: string): StoredProduct | undefined => {
      return products.find(
        (p) =>
          p.fullAnalysis.product_name === productName ||
          p.title === productName ||
          p.fullAnalysis.product_name?.includes(productName) ||
          productName.includes(p.fullAnalysis.product_name || '')
      );
    },
    [products]
  );

  // 사용자 기준 여부
  const isUserCriterion = useCallback(
    (criterion: string): boolean => {
      return report?.user_criteria.includes(criterion) || false;
    },
    [report]
  );

  // 기준 중요도 가져오기
  const getCriteriaImportance = useCallback(
    (criterion: string): number | undefined => {
      return report?.criteria_importance[criterion];
    },
    [report]
  );

  // 계산된 값들
  const orderedVisibleProducts = productOrder.filter((p) => visibleProducts.includes(p));
  const orderedVisibleCriteria = criteriaOrder.filter((c) => visibleCriteria.includes(c));
  const hiddenProducts = productOrder.filter((p) => !visibleProducts.includes(p));

  return {
    state: {
      report,
      products,
      visibleProducts,
      visibleCriteria,
      productOrder,
      criteriaOrder,
      loading,
      error,
    },
    actions: {
      toggleProduct,
      toggleCriterion,
      reorderProducts,
      reorderCriteria,
      hideProduct,
      showProduct,
      getProductData,
      getProductInfo,
      isUserCriterion,
      getCriteriaImportance,
    },
    orderedVisibleProducts,
    orderedVisibleCriteria,
    hiddenProducts,
  };
}
