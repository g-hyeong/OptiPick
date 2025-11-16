import * as React from "react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface CategoryItemProps {
  category: string;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (oldName: string, newName: string) => Promise<void>;
  onDelete: (category: string) => Promise<void>;
  onCompare: (category: string) => void;
}

export function CategoryItem({
  category,
  count,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onCompare,
}: CategoryItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(category);
  const [isHovered, setIsHovered] = React.useState(false);
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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(category);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();

    // Validation
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

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <>
      <div
        className={cn(
          "w-full group relative rounded-md transition-colors",
          isSelected ? "bg-primary-500 text-white" : "hover:bg-warm-100"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
            {error && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
          </div>
        ) : (
          // 일반 모드
          <button
            onClick={onSelect}
            className="w-full text-left px-3 py-2 flex items-center gap-2"
          >
            {/* 카테고리명 */}
            <span className="truncate min-w-0 flex-1 text-sm">
              {category}
            </span>

            {/* 제품 개수 뱃지 */}
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                isSelected
                  ? "bg-white/20 text-white"
                  : "bg-primary-100 text-primary-600"
              )}
            >
              {count}
            </span>

            {/* 아이콘 버튼들 (hover 시 표시) */}
            {isHovered && !isSelected && (
              <div className="flex items-center gap-1 ml-1">
                {/* 비교 버튼 */}
                <button
                  onClick={handleCompareClick}
                  className="p-1 rounded hover:bg-green-100 transition-colors"
                  title="비교 실행"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-600"
                  >
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                  </svg>
                </button>

                {/* 편집 버튼 */}
                <button
                  onClick={handleEditClick}
                  className="p-1 rounded hover:bg-blue-100 transition-colors"
                  title="편집"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-600"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>

                {/* 삭제 버튼 */}
                <button
                  onClick={handleDeleteClick}
                  className="p-1 rounded hover:bg-red-100 transition-colors"
                  title="삭제"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-600"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            )}
          </button>
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
