/**
 * 비교 템플릿 관리 Hook (IndexedDB via Dexie)
 */
import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import type { ComparisonTemplate } from '@/types/storage';

/**
 * 비교 템플릿 관리 Hook
 */
export function useTemplates() {
  // useLiveQuery: 실시간 반응형 쿼리
  const templates = useLiveQuery(() => db.comparisonTemplates.orderBy('updatedAt').reverse().toArray(), []);

  const loading = templates === undefined;

  // 템플릿 추가
  const addTemplate = useCallback(
    async (template: Omit<ComparisonTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTemplate: ComparisonTemplate = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.comparisonTemplates.add(newTemplate);
      return newTemplate;
    },
    []
  );

  // 템플릿 업데이트
  const updateTemplate = useCallback(
    async (id: string, updates: Partial<Omit<ComparisonTemplate, 'id' | 'createdAt'>>) => {
      await db.comparisonTemplates.update(id, {
        ...updates,
        updatedAt: Date.now(),
      });
    },
    []
  );

  // 템플릿 삭제
  const deleteTemplate = useCallback(async (id: string) => {
    await db.comparisonTemplates.delete(id);
  }, []);

  // 특정 템플릿 조회
  const getTemplate = useCallback(
    (id: string) => {
      return (templates || []).find((t) => t.id === id);
    },
    [templates]
  );

  // 카테고리별 템플릿
  const getTemplatesByCategory = useCallback(
    (category: string) => {
      return (templates || []).filter((t) => t.category === category);
    },
    [templates]
  );

  // 수동 리로드 (호환성 유지)
  const reload = useCallback(() => {
    // useLiveQuery가 자동으로 동기화
  }, []);

  return {
    templates: templates || [],
    loading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getTemplatesByCategory,
    reload,
  };
}
