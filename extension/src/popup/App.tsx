import { AppProvider, ProductsProvider, useApp } from "@/context";
import { MainLayout } from "@/components/layout";
import { ExtractPage, ProductsPage, ComparePage } from "@/pages";
import { ToastProvider, ToastViewport } from "@/components/ui";

function AppContent() {
  const { state } = useApp();

  // 현재 페이지에 따라 렌더링
  const renderPage = () => {
    switch (state.currentPage) {
      case "extract":
        return <ExtractPage />;
      case "products":
        return <ProductsPage />;
      case "compare":
        return <ComparePage />;
      default:
        return <ExtractPage />;
    }
  };

  return (
    <MainLayout>
      {renderPage()}
    </MainLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <ProductsProvider>
          <AppContent />
          <ToastViewport />
        </ProductsProvider>
      </AppProvider>
    </ToastProvider>
  );
}
