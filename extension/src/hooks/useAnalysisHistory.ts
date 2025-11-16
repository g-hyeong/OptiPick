import { useState, useEffect, useCallback } from "react";
import type { ComparisonReportData } from "@/types/content";
import type { StoredProduct } from "@/types/storage";

export interface AnalysisHistoryItem {
  id: string;
  date: number;
  category: string;
  productCount: number;
  products: StoredProduct[];
  criteria?: string[];
  userPriorities?: string[];
  reportData?: ComparisonReportData;
  isFavorite?: boolean;
}

// 정렬 옵션 타입
export type SortOption = 'date-desc' | 'date-asc' | 'count-desc' | 'count-asc' | 'category-asc';

// 정렬 함수
export const sortHistory = (items: AnalysisHistoryItem[], option: SortOption): AnalysisHistoryItem[] => {
  const sorted = [...items];

  // 즐겨찾기는 항상 상단
  const favorites = sorted.filter(h => h.isFavorite);
  const regular = sorted.filter(h => !h.isFavorite);

  const sortFn = (list: AnalysisHistoryItem[]) => {
    switch (option) {
      case 'date-desc':
        return list.sort((a, b) => b.date - a.date);
      case 'date-asc':
        return list.sort((a, b) => a.date - b.date);
      case 'count-desc':
        return list.sort((a, b) => b.productCount - a.productCount);
      case 'count-asc':
        return list.sort((a, b) => a.productCount - b.productCount);
      case 'category-asc':
        return list.sort((a, b) => a.category.localeCompare(b.category, 'ko'));
      default:
        return list;
    }
  };

  return [...sortFn(favorites), ...sortFn(regular)];
};

// 필터 함수
export const filterHistory = (
  items: AnalysisHistoryItem[],
  categoryFilter: string | null,
  favoritesOnly: boolean,
  searchQuery: string
): AnalysisHistoryItem[] => {
  let filtered = items;

  if (categoryFilter) {
    filtered = filtered.filter(h => h.category === categoryFilter);
  }

  if (favoritesOnly) {
    filtered = filtered.filter(h => h.isFavorite);
  }

  if (searchQuery) {
    filtered = filtered.filter(h =>
      h.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return filtered;
};

/**
 * 분석 결과 히스토리 관리 Hook
 */
export function useAnalysisHistory() {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 히스토리 로드
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const result = await chrome.storage.local.get("analysisHistory");
      const items = result.analysisHistory || [];

      // isFavorite 필드 없으면 false 추가 (마이그레이션)
      const migrated = items.map((item: AnalysisHistoryItem) => ({
        ...item,
        isFavorite: item.isFavorite ?? false,
      }));

      // 필요 시 Storage 업데이트
      if (items.some((item: AnalysisHistoryItem) => item.isFavorite === undefined)) {
        await chrome.storage.local.set({ analysisHistory: migrated });
        console.log("[useAnalysisHistory] Migrated history with isFavorite field");
      }

      setHistory(migrated);
    } catch (error) {
      console.error("[useAnalysisHistory] Failed to load history:", error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 히스토리 추가
  const addHistoryItem = useCallback(async (item: Omit<AnalysisHistoryItem, "id" | "date">) => {
    const newItem: AnalysisHistoryItem = {
      ...item,
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: Date.now(),
    };

    console.log("[useAnalysisHistory] Adding history item:", {
      id: newItem.id,
      category: newItem.category,
      productCount: newItem.productCount,
      hasCriteria: !!newItem.criteria,
      hasReportData: !!newItem.reportData,
    });

    try {
      // Storage에서 최신 히스토리를 읽어옴 (stale closure 방지)
      const result = await chrome.storage.local.get("analysisHistory");
      const currentHistory = result.analysisHistory || [];
      console.log("[useAnalysisHistory] Current history in storage:", currentHistory.length);

      const updated = [newItem, ...currentHistory];

      // Storage에 저장
      await chrome.storage.local.set({ analysisHistory: updated });
      console.log("[useAnalysisHistory] History saved to storage successfully. New count:", updated.length);

      // State 업데이트
      setHistory(updated);

      return newItem;
    } catch (error) {
      console.error("[useAnalysisHistory] Failed to save to storage:", error);
      throw error;
    }
  }, []);

  // 특정 히스토리 조회
  const getHistoryItem = useCallback((id: string) => {
    return history.find((item) => item.id === id);
  }, [history]);

  // 카테고리별 히스토리
  const getHistoryByCategory = useCallback((category: string) => {
    return history.filter((item) => item.category === category);
  }, [history]);

  // 히스토리 삭제
  const deleteHistoryItem = useCallback(async (id: string) => {
    try {
      // Storage에서 최신 히스토리를 읽어옴
      const result = await chrome.storage.local.get("analysisHistory");
      const currentHistory = result.analysisHistory || [];

      const updated = currentHistory.filter((item: AnalysisHistoryItem) => item.id !== id);

      // Storage에 저장
      await chrome.storage.local.set({ analysisHistory: updated });
      console.log("[useAnalysisHistory] History item deleted. New count:", updated.length);

      // State 업데이트
      setHistory(updated);
    } catch (error) {
      console.error("[useAnalysisHistory] Failed to delete history item:", error);
      throw error;
    }
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback(async (id: string) => {
    try {
      // Storage에서 최신 히스토리를 읽어옴
      const result = await chrome.storage.local.get("analysisHistory");
      const currentHistory = result.analysisHistory || [];

      const updated = currentHistory.map((item: AnalysisHistoryItem) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );

      // Storage에 저장
      await chrome.storage.local.set({ analysisHistory: updated });
      console.log("[useAnalysisHistory] Favorite toggled for:", id);

      // State 업데이트
      setHistory(updated);
    } catch (error) {
      console.error("[useAnalysisHistory] Failed to toggle favorite:", error);
      throw error;
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Storage 변경 감지
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.analysisHistory) {
        console.log("[useAnalysisHistory] Storage changed, reloading...");
        setHistory(changes.analysisHistory.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return {
    history,
    loading,
    addHistoryItem,
    getHistoryItem,
    getHistoryByCategory,
    deleteHistoryItem,
    toggleFavorite,
    reload: loadHistory,
  };
}
