import { useState, useCallback } from "react";

export interface ToastItem {
  id: string;
  variant: "default" | "success" | "error" | "warning";
  title: string;
  description?: string;
}

/**
 * Toast 알림 관리 Hook
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // 5초 후 자동 제거
    setTimeout(() => {
      removeToast(id);
    }, 5000);

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((title: string, description?: string) => {
    return addToast({ variant: "success", title, description });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    return addToast({ variant: "error", title, description });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    return addToast({ variant: "warning", title, description });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    return addToast({ variant: "default", title, description });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}
