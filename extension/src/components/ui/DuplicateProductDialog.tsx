import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
} from "./Modal";
import type { StoredProduct } from "@/types/storage";

interface DuplicateProductDialogProps {
  isOpen: boolean;
  existingProduct: StoredProduct;
  onChoice: (choice: "update" | "save_new" | "cancel") => void;
}

export function DuplicateProductDialog({
  isOpen,
  existingProduct,
  onChoice,
}: DuplicateProductDialogProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onChoice("cancel")}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <div className="flex items-start gap-3">
            {/* 경고 아이콘 */}
            <div className="flex-shrink-0 text-yellow-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="flex-1">
              <ModalTitle>중복 제품 감지</ModalTitle>
              <ModalDescription className="mt-2">
                이 제품이 이미 저장되어 있습니다.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        {/* 기존 제품 정보 */}
        <div className="py-4">
          <div className="bg-warm-50 rounded-lg p-4 border border-warm-200">
            <h4 className="text-sm font-semibold text-primary-800 mb-3">
              기존 제품 정보
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-primary-600 font-medium">제품명:</span>
                <p className="text-primary-800 mt-1 line-clamp-2">
                  {existingProduct.title || existingProduct.fullAnalysis.product_name}
                </p>
              </div>
              <div>
                <span className="text-primary-600 font-medium">카테고리:</span>
                <p className="text-primary-800 mt-1">{existingProduct.category}</p>
              </div>
              <div>
                <span className="text-primary-600 font-medium">추출일:</span>
                <p className="text-primary-800 mt-1">
                  {formatDate(existingProduct.addedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-primary-600">
            <p className="font-medium mb-2">어떻게 하시겠습니까?</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>
                <strong>업데이트:</strong> 기존 제품 정보를 새로 추출한 정보로 교체합니다
              </li>
              <li>
                <strong>새로 저장:</strong> 중복이어도 새 제품으로 저장합니다
              </li>
              <li>
                <strong>취소:</strong> 제품 추출을 취소합니다
              </li>
            </ul>
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => onChoice("cancel")}
            className="px-4 py-2 rounded-lg border border-warm-300 text-primary-700 hover:bg-warm-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => onChoice("save_new")}
            className="px-4 py-2 rounded-lg border border-primary-500 text-primary-700 hover:bg-primary-50 transition-colors"
          >
            새로 저장
          </button>
          <button
            onClick={() => onChoice("update")}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            업데이트
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
