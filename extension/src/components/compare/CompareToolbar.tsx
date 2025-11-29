import { useState } from "react";
import { cn } from "@/lib/utils";

interface CompareToolbarProps {
  allCriteria: string[];
  visibleCriteria: string[];
  hiddenProducts: string[];
  onCriteriaToggle: (criterion: string) => void;
  onProductRestore: (product: string) => void;
  isUserCriterion: (c: string) => boolean;
  getCriteriaImportance: (c: string) => number | undefined;
}

// 체크 아이콘
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// 화살표 아래 아이콘
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function CompareToolbar({
  allCriteria,
  visibleCriteria,
  hiddenProducts,
  onCriteriaToggle,
  onProductRestore,
  isUserCriterion,
  getCriteriaImportance,
}: CompareToolbarProps) {
  const [showAllCriteria, setShowAllCriteria] = useState(false);
  const [showHiddenDropdown, setShowHiddenDropdown] = useState(false);

  // 처음 5개만 표시, 나머지는 "더보기"
  const VISIBLE_COUNT = 5;
  const visibleChips = showAllCriteria
    ? allCriteria
    : allCriteria.slice(0, VISIBLE_COUNT);
  const hiddenCount = allCriteria.length - VISIBLE_COUNT;

  return (
    <div className="flex items-center gap-4 py-3 px-4 bg-white/80 backdrop-blur-sm border-b border-warm-100 sticky top-0 z-30">
      {/* 기준 필터 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-medium text-primary-600 flex-shrink-0">
          기준
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {visibleChips.map((criterion) => {
            const isVisible = visibleCriteria.includes(criterion);
            const isUser = isUserCriterion(criterion);
            const importance = getCriteriaImportance(criterion);

            return (
              <button
                key={criterion}
                onClick={() => onCriteriaToggle(criterion)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                  "transition-all duration-150",
                  isVisible
                    ? "bg-primary-500 text-white hover:bg-primary-600"
                    : "bg-warm-100 text-primary-500 hover:bg-warm-200"
                )}
              >
                {isVisible && <CheckIcon className="w-3 h-3" />}
                <span className="truncate max-w-[80px]">{criterion}</span>
                {(isUser || importance) && (
                  <span
                    className={cn(
                      "text-[10px] px-1 rounded",
                      isVisible
                        ? "bg-white/20"
                        : "bg-primary-100"
                    )}
                  >
                    {isUser ? "U" : importance}
                  </span>
                )}
              </button>
            );
          })}

          {/* 더보기 버튼 */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAllCriteria(!showAllCriteria)}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                "bg-warm-50 text-primary-600 hover:bg-warm-100",
                "transition-all duration-150"
              )}
            >
              {showAllCriteria ? "접기" : `+${hiddenCount}개`}
              <ChevronDownIcon
                className={cn(
                  "w-3 h-3 transition-transform",
                  showAllCriteria && "rotate-180"
                )}
              />
            </button>
          )}
        </div>
      </div>

      {/* 숨긴 제품 복원 드롭다운 */}
      {hiddenProducts.length > 0 && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowHiddenDropdown(!showHiddenDropdown)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              "bg-warm-100 text-primary-600 hover:bg-warm-200",
              "transition-all duration-150"
            )}
          >
            <span>숨긴 제품</span>
            <span className="bg-primary-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">
              {hiddenProducts.length}
            </span>
            <ChevronDownIcon
              className={cn(
                "w-3 h-3 transition-transform",
                showHiddenDropdown && "rotate-180"
              )}
            />
          </button>

          {/* 드롭다운 메뉴 */}
          {showHiddenDropdown && (
            <>
              {/* 배경 클릭 시 닫기 */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowHiddenDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-warm-200 py-1 z-50">
                {hiddenProducts.map((product) => (
                  <button
                    key={product}
                    onClick={() => {
                      onProductRestore(product);
                      if (hiddenProducts.length === 1) {
                        setShowHiddenDropdown(false);
                      }
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-primary-700 hover:bg-primary-50 transition-colors"
                  >
                    <span className="truncate block">{product}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
