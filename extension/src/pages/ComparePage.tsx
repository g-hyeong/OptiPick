import { useState } from "react";
import { useProductsContext } from "@/context";
import { Button, Card, Chip, ComparisonDialog } from "@/components/ui";

export function ComparePage() {
  const { allCategories, getProductsByCategory } = useProductsContext();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const categoryProducts = selectedCategory
    ? getProductsByCategory(selectedCategory)
    : [];

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    // 카테고리 선택 시 해당 카테고리의 전체 제품 자동 선택
    const products = getProductsByCategory(category);
    const allProductIds = products.map((p) => p.id).slice(0, 10); // 최대 10개
    setSelectedProducts(allProductIds);
  };

  const toggleProductSelection = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    } else {
      if (selectedProducts.length < 10) {
        setSelectedProducts([...selectedProducts, productId]);
      }
    }
  };

  const handleStartComparison = () => {
    setComparisonOpen(true);
  };

  const handleSelectAll = () => {
    const allProductIds = categoryProducts.map((p) => p.id).slice(0, 10); // 최대 10개
    setSelectedProducts(allProductIds);
  };

  return (
    <div className="p-4 space-y-4 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold text-primary-800 mb-2">제품 비교</h1>
        <p className="text-sm text-primary-600">
          비교할 제품을 선택하세요 (2~10개)
        </p>
      </div>

      {/* 카테고리 선택 */}
      <Card>
        <h3 className="text-sm font-semibold text-primary-800 mb-3">
          카테고리 선택
        </h3>
        {allCategories.length === 0 ? (
          <p className="text-sm text-primary-600">
            저장된 카테고리가 없습니다
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat) => (
              <Chip
                key={cat}
                variant={selectedCategory === cat ? "selected" : "primary"}
                clickable
                onClick={() => handleCategorySelect(cat)}
              >
                {cat}
              </Chip>
            ))}
          </div>
        )}
      </Card>

      {/* 제품 선택 */}
      {selectedCategory && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary-800">
              제품 선택 ({selectedProducts.length}/10)
            </h3>
            <div className="flex gap-2">
              {selectedProducts.length < categoryProducts.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  전체 선택
                </Button>
              )}
              {selectedProducts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProducts([])}
                >
                  전체 해제
                </Button>
              )}
            </div>
          </div>

          {categoryProducts.length === 0 ? (
            <p className="text-sm text-primary-600">
              이 카테고리에 저장된 제품이 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {categoryProducts.map((product) => (
                <label
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-md hover:bg-warm-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    disabled={
                      !selectedProducts.includes(product.id) &&
                      selectedProducts.length >= 10
                    }
                    className="w-4 h-4 flex-shrink-0"
                  />
                  <span className="text-sm text-primary-800 flex-1 min-w-0 truncate">
                    {product.title || product.fullAnalysis.product_name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 비교 시작 버튼 */}
      {selectedProducts.length >= 2 && (
        <Button
          onClick={handleStartComparison}
          disabled={selectedProducts.length < 2}
          className="w-full"
        >
          비교 시작 ({selectedProducts.length}개 제품)
        </Button>
      )}

      {selectedProducts.length === 1 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          최소 2개 이상의 제품을 선택해주세요
        </div>
      )}

      {/* 비교 모달 */}
      <ComparisonDialog
        open={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        category={selectedCategory}
        productIds={selectedProducts}
      />
    </div>
  );
}
