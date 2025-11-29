import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface ProductColumnHeaderProps {
  id: string;
  productName: string;
  thumbnailUrl?: string;
  productUrl?: string;
  onHide: () => void;
}

// 드래그 핸들 아이콘
function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
    </svg>
  );
}

// X 아이콘 (숨기기 버튼)
function CloseIcon({ className }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ProductColumnHeader({
  id,
  productName,
  thumbnailUrl,
  productUrl,
  onHide,
}: ProductColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative text-center p-4 bg-primary-50 min-w-[140px]",
        "transition-all duration-200",
        isDragging && "opacity-50 scale-[1.02] shadow-lg z-20"
      )}
    >
      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-primary-100 transition-colors"
      >
        <GripIcon className="w-4 h-4 text-primary-400" />
      </div>

      {/* 썸네일 */}
      <div className="flex flex-col items-center gap-2 mt-4">
        {/* 썸네일 + 오버레이 X 버튼 */}
        <div className="relative">
          {thumbnailUrl ? (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={thumbnailUrl}
                alt={productName}
                className={cn(
                  "w-16 h-16 object-cover rounded-lg",
                  "ring-2 ring-transparent group-hover:ring-primary-200",
                  "transition-all duration-200"
                )}
              />
            </a>
          ) : (
            <div className="w-16 h-16 bg-warm-100 rounded-lg flex items-center justify-center">
              <span className="text-warm-400 text-2xl">?</span>
            </div>
          )}

          {/* 숨기기 버튼 - hover 시 썸네일 우상단에 오버레이 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
            className={cn(
              "absolute -top-1.5 -right-1.5 p-0.5 rounded-full",
              "opacity-0 group-hover:opacity-100",
              "bg-primary-500 hover:bg-primary-600 text-white",
              "shadow-sm transition-all duration-150",
              "transform hover:scale-110"
            )}
            title="숨기기"
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        </div>

        {/* 제품명 (truncate) */}
        <a
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "font-medium text-sm text-primary-800 hover:text-primary-600",
            "max-w-[120px] truncate block",
            "transition-colors duration-150"
          )}
          title={productName}
        >
          {productName}
        </a>
      </div>
    </th>
  );
}
