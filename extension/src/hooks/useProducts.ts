/**
 * 제품 목록 관리 Hook (IndexedDB via Dexie)
 */
import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { generateUUID } from '@/utils/storage';
import type { StoredProduct } from '@/types/storage';

export function useProducts() {
  // useLiveQuery: 실시간 반응형 쿼리 (onChanged 대체)
  const products = useLiveQuery(
    () => db.products.orderBy('addedAt').reverse().toArray(),
    []
  );

  const loading = products === undefined;

  // 제품 추가
  const addProduct = useCallback(
    async (product: Omit<StoredProduct, 'id' | 'addedAt'>) => {
      const newProduct: StoredProduct = {
        ...product,
        id: generateUUID(),
        addedAt: Date.now(),
      };

      await db.products.add(newProduct);
      return newProduct;
    },
    []
  );

  // 제품 삭제
  const deleteProduct = useCallback(async (productId: string) => {
    await db.products.delete(productId);
  }, []);

  // 제품 업데이트
  const updateProduct = useCallback(
    async (productId: string, updates: Partial<StoredProduct>) => {
      await db.products.update(productId, updates);
    },
    []
  );

  // 카테고리별 필터링
  const getProductsByCategory = useCallback(
    (category: string) => {
      return (products || []).filter((p) => p.category === category);
    },
    [products]
  );

  // 카테고리별 제품 일괄 삭제
  const deleteByCategory = useCallback(async (category: string) => {
    await db.products.where('category').equals(category).delete();
  }, []);

  // 제품 ID 배열로 일괄 삭제
  const deleteProducts = useCallback(async (productIds: string[]) => {
    await db.products.bulkDelete(productIds);
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback(async (productId: string) => {
    const product = await db.products.get(productId);
    if (product) {
      await db.products.update(productId, {
        isFavorite: !product.isFavorite,
      });
    }
  }, []);

  // 수동 리로드 (보통 필요 없음, useLiveQuery가 자동 갱신)
  const reload = useCallback(() => {
    // useLiveQuery는 자동으로 데이터를 동기화하므로
    // 이 함수는 호환성을 위해 유지
  }, []);

  return {
    products: products || [],
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    deleteProducts,
    deleteByCategory,
    getProductsByCategory,
    toggleFavorite,
    reload,
  };
}
