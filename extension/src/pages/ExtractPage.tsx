import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Input, Chip, Card } from "@/components/ui";
import { DuplicateProductDialog } from "@/components/ui/DuplicateProductDialog";
import { useProductsContext } from "@/context";
import { useChrome } from "@/hooks";
import type { StoredProduct } from "@/types/storage";

export function ExtractPage() {
  const { recentCategories, recordCategoryUsage } = useProductsContext();
  const { getCurrentTab, sendMessage } = useChrome();
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // 중복 감지 관련 상태
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateProduct, setDuplicateProduct] = useState<StoredProduct | null>(null);
  const pollingRef = useRef<number | null>(null);

  // 폴링 중지 헬퍼
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Task 상태 폴링 함수
  const pollTaskState = useCallback(async (options?: { onComplete?: () => void }) => {
    try {
      const response = await sendMessage<{ success: boolean; task?: { status: string; message?: string; error?: string } }>({ type: "GET_TASK_STATE" });
      if (response.success && response.task) {
        const task = response.task;

        // 중복 감지 대기 상태
        if (task.status === "waiting_duplicate_choice") {
          // 메시지 API로 duplicateCheckData 요청
          const dupResponse = await sendMessage<{ success: boolean; data?: { duplicateProduct: StoredProduct } }>({ type: "GET_DUPLICATE_DATA" });
          if (dupResponse.success && dupResponse.data) {
            setDuplicateProduct(dupResponse.data.duplicateProduct);
            setShowDuplicateDialog(true);
            setMessage("중복된 제품이 발견되었습니다.");
            stopPolling();
          }
        } else if (task.status === "completed") {
          setMessage(task.message || "제품 추출이 완료되었습니다.");
          setLoading(false);
          stopPolling();
          options?.onComplete?.();
        } else if (task.status === "failed") {
          setMessage(task.error || "제품 추출에 실패했습니다.");
          setLoading(false);
          stopPolling();
        }
      }
    } catch (error) {
      console.error("Failed to poll task state:", error);
    }
  }, [sendMessage, stopPolling]);

  // 폴링 시작 헬퍼
  const startPolling = useCallback((options?: { onComplete?: () => void }) => {
    stopPolling();
    pollTaskState(options);
    pollingRef.current = window.setInterval(() => pollTaskState(options), 1000);
  }, [pollTaskState, stopPolling]);

  // Task 상태 폴링
  useEffect(() => {
    if (loading && !pollingRef.current) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [loading, startPolling, stopPolling]);

  const handleExtract = async () => {
    if (!category.trim()) {
      setMessage("카테고리를 입력해주세요");
      return;
    }

    try {
      setLoading(true);
      setMessage("제품을 추출하고 있습니다...");

      const tab = await getCurrentTab();
      if (!tab?.id) {
        throw new Error("현재 탭을 찾을 수 없습니다");
      }

      // Background worker에 분석 요청
      await sendMessage({
        type: "START_ANALYSIS",
        category: category.trim(),
        tabId: tab.id,
      });

      // 카테고리 사용 기록
      await recordCategoryUsage(category.trim());
    } catch (error) {
      console.error("Extract failed:", error);
      setMessage(
        error instanceof Error ? error.message : "추출에 실패했습니다"
      );
      setLoading(false);
    }
  };

  const handleDuplicateChoice = async (choice: "update" | "save_new" | "cancel") => {
    setShowDuplicateDialog(false);

    if (choice === "cancel") {
      setMessage("제품 추출이 취소되었습니다.");
      setLoading(false);
      setCategory("");
      return;
    }

    try {
      setLoading(true);
      setMessage(
        choice === "update"
          ? "기존 제품을 업데이트하고 있습니다..."
          : "새 제품으로 저장하고 있습니다..."
      );

      // Background로 선택 전송
      await sendMessage({
        type: "DUPLICATE_CHOICE",
        choice,
      });

      // 폴링 재시작 (완료 대기)
      startPolling({ onComplete: () => setCategory("") });
    } catch (error) {
      console.error("Failed to send duplicate choice:", error);
      setMessage("선택 전송에 실패했습니다.");
      setLoading(false);
    }
  };

  const handleCategoryChipClick = (cat: string) => {
    setCategory(cat);
  };

  return (
    <div className="p-4 space-y-4 w-full">
      <div>
        <h1 className="text-2xl font-bold text-primary-800 mb-2">상품 추출</h1>
        <p className="text-sm text-primary-600">
          현재 페이지의 제품 정보를 추출합니다
        </p>
      </div>

      <Card>
        <div className="space-y-3">
          {/* 최근 카테고리 */}
          {recentCategories.length > 0 && (
            <div>
              <label className="text-sm font-medium text-primary-700 mb-2 block">
                최근 사용 카테고리
              </label>
              <div className="flex flex-wrap gap-2">
                {recentCategories.map((cat) => (
                  <Chip
                    key={cat}
                    variant="primary"
                    clickable
                    onClick={() => handleCategoryChipClick(cat)}
                  >
                    {cat}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {/* 카테고리 입력 */}
          <div>
            <label
              htmlFor="category"
              className="text-sm font-medium text-primary-700 mb-2 block"
            >
              카테고리
            </label>
            <Input
              id="category"
              placeholder="예: 노트북, 스마트폰, 헤드폰"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleExtract();
                }
              }}
            />
          </div>

          {/* 추출 버튼 */}
          <Button
            onClick={handleExtract}
            disabled={loading || !category.trim()}
            className="w-full"
          >
            {loading ? "추출 중..." : "현재 페이지 추출"}
          </Button>

          {/* 메시지 */}
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.includes("실패") || message.includes("없습니다")
                  ? "bg-red-50 text-red-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </Card>

      {/* 안내 */}
      <Card className="bg-warm-100 border-warm-300">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-semibold text-primary-800">
            사용 방법
          </h3>
          <span className="text-primary-600 text-sm">
            {showHelp ? "▲" : "▼"}
          </span>
        </button>
        {showHelp && (
          <ul className="text-xs text-primary-700 space-y-1 mt-3">
            <li>• 제품 페이지로 이동한 후 카테고리를 입력하세요</li>
            <li>• 최근 사용한 카테고리는 클릭하여 빠르게 선택할 수 있습니다</li>
            <li>• 추출된 제품은 자동으로 저장됩니다</li>
          </ul>
        )}
      </Card>

      {/* 중복 제품 다이얼로그 */}
      {duplicateProduct && (
        <DuplicateProductDialog
          isOpen={showDuplicateDialog}
          existingProduct={duplicateProduct}
          onChoice={handleDuplicateChoice}
        />
      )}
    </div>
  );
}
