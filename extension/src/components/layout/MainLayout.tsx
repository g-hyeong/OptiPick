import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="w-full h-full flex overflow-hidden bg-warm-50 box-border">
      {/* 좌측 사이드바 */}
      <Sidebar />

      {/* 우측 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-x-hidden overflow-y-auto min-w-0 box-border">
        {/* 상단 헤더 */}
        <Header />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-x-hidden box-border">
          {children}
        </main>
      </div>
    </div>
  );
}
