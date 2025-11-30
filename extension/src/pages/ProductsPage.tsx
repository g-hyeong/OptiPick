import { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context";
import { useProductsContext } from "@/context";
import { useAnalysisHistory, sortHistory, filterHistory, type SortOption } from "@/hooks/useAnalysisHistory";
import { Card, Button } from "@/components/ui";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import ProductDetailModal from "@/components/ui/ProductDetailModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ComparisonDialog } from "@/components/ui/ComparisonDialog";
import { formatCurrency, cn } from "@/lib/utils";
import type { StoredProduct } from "@/types/storage";

// 별 아이콘
const StarFilledIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const StarOutlineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// 아이콘 컴포넌트들
const CompareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const MoreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

type TabType = "products" | "history";

export function ProductsPage() {
  const { state } = useApp();
  const { products, deleteProduct, deleteProducts, renameCategory, deleteCategory, toggleFavorite: toggleProductFavorite } = useProductsContext();
  const { history, deleteHistoryItem, toggleFavorite: toggleHistoryFavorite } = useAnalysisHistory();
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [selectedProduct, setSelectedProduct] = useState<StoredProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 일괄 삭제 상태
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 카테고리 관리 상태
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [showCategoryDeleteConfirm, setShowCategoryDeleteConfirm] = useState(false);
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);

  // 히스토리 탭 상태
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [historyFavoritesOnly, setHistoryFavoritesOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 제품 탭 즐겨찾기 필터 상태
  const [productFavoritesOnly, setProductFavoritesOnly] = useState(false);

  // 검색 debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 선택된 카테고리로 필터링 + 즐겨찾기 상단 정렬 + 즐겨찾기만 보기
  const filteredProducts = useMemo(() => {
    let result = state.selectedCategory
      ? products.filter((p) => p.category === state.selectedCategory)
      : products;

    // 즐겨찾기만 보기 필터
    if (productFavoritesOnly) {
      result = result.filter((p) => p.isFavorite);
    }

    // 즐겨찾기 상단 정렬
    result = [...result].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.addedAt - a.addedAt; // 그 외에는 최신순
    });

    return result;
  }, [products, state.selectedCategory, productFavoritesOnly]);

  // 정렬/필터 적용된 히스토리 계산
  const displayedHistory = useMemo(() => {
    let result = state.selectedCategory
      ? history.filter((h) => h.category === state.selectedCategory)
      : history;

    result = filterHistory(result, categoryFilter, historyFavoritesOnly, searchQuery);
    result = sortHistory(result, sortOption);

    return result;
  }, [history, state.selectedCategory, categoryFilter, historyFavoritesOnly, searchQuery, sortOption]);

  // 카테고리 필터 드롭다운용
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

  // 모달에서 즐겨찾기 토글
  const handleModalToggleFavorite = (productId: string) => {
    toggleProductFavorite(productId);
    // 선택된 제품 상태도 업데이트
    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct({
        ...selectedProduct,
        isFavorite: !selectedProduct.isFavorite,
      });
    }
  };

  // 히스토리에서 비교 결과 열기
  const openComparisonReport = async (historyId: string) => {
    const url = chrome.runtime.getURL(`src/compare-report/index.html?historyId=${historyId}`);
    await chrome.tabs.create({ url });
  };

  // 카테고리 이름 변경 시작
  const handleStartEditCategory = () => {
    if (state.selectedCategory) {
      setEditCategoryValue(state.selectedCategory);
      setIsEditingCategory(true);
    }
  };

  // 카테고리 이름 변경 저장
  const handleSaveCategory = async () => {
    const trimmed = editCategoryValue.trim();
    if (!trimmed || !state.selectedCategory) {
      setIsEditingCategory(false);
      return;
    }
    if (trimmed === state.selectedCategory) {
      setIsEditingCategory(false);
      return;
    }
    try {
      await renameCategory(state.selectedCategory, trimmed);
      setIsEditingCategory(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "이름 변경 실패");
    }
  };

  // 카테고리 삭제
  const handleDeleteCategory = async () => {
    if (state.selectedCategory) {
      await deleteCategory(state.selectedCategory);
      setShowCategoryDeleteConfirm(false);
    }
  };

  // 카테고리 비교 시작
  const handleStartComparison = () => {
    if (filteredProducts.length < 2) {
      alert("비교하려면 최소 2개 이상의 제품이 필요합니다");
      return;
    }
    setComparisonDialogOpen(true);
  };

  // 카테고리 관리 드롭다운 아이템
  const categoryMenuItems = [
    {
      label: "이름 변경",
      icon: <EditIcon />,
      onClick: handleStartEditCategory,
    },
    {
      label: "카테고리 삭제",
      icon: <TrashIcon />,
      onClick: () => setShowCategoryDeleteConfirm(true),
      variant: "danger" as const,
    },
  ];

  // 즐겨찾기 개수
  const favoriteCount = useMemo(() => {
    const categoryProducts = state.selectedCategory
      ? products.filter((p) => p.category === state.selectedCategory)
      : products;
    return categoryProducts.filter((p) => p.isFavorite).length;
  }, [products, state.selectedCategory]);

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

        {/* 선택된 카테고리 헤더 */}
        {state.selectedCategory && (
          <div className="flex items-center gap-3 mt-3 p-3 bg-warm-50 rounded-lg border border-warm-200">
            {isEditingCategory ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editCategoryValue}
                  onChange={(e) => setEditCategoryValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveCategory();
                    if (e.key === "Escape") setIsEditingCategory(false);
                  }}
                  autoFocus
                  className="flex-1 px-3 py-1.5 text-sm border border-warm-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button size="sm" onClick={handleSaveCategory}>
                  저장
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingCategory(false)}>
                  취소
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span className="text-sm font-medium text-primary-800">
                    {state.selectedCategory}
                  </span>
                  <span className="ml-2 text-xs text-primary-500">
                    ({filteredProducts.length}개 제품)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleStartComparison}
                    disabled={filteredProducts.length < 2}
                    className="flex items-center gap-1"
                  >
                    <CompareIcon />
                    비교 분석
                  </Button>
                  <DropdownMenu
                    trigger={
                      <button className="p-2 rounded-md text-primary-600 hover:bg-warm-200 transition-colors">
                        <MoreIcon />
                      </button>
                    }
                    items={categoryMenuItems}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 제품 목록 탭 */}
      {activeTab === "products" && (
        <>
          {filteredProducts.length === 0 && !productFavoritesOnly ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-primary-600 mb-2">저장된 제품이 없습니다</p>
              <p className="text-sm text-primary-500">
                상품 추출 페이지에서 제품을 추가해보세요
              </p>
            </div>
          ) : (
            <>
              {/* 헤더: 전체 선택 + 즐겨찾기 필터 + 삭제 */}
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

                <div className="flex items-center gap-3">
                  {/* 즐겨찾기만 보기 필터 */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productFavoritesOnly}
                      onChange={(e) => setProductFavoritesOnly(e.target.checked)}
                      className="w-4 h-4 accent-yellow-500"
                    />
                    <span className="text-sm text-primary-700">
                      즐겨찾기만 ({favoriteCount})
                    </span>
                  </label>

                  <Button
                    variant="danger"
                    size="sm"
                    disabled={selectedProductIds.size === 0}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    선택 삭제
                  </Button>
                </div>
              </div>

              {filteredProducts.length === 0 && productFavoritesOnly ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-6xl mb-4">⭐</div>
                  <p className="text-primary-600 mb-2">즐겨찾기한 제품이 없습니다</p>
                  <p className="text-sm text-primary-500">
                    제품의 별 아이콘을 클릭하여 즐겨찾기에 추가하세요
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductIds.has(product.id);
                    return (
                      <Card
                        key={product.id}
                        hover
                        className={cn(
                          isSelected && "bg-blue-50 border-blue-500 border-2",
                          product.isFavorite && !isSelected && "bg-yellow-50/50"
                        )}
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
                            </div>
                          </div>

                          {/* 즐겨찾기 버튼 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleProductFavorite(product.id);
                            }}
                            className={cn(
                              "p-2 rounded-full transition-colors flex-shrink-0 self-start",
                              product.isFavorite
                                ? "text-yellow-500 hover:bg-yellow-100"
                                : "text-primary-300 hover:text-yellow-500 hover:bg-yellow-50"
                            )}
                            title={product.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                          >
                            {product.isFavorite ? <StarFilledIcon /> : <StarOutlineIcon />}
                          </button>
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
              )}
            </>
          )}
        </>
      )}

      {/* 분석 히스토리 탭 */}
      {activeTab === "history" && (
        <>
          {history.length > 0 && (
            <div className="mb-4 p-4 bg-warm-50 rounded-lg border border-warm-200 space-y-3">
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
                    checked={historyFavoritesOnly}
                    onChange={(e) => setHistoryFavoritesOnly(e.target.checked)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-sm text-primary-700">즐겨찾기만</span>
                </label>
              </div>

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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-primary-800 text-sm">
                          {item.category} 비교 분석
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHistoryFavorite(item.id);
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
                    </div>
                  </div>

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
        onToggleFavorite={handleModalToggleFavorite}
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

      {/* 카테고리 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={showCategoryDeleteConfirm}
        onOpenChange={setShowCategoryDeleteConfirm}
        title="카테고리 삭제"
        description={`'${state.selectedCategory}' 카테고리와 포함된 모든 제품(${filteredProducts.length}개)을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDeleteCategory}
      />

      {/* 비교 다이얼로그 */}
      {comparisonDialogOpen && state.selectedCategory && (
        <ComparisonDialog
          open={comparisonDialogOpen}
          onClose={() => setComparisonDialogOpen(false)}
          category={state.selectedCategory}
          productIds={filteredProducts.map((p) => p.id)}
        />
      )}
    </div>
  );
}
