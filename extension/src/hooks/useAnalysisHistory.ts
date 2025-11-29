/**
 * 분석 결과 히스토리 관리 Hook (IndexedDB via Dexie)
 */
import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { AnalysisHistoryItem } from '@/types/storage';

// 정렬 옵션 타입
export type SortOption = 'date-desc' | 'date-asc' | 'count-desc' | 'count-asc' | 'category-asc';

// 정렬 함수
export const sortHistory = (items: AnalysisHistoryItem[], option: SortOption): AnalysisHistoryItem[] => {
  const sorted = [...items];

  // 즐겨찾기는 항상 상단
  const favorites = sorted.filter((h) => h.isFavorite);
  const regular = sorted.filter((h) => !h.isFavorite);

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
    filtered = filtered.filter((h) => h.category === categoryFilter);
  }

  if (favoritesOnly) {
    filtered = filtered.filter((h) => h.isFavorite);
  }

  if (searchQuery) {
    filtered = filtered.filter((h) => h.category.toLowerCase().includes(searchQuery.toLowerCase()));
  }

  return filtered;
};

/**
 * 분석 결과 히스토리 관리 Hook
 */
export function useAnalysisHistory() {
  // useLiveQuery: 실시간 반응형 쿼리
  const history = useLiveQuery(() => db.analysisHistory.orderBy('date').reverse().toArray(), []);

  const loading = history === undefined;

  // 히스토리 추가
  const addHistoryItem = useCallback(async (item: Omit<AnalysisHistoryItem, 'id' | 'date'>) => {
    const newItem: AnalysisHistoryItem = {
      ...item,
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: Date.now(),
    };

    console.log('[useAnalysisHistory] Adding history item:', {
      id: newItem.id,
      category: newItem.category,
      productCount: newItem.productCount,
      hasCriteria: !!newItem.criteria,
      hasReportData: !!newItem.reportData,
    });

    await db.analysisHistory.add(newItem);
    console.log('[useAnalysisHistory] History saved successfully');

    return newItem;
  }, []);

  // 특정 히스토리 조회
  const getHistoryItem = useCallback(
    (id: string) => {
      return (history || []).find((item) => item.id === id);
    },
    [history]
  );

  // 카테고리별 히스토리
  const getHistoryByCategory = useCallback(
    (category: string) => {
      return (history || []).filter((item) => item.category === category);
    },
    [history]
  );

  // 히스토리 삭제
  const deleteHistoryItem = useCallback(async (id: string) => {
    await db.analysisHistory.delete(id);
    console.log('[useAnalysisHistory] History item deleted:', id);
  }, []);

  // 즐겨찾기 토글
  const toggleFavorite = useCallback(async (id: string) => {
    const item = await db.analysisHistory.get(id);
    if (item) {
      await db.analysisHistory.update(id, { isFavorite: !item.isFavorite });
      console.log('[useAnalysisHistory] Favorite toggled for:', id);
    }
  }, []);

  // 수동 리로드 (호환성 유지)
  const reload = useCallback(() => {
    // useLiveQuery가 자동으로 동기화
  }, []);

  return {
    history: history || [],
    loading,
    addHistoryItem,
    getHistoryItem,
    getHistoryByCategory,
    deleteHistoryItem,
    toggleFavorite,
    reload,
  };
}
