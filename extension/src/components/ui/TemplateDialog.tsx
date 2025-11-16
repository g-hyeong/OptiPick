import { useState, useEffect } from "react";
import { ComparisonTemplate } from "@/types/storage";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
} from "./Modal";
import { Button } from "./Button";

interface TemplateDialogProps {
  isOpen: boolean;
  mode: 'save' | 'select';
  priorities?: string[];
  category?: string;
  templates?: ComparisonTemplate[];
  onSave?: (template: Omit<ComparisonTemplate, "id" | "createdAt" | "updatedAt">) => void;
  onSelect?: (template: ComparisonTemplate) => void;
  onClose: () => void;
}

export function TemplateDialog({
  isOpen,
  mode,
  priorities = [],
  category,
  templates = [],
  onSave,
  onSelect,
  onClose,
}: TemplateDialogProps) {
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState(category || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && mode === 'save') {
      setTemplateName("");
      setTemplateCategory(category || "");
    }
  }, [isOpen, mode, category]);

  const handleSave = () => {
    if (!templateName.trim()) {
      alert("템플릿 이름을 입력하세요");
      return;
    }

    if (onSave) {
      onSave({
        name: templateName.trim(),
        category: templateCategory.trim() || undefined,
        priorities,
      });
    }

    onClose();
  };

  const handleSelect = () => {
    if (!selectedTemplateId) {
      alert("템플릿을 선택하세요");
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplateId);
    if (template && onSelect) {
      onSelect(template);
    }

    onClose();
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {mode === 'save' ? "템플릿 저장" : "템플릿 선택"}
          </ModalTitle>
        </ModalHeader>

        <div className="p-4">
          {mode === 'save' ? (
            <>
              {/* 저장 모드 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">
                    템플릿 이름 *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="예: 노트북 성능 비교"
                    className="w-full px-3 py-2 border border-warm-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">
                    카테고리 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    placeholder="예: 노트북"
                    className="w-full px-3 py-2 border border-warm-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    저장할 우선순위:
                  </label>
                  <div className="bg-warm-50 p-3 rounded-md border border-warm-200">
                    {priorities.length > 0 ? (
                      <ol className="list-decimal list-inside space-y-1">
                        {priorities.map((p, idx) => (
                          <li key={idx} className="text-sm text-primary-800">
                            {p}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm text-primary-500">선택된 우선순위가 없습니다</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 선택 모드 */}
              <div className="space-y-3">
                {templates.length === 0 ? (
                  <p className="text-sm text-primary-500 text-center py-4">
                    저장된 템플릿이 없습니다
                  </p>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedTemplateId === template.id
                          ? "border-primary-500 bg-primary-50"
                          : "border-warm-200 hover:bg-warm-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-primary-800">{template.name}</h4>
                          {template.category && (
                            <p className="text-xs text-primary-600 mt-1">
                              카테고리: {template.category}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {template.priorities.slice(0, 3).map((p, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded"
                              >
                                {idx + 1}. {p}
                              </span>
                            ))}
                            {template.priorities.length > 3 && (
                              <span className="text-xs px-2 py-1 text-primary-600">
                                +{template.priorities.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                        <input
                          type="radio"
                          checked={selectedTemplateId === template.id}
                          onChange={() => setSelectedTemplateId(template.id)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {mode === 'save' ? "취소" : "닫기"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={mode === 'save' ? handleSave : handleSelect}
            disabled={mode === 'select' && !selectedTemplateId}
          >
            {mode === 'save' ? "저장" : "선택"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
