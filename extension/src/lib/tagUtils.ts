// 태그 색상 매핑
export const TAG_COLORS: Record<string, string> = {
  "구매 예정": "bg-green-100 text-green-800 border-green-300",
  "관심 없음": "bg-gray-100 text-gray-800 border-gray-300",
  "비교 중": "bg-blue-100 text-blue-800 border-blue-300",
  "구매 완료": "bg-purple-100 text-purple-800 border-purple-300",
};

export const DEFAULT_TAG_COLOR = "bg-yellow-100 text-yellow-800 border-yellow-300";

export function getTagColor(tag: string): string {
  return TAG_COLORS[tag] || DEFAULT_TAG_COLOR;
}

// 미리 정의된 태그
export const PREDEFINED_TAGS = [
  "구매 예정",
  "관심 없음",
  "비교 중",
  "구매 완료",
];
