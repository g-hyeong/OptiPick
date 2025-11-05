import { useState, useEffect } from "react";
import { useApp } from "@/context";
import { useProductsContext } from "@/context";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { Card, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

type TabType = "products" | "history";

export function ProductsPage() {
  const { state } = useApp();
  const { products, deleteProduct } = useProductsContext();
  const { history, deleteHistoryItem } = useAnalysisHistory();
  const [activeTab, setActiveTab] = useState<TabType>("products");

  // 디버깅: 히스토리 로드 확인
  useEffect(() => {
    console.log("[ProductsPage] History loaded:", {
      totalCount: history.length,
      items: history.map(h => ({
        id: h.id,
        category: h.category,
        date: new Date(h.date).toLocaleString(),
        productCount: h.productCount,
      })),
    });
  }, [history]);

  // 선택된 카테고리의 제품만 필터링
  const filteredProducts = state.selectedCategory
    ? products.filter((p) => p.category === state.selectedCategory)
    : products;

  // 선택된 카테고리의 히스토리만 필터링
  const filteredHistory = state.selectedCategory
    ? history.filter((h) => h.category === state.selectedCategory)
    : history;

  // 히스토리에서 비교 결과 열기
  const openComparisonReport = (historyId: string) => {
    const url = chrome.runtime.getURL(`/src/compare-report/index.html?historyId=${historyId}`);
    window.open(url, "_blank");
  };

  return (
    <div className="p-4 max-w-full overflow-x-hidden">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-primary-800 mb-3">
          {activeTab === "products" ? "제품 목록" : "분석 히스토리"}
        </h1>

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 border-b border-warm-200">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "products"
                ? "text-primary-700 border-primary-500"
                : "text-primary-500 border-transparent hover:text-primary-600"
            }`}
          >
            제품 ({filteredProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "history"
                ? "text-primary-700 border-primary-500"
                : "text-primary-500 border-transparent hover:text-primary-600"
            }`}
          >
            분석 히스토리 ({filteredHistory.length})
          </button>
        </div>
        {state.selectedCategory && (
          <p className="text-sm text-primary-600 mt-2">
            {state.selectedCategory}
          </p>
        )}
      </div>

      {/* 제품 목록 탭 */}
      {activeTab === "products" && (
        <>
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-primary-600 mb-2">저장된 제품이 없습니다</p>
              <p className="text-sm text-primary-500">
                상품 추출 페이지에서 제품을 추가해보세요
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <Card key={product.id} hover>
                  <div className="flex gap-4 min-w-0">
                    {/* 썸네일 */}
                    {product.thumbnailUrl ? (
                      <img
                        src={product.thumbnailUrl}
                        alt={product.title}
                        className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-warm-200 rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-warm-400 text-xl">📷</span>
                      </div>
                    )}

                    {/* 정보 */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="font-semibold text-primary-800 text-sm mb-1 line-clamp-2 break-words">
                        {product.title || product.fullAnalysis.product_name}
                      </h3>
                      {product.price && (
                        <p className="text-primary-600 font-bold text-base mb-2">
                          {formatCurrency(parseFloat(product.price.replace(/[^0-9.]/g, "")))}
                        </p>
                      )}
                      {product.summary && (
                        <p className="text-xs text-primary-600 line-clamp-2 break-words">
                          {product.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-warm-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(product.url, "_blank")}
                    >
                      페이지 열기
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteProduct(product.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* 분석 히스토리 탭 */}
      {activeTab === "history" && (
        <>
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-primary-600 mb-2">분석 히스토리가 없습니다</p>
              <p className="text-sm text-primary-500">
                제품 비교를 완료하면 여기에 히스토리가 저장됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <Card key={item.id} hover>
                  <div className="flex justify-between items-start gap-4">
                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-primary-800 text-sm mb-1">
                        {item.category} 비교 분석
                      </h3>
                      <p className="text-xs text-primary-600 mb-2">
                        {new Date(item.date).toLocaleString("ko-KR")}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-primary-600">
                        <span>제품 {item.productCount}개</span>
                        {item.criteria && item.criteria.length > 0 && (
                          <span>· 기준 {item.criteria.length}개</span>
                        )}
                      </div>
                      {item.userPriorities && item.userPriorities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.userPriorities.slice(0, 3).map((priority, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded"
                            >
                              {idx + 1}. {priority}
                            </span>
                          ))}
                          {item.userPriorities.length > 3 && (
                            <span className="text-xs px-2 py-1 text-primary-600">
                              +{item.userPriorities.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-warm-200">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openComparisonReport(item.id)}
                    >
                      결과 보기
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteHistoryItem(item.id)}
                    >
                      삭제
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
