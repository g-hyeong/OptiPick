import * as React from "react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { HistoryItem } from "./HistoryItem";
import type { AnalysisHistoryItem } from "@/types/storage";

interface CategoryItemProps {
  category: string;
  count: number;
  isSelected: boolean;
  isExpanded: boolean;
  historyItems: AnalysisHistoryItem[];
  onSelect: () => void;
  onToggleExpand: () => void;
  onRename: (oldName: string, newName: string) => Promise<void>;
  onDelete: (category: string) => Promise<void>;
  onCompare: (category: string) => void;
  onHistoryClick: (historyId: string) => void;
  onToggleFavorite: (historyId: string) => void;
}

// 아이콘 컴포넌트들
const ChevronIcon = ({ isExpanded }: { isExpanded: boolean }) => (
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
    className={cn(
      "transition-transform duration-200",
      isExpanded ? "rotate-180" : ""
    )}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CompareIcon = () => (
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
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const MoreIcon = () => (
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
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

const EditIcon = () => (
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
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
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
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export function CategoryItem({
  category,
  count,
  isSelected,
  isExpanded,
  historyItems,
  onSelect,
  onToggleExpand,
  onRename,
  onDelete,
  onCompare,
  onHistoryClick,
  onToggleFavorite,
}: CategoryItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(category);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 편집 모드 진입 시 input에 포커스
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditValue(category);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    if (!trimmedValue) {
      setError("카테고리명을 입력해주세요");
      return;
    }

    if (trimmedValue === category) {
      setIsEditing(false);
      setError(null);
      return;
    }

    try {
      await onRename(category, trimmedValue);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(category);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await onDelete(category);
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCompare(category);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
  };

  const handleHeaderClick = () => {
    onSelect();
  };

  // 드롭다운 메뉴 아이템
  const dropdownItems = [
    {
      label: "이름 변경",
      icon: <EditIcon />,
      onClick: handleEditClick,
    },
    {
      label: "삭제",
      icon: <TrashIcon />,
      onClick: handleDeleteClick,
      variant: "danger" as const,
    },
  ];

  return (
    <>
      <div
        className={cn(
          "w-full rounded-md transition-colors",
          isSelected ? "bg-primary-100" : ""
        )}
      >
        {isEditing ? (
          // 편집 모드
          <div className="px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className={cn(
                "w-full px-2 py-1 text-sm rounded border",
                "bg-white text-primary-800",
                "focus:outline-none focus:ring-2 focus:ring-primary-400",
                error ? "border-red-500" : "border-warm-300"
              )}
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
        ) : (
          <>
            {/* 카테고리 헤더 */}
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-2 rounded-md cursor-pointer",
                "hover:bg-warm-100 transition-colors"
              )}
            >
              {/* 카테고리명 (클릭 시 제품 목록으로) */}
              <button
                onClick={handleHeaderClick}
                className="flex-1 min-w-0 flex items-center gap-2 text-left"
              >
                <span className="truncate text-sm font-medium text-primary-800">
                  {category}
                </span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
                    "bg-primary-100 text-primary-600"
                  )}
                >
                  {count}
                </span>
              </button>

              {/* 액션 버튼들 */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* 비교 버튼 (항상 표시) */}
                <button
                  onClick={handleCompareClick}
                  disabled={count < 2}
                  className={cn(
                    "p-1 rounded transition-colors",
                    count >= 2
                      ? "text-green-600 hover:bg-green-100"
                      : "text-primary-300 cursor-not-allowed"
                  )}
                  title={count >= 2 ? "비교 분석" : "2개 이상의 제품이 필요합니다"}
                >
                  <CompareIcon />
                </button>

                {/* 더보기 메뉴 */}
                <DropdownMenu
                  trigger={
                    <button
                      className="p-1 rounded text-primary-500 hover:bg-warm-200 transition-colors"
                      title="더보기"
                    >
                      <MoreIcon />
                    </button>
                  }
                  items={dropdownItems}
                />

                {/* 확장/축소 버튼 */}
                <button
                  onClick={handleExpandClick}
                  className="p-1 rounded text-primary-500 hover:bg-warm-200 transition-colors"
                  title={isExpanded ? "접기" : "분석 결과 보기"}
                >
                  <ChevronIcon isExpanded={isExpanded} />
                </button>
              </div>
            </div>

            {/* 확장 영역: 분석 결과 목록 */}
            {isExpanded && (
              <div className="pl-3 pr-1 pb-2 space-y-0.5">
                {historyItems.length === 0 ? (
                  <p className="text-xs text-primary-400 py-2 pl-2">
                    분석 결과가 없습니다
                  </p>
                ) : (
                  <>
                    {historyItems.slice(0, 3).map((item) => (
                      <HistoryItem
                        key={item.id}
                        item={item}
                        onClick={() => onHistoryClick(item.id)}
                        onToggleFavorite={() => onToggleFavorite(item.id)}
                      />
                    ))}
                    {historyItems.length > 3 && (
                      <button
                        onClick={onSelect}
                        className="w-full text-left text-xs text-primary-500 hover:text-primary-700 py-1 pl-2"
                      >
                        +{historyItems.length - 3}개 더 보기
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="카테고리 삭제"
        description={`'${category}' 카테고리와 포함된 모든 제품(${count}개)을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
