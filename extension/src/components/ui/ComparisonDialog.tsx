import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";
import { Chip } from "./Chip";
import { useComparisonTask } from "@/hooks/useComparisonTask";
import { useProducts } from "@/hooks/useProducts";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { useTemplates } from "@/hooks/useTemplates";
import { TemplateDialog } from "./TemplateDialog";
import type { ComparisonTemplate } from "@/types/storage";

interface ComparisonDialogProps {
  open: boolean;
  onClose: () => void;
  category: string;
  productIds: string[];
}

export function ComparisonDialog({
  open,
  onClose,
  category,
  productIds,
}: ComparisonDialogProps) {
  const {
    task,
    startComparison,
    submitCriteria,
  } = useComparisonTask(open); // 모달이 열려있을 때만 폴링

  const { products } = useProducts();
  const { addHistoryItem } = useAnalysisHistory();
  const { templates, addTemplate } = useTemplates();

  // 사용자 기준 입력
  const [criteriaInput, setCriteriaInput] = useState("");
  const [criteriaList, setCriteriaList] = useState<string[]>([]);

  // 템플릿 관련
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateDialogMode, setTemplateDialogMode] = useState<'save' | 'select'>('select');

  // 로딩 상태
  const [isSubmittingCriteria, setIsSubmittingCriteria] = useState(false);

  // 에러 메시지
  const [error, setError] = useState("");

  // 모달이 열릴 때 비교 시작
  useEffect(() => {
    if (open && !task) {
      startComparison(category, productIds);
    }
  }, [open, category, productIds, task, startComparison]);

  // 작업이 완료되면 히스토리 저장 및 모달 자동 닫기
  useEffect(() => {
    console.log("[ComparisonDialog] useEffect triggered - task status:", task?.status, "has report:", !!task?.report);

    if (task?.status === "completed" && task.report) {
      console.log("[ComparisonDialog] ✅ Task completed with report, preparing to save history");

      // 히스토리에 저장
      const saveHistory = async () => {
        try {
          const selectedProducts = products.filter((p) => productIds.includes(p.id));

          console.log("[ComparisonDialog] Selected products for history:", {
            requestedIds: productIds,
            foundCount: selectedProducts.length,
            products: selectedProducts.map(p => ({ id: p.id, title: p.title })),
          });

          console.log("[ComparisonDialog] Calling addHistoryItem with:", {
            category: task.category,
            productCount: selectedProducts.length,
            criteriaCount: task.report!.user_criteria.length,
            hasReport: !!task.report,
          });

          const historyItem = await addHistoryItem({
            category: task.category,
            productCount: selectedProducts.length,
            products: selectedProducts,
            criteria: task.report!.user_criteria,
            reportData: task.report,
          });

          console.log("[ComparisonDialog] ✅ History saved successfully with ID:", historyItem.id);
        } catch (error) {
          console.error("[ComparisonDialog] ❌ Failed to save history:", error);
        }
      };

      saveHistory();

      setTimeout(() => {
        onClose();
        // 상태 초기화
        setCriteriaInput("");
        setCriteriaList([]);
        setError("");
      }, 2000);
    }
  }, [task?.status, task?.report, task?.category, products, productIds, addHistoryItem, onClose]);

  // Step 1: 기준 추가
  const handleAddCriteria = () => {
    const trimmed = criteriaInput.trim();
    if (trimmed && !criteriaList.includes(trimmed)) {
      setCriteriaList([...criteriaList, trimmed]);
      setCriteriaInput("");
    }
  };

  // Step 1: 기준 제거
  const handleRemoveCriteria = (criterion: string) => {
    setCriteriaList(criteriaList.filter((c) => c !== criterion));
  };

  // 기준 전송 및 비교 진행
  const handleSubmitCriteria = async () => {
    if (criteriaList.length === 0) {
      setError("최소 1개 이상의 비교 기준을 입력해주세요");
      return;
    }

    setError("");
    setIsSubmittingCriteria(true);
    try {
      const result = await submitCriteria(criteriaList);
      if (!result.success) {
        setError(result.error || "기준 전송에 실패했습니다");
      }
    } finally {
      setIsSubmittingCriteria(false);
    }
  };

  // 템플릿 선택 핸들러
  const handleSelectTemplate = (template: ComparisonTemplate) => {
    // 템플릿의 기준을 기준 목록으로 설정
    setCriteriaList(template.priorities);  // 기존 priorities 필드 재사용 (기준 리스트 의미)
    setShowTemplateDialog(false);
  };

  // 템플릿 저장 핸들러
  const handleSaveAsTemplate = async (template: Omit<ComparisonTemplate, "id" | "createdAt" | "updatedAt">) => {
    try {
      await addTemplate(template);
      alert("템플릿이 저장되었습니다");
    } catch (error) {
      alert("템플릿 저장에 실패했습니다");
    }
  };

  // 현재 단계 렌더링
  const renderContent = () => {
    if (!task) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-primary-600">비교 분석을 준비하고 있습니다...</p>
        </div>
      );
    }

    if (task.status === "failed") {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-primary-800 mb-2">분석 실패</p>
          <p className="text-sm text-primary-600">{task.error || "알 수 없는 오류"}</p>
          <Button onClick={onClose} className="mt-4">
            닫기
          </Button>
        </div>
      );
    }

    if (task.status === "completed") {
      return (
        <div className="text-center py-8">
          <div className="text-green-600 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-primary-800 mb-2">비교 완료!</p>
          <p className="text-sm text-primary-600">
            새 탭에서 비교 결과를 확인하세요
          </p>
        </div>
      );
    }

    // Step 1: 비교 기준 입력
    if (task.status === "step1") {
      // 로딩 중일 때
      if (isSubmittingCriteria) {
        return (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm font-semibold text-primary-800 mb-2">
              기준을 전송하고 있습니다
            </p>
            <p className="text-sm text-primary-600">잠시만 기다려주세요...</p>
          </div>
        );
      }

      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-primary-800 mb-2">
              비교 기준 입력
            </h3>
            <p className="text-sm text-primary-600 mb-4">
              제품 비교 시 중요하게 생각하는 기준을 입력하세요
              <br />
              예: 성능, 가격, 배터리, 디자인, 무게
            </p>

            {/* 템플릿 불러오기 버튼 */}
            {templates.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTemplateDialogMode('select');
                  setShowTemplateDialog(true);
                }}
                className="mb-3 w-full"
              >
                템플릿 불러오기 ({templates.length}개)
              </Button>
            )}

            {/* 기준 입력 */}
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="비교 기준 입력 (예: 성능)"
                value={criteriaInput}
                onChange={(e) => setCriteriaInput(e.target.value)}
                onKeyDown={(e) => {
                  // 한글 입력(IME) 중에는 Enter 키 무시
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleAddCriteria();
                  }
                }}
              />
              <Button onClick={handleAddCriteria} size="sm" className="whitespace-nowrap flex-shrink-0">
                추가
              </Button>
            </div>

            {/* 추가된 기준 목록 */}
            {criteriaList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {criteriaList.map((criterion) => (
                  <Chip
                    key={criterion}
                    variant="primary"
                    onRemove={() => handleRemoveCriteria(criterion)}
                  >
                    {criterion}
                  </Chip>
                ))}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmitCriteria}
              disabled={criteriaList.length === 0 || isSubmittingCriteria}
              className="w-full"
            >
              {isSubmittingCriteria ? "전송 중..." : `기준 전송 (${criteriaList.length}개)`}
            </Button>
          </div>
        </div>
      );
    }

    // analyzing 상태 처리
    if (task.status === "analyzing") {
      return (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-primary-800 mb-2">
            제품을 비교 분석하고 있습니다
          </p>
          <p className="text-sm text-primary-600">잠시만 기다려주세요...</p>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Modal open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{category} 제품 비교</ModalTitle>
          </ModalHeader>
          {renderContent()}
        </ModalContent>
      </Modal>

      {/* 템플릿 다이얼로그 */}
      <TemplateDialog
        isOpen={showTemplateDialog}
        mode={templateDialogMode}
        priorities={templateDialogMode === 'save' ? criteriaList : undefined}
        category={category}
        templates={templates}
        onSave={handleSaveAsTemplate}
        onSelect={handleSelectTemplate}
        onClose={() => setShowTemplateDialog(false)}
      />
    </>
  );
}
