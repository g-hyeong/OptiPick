/**
 * 챗봇 사이드바 컴포넌트
 */

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType } from '@/types/chatbot';
import type { ChatSessionSummary } from '@/hooks/useChatbot';

// 아이콘 SVG
const MessageCircleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

const ChevronRightIcon = () => (
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
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const XIcon = () => (
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
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const PlusIcon = () => (
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
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const HistoryIcon = () => (
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
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessageType[];
  welcomeMessage: string | null;
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onClearError: () => void;
  // 새로 추가된 props
  sessions: ChatSessionSummary[];
  currentThreadId: string | null;
  onNewChat: () => void;
  onSwitchSession: (threadId: string) => void;
}

// 리사이즈 관련 상수
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const CLOSE_THRESHOLD = 150; // 이 너비 이하로 줄이면 자동으로 닫힘

export function ChatSidebar({
  isOpen,
  onToggle,
  messages,
  welcomeMessage,
  isLoading,
  error,
  onSendMessage,
  onClearError,
  sessions,
  currentThreadId,
  onNewChat,
  onSwitchSession,
}: ChatSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  // 리사이즈 관련 상태
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 리사이즈 핸들러
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 오른쪽 고정 사이드바이므로 window.innerWidth - mouseX가 새 너비
      const newWidth = window.innerWidth - e.clientX;

      // 닫기 임계값 이하면 자동으로 닫기
      if (newWidth < CLOSE_THRESHOLD) {
        setIsResizing(false);
        setWidth(DEFAULT_WIDTH); // 다음에 열 때를 위해 기본값 복원
        onToggle();
        return;
      }

      // 최소/최대 범위 내로 제한
      setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    // 리사이즈 중 텍스트 선택 방지
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onToggle]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // 새 메시지 시 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 닫힌 상태: 토글 버튼만 표시
  if (!isOpen) {
    return (
      <Button
        variant="primary"
        size="lg"
        onClick={onToggle}
        className="fixed right-4 bottom-4 z-50 h-14 w-14 rounded-full shadow-lg p-0"
      >
        <MessageCircleIcon />
      </Button>
    );
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className={cn(
        'fixed right-0 top-0 z-50 h-full bg-white border-l border-warm-200 shadow-xl',
        'flex flex-col',
        !isResizing && 'transition-[width] duration-150'
      )}
    >
      {/* 리사이즈 핸들 */}
      <div
        onMouseDown={handleResizeStart}
        className={cn(
          'absolute left-0 top-0 h-full w-1 cursor-ew-resize z-10',
          'hover:bg-primary-300 active:bg-primary-400',
          'transition-colors duration-150',
          isResizing && 'bg-primary-400'
        )}
      />

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-100 bg-warm-50">
        <div className="flex items-center gap-2">
          <span className="text-primary-500">
            <MessageCircleIcon />
          </span>
          <h2 className="font-semibold text-sm text-primary-800">제품 비교 어시스턴트</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* 새 채팅 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            disabled={isLoading}
            className="h-8 w-8 p-0"
            title="새 채팅"
          >
            <PlusIcon />
          </Button>
          {/* 히스토리 버튼 */}
          {sessions.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={cn('h-8 w-8 p-0', showHistory && 'bg-warm-200')}
              title="채팅 기록"
            >
              <HistoryIcon />
            </Button>
          )}
          {/* 닫기 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      {/* 히스토리 드롭다운 */}
      {showHistory && sessions.length > 1 && (
        <div className="border-b border-warm-100 bg-warm-50/50 max-h-48 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.threadId}
              type="button"
              onClick={() => {
                onSwitchSession(session.threadId);
                setShowHistory(false);
              }}
              className={cn(
                'w-full px-4 py-2 text-left text-sm hover:bg-warm-100 transition-colors',
                'flex items-center justify-between',
                session.threadId === currentThreadId && 'bg-primary-50 border-l-2 border-primary-500'
              )}
            >
              <span className="truncate flex-1 text-primary-700">
                {session.firstMessage}
              </span>
              <span className="text-xs text-primary-400 ml-2 shrink-0">
                {formatTime(session.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="mx-3 mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearError}
            className="h-6 w-6 p-0 text-red-700 hover:bg-red-100"
          >
            <XIcon />
          </Button>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 환영 메시지 */}
        {welcomeMessage && messages.length === 0 && (
          <div className="mb-4 p-4 bg-warm-50 rounded-lg border border-warm-100">
            <div className="text-sm text-primary-700 prose prose-sm prose-primary max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="my-1">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="my-2 ml-4 list-disc space-y-0.5">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-primary-600">{children}</li>
                  ),
                }}
              >
                {welcomeMessage}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* 스크롤 앵커 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <ChatInput
        onSend={onSendMessage}
        disabled={isLoading}
        placeholder={isLoading ? '응답 생성 중...' : '질문을 입력하세요...'}
      />
    </div>
  );
}
