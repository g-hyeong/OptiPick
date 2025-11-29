/**
 * 챗봇 입력창 컴포넌트
 */

import { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui';

// Send 아이콘 SVG
const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = '메시지를 입력하세요...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInput('');

      // 높이 초기화
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter로 전송 (Shift+Enter는 줄바꿈)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // 자동 높이 조절
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t bg-white">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 min-h-[40px] max-h-[150px] resize-none py-2.5 px-3 text-sm border border-warm-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <Button
        size="sm"
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="shrink-0 h-10 w-10 p-0"
      >
        <SendIcon />
      </Button>
    </div>
  );
}
