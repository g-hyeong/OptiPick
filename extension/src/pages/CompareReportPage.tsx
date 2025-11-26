import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import { Chip } from "@/components/ui";
import type { ComparisonTask, StoredProduct } from "@/types/storage";
import type { ComparisonReportData, ProductComparison } from "@/types/content";

export function CompareReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ComparisonReportData | null>(null);
  const [products, setProducts] = useState<StoredProduct[]>([]);

  // 필터링 및 순서 변경 상태
  const [visibleProducts, setVisibleProducts] = useState<string[]>([]);
  const [visibleCriteria, setVisibleCriteria] = useState<string[]>([]);
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [criteriaOrder, setCriteriaOrder] = useState<string[]>([]);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      // URL 파라미터 확인
      const urlParams = new URLSearchParams(window.location.search);
      const historyId = urlParams.get("historyId");

      let reportData: ComparisonReportData;
      let loadedProducts: StoredProduct[] = [];

      if (historyId) {
        // 히스토리에서 로드
        console.log("[CompareReportPage] Loading from history:", historyId);
        const result = await chrome.storage.local.get("analysisHistory");
        const history = result.analysisHistory || [];
        console.log("[CompareReportPage] Total history items:", history.length);

        const historyItem = history.find((item: any) => item.id === historyId);

        if (!historyItem || !historyItem.reportData) {
          console.error("[CompareReportPage] History item not found:", {
            historyId,
            availableIds: history.map((h: any) => h.id),
          });
          throw new Error("히스토리를 찾을 수 없습니다");
        }

        console.log("[CompareReportPage] History item loaded:", {
          category: historyItem.category,
          productCount: historyItem.productCount,
        });

        reportData = historyItem.reportData;
        loadedProducts = historyItem.products || [];

        // 기존 히스토리 데이터 호환성: 누락된 필드 기본값 추가
        if (!reportData.unavailable_criteria) {
          reportData.unavailable_criteria = [];
        }
        if (!reportData.criteria_importance) {
          reportData.criteria_importance = {};
        }
      } else {
        // 현재 작업에서 로드
        const result = await chrome.storage.local.get("currentComparisonTask");
        const task: ComparisonTask | null = result.currentComparisonTask;

        if (!task || !task.report) {
          throw new Error("비교 결과를 찾을 수 없습니다");
        }

        reportData = task.report;

        // 기존 데이터 호환성: 누락된 필드 기본값 추가
        if (!reportData.unavailable_criteria) {
          reportData.unavailable_criteria = [];
        }
        if (!reportData.criteria_importance) {
          reportData.criteria_importance = {};
        }

        // 선택된 제품들 가져오기
        const allProductsResult = await chrome.storage.local.get("products");
        const allProducts = allProductsResult.products || [];
        loadedProducts = allProducts.filter((p: StoredProduct) =>
          task.selectedProductIds.includes(p.id)
        );
      }

      // 초기 필터링 및 순서 설정
      const productNames = reportData.products.map(p => p.product_name);
      const allCriteria = getAllCriteria(reportData);

      // 사용자 기준 먼저, 그 다음 Agent 기준 (중요도 순)
      const orderedCriteria = [
        ...reportData.user_criteria.filter(c => !reportData.unavailable_criteria.includes(c)),
        ...Object.entries(reportData.criteria_importance)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([c]) => c)
      ];

      setReport(reportData);
      setProducts(loadedProducts);
      setVisibleProducts(productNames);
      setVisibleCriteria(allCriteria);
      setProductOrder(productNames);
      setCriteriaOrder(orderedCriteria);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load report:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setLoading(false);
    }
  };

  const getAllCriteria = (report: ComparisonReportData): string[] => {
    const criteriaSet = new Set<string>();

    // 사용자 기준 (unavailable 제외)
    report.user_criteria
      .filter(c => !report.unavailable_criteria.includes(c))
      .forEach(c => criteriaSet.add(c));

    // Agent 도출 기준
    Object.keys(report.criteria_importance).forEach(c => criteriaSet.add(c));

    return Array.from(criteriaSet);
  };

  const toggleProduct = (productName: string) => {
    setVisibleProducts(prev =>
      prev.includes(productName)
        ? prev.filter(p => p !== productName)
        : [...prev, productName]
    );
  };

  const toggleCriterion = (criterion: string) => {
    setVisibleCriteria(prev =>
      prev.includes(criterion)
        ? prev.filter(c => c !== criterion)
        : [...prev, criterion]
    );
  };

  const moveProduct = (productName: string, direction: 'left' | 'right') => {
    const index = productOrder.indexOf(productName);
    if (index === -1) return;

    const newOrder = [...productOrder];
    if (direction === 'left' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'right' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setProductOrder(newOrder);
  };

  const moveCriterion = (criterion: string, direction: 'up' | 'down') => {
    const index = criteriaOrder.indexOf(criterion);
    if (index === -1) return;

    const newOrder = [...criteriaOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setCriteriaOrder(newOrder);
  };

  const getProductData = (productName: string): ProductComparison | undefined => {
    return report?.products.find(p => p.product_name === productName);
  };

  const getProductInfo = (productName: string): StoredProduct | undefined => {
    return products.find(p => p.fullAnalysis.product_name === productName);
  };

  const isUserCriterion = (criterion: string): boolean => {
    return report?.user_criteria.includes(criterion) || false;
  };

  const getCriteriaImportance = (criterion: string): number | undefined => {
    return report?.criteria_importance[criterion];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-primary-600">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-error text-lg font-semibold">{error || "데이터를 찾을 수 없습니다"}</p>
        </div>
      </div>
    );
  }

  const orderedVisibleProducts = productOrder.filter(p => visibleProducts.includes(p));
  const orderedVisibleCriteria = criteriaOrder.filter(c => visibleCriteria.includes(c));

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* 헤더 */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary-800 mb-2">
            SmartCompare 비교 분석 결과
          </h1>
          <p className="text-primary-600">
            {report.category} · {report.total_products}개 제품 비교
          </p>

          {report.user_criteria.length > 0 && (
            <div className="mt-4">
              <span className="text-sm font-medium text-primary-700">사용자 입력 기준:</span>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {report.user_criteria.map((criterion) => (
                  <Chip key={criterion} variant="selected" size="md">
                    {criterion}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* 추출 불가능한 기준 안내 */}
        {report.unavailable_criteria.length > 0 && (
          <Card className="mb-6 bg-yellow-50 border-yellow-300">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                  추출 불가능한 기준
                </h3>
                <p className="text-sm text-yellow-700 mb-2">
                  제품 데이터에서 다음 기준에 대한 정보를 찾을 수 없습니다:
                </p>
                <div className="flex flex-wrap gap-2">
                  {report.unavailable_criteria.map((criterion) => (
                    <Chip key={criterion} variant="primary" size="sm">
                      {criterion}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 제품 필터링 및 순서 변경 */}
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-primary-800 mb-3">
            제품 필터링 및 순서 변경
          </h3>
          <div className="space-y-2">
            {productOrder.map((productName) => {
              const isVisible = visibleProducts.includes(productName);
              const productInfo = getProductInfo(productName);
              const index = productOrder.indexOf(productName);

              return (
                <div
                  key={productName}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isVisible
                      ? "bg-white border-primary-200"
                      : "bg-warm-100 border-warm-200 opacity-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleProduct(productName)}
                    className="w-4 h-4 text-primary-600"
                  />
                  {productInfo?.thumbnailUrl && (
                    <img
                      src={productInfo.thumbnailUrl}
                      alt={productName}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <span className="flex-1 text-sm font-medium text-primary-800">
                    {productName}
                  </span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveProduct(productName, 'left')}
                      disabled={index === 0}
                      className={`p-1.5 rounded ${
                        index === 0
                          ? "text-warm-300 cursor-not-allowed"
                          : "text-primary-600 hover:bg-primary-100"
                      }`}
                      title="왼쪽으로 이동"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveProduct(productName, 'right')}
                      disabled={index === productOrder.length - 1}
                      className={`p-1.5 rounded ${
                        index === productOrder.length - 1
                          ? "text-warm-300 cursor-not-allowed"
                          : "text-primary-600 hover:bg-primary-100"
                      }`}
                      title="오른쪽으로 이동"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 기준 필터링 및 순서 변경 */}
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-primary-800 mb-3">
            기준 필터링 및 순서 변경
          </h3>
          <div className="space-y-2">
            {criteriaOrder.map((criterion) => {
              const isVisible = visibleCriteria.includes(criterion);
              const isUser = isUserCriterion(criterion);
              const importance = getCriteriaImportance(criterion);
              const index = criteriaOrder.indexOf(criterion);

              return (
                <div
                  key={criterion}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isVisible
                      ? "bg-white border-primary-200"
                      : "bg-warm-100 border-warm-200 opacity-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleCriterion(criterion)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="flex-1 text-sm font-medium text-primary-800">
                    {criterion}
                    {isUser && (
                      <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                        사용자 기준
                      </span>
                    )}
                    {importance && (
                      <span className="ml-2 text-xs bg-accent-100 text-accent-700 px-2 py-0.5 rounded">
                        중요도 {importance}
                      </span>
                    )}
                  </span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveCriterion(criterion, 'up')}
                      disabled={index === 0}
                      className={`p-1.5 rounded ${
                        index === 0
                          ? "text-warm-300 cursor-not-allowed"
                          : "text-primary-600 hover:bg-primary-100"
                      }`}
                      title="위로 이동"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveCriterion(criterion, 'down')}
                      disabled={index === criteriaOrder.length - 1}
                      className={`p-1.5 rounded ${
                        index === criteriaOrder.length - 1
                          ? "text-warm-300 cursor-not-allowed"
                          : "text-primary-600 hover:bg-primary-100"
                      }`}
                      title="아래로 이동"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 비교 테이블 (전치: 행=기준, 열=제품) */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold text-primary-800 mb-4">제품 비교 테이블</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              {/* 제품명 + 썸네일 행 */}
              <thead>
                <tr className="border-b-2 border-primary-300">
                  <th className="text-left p-3 bg-primary-50 font-semibold text-primary-800 sticky left-0 z-10">
                    기준 / 제품
                  </th>
                  {orderedVisibleProducts.map((productName) => {
                    const productInfo = getProductInfo(productName);
                    return (
                      <th key={productName} className="text-center p-3 bg-primary-50">
                        <div className="flex flex-col items-center gap-2">
                          {productInfo?.thumbnailUrl && (
                            <a
                              href={productInfo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={productInfo.thumbnailUrl}
                                alt={productName}
                                className="w-20 h-20 object-cover rounded hover:ring-2 hover:ring-primary-500 transition-all"
                              />
                            </a>
                          )}
                          <a
                            href={productInfo?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-primary-800 hover:text-primary-600 transition-colors text-sm max-w-[150px]"
                          >
                            {productName}
                          </a>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {orderedVisibleCriteria.map((criterion, idx) => {
                  const isUser = isUserCriterion(criterion);
                  const importance = getCriteriaImportance(criterion);

                  return (
                    <tr
                      key={criterion}
                      className={`border-b border-warm-100 ${
                        idx % 2 === 0 ? "bg-warm-50" : "bg-white"
                      }`}
                    >
                      <td className="p-3 font-medium text-primary-800 sticky left-0 z-10 bg-inherit">
                        <div className="flex flex-col gap-1">
                          <span>{criterion}</span>
                          <div className="flex gap-1 flex-wrap">
                            {isUser && (
                              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                                사용자
                              </span>
                            )}
                            {importance && (
                              <span className="text-xs bg-accent-100 text-accent-700 px-2 py-0.5 rounded">
                                중요도 {importance}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {orderedVisibleProducts.map((productName) => {
                        const productData = getProductData(productName);
                        const spec = productData?.criteria_specs?.[criterion];
                        const details = productData?.criteria_details?.[criterion];

                        return (
                          <td key={productName} className="p-3 align-top">
                            {spec && spec.trim() !== "" ? (
                              <div className="flex flex-col gap-2">
                                <span className="text-primary-800 font-medium">
                                  {spec}
                                </span>
                                {details && details.length > 0 && (
                                  <ul className="text-xs text-primary-600 space-y-1 pl-3">
                                    {details.map((detail, detailIdx) => (
                                      <li key={detailIdx} className="list-disc">
                                        {detail}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ) : (
                              <span className="text-warm-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 종합평 */}
        <Card className="bg-primary-50 border-primary-200">
          <h2 className="text-xl font-semibold text-primary-800 mb-3">종합평</h2>
          <p className="text-primary-700 leading-relaxed">{report.summary}</p>
        </Card>
      </div>
    </div>
  );
}
