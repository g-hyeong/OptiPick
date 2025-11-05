import { useApp } from "@/context";
import { Button } from "@/components/ui";

export function Header() {
  const { state, setCurrentPage } = useApp();

  return (
    <header className="h-14 bg-white border-b border-warm-200 flex items-center px-6 gap-4 overflow-x-hidden min-w-0">
      {/* 네비게이션 버튼 */}
      <nav className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant={state.currentPage === "extract" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setCurrentPage("extract")}
        >
          추출
        </Button>
        <Button
          variant={state.currentPage === "products" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setCurrentPage("products")}
        >
          제품 목록
        </Button>
        <Button
          variant={state.currentPage === "compare" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setCurrentPage("compare")}
        >
          비교
        </Button>
      </nav>

      {/* 우측 영역 (확장 가능) */}
      <div className="ml-auto flex items-center gap-2">
        {/* 추후 설정 버튼 등 추가 가능 */}
      </div>
    </header>
  );
}
