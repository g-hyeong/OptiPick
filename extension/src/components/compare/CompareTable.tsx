import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ProductColumnHeader } from "./ProductColumnHeader";
import { CriteriaRow } from "./CriteriaRow";
import type { StoredProduct } from "@/types/storage";
import type { ProductComparison } from "@/types/content";

interface CompareTableProps {
  productOrder: string[];
  criteriaOrder: string[];
  getProductInfo: (name: string) => StoredProduct | undefined;
  getProductData: (name: string) => ProductComparison | undefined;
  onProductReorder: (newOrder: string[]) => void;
  onCriteriaReorder: (newOrder: string[]) => void;
  onProductHide: (name: string) => void;
  onProductClick: (name: string) => void;
  isUserCriterion: (c: string) => boolean;
}

export function CompareTable({
  productOrder,
  criteriaOrder,
  getProductInfo,
  getProductData,
  onProductReorder,
  onCriteriaReorder,
  onProductHide,
  isUserCriterion,
}: CompareTableProps) {
  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px 이상 움직여야 드래그 시작
      },
    }),
    useSensor(KeyboardSensor)
  );

  // 제품(열) 드래그 완료 핸들러
  const handleProductDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = productOrder.indexOf(active.id as string);
      const newIndex = productOrder.indexOf(over.id as string);
      onProductReorder(arrayMove(productOrder, oldIndex, newIndex));
    }
  };

  // 기준(행) 드래그 완료 핸들러
  const handleCriteriaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = criteriaOrder.indexOf(active.id as string);
      const newIndex = criteriaOrder.indexOf(over.id as string);
      onCriteriaReorder(arrayMove(criteriaOrder, oldIndex, newIndex));
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        {/* 제품 헤더 행 - 가로 드래그 */}
        <thead>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleProductDragEnd}
          >
            <tr className="border-b-2 border-primary-200">
              {/* 좌상단 빈 셀 */}
              <th className="text-left p-4 bg-primary-50/80 font-semibold text-primary-700 sticky left-0 z-20 min-w-[160px]">
                <span className="text-sm">기준</span>
              </th>

              {/* 제품 헤더들 */}
              <SortableContext
                items={productOrder}
                strategy={horizontalListSortingStrategy}
              >
                {productOrder.map((productName) => {
                  const productInfo = getProductInfo(productName);
                  return (
                    <ProductColumnHeader
                      key={productName}
                      id={productName}
                      productName={productName}
                      thumbnailUrl={productInfo?.thumbnailUrl}
                      productUrl={productInfo?.url}
                      onHide={() => onProductHide(productName)}
                    />
                  );
                })}
              </SortableContext>
            </tr>
          </DndContext>
        </thead>

        {/* 기준 행들 - 세로 드래그 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCriteriaDragEnd}
        >
          <tbody>
            <SortableContext
              items={criteriaOrder}
              strategy={verticalListSortingStrategy}
            >
              {criteriaOrder.map((criterion, idx) => (
                <CriteriaRow
                  key={criterion}
                  id={criterion}
                  criterion={criterion}
                  isUserCriterion={isUserCriterion(criterion)}
                  productOrder={productOrder}
                  getProductData={getProductData}
                  isEven={idx % 2 === 0}
                />
              ))}
            </SortableContext>
          </tbody>
        </DndContext>
      </table>
    </div>
  );
}
