import { useState } from "react";
import { Button, Input, Chip, Card } from "@/components/ui";
import { useProductsContext } from "@/context";
import { useChrome } from "@/hooks";

export function ExtractPage() {
  const { recentCategories, recordCategoryUsage } = useProductsContext();
  const { getCurrentTab, sendMessage } = useChrome();
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

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

      setMessage("분석이 시작되었습니다. 완료되면 알림을 받게 됩니다.");
      setCategory("");
    } catch (error) {
      console.error("Extract failed:", error);
      setMessage(
        error instanceof Error ? error.message : "추출에 실패했습니다"
      );
    } finally {
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
    </div>
  );
}
