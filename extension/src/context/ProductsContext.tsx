import { createContext, useContext, ReactNode } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import type { StoredProduct } from "@/types/storage";

interface ProductsContextType {
  products: StoredProduct[];
  loading: boolean;
  addProduct: (product: Omit<StoredProduct, "id" | "addedAt">) => Promise<StoredProduct>;
  updateProduct: (productId: string, updates: Partial<StoredProduct>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  deleteProducts: (productIds: string[]) => Promise<void>;
  deleteByCategory: (category: string) => Promise<void>;
  getProductsByCategory: (category: string) => StoredProduct[];
  reload: () => Promise<void>;
  allCategories: string[];
  recentCategories: string[];
  categoryHistory: Array<{ category: string; count: number; lastUsed: number }>;
  recordCategoryUsage: (category: string) => Promise<void>;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (categoryName: string) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const productsHook = useProducts();
  const categoriesHook = useCategories(productsHook.products);

  return (
    <ProductsContext.Provider
      value={{
        ...productsHook,
        ...categoriesHook,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProductsContext() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProductsContext must be used within ProductsProvider");
  }
  return context;
}
