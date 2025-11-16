import { useState, useEffect, useCallback } from "react";
import type { ComparisonTemplate } from "@/types/storage";

/**
 * 비교 템플릿 관리 Hook
 */
export function useTemplates() {
  const [templates, setTemplates] = useState<ComparisonTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // 템플릿 로드
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const result = await chrome.storage.local.get("comparisonTemplates");
      setTemplates(result.comparisonTemplates || []);
    } catch (error) {
      console.error("[useTemplates] Failed to load templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 템플릿 추가
  const addTemplate = useCallback(async (template: Omit<ComparisonTemplate, "id" | "createdAt" | "updatedAt">) => {
    const newTemplate: ComparisonTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const result = await chrome.storage.local.get("comparisonTemplates");
      const currentTemplates = result.comparisonTemplates || [];
      const updated = [newTemplate, ...currentTemplates];

      await chrome.storage.local.set({ comparisonTemplates: updated });
      setTemplates(updated);

      return newTemplate;
    } catch (error) {
      console.error("[useTemplates] Failed to add template:", error);
      throw error;
    }
  }, []);

  // 템플릿 업데이트
  const updateTemplate = useCallback(async (
    id: string,
    updates: Partial<Omit<ComparisonTemplate, "id" | "createdAt">>
  ) => {
    try {
      const result = await chrome.storage.local.get("comparisonTemplates");
      const currentTemplates = result.comparisonTemplates || [];

      const updated = currentTemplates.map((t: ComparisonTemplate) =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
      );

      await chrome.storage.local.set({ comparisonTemplates: updated });
      setTemplates(updated);
    } catch (error) {
      console.error("[useTemplates] Failed to update template:", error);
      throw error;
    }
  }, []);

  // 템플릿 삭제
  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const result = await chrome.storage.local.get("comparisonTemplates");
      const currentTemplates = result.comparisonTemplates || [];

      const updated = currentTemplates.filter((t: ComparisonTemplate) => t.id !== id);

      await chrome.storage.local.set({ comparisonTemplates: updated });
      setTemplates(updated);
    } catch (error) {
      console.error("[useTemplates] Failed to delete template:", error);
      throw error;
    }
  }, []);

  // 특정 템플릿 조회
  const getTemplate = useCallback((id: string) => {
    return templates.find((t) => t.id === id);
  }, [templates]);

  // 카테고리별 템플릿
  const getTemplatesByCategory = useCallback((category: string) => {
    return templates.filter((t) => t.category === category);
  }, [templates]);

  // 초기 로드
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Storage 변경 감지
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.comparisonTemplates) {
        setTemplates(changes.comparisonTemplates.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return {
    templates,
    loading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getTemplatesByCategory,
    reload: loadTemplates,
  };
}
