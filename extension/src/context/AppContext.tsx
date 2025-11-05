import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Page = "extract" | "products" | "compare" | "history";

interface AppState {
  currentPage: Page;
  sidebarCollapsed: boolean;
  selectedCategory: string | null;
}

interface AppContextType {
  state: AppState;
  setCurrentPage: (page: Page) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedCategory: (category: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentPage: "extract",
    sidebarCollapsed: false,
    selectedCategory: null,
  });

  const setCurrentPage = useCallback((page: Page) => {
    setState((prev) => ({ ...prev, currentPage: page }));
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState((prev) => ({ ...prev, sidebarCollapsed: collapsed }));
  }, []);

  const setSelectedCategory = useCallback((category: string | null) => {
    setState((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        setCurrentPage,
        setSidebarCollapsed,
        setSelectedCategory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
