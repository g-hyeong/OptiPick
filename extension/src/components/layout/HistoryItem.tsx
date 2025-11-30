import * as React from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AnalysisHistoryItem } from "@/types/storage";

interface HistoryItemProps {
  item: AnalysisHistoryItem;
  onClick: () => void;
  onToggleFavorite: () => void;
}

// 별 아이콘 (채워진)
const StarFilledIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// 별 아이콘 (빈)
const StarOutlineIcon = () => (
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
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export function HistoryItem({ item, onClick, onToggleFavorite }: HistoryItemProps) {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  // 비교 기준 툴팁 텍스트
  const criteriaTooltip = item.criteria?.length
    ? `비교 기준: ${item.criteria.join(", ")}`
    : undefined;

  return (
    <button
      onClick={onClick}
      title={criteriaTooltip}
      className={cn(
        "w-full text-left px-2 py-1.5 rounded",
        "hover:bg-warm-100 transition-colors",
        "flex items-center gap-2 group"
      )}
    >
      {/* 즐겨찾기 버튼 */}
      <button
        onClick={handleFavoriteClick}
        className={cn(
          "flex-shrink-0 p-0.5 rounded transition-colors",
          item.isFavorite
            ? "text-yellow-500"
            : "text-primary-300 hover:text-yellow-500"
        )}
      >
        {item.isFavorite ? <StarFilledIcon /> : <StarOutlineIcon />}
      </button>

      {/* 정보 */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-xs text-primary-700 truncate">
          {item.productCount}개 제품
        </span>
        <span className="text-xs text-primary-400">|</span>
        <span className="text-xs text-primary-500 whitespace-nowrap">
          {formatRelativeTime(item.date)}
        </span>
      </div>
    </button>
  );
}
