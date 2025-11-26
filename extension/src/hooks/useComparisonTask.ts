import { useState, useEffect, useCallback } from "react";
import type { ComparisonTask } from "@/types/storage";

/**
 * 비교 작업 상태 관리 Hook
 * Background worker의 ComparisonTask 상태를 주기적으로 폴링
 */
export function useComparisonTask(polling = true) {
  const [task, setTask] = useState<ComparisonTask | null>(null);
  const [loading, setLoading] = useState(true);

  // 현재 작업 상태 조회
  const fetchTask = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_COMPARISON_TASK_STATE",
      });

      if (response.success) {
        setTask(response.task || null);
      } else {
        console.error("[useComparisonTask] Failed to fetch task:", response.error);
      }
    } catch (error) {
      console.error("[useComparisonTask] Error fetching task:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 비교 시작
  const startComparison = useCallback(async (category: string, productIds: string[]) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "START_COMPARISON",
        category,
        productIds,
      });

      if (response.success) {
        await fetchTask();
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }, [fetchTask]);

  // 사용자 기준 전송 (비교 진행)
  const submitCriteria = useCallback(async (userCriteria: string[]) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SUBMIT_COMPARISON_CRITERIA",
        userCriteria,
      });

      if (response.success) {
        await fetchTask();
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }, [fetchTask]);

  // 초기 로드
  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  // 폴링 (1초 간격)
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(() => {
      fetchTask();
    }, 1000);

    return () => clearInterval(interval);
  }, [polling, fetchTask]);

  return {
    task,
    loading,
    startComparison,
    submitCriteria,
    refresh: fetchTask,
  };
}
