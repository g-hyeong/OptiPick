import { useState } from "react";
import { useApp } from "@/context";
import { useProductsContext } from "@/context";
import { useAnalysisHistory } from "@/hooks";
import { CategoryItem } from "./CategoryItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { ComparisonDialog } from "@/components/ui/ComparisonDialog";

// 폴더 아이콘
const FolderIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

// 화살표 아이콘
const ArrowRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export function Sidebar() {
  const { state, setCurrentPage, setSelectedCategory } = useApp();
  const { allCategories, products, renameCategory, deleteCategory } = useProductsContext();
  const { history, toggleFavorite } = useAnalysisHistory();

  // ComparisonDialog 상태
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [comparisonCategory, setComparisonCategory] = useState("");
  const [comparisonProductIds, setComparisonProductIds] = useState<string[]>([]);

  // 확장된 카테고리 상태
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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

  const handleToggleExpand = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const handleToggleFavorite = (historyId: string) => {
    toggleFavorite(historyId);
  };

  // 카테고리별 히스토리 조회
  const getHistoryByCategory = (category: string) =>
    history.filter((h) => h.category === category);

  // 전체 히스토리 개수
  const totalHistoryCount = history.length;

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
            <EmptyState
              icon={<FolderIcon />}
              title="저장된 카테고리가 없습니다"
              description="제품 페이지에서 추출을 시작해보세요"
              action={{
                label: "추출하기",
                onClick: () => setCurrentPage("extract"),
              }}
              size="sm"
            />
          ) : (
            <div className="space-y-1">
              {allCategories.map((category) => {
                const count = products.filter((p) => p.category === category).length;
                const isSelected = state.selectedCategory === category;
                const isExpanded = expandedCategory === category;
                const categoryHistory = getHistoryByCategory(category);

                return (
                  <CategoryItem
                    key={category}
                    category={category}
                    count={count}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    historyItems={categoryHistory}
                    onSelect={() => handleCategoryClick(category)}
                    onToggleExpand={() => handleToggleExpand(category)}
                    onRename={renameCategory}
                    onDelete={deleteCategory}
                    onCompare={handleCompare}
                    onHistoryClick={handleHistoryClick}
                    onToggleFavorite={handleToggleFavorite}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 하단: 전체 분석 기록 보기 링크 */}
      {totalHistoryCount > 0 && (
        <div className="p-4 border-t border-warm-200">
          <button
            onClick={() => setCurrentPage("history")}
            className="w-full flex items-center justify-between text-sm text-primary-600 hover:text-primary-800 transition-colors"
          >
            <span>전체 분석 기록 ({totalHistoryCount})</span>
            <ArrowRightIcon />
          </button>
        </div>
      )}

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
