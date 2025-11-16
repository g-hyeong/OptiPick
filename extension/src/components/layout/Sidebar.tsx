import { useState } from "react";
import { useApp } from "@/context";
import { useProductsContext } from "@/context";
import { useAnalysisHistory } from "@/hooks";
import { formatRelativeTime } from "@/lib/utils";
import { CategoryItem } from "./CategoryItem";
import { ComparisonDialog } from "@/components/ui/ComparisonDialog";

export function Sidebar() {
  const { state, setCurrentPage, setSelectedCategory } = useApp();
  const { allCategories, products, renameCategory, deleteCategory } = useProductsContext();
  const { history } = useAnalysisHistory();

  // ComparisonDialog 상태
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [comparisonCategory, setComparisonCategory] = useState("");
  const [comparisonProductIds, setComparisonProductIds] = useState<string[]>([]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage("products");
  };

  const handleHistoryClick = async (historyId: string) => {
    const url = chrome.runtime.getURL(`src/compare-report/index.html?historyId=${historyId}`);
    await chrome.tabs.create({ url });
  };

  const handleCompare = (category: string) => {
    const categoryProducts = products.filter((p) => p.category === category);

    if (categoryProducts.length < 2) {
      alert("비교하려면 최소 2개 이상의 제품이 필요합니다");
      return;
    }

    setComparisonCategory(category);
    setComparisonProductIds(categoryProducts.map((p) => p.id));
    setComparisonDialogOpen(true);
  };

  return (
    <div className="w-[220px] h-full bg-warm-50 border-r border-warm-200 flex flex-col">
      {/* 로고 영역 */}
      <div className="p-4 border-b border-warm-200">
        <h1 className="text-2xl font-bold text-primary-700">OptiPick</h1>
        <p className="text-xs text-primary-500 mt-1">스마트한 제품 비교</p>
      </div>

      {/* 카테고리 섹션 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-primary-800 mb-3">카테고리</h2>
          {allCategories.length === 0 ? (
            <p className="text-xs text-primary-500">저장된 카테고리가 없습니다</p>
          ) : (
            <div className="space-y-1">
              {allCategories.map((category) => {
                const count = products.filter((p) => p.category === category).length;
                const isSelected = state.selectedCategory === category;

                return (
                  <CategoryItem
                    key={category}
                    category={category}
                    count={count}
                    isSelected={isSelected}
                    onSelect={() => handleCategoryClick(category)}
                    onRename={renameCategory}
                    onDelete={deleteCategory}
                    onCompare={handleCompare}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* 분석 결과 섹션 */}
        <div className="p-4 border-t border-warm-200">
          <h2 className="text-sm font-semibold text-primary-800 mb-3">분석 결과</h2>
          {history.length === 0 ? (
            <p className="text-xs text-primary-500">분석 결과가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleHistoryClick(item.id)}
                  className="w-full text-left p-2 rounded-md hover:bg-warm-100 transition-colors overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 overflow-hidden">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1">
                        {item.isFavorite && <span className="text-yellow-500 text-sm">⭐</span>}
                        <p className="text-sm font-medium text-primary-800 truncate">
                          {item.category}
                        </p>
                      </div>
                      <p className="text-xs text-primary-600">
                        {item.productCount}개 제품
                      </p>
                    </div>
                    <span className="text-xs text-primary-500 whitespace-nowrap">
                      {formatRelativeTime(item.date)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ComparisonDialog */}
      {comparisonDialogOpen && (
        <ComparisonDialog
          open={comparisonDialogOpen}
          onClose={() => setComparisonDialogOpen(false)}
          category={comparisonCategory}
          productIds={comparisonProductIds}
        />
      )}
    </div>
  );
}
