import { createContext, useContext, ReactNode } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import type { StoredProduct } from "@/types/storage";

interface ProductsContextType {
  products: StoredProduct[];
  loading: boolean;
  addProduct: (product: Omit<StoredProduct, "id" | "addedAt">) => Promise<StoredProduct>;
  deleteProduct: (productId: string) => Promise<void>;
  getProductsByCategory: (category: string) => StoredProduct[];
  reload: () => Promise<void>;
  allCategories: string[];
  recentCategories: string[];
  recordCategoryUsage: (category: string) => Promise<void>;
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
