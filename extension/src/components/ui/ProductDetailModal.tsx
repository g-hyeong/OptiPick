import React, { useState, useEffect } from 'react';
import { StoredProduct } from '@/types/storage';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
} from './Modal';
import { Button } from './Button';
import { TagSelector } from './TagSelector';
import { getTagColor } from '@/lib/tagUtils';

interface ProductDetailModalProps {
  product: StoredProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Partial<StoredProduct>) => Promise<void>;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Partial<StoredProduct>>({});
  const [isSaving, setIsSaving] = useState(false);

  // product가 변경되면 editedProduct 초기화
  useEffect(() => {
    if (product) {
      setEditedProduct({
        title: product.title,
        price: product.price,
        summary: product.summary,
        fullAnalysis: product.fullAnalysis,
        notes: product.notes,
        tags: product.tags || [],
      });
    }
    setIsEditMode(false);
  }, [product]);

  if (!product) return null;

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    // 원본 데이터로 복원
    setEditedProduct({
      title: product.title,
      price: product.price,
      summary: product.summary,
      fullAnalysis: product.fullAnalysis,
      notes: product.notes,
      tags: product.tags || [],
    });
    setIsEditMode(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedProduct);
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('제품 정보 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenOriginalPage = () => {
    chrome.tabs.create({ url: product.url });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <div className="flex items-center justify-between pr-8">
            <ModalTitle>
              {isEditMode ? '상품 정보 편집' : '상품 상세 정보'}
            </ModalTitle>
            {!isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="ml-4"
              >
                편집
              </Button>
            )}
          </div>
        </ModalHeader>

        <div className="space-y-6 py-4">
          {/* 썸네일 이미지 */}
          {product.thumbnailUrl && (
            <div className="flex justify-center">
              <img
                src={product.thumbnailUrl}
                alt={product.title}
                className="max-w-sm max-h-48 object-contain rounded-lg"
              />
            </div>
          )}

          {/* 제품 기본 정보 */}
          <div className="space-y-4">
            {/* 제품명 */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                제품명
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedProduct.title || ''}
                  onChange={(e) =>
                    setEditedProduct({ ...editedProduct, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              ) : (
                <p className="text-base text-primary-900">{product.title}</p>
              )}
            </div>

            {/* 가격 */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                가격
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedProduct.price || ''}
                  onChange={(e) =>
                    setEditedProduct({ ...editedProduct, price: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              ) : (
                <p className="text-lg font-semibold text-primary-900">
                  {product.price}
                </p>
              )}
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                카테고리
              </label>
              <p className="text-base text-primary-900">{product.category}</p>
            </div>

            {/* 추출일 */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                추출일
              </label>
              <p className="text-base text-primary-900">
                {formatDate(product.addedAt)}
              </p>
            </div>

            {/* 요약 */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                요약
              </label>
              {isEditMode ? (
                <textarea
                  value={editedProduct.summary || ''}
                  onChange={(e) =>
                    setEditedProduct({ ...editedProduct, summary: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              ) : (
                <p className="text-base text-primary-900 whitespace-pre-wrap">
                  {product.summary}
                </p>
              )}
            </div>

            {/* 전체 분석 결과 */}
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">
                전체 분석 결과
              </label>
              {isEditMode ? (
                <div className="space-y-3">
                  {/* key_features */}
                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      주요 특징
                    </label>
                    <textarea
                      value={
                        editedProduct.fullAnalysis?.key_features?.join('\n') ||
                        product.fullAnalysis.key_features.join('\n')
                      }
                      onChange={(e) =>
                        setEditedProduct({
                          ...editedProduct,
                          fullAnalysis: {
                            ...product.fullAnalysis,
                            key_features: e.target.value.split('\n'),
                          },
                        })
                      }
                      rows={4}
                      placeholder="한 줄에 하나씩 입력"
                      className="w-full px-3 py-2 border border-warm-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>

                  {/* pros */}
                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      장점
                    </label>
                    <textarea
                      value={
                        editedProduct.fullAnalysis?.pros?.join('\n') ||
                        product.fullAnalysis.pros.join('\n')
                      }
                      onChange={(e) =>
                        setEditedProduct({
                          ...editedProduct,
                          fullAnalysis: {
                            ...product.fullAnalysis,
                            pros: e.target.value.split('\n'),
                          },
                        })
                      }
                      rows={3}
                      placeholder="한 줄에 하나씩 입력"
                      className="w-full px-3 py-2 border border-warm-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>

                  {/* cons */}
                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      단점
                    </label>
                    <textarea
                      value={
                        editedProduct.fullAnalysis?.cons?.join('\n') ||
                        product.fullAnalysis.cons.join('\n')
                      }
                      onChange={(e) =>
                        setEditedProduct({
                          ...editedProduct,
                          fullAnalysis: {
                            ...product.fullAnalysis,
                            cons: e.target.value.split('\n'),
                          },
                        })
                      }
                      rows={3}
                      placeholder="한 줄에 하나씩 입력"
                      className="w-full px-3 py-2 border border-warm-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>

                  {/* recommended_for */}
                  <div>
                    <label className="block text-xs font-medium text-primary-600 mb-1">
                      추천 대상
                    </label>
                    <input
                      type="text"
                      value={
                        editedProduct.fullAnalysis?.recommended_for ||
                        product.fullAnalysis.recommended_for
                      }
                      onChange={(e) =>
                        setEditedProduct({
                          ...editedProduct,
                          fullAnalysis: {
                            ...product.fullAnalysis,
                            recommended_for: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-warm-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-warm-50 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                  {/* 주요 특징 */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary-800 mb-2">
                      주요 특징
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {product.fullAnalysis.key_features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-primary-700">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 장점 */}
                  <div>
                    <h4 className="text-sm font-semibold text-green-800 mb-2">
                      장점
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {product.fullAnalysis.pros.map((pro, idx) => (
                        <li key={idx} className="text-sm text-green-700">
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 단점 */}
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 mb-2">
                      단점
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      {product.fullAnalysis.cons.map((con, idx) => (
                        <li key={idx} className="text-sm text-red-700">
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 추천 대상 */}
                  <div>
                    <h4 className="text-sm font-semibold text-primary-800 mb-2">
                      추천 대상
                    </h4>
                    <p className="text-sm text-primary-700">
                      {product.fullAnalysis.recommended_for}
                    </p>
                  </div>

                  {/* 추천 이유 */}
                  {product.fullAnalysis.recommendation_reasons &&
                    product.fullAnalysis.recommendation_reasons.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-primary-800 mb-2">
                          추천 이유
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {product.fullAnalysis.recommendation_reasons.map(
                            (reason, idx) => (
                              <li key={idx} className="text-sm text-primary-700">
                                {reason}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {/* 비추천 이유 */}
                  {product.fullAnalysis.not_recommended_reasons &&
                    product.fullAnalysis.not_recommended_reasons.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-primary-800 mb-2">
                          비추천 이유
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {product.fullAnalysis.not_recommended_reasons.map(
                            (reason, idx) => (
                              <li key={idx} className="text-sm text-primary-700">
                                {reason}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* 메모 섹션 */}
            <div className="border-t border-warm-200 pt-4">
              <label className="block text-sm font-medium text-primary-700 mb-2">
                메모
              </label>
              {isEditMode ? (
                <textarea
                  value={editedProduct.notes || ''}
                  onChange={(e) =>
                    setEditedProduct({ ...editedProduct, notes: e.target.value })
                  }
                  rows={4}
                  placeholder="이 제품에 대한 개인 메모를 작성하세요..."
                  className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              ) : (
                <div className="bg-warm-50 rounded-lg p-3 min-h-[80px]">
                  {product.notes ? (
                    <p className="text-sm text-primary-700 whitespace-pre-wrap">
                      {product.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-primary-500 italic">
                      메모가 없습니다
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 태그 섹션 */}
            <div className="border-t border-warm-200 pt-4">
              <label className="block text-sm font-medium text-primary-700 mb-2">
                태그
              </label>
              {isEditMode ? (
                <TagSelector
                  selectedTags={editedProduct.tags || []}
                  onTagsChange={(tags) =>
                    setEditedProduct({ ...editedProduct, tags })
                  }
                />
              ) : (
                <div className="bg-warm-50 rounded-lg p-3 min-h-[60px]">
                  {product.tags && product.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-sm border ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-primary-500 italic">
                      태그가 없습니다
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <ModalFooter>
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                취소
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleOpenOriginalPage}>
                원본 페이지 열기
              </Button>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProductDetailModal;
