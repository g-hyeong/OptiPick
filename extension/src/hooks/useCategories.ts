/**
 * 카테고리 관리 Hook (IndexedDB via Dexie)
 */
import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { StoredProduct } from '@/types/storage';

/**
 * 카테고리 관리 Hook
 * - 전체 카테고리 목록
 * - 최근 사용 히스토리 (최대 5개, 빈도순)
 */
export function useCategories(products: StoredProduct[]) {
  // 카테고리 히스토리 실시간 쿼리
  const categoryHistory = useLiveQuery(() => db.categoryHistory.toArray(), []) || [];

  // 모든 고유 카테고리 추출
  const allCategories = Array.from(new Set(products.map((p) => p.category))).sort();

  // 카테고리 사용 기록
  const recordCategoryUsage = useCallback(async (category: string) => {
    try {
      const existing = await db.categoryHistory.get(category);

      // put(): upsert (insert or update)
      await db.categoryHistory.put({
        category,
        count: existing ? existing.count + 1 : 1,
        lastUsed: Date.now(),
      });

      // 최대 5개만 유지 (가장 적게 사용된 것 삭제)
      const all = await db.categoryHistory.orderBy('count').toArray();
      if (all.length > 5) {
        const toDelete = all.slice(0, all.length - 5);
        await db.categoryHistory.bulkDelete(toDelete.map((h) => h.category));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[useCategories] Failed to record category usage:', errorMessage);
    }
  }, []);

  // 카테고리명 변경
  const renameCategory = useCallback(
    async (oldName: string, newName: string) => {
      try {
        // 중복 이름 체크
        if (allCategories.includes(newName) && oldName !== newName) {
          throw new Error('이미 존재하는 카테고리명입니다');
        }

        // 모든 제품의 category 필드 업데이트
        await db.products.where('category').equals(oldName).modify({ category: newName });

        // 카테고리 히스토리 업데이트
        const existing = await db.categoryHistory.get(oldName);
        if (existing) {
          await db.categoryHistory.delete(oldName);
          await db.categoryHistory.put({
            ...existing,
            category: newName,
          });
        }
      } catch (error) {
        console.error('[useCategories] Failed to rename category:', error);
        throw error;
      }
    },
    [allCategories]
  );

  // 카테고리 삭제
  const deleteCategory = useCallback(async (categoryName: string) => {
    try {
      // 해당 카테고리의 모든 제품 삭제
      await db.products.where('category').equals(categoryName).delete();

      // 카테고리 히스토리에서 제거
      await db.categoryHistory.delete(categoryName);
    } catch (error) {
      console.error('[useCategories] Failed to delete category:', error);
      throw error;
    }
  }, []);

  // 최근 카테고리 (빈도순, 최대 5개)
  const recentCategories = [...categoryHistory]
    .sort((a, b) => b.count - a.count)
    .map((h) => h.category);

  return {
    allCategories,
    recentCategories,
    categoryHistory,
    recordCategoryUsage,
    renameCategory,
    deleteCategory,
  };
}
