import { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context";
import { useProductsContext } from "@/context";
import { useAnalysisHistory, sortHistory, filterHistory, type SortOption } from "@/hooks/useAnalysisHistory";
import { Card, Button } from "@/components/ui";
import ProductDetailModal from "@/components/ui/ProductDetailModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/lib/utils";
import { getTagColor } from "@/lib/tagUtils";
import type { StoredProduct } from "@/types/storage";

type TabType = "products" | "history";

export function ProductsPage() {
  const { state } = useApp();
  const { products, deleteProduct, updateProduct, deleteProducts } = useProductsContext();
  const { history, deleteHistoryItem, toggleFavorite } = useAnalysisHistory();
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [selectedProduct, setSelectedProduct] = useState<StoredProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 일괄 삭제 상태
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 히스토리 탭 상태
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 제품 탭 태그 필터 상태
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // 디버깅: 히스토리 로드 확인
  useEffect(() => {
    console.log("[ProductsPage] History loaded:", {
      totalCount: history.length,
      items: history.map(h => ({
        id: h.id,
        category: h.category,
        date: new Date(h.date).toLocaleString(),
        productCount: h.productCount,
      })),
    });
  }, [history]);

  // 검색 debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 선택된 카테고리 및 태그로 제품 필터링
  const filteredProducts = useMemo(() => {
    let result = state.selectedCategory
      ? products.filter((p) => p.category === state.selectedCategory)
      : products;

    // 태그 필터 적용
    if (selectedTagFilter) {
      result = result.filter((p) => p.tags && p.tags.includes(selectedTagFilter));
    }

    return result;
  }, [products, state.selectedCategory, selectedTagFilter]);

  // 전체 태그 목록 (필터용)
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach((p) => {
      if (p.tags) {
        p.tags.forEach((t) => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [products]);

  // 정렬/필터 적용된 히스토리 계산
  const displayedHistory = useMemo(() => {
    // 1. 선택된 카테고리로 먼저 필터링
    let result = state.selectedCategory
      ? history.filter((h) => h.category === state.selectedCategory)
      : history;

    // 2. 추가 필터 적용 (카테고리, 즐겨찾기, 검색)
    result = filterHistory(result, categoryFilter, favoritesOnly, searchQuery);

    // 3. 정렬 적용
    result = sortHistory(result, sortOption);

    return result;
  }, [history, state.selectedCategory, categoryFilter, favoritesOnly, searchQuery, sortOption]);

  // 카테고리 필터 드롭다운용 - 전체 카테고리 목록
  const allHistoryCategories = useMemo(() => {
    const categories = new Set(history.map((h) => h.category));
    return Array.from(categories).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [history]);

  // 카테고리 변경 시 선택 상태 초기화
  useEffect(() => {
    setSelectedProductIds(new Set());
  }, [state.selectedCategory]);

  // 체크박스 토글 핸들러
  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // 전체 선택 핸들러
  const handleSelectAll = () => {
    const allIds = new Set(filteredProducts.map((p) => p.id));
    setSelectedProductIds(allIds);
  };

  // 선택 해제 핸들러
  const handleDeselectAll = () => {
    setSelectedProductIds(new Set());
  };

  // 선택 삭제 핸들러
  const handleDeleteSelected = async () => {
    if (selectedProductIds.size === 0) return;
    await deleteProducts(Array.from(selectedProductIds));
    setSelectedProductIds(new Set());
    setShowDeleteConfirm(false);
  };

  // 제품 클릭 핸들러
  const handleProductClick = (product: StoredProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // 모달 닫기 핸들러
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // 제품 저장 핸들러
  const handleSaveProduct = async (updates: Partial<StoredProduct>) => {
    if (!selectedProduct) return;
    await updateProduct(selectedProduct.id, updates);
  };

  // 히스토리에서 비교 결과 열기
  const openComparisonReport = async (historyId: string) => {
    const url = chrome.runtime.getURL(`src/compare-report/index.html?historyId=${historyId}`);
    await chrome.tabs.create({ url });
  };

  return (
    <div className="p-4 w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-primary-800 mb-3">
          {activeTab === "products" ? "제품 목록" : "분석 히스토리"}
        </h1>

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 border-b border-warm-200">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "products"
                ? "text-primary-700 border-primary-500"
                : "text-primary-500 border-transparent hover:text-primary-600"
            }`}
          >
            제품 ({filteredProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
              activeTab === "history"
                ? "text-primary-700 border-primary-500"
                : "text-primary-500 border-transparent hover:text-primary-600"
            }`}
          >
            분석 히스토리 ({displayedHistory.length})
          </button>
        </div>
        {state.selectedCategory && (
          <p className="text-sm text-primary-600 mt-2">
            {state.selectedCategory}
          </p>
        )}
      </div>

      {/* 제품 목록 탭 */}
      {activeTab === "products" && (
        <>
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-primary-600 mb-2">저장된 제품이 없습니다</p>
              <p className="text-sm text-primary-500">
                상품 추출 페이지에서 제품을 추가해보세요
              </p>
            </div>
          ) : (
            <>
              {/* 태그 필터 */}
              {allTags.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    태그 필터:
                  </label>
                  <select
                    value={selectedTagFilter || ''}
                    onChange={(e) => setSelectedTagFilter(e.target.value || null)}
                    className="px-3 py-2 text-sm border border-warm-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">전체 태그</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 일괄 작업 헤더 */}
              <div className="flex items-center justify-between mb-4 p-3 bg-warm-50 rounded-lg border border-warm-200">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAll();
                        } else {
                          handleDeselectAll();
                        }
                      }}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-primary-700">전체 선택</span>
                  </label>
                  {selectedProductIds.size > 0 && (
                    <span className="text-sm text-primary-600">
                      {selectedProductIds.size}개 선택됨
                    </span>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={selectedProductIds.size === 0}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  선택 삭제
                </Button>
              </div>

              <div className="space-y-2">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProductIds.has(product.id);
                  return (
                    <Card
                      key={product.id}
                      hover
                      className={isSelected ? "bg-blue-50 border-blue-500 border-2" : ""}
                    >
                      <div className="flex gap-4 min-w-0">
                        {/* 체크박스 */}
                        <div className="flex items-start pt-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProduct(product.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 accent-blue-600"
                          />
                        </div>

                        {/* 제품 정보 */}
                        <div
                          className="flex gap-4 min-w-0 flex-1 cursor-pointer"
                          onClick={() => handleProductClick(product)}
                        >
                          {/* 썸네일 */}
                          {product.thumbnailUrl ? (
                            <img
                              src={product.thumbnailUrl}
                              alt={product.title}
                              className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-warm-200 rounded-md flex items-center justify-center flex-shrink-0">
                              <span className="text-warm-400 text-xl">📷</span>
                            </div>
                          )}

                          {/* 정보 */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h3 className="font-semibold text-primary-800 text-sm mb-1 line-clamp-2 break-words">
                              {product.title || product.fullAnalysis.product_name}
                            </h3>
                            {product.price && (
                              <p className="text-primary-600 font-bold text-base mb-2">
                                {formatCurrency(parseFloat(product.price.replace(/[^0-9.]/g, "")))}
                              </p>
                            )}
                            {product.summary && (
                              <p className="text-xs text-primary-600 line-clamp-2 break-words">
                                {product.summary}
                              </p>
                            )}
                            {/* 태그 표시 */}
                            {product.tags && product.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {product.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className={`text-xs px-2 py-0.5 rounded border ${getTagColor(tag)}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {product.tags.length > 3 && (
                                  <span className="text-xs text-primary-500">
                                    +{product.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-warm-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await chrome.tabs.create({ url: product.url });
                          }}
                        >
                          페이지 열기
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProduct(product.id);
                          }}
                        >
                          삭제
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* 분석 히스토리 탭 */}
      {activeTab === "history" && (
        <>
          {/* 정렬/필터/검색 헤더 */}
          {history.length > 0 && (
            <div className="mb-4 p-4 bg-warm-50 rounded-lg border border-warm-200 space-y-3">
              {/* 정렬 옵션 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-primary-700 w-16">정렬:</label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="flex-1 px-3 py-1.5 text-sm border border-warm-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="date-desc">날짜 (최신순)</option>
                  <option value="date-asc">날짜 (오래된 순)</option>
                  <option value="count-desc">제품 개수 (많은 순)</option>
                  <option value="count-asc">제품 개수 (적은 순)</option>
                  <option value="category-asc">카테고리 (가나다순)</option>
                </select>
              </div>

              {/* 필터 옵션 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-primary-700 w-16">필터:</label>
                <select
                  value={categoryFilter || ''}
                  onChange={(e) => setCategoryFilter(e.target.value || null)}
                  className="flex-1 px-3 py-1.5 text-sm border border-warm-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">전체 카테고리</option>
                  {allHistoryCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={favoritesOnly}
                    onChange={(e) => setFavoritesOnly(e.target.checked)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-sm text-primary-700">즐겨찾기만</span>
                </label>
              </div>

              {/* 검색 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-primary-700 w-16">검색:</label>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="카테고리명 검색..."
                  className="flex-1 px-3 py-1.5 text-sm border border-warm-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {displayedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-primary-600 mb-2">
                {history.length === 0 ? "분석 히스토리가 없습니다" : "검색 결과가 없습니다"}
              </p>
              <p className="text-sm text-primary-500">
                {history.length === 0
                  ? "제품 비교를 완료하면 여기에 히스토리가 저장됩니다"
                  : "다른 검색어나 필터를 시도해보세요"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedHistory.map((item) => (
                <Card
                  key={item.id}
                  hover
                  onClick={() => openComparisonReport(item.id)}
                  className={item.isFavorite ? "bg-yellow-50 border-yellow-200" : ""}
                >
                  <div className="flex justify-between items-start gap-4">
                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-primary-800 text-sm">
                          {item.category} 비교 분석
                        </h3>
                        {/* 즐겨찾기 버튼 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          className="text-lg hover:scale-110 transition-transform"
                          title={item.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                        >
                          {item.isFavorite ? "⭐" : "☆"}
                        </button>
                      </div>
                      <p className="text-xs text-primary-600 mb-2">
                        {new Date(item.date).toLocaleString("ko-KR")}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-primary-600">
                        <span>제품 {item.productCount}개</span>
                        {item.criteria && item.criteria.length > 0 && (
                          <span>· 기준 {item.criteria.length}개</span>
                        )}
                      </div>
                      {item.userPriorities && item.userPriorities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.userPriorities.slice(0, 3).map((priority, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded"
                            >
                              {idx + 1}. {priority}
                            </span>
                          ))}
                          {item.userPriorities.length > 3 && (
                            <span className="text-xs px-2 py-1 text-primary-600">
                              +{item.userPriorities.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-warm-200">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openComparisonReport(item.id);
                      }}
                    >
                      결과 보기
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistoryItem(item.id);
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* 제품 상세 모달 */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveProduct}
      />

      {/* 일괄 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="제품 삭제"
        description={`선택한 ${selectedProductIds.size}개 제품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDeleteSelected}
      />
    </div>
  );
}
