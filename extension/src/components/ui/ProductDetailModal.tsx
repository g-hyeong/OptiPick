import React from "react";
import { StoredProduct } from "@/types/storage";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
} from "./Modal";
import { Button } from "./Button";
import { cn, formatRelativeTime } from "@/lib/utils";

interface ProductDetailModalProps {
  product: StoredProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (productId: string) => void;
}

// 별 아이콘 (채워진)
const StarFilledIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// 별 아이콘 (빈)
const StarOutlineIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// 외부 링크 아이콘
const ExternalLinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onToggleFavorite,
}) => {
  if (!product) return null;

  const handleOpenOriginalPage = () => {
    chrome.tabs.create({ url: product.url });
  };

  const handleFavoriteClick = () => {
    onToggleFavorite(product.id);
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <ModalHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <ModalTitle className="line-clamp-2 text-lg">
                {product.title || product.fullAnalysis.product_name}
              </ModalTitle>
              <div className="flex items-center gap-3 mt-2 text-sm text-primary-500">
                <span>{product.category}</span>
                <span>|</span>
                <span>{formatRelativeTime(product.addedAt)}</span>
              </div>
            </div>
            {/* 즐겨찾기 버튼 */}
            <button
              onClick={handleFavoriteClick}
              className={cn(
                "p-2 rounded-full transition-colors flex-shrink-0",
                product.isFavorite
                  ? "text-yellow-500 bg-yellow-50 hover:bg-yellow-100"
                  : "text-primary-400 hover:text-yellow-500 hover:bg-yellow-50"
              )}
              title={product.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            >
              {product.isFavorite ? <StarFilledIcon /> : <StarOutlineIcon />}
            </button>
          </div>
        </ModalHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* 상단: 썸네일 + 기본 정보 */}
          <div className="flex gap-6 mb-6">
            {/* 썸네일 */}
            {product.thumbnailUrl ? (
              <img
                src={product.thumbnailUrl}
                alt={product.title}
                className="w-32 h-32 object-cover rounded-lg flex-shrink-0 bg-warm-100"
              />
            ) : (
              <div className="w-32 h-32 bg-warm-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-4xl text-warm-300">📷</span>
              </div>
            )}

            {/* 가격 + 요약 */}
            <div className="flex-1 min-w-0">
              {product.price && (
                <p className="text-2xl font-bold text-primary-800 mb-3">
                  {product.price}
                </p>
              )}
              {product.summary && (
                <p className="text-sm text-primary-600 leading-relaxed">
                  {product.summary}
                </p>
              )}
            </div>
          </div>

          {/* 분석 결과 섹션 */}
          <div className="space-y-4">
            {/* 주요 특징 */}
            <Section title="주요 특징" variant="default">
              <ul className="space-y-1.5">
                {product.fullAnalysis.key_features.map((feature, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-primary-700">
                    <span className="text-primary-400 flex-shrink-0">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* 장점 / 단점 */}
            <div className="grid grid-cols-2 gap-4">
              <Section title="장점" variant="positive">
                <ul className="space-y-1.5">
                  {product.fullAnalysis.pros.map((pro, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-green-700">
                      <span className="text-green-500 flex-shrink-0">+</span>
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="단점" variant="negative">
                <ul className="space-y-1.5">
                  {product.fullAnalysis.cons.map((con, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-red-700">
                      <span className="text-red-500 flex-shrink-0">-</span>
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            </div>

            {/* 추천 대상 */}
            <Section title="추천 대상" variant="default">
              <p className="text-sm text-primary-700">
                {product.fullAnalysis.recommended_for}
              </p>
            </Section>

            {/* 추천 이유 */}
            {product.fullAnalysis.recommendation_reasons &&
              product.fullAnalysis.recommendation_reasons.length > 0 && (
                <Section title="추천 이유" variant="positive">
                  <ul className="space-y-1.5">
                    {product.fullAnalysis.recommendation_reasons.map(
                      (reason, idx) => (
                        <li
                          key={idx}
                          className="flex gap-2 text-sm text-green-700"
                        >
                          <span className="text-green-500 flex-shrink-0">
                            +
                          </span>
                          <span>{reason}</span>
                        </li>
                      )
                    )}
                  </ul>
                </Section>
              )}

            {/* 비추천 이유 */}
            {product.fullAnalysis.not_recommended_reasons &&
              product.fullAnalysis.not_recommended_reasons.length > 0 && (
                <Section title="비추천 이유" variant="negative">
                  <ul className="space-y-1.5">
                    {product.fullAnalysis.not_recommended_reasons.map(
                      (reason, idx) => (
                        <li
                          key={idx}
                          className="flex gap-2 text-sm text-red-700"
                        >
                          <span className="text-red-500 flex-shrink-0">-</span>
                          <span>{reason}</span>
                        </li>
                      )
                    )}
                  </ul>
                </Section>
              )}
          </div>
        </div>

        <ModalFooter className="flex-shrink-0 border-t border-warm-200">
          <Button
            variant="outline"
            onClick={handleOpenOriginalPage}
            className="flex items-center gap-2"
          >
            <ExternalLinkIcon />
            원본 페이지
          </Button>
          <Button onClick={onClose}>닫기</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// 섹션 컴포넌트
interface SectionProps {
  title: string;
  variant: "default" | "positive" | "negative";
  children: React.ReactNode;
}

function Section({ title, variant, children }: SectionProps) {
  const bgColor = {
    default: "bg-warm-50",
    positive: "bg-green-50",
    negative: "bg-red-50",
  }[variant];

  const titleColor = {
    default: "text-primary-800",
    positive: "text-green-800",
    negative: "text-red-800",
  }[variant];

  return (
    <div className={cn("rounded-lg p-4", bgColor)}>
      <h4 className={cn("text-sm font-semibold mb-2", titleColor)}>{title}</h4>
      {children}
    </div>
  );
}

export default ProductDetailModal;
