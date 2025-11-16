import { useState, useEffect, useCallback } from "react";
import type { StoredProduct } from "@/types/storage";

/**
 * 제품 목록 관리 Hook
 */
export function useProducts() {
  const [products, setProducts] = useState<StoredProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // 제품 목록 로드
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await chrome.storage.local.get("products");
      setProducts(result.products || []);
    } catch (error) {
      console.error("[useProducts] Failed to load products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 제품 추가
  const addProduct = useCallback(async (product: Omit<StoredProduct, "id" | "addedAt">) => {
    const newProduct: StoredProduct = {
      ...product,
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: Date.now(),
    };

    const updatedProducts = [...products, newProduct];
    await chrome.storage.local.set({ products: updatedProducts });
    setProducts(updatedProducts);

    return newProduct;
  }, [products]);

  // 제품 삭제
  const deleteProduct = useCallback(async (productId: string) => {
    const updatedProducts = products.filter((p) => p.id !== productId);
    await chrome.storage.local.set({ products: updatedProducts });
    setProducts(updatedProducts);
  }, [products]);

  // 제품 업데이트
  const updateProduct = useCallback(async (
    productId: string,
    updates: Partial<StoredProduct>
  ) => {
    const updatedProducts = products.map((p) =>
      p.id === productId ? { ...p, ...updates } : p
    );
    await chrome.storage.local.set({ products: updatedProducts });
    setProducts(updatedProducts);
  }, [products]);

  // 카테고리별 필터링
  const getProductsByCategory = useCallback((category: string) => {
    return products.filter((p) => p.category === category);
  }, [products]);

  // 카테고리별 제품 일괄 삭제
  const deleteByCategory = useCallback(async (category: string) => {
    const updatedProducts = products.filter((p) => p.category !== category);
    await chrome.storage.local.set({ products: updatedProducts });
    setProducts(updatedProducts);
  }, [products]);

  // 제품 ID 배열로 일괄 삭제
  const deleteProducts = useCallback(async (productIds: string[]) => {
    const idsSet = new Set(productIds);
    const updatedProducts = products.filter((p) => !idsSet.has(p.id));
    await chrome.storage.local.set({ products: updatedProducts });
    setProducts(updatedProducts);
  }, [products]);

  // 초기 로드
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Storage 변경 감지
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.products) {
        setProducts(changes.products.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteProducts,
    deleteByCategory,
    getProductsByCategory,
    reload: loadProducts,
  };
}
