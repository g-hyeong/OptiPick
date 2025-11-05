import { useState, useEffect } from "react";
import { Card } from "@/components/ui";
import { Chip } from "@/components/ui";
import type { ComparisonTask } from "@/types/storage";
import type { ComparisonReportData, ProductComparison } from "@/types/content";

interface RankedProduct extends ProductComparison {
  score: number;
  rank: number;
}

export function CompareReportPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ComparisonReportData | null>(null);
  const [rankedProducts, setRankedProducts] = useState<RankedProduct[]>([]);
  const [userPriorities, setUserPriorities] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<RankedProduct | null>(null);
  const [isEditingPriorities, setIsEditingPriorities] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      // URL 파라미터 확인
      const urlParams = new URLSearchParams(window.location.search);
      const historyId = urlParams.get("historyId");

      let reportData: ComparisonReportData;
      let priorities: string[] = [];

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
          hasPriorities: !!historyItem.userPriorities,
        });

        reportData = historyItem.reportData;
        priorities = historyItem.userPriorities || [];
      } else {
        // 현재 작업에서 로드
        const result = await chrome.storage.local.get("currentComparisonTask");
        const task: ComparisonTask | null = result.currentComparisonTask;

        if (!task || !task.report) {
          throw new Error("비교 결과를 찾을 수 없습니다");
        }

        reportData = task.report;

        // 우선순위 배열 변환
        if (task.userPriorities && Array.isArray(task.userPriorities)) {
          priorities = task.userPriorities;
        } else if (reportData.user_priorities && typeof reportData.user_priorities === "object") {
          priorities = Object.entries(reportData.user_priorities)
            .sort(([, a], [, b]) => (a as number) - (b as number))
            .map(([criterion]) => criterion);
        }
      }

      // 우선순위가 없으면 reportData에서 추출
      if (priorities.length === 0 && reportData.user_priorities) {
        priorities = Object.entries(reportData.user_priorities)
          .sort(([, a], [, b]) => (a as number) - (b as number))
          .map(([criterion]) => criterion);
      }

      // 순위 계산
      const ranked = rankProducts(reportData.products, priorities);

      setReport(reportData);
      setUserPriorities(priorities);
      setRankedProducts(ranked);
      setSelectedProducts(ranked.slice(0, 2).map((p) => p.product_name));
      setLoading(false);
    } catch (err) {
      console.error("Failed to load report:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setLoading(false);
    }
  };

  const getPriorityWeight = (priority: number): number => {
    return Math.max(6 - priority, 0);
  };

  const calculateFinalScore = (
    product: ProductComparison,
    priorities: string[]
  ): number => {
    if (priorities.length === 0) {
      const scores = Object.values(product.criteria_scores);
      return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    let weightedSum = 0;
    let totalWeight = 0;

    priorities.forEach((criterion, index) => {
      const priority = index + 1;
      const weight = getPriorityWeight(priority);
      const score = product.criteria_scores[criterion] || 0;

      weightedSum += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const rankProducts = (
    products: ProductComparison[],
    priorities: string[]
  ): RankedProduct[] => {
    const productsWithScore = products.map((product) => ({
      ...product,
      score: calculateFinalScore(product, priorities),
      rank: 0,
    }));

    productsWithScore.sort((a, b) => b.score - a.score);
    productsWithScore.forEach((product, index) => {
      product.rank = index + 1;
    });

    return productsWithScore;
  };

  const toggleProductSelection = (productName: string) => {
    if (selectedProducts.includes(productName)) {
      if (selectedProducts.length > 2) {
        setSelectedProducts(selectedProducts.filter((p) => p !== productName));
      }
    } else {
      if (selectedProducts.length < 3) {
        setSelectedProducts([...selectedProducts, productName]);
      }
    }
  };

  // 우선순위 위로 이동
  const movePriorityUp = (index: number) => {
    if (index === 0) return;
    const newPriorities = [...userPriorities];
    [newPriorities[index - 1], newPriorities[index]] = [
      newPriorities[index],
      newPriorities[index - 1],
    ];
    setUserPriorities(newPriorities);

    // 순위 재계산
    if (report) {
      const reranked = rankProducts(report.products, newPriorities);
      setRankedProducts(reranked);
    }
  };

  // 우선순위 아래로 이동
  const movePriorityDown = (index: number) => {
    if (index === userPriorities.length - 1) return;
    const newPriorities = [...userPriorities];
    [newPriorities[index], newPriorities[index + 1]] = [
      newPriorities[index + 1],
      newPriorities[index],
    ];
    setUserPriorities(newPriorities);

    // 순위 재계산
    if (report) {
      const reranked = rankProducts(report.products, newPriorities);
      setRankedProducts(reranked);
    }
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

  const selectedForComparison = rankedProducts.filter((p) =>
    selectedProducts.includes(p.product_name)
  );
  const criteria = selectedForComparison.length > 0
    ? Object.keys(selectedForComparison[0].criteria_scores)
    : [];

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* 헤더 */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary-800 mb-2">
            OptiPick 비교 분석 결과
          </h1>
          <p className="text-primary-600">
            {report.category} · {report.total_products}개 제품 비교
          </p>

          {userPriorities.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-primary-700">선택한 우선순위:</span>
                <button
                  onClick={() => setIsEditingPriorities(!isEditingPriorities)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1 rounded border border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  {isEditingPriorities ? "편집 완료" : "우선순위 편집"}
                </button>
              </div>

              {!isEditingPriorities ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {userPriorities.map((priority, index) => (
                    <Chip key={priority} variant="selected" size="md">
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                        {index + 1}
                      </span>
                      {priority}
                    </Chip>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {userPriorities.map((priority, index) => (
                    <div
                      key={priority}
                      className="flex items-center gap-3 bg-white p-3 rounded-lg border border-warm-200"
                    >
                      <span className="flex items-center justify-center w-8 h-8 bg-primary-500 text-white text-sm font-bold rounded-full flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-primary-800">
                        {priority}
                      </span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => movePriorityUp(index)}
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
                          onClick={() => movePriorityDown(index)}
                          disabled={index === userPriorities.length - 1}
                          className={`p-1.5 rounded ${
                            index === userPriorities.length - 1
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
                  ))}
                  <p className="text-xs text-primary-600 mt-2">
                    우선순위를 변경하면 제품 순위가 자동으로 재계산됩니다
                  </p>
                </div>
              )}
            </div>
          )}
        </header>

        {/* 요약 */}
        <Card className="mb-8 bg-primary-50 border-primary-200">
          <h2 className="text-xl font-semibold text-primary-800 mb-3">요약</h2>
          <p className="text-primary-700 leading-relaxed">{report.summary}</p>
        </Card>

        {/* 순위별 제품 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-primary-800 mb-6">순위별 제품</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rankedProducts.map((product) => (
              <Card
                key={product.product_name}
                className={`relative ${
                  product.rank === 1
                    ? "ring-2 ring-yellow-400 bg-yellow-50"
                    : product.rank === 2
                    ? "ring-2 ring-gray-300"
                    : product.rank === 3
                    ? "ring-2 ring-orange-300"
                    : ""
                }`}
                hover
                onClick={() => setSelectedProduct(product)}
              >
                <div
                  className={`absolute -top-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    product.rank === 1
                      ? "bg-yellow-500"
                      : product.rank === 2
                      ? "bg-gray-400"
                      : product.rank === 3
                      ? "bg-orange-400"
                      : "bg-primary-500"
                  }`}
                >
                  {product.rank}
                </div>

                <h3 className="font-bold text-lg text-primary-800 mb-2 pr-8">
                  {product.product_name}
                </h3>
                <p className="text-3xl font-bold text-primary-600 mb-4">
                  {product.score.toFixed(1)}점
                </p>

                {/* 상위 3개 기준 점수 */}
                <div className="space-y-2">
                  {userPriorities.slice(0, 3).map((criterion) => (
                    <div key={criterion} className="flex justify-between text-sm">
                      <span className="text-primary-700">{criterion}</span>
                      <span className="font-semibold text-primary-800">
                        {product.criteria_scores[criterion]?.toFixed(0) || "-"}점
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* 기준별 비교 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-primary-800 mb-6">기준별 비교</h2>

          {/* 제품 선택 */}
          <Card className="mb-6 bg-warm-100">
            <h3 className="text-sm font-semibold text-primary-800 mb-3">
              비교할 제품 선택 (2~3개)
            </h3>
            <div className="flex flex-wrap gap-2">
              {rankedProducts.map((product) => (
                <Chip
                  key={product.product_name}
                  variant={selectedProducts.includes(product.product_name) ? "selected" : "primary"}
                  clickable
                  onClick={() => toggleProductSelection(product.product_name)}
                >
                  {product.product_name}
                </Chip>
              ))}
            </div>
          </Card>

          {/* 비교 테이블 */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-200">
                    <th className="text-left p-3 text-primary-800 font-semibold">기준</th>
                    {selectedForComparison.map((product) => (
                      <th key={product.product_name} className="text-left p-3 text-primary-800 font-semibold">
                        {product.product_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((criterion, idx) => {
                    const isPriority = userPriorities.includes(criterion);
                    return (
                      <tr
                        key={criterion}
                        className={`border-b border-warm-100 ${
                          idx % 2 === 0 ? "bg-warm-50" : ""
                        }`}
                      >
                        <td className="p-3 font-medium text-primary-700">
                          {criterion} {isPriority && "⭐"}
                        </td>
                        {selectedForComparison.map((product) => {
                          const score = product.criteria_scores[criterion];
                          const spec = product.criteria_specs?.[criterion];

                          return (
                            <td key={product.product_name} className="p-3">
                              <div className="flex flex-col gap-1">
                                <span className="text-primary-800 font-medium">
                                  {score !== undefined ? `${score.toFixed(0)}점` : "-"}
                                </span>
                                {spec && spec.trim() !== "" && (
                                  <span className="text-xs text-primary-600">
                                    {spec}
                                  </span>
                                )}
                                {(!spec || spec.trim() === "") && (
                                  <span className="text-xs text-primary-400">-</span>
                                )}
                              </div>
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
        </section>

        {/* 최종 추천 */}
        <Card className="bg-gradient-to-r from-accent-500 to-primary-500 text-white">
          <h2 className="text-2xl font-bold mb-4">최종 추천</h2>
          <p className="text-white/90 text-lg leading-relaxed">{report.recommendation}</p>
        </Card>
      </div>

      {/* 제품 상세 모달 */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedProduct(null)}
        >
          <Card
            className="max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${
                    selectedProduct.rank === 1
                      ? "bg-yellow-500 text-white"
                      : selectedProduct.rank === 2
                      ? "bg-gray-400 text-white"
                      : selectedProduct.rank === 3
                      ? "bg-orange-400 text-white"
                      : "bg-primary-500 text-white"
                  }`}
                >
                  {selectedProduct.rank}위
                </span>
                <h3 className="text-2xl font-bold text-primary-800">
                  {selectedProduct.product_name}
                </h3>
                <p className="text-4xl font-bold text-primary-600 mt-2">
                  {selectedProduct.score.toFixed(1)}점
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-primary-600 hover:text-primary-800 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-primary-800 mb-2">기준별 점수</h4>
                <div className="space-y-2">
                  {Object.entries(selectedProduct.criteria_scores).map(([criterion, score]) => {
                    const isPriority = userPriorities.includes(criterion);
                    return (
                      <div key={criterion} className="flex justify-between">
                        <span className="text-primary-700">
                          {criterion} {isPriority && "⭐"}
                        </span>
                        <span className="font-semibold text-primary-800">
                          {score.toFixed(0)}점
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedProduct.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-success mb-2">강점</h4>
                  <ul className="space-y-1">
                    {selectedProduct.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-primary-700 flex items-start gap-2">
                        <span className="text-success">✓</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedProduct.weaknesses.length > 0 && (
                <div>
                  <h4 className="font-semibold text-error mb-2">약점</h4>
                  <ul className="space-y-1">
                    {selectedProduct.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-sm text-primary-700 flex items-start gap-2">
                        <span className="text-error">✗</span>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
