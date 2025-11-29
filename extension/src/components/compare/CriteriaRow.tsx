import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { ProductComparison } from "@/types/content";

interface CriteriaRowProps {
  id: string;
  criterion: string;
  isUserCriterion: boolean;
  productOrder: string[];
  getProductData: (name: string) => ProductComparison | undefined;
  isEven: boolean;
}

// 드래그 핸들 아이콘 (가로 방향)
function GripHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <circle cx="4" cy="5" r="1.5" />
      <circle cx="8" cy="5" r="1.5" />
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="4" cy="11" r="1.5" />
      <circle cx="8" cy="11" r="1.5" />
      <circle cx="12" cy="11" r="1.5" />
    </svg>
  );
}

export function CriteriaRow({
  id,
  criterion,
  isUserCriterion,
  productOrder,
  getProductData,
  isEven,
}: CriteriaRowProps) {
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
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "group border-b border-warm-100",
        isEven ? "bg-warm-50/50" : "bg-white",
        "hover:bg-primary-50/30 transition-colors duration-150",
        isDragging && "opacity-60 bg-primary-50 shadow-md z-10"
      )}
    >
      {/* 기준명 셀 (드래그 가능) */}
      <td className={cn(
        "p-4 font-medium text-primary-800 sticky left-0 z-10",
        isEven ? "bg-warm-50/50" : "bg-white",
        "group-hover:bg-primary-50/30",
        isDragging && "bg-primary-50"
      )}>
        <div className="flex items-center gap-3">
          {/* 드래그 핸들 */}
          <div
            {...attributes}
            {...listeners}
            className={cn(
              "cursor-grab active:cursor-grabbing p-1 rounded",
              "text-warm-300 hover:text-primary-500 hover:bg-primary-100",
              "transition-colors duration-150"
            )}
          >
            <GripHorizontalIcon className="w-4 h-4" />
          </div>

          {/* 기준명 + 뱃지 */}
          <div className="flex flex-col gap-1">
            <span className="text-sm">{criterion}</span>
            {isUserCriterion && (
              <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-medium w-fit">
                사용자
              </span>
            )}
          </div>
        </div>
      </td>

      {/* 제품별 데이터 셀 */}
      {productOrder.map((productName) => {
        const productData = getProductData(productName);
        const spec = productData?.criteria_specs?.[criterion];
        const details = productData?.criteria_details?.[criterion];

        return (
          <td key={productName} className="p-4 align-top min-w-[140px]">
            {spec && spec.trim() !== "" ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-primary-800 font-medium">
                  {spec}
                </span>
                {details && details.length > 0 && (
                  <ul className="text-xs text-primary-500 space-y-0.5 pl-3">
                    {details.slice(0, 3).map((detail, idx) => (
                      <li key={idx} className="list-disc">
                        {detail}
                      </li>
                    ))}
                    {details.length > 3 && (
                      <li className="text-primary-400 list-none">
                        +{details.length - 3}개 더...
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ) : (
              <span className="text-warm-300 text-sm">-</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
