import { useEffect } from "react";
import { useCompareState, useChatbot } from "@/hooks";
import { CompareTable, CompareToolbar } from "@/components/compare";
import { ChatSidebar } from "@/components/chatbot";
import { Card } from "@/components/ui";
import type { ProductContext } from "@/types/chatbot";

export function CompareReportPage() {
  // URL 파라미터에서 historyId 추출
  const urlParams = new URLSearchParams(window.location.search);
  const historyId = urlParams.get("historyId");

  const {
    state: { report, products, loading, error, criteriaOrder },
    actions: {
      toggleCriterion,
      reorderProducts,
      reorderCriteria,
      hideProduct,
      showProduct,
      getProductData,
      getProductInfo,
      isUserCriterion,
    },
    orderedVisibleProducts,
    orderedVisibleCriteria,
    hiddenProducts,
  } = useCompareState(historyId);

  // 챗봇 상태
  const chatbot = useChatbot();

  // 리포트 로드 시 챗봇 세션 시작
  useEffect(() => {
    if (report && products.length > 0 && historyId && !chatbot.threadId) {
      // 제품 컨텍스트 변환
      const productContexts: ProductContext[] = products.map((p) => ({
        product_name: p.fullAnalysis?.product_name || p.title,
        price: p.price,
        raw_content: p.rawContent || "",
      }));

      chatbot.startSession(productContexts, report.category, historyId);
    }
  }, [report, products, historyId]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-primary-600 text-sm">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !report) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-50">!</div>
          <p className="text-primary-600 text-sm">
            {error || "데이터를 찾을 수 없습니다"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="max-w-[1400px] mx-auto">
        {/* 헤더 - 간소화 */}
        <header className="px-6 py-5 border-b border-warm-100 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary-800">
                SmartCompare
              </h1>
              <p className="text-sm text-primary-500 mt-0.5">
                {report.category} · {report.total_products}개 제품 비교
              </p>
            </div>

            {/* 사용자 입력 기준 */}
            {report.user_criteria.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary-500">사용자 기준:</span>
                <div className="flex gap-1.5">
                  {report.user_criteria.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                  {report.user_criteria.length > 3 && (
                    <span className="text-xs text-primary-500">
                      +{report.user_criteria.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 추출 불가능한 기준 안내 */}
        {report.unavailable_criteria.length > 0 && (
          <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              <span className="font-medium">추출 불가:</span>{" "}
              {report.unavailable_criteria.join(", ")}
            </p>
          </div>
        )}

        {/* 툴바 - 기준 필터 + 숨긴 제품 */}
        <CompareToolbar
          allCriteria={criteriaOrder}
          visibleCriteria={orderedVisibleCriteria}
          hiddenProducts={hiddenProducts}
          onCriteriaToggle={toggleCriterion}
          onProductRestore={showProduct}
          isUserCriterion={isUserCriterion}
        />

        {/* 메인 테이블 */}
        <div className="p-6">
          <Card className="overflow-hidden p-0">
            <CompareTable
              productOrder={orderedVisibleProducts}
              criteriaOrder={orderedVisibleCriteria}
              getProductInfo={getProductInfo}
              getProductData={getProductData}
              onProductReorder={reorderProducts}
              onCriteriaReorder={reorderCriteria}
              onProductHide={hideProduct}
              isUserCriterion={isUserCriterion}
            />
          </Card>
        </div>

        {/* 종합평 */}
        <div className="px-6 pb-8">
          <Card className="bg-primary-50/50 border-primary-100">
            <h2 className="text-sm font-semibold text-primary-700 mb-2">
              종합평
            </h2>
            <p className="text-sm text-primary-600 leading-relaxed">
              {report.summary}
            </p>
          </Card>
        </div>
      </div>

      {/* 챗봇 사이드바 */}
      <ChatSidebar
        isOpen={chatbot.isOpen}
        onToggle={chatbot.toggleSidebar}
        messages={chatbot.messages}
        welcomeMessage={chatbot.welcomeMessage}
        isLoading={chatbot.isLoading}
        error={chatbot.error}
        onSendMessage={chatbot.sendMessage}
        onClearError={chatbot.clearError}
        sessions={chatbot.sessions}
        currentThreadId={chatbot.threadId}
        onNewChat={chatbot.startNewChat}
        onSwitchSession={chatbot.switchSession}
      />
    </div>
  );
}
