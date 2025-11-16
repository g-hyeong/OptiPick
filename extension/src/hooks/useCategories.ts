import { useState, useEffect, useCallback } from "react";
import type { StoredProduct } from "@/types/storage";

interface CategoryHistory {
  category: string;
  count: number;
  lastUsed: number;
}

/**
 * 카테고리 관리 Hook
 * - 전체 카테고리 목록
 * - 최근 사용 히스토리 (최대 5개, 빈도순)
 */
export function useCategories(products: StoredProduct[]) {
  const [categoryHistory, setCategoryHistory] = useState<CategoryHistory[]>([]);

  // 모든 고유 카테고리 추출
  const allCategories = Array.from(new Set(products.map((p) => p.category))).sort();

  // 카테고리 히스토리 로드
  const loadCategoryHistory = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get("categoryHistory");
      setCategoryHistory(result.categoryHistory || []);
    } catch (error) {
      console.error("[useCategories] Failed to load category history:", error);
      setCategoryHistory([]);
    }
  }, []);

  // 카테고리 사용 기록
  const recordCategoryUsage = useCallback(async (category: string) => {
    try {
      // Storage에서 최신 데이터를 읽어옴 (stale closure 방지)
      const result = await chrome.storage.local.get("categoryHistory");
      const currentHistory = result.categoryHistory || [];

      const existing = currentHistory.find((h: CategoryHistory) => h.category === category);

      let updated: CategoryHistory[];
      if (existing) {
        // 기존 카테고리: count 증가
        updated = currentHistory.map((h: CategoryHistory) =>
          h.category === category
            ? { ...h, count: h.count + 1, lastUsed: Date.now() }
            : h
        );
      } else {
        // 새 카테고리: 추가
        updated = [...currentHistory, { category, count: 1, lastUsed: Date.now() }];
      }

      // 빈도순 정렬 후 최대 5개만 유지
      updated.sort((a, b) => b.count - a.count);
      updated = updated.slice(0, 5);

      await chrome.storage.local.set({ categoryHistory: updated });
      setCategoryHistory(updated);
    } catch (error) {
      console.error("[useCategories] Failed to record category usage:", error);
    }
  }, []); // categoryHistory dependency 제거

  // 카테고리명 변경
  const renameCategory = useCallback(async (oldName: string, newName: string) => {
    try {
      // 중복 이름 체크
      if (allCategories.includes(newName) && oldName !== newName) {
        throw new Error("이미 존재하는 카테고리명입니다");
      }

      // 모든 제품의 category 필드 업데이트
      const result = await chrome.storage.local.get("products");
      const currentProducts = result.products || [];
      const updatedProducts = currentProducts.map((p: StoredProduct) =>
        p.category === oldName ? { ...p, category: newName } : p
      );
      await chrome.storage.local.set({ products: updatedProducts });

      // 카테고리 히스토리 업데이트
      const historyResult = await chrome.storage.local.get("categoryHistory");
      const currentHistory = historyResult.categoryHistory || [];
      const updatedHistory = currentHistory.map((h: CategoryHistory) =>
        h.category === oldName ? { ...h, category: newName } : h
      );
      await chrome.storage.local.set({ categoryHistory: updatedHistory });
      setCategoryHistory(updatedHistory);
    } catch (error) {
      console.error("[useCategories] Failed to rename category:", error);
      throw error;
    }
  }, [allCategories]);

  // 카테고리 삭제
  const deleteCategory = useCallback(async (categoryName: string) => {
    try {
      // 해당 카테고리의 모든 제품 삭제
      const result = await chrome.storage.local.get("products");
      const currentProducts = result.products || [];
      const updatedProducts = currentProducts.filter(
        (p: StoredProduct) => p.category !== categoryName
      );
      await chrome.storage.local.set({ products: updatedProducts });

      // 카테고리 히스토리에서 제거
      const historyResult = await chrome.storage.local.get("categoryHistory");
      const currentHistory = historyResult.categoryHistory || [];
      const updatedHistory = currentHistory.filter(
        (h: CategoryHistory) => h.category !== categoryName
      );
      await chrome.storage.local.set({ categoryHistory: updatedHistory });
      setCategoryHistory(updatedHistory);
    } catch (error) {
      console.error("[useCategories] Failed to delete category:", error);
      throw error;
    }
  }, []);

  // 최근 카테고리 (빈도순, 최대 5개)
  const recentCategories = [...categoryHistory]
    .sort((a, b) => b.count - a.count)
    .map((h) => h.category);

  // 초기 로드
  useEffect(() => {
    loadCategoryHistory();
  }, [loadCategoryHistory]);

  return {
    allCategories,
    recentCategories,
    categoryHistory,
    recordCategoryUsage,
    renameCategory,
    deleteCategory,
  };
}
