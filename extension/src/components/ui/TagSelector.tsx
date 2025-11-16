import { useState } from "react";
import { Button } from "./Button";
import { PREDEFINED_TAGS, getTagColor } from "@/lib/tagUtils";

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
  const [customTagInput, setCustomTagInput] = useState("");

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      onTagsChange([...selectedTags, trimmed]);
      setCustomTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-3">
      {/* 미리 정의된 태그 */}
      <div>
        <label className="block text-sm font-medium text-primary-700 mb-2">
          미리 정의된 태그
        </label>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => handleToggleTag(tag)}
                className={`px-3 py-1 rounded-md text-sm border transition-colors ${
                  isSelected
                    ? getTagColor(tag)
                    : "bg-white text-primary-600 border-warm-300 hover:bg-warm-50"
                }`}
              >
                {isSelected && "✓ "}
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* 커스텀 태그 입력 */}
      <div>
        <label className="block text-sm font-medium text-primary-700 mb-2">
          커스텀 태그
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleAddCustomTag();
              }
            }}
            placeholder="새 태그 입력..."
            className="flex-1 px-3 py-2 text-sm border border-warm-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddCustomTag}
            disabled={!customTagInput.trim()}
          >
            추가
          </Button>
        </div>
      </div>

      {/* 선택된 태그 */}
      {selectedTags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-2">
            선택된 태그
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm border ${getTagColor(
                  tag
                )}`}
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:opacity-70"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
