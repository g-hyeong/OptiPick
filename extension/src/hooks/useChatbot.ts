/**
 * 챗봇 상태 관리 Hook
 */

import { useState, useCallback } from 'react';
import {
  startChatbot,
  streamChatMessage,
  endChatbot,
} from '@/utils/api';
import {
  getChatSessionByHistoryId,
  getChatSessionsByHistoryId,
  getChatMessages,
  getChatSession,
  saveChatSession,
  saveChatMessage,
  updateChatMessage,
  toUIChatMessage,
  toStoredChatMessage,
} from '@/utils/chatStorage';
import type {
  ChatMessage,
  ProductContext,
  StoredChatSession,
} from '@/types/chatbot';

// UUID 생성 유틸
function generateId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// 세션 요약 타입 (UI용)
export interface ChatSessionSummary {
  threadId: string;
  firstMessage: string; // 첫 번째 사용자 메시지 또는 '새 채팅'
  updatedAt: number;
  messageCount: number;
}

interface UseChatbotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  threadId: string | null;
  isOpen: boolean;
  welcomeMessage: string | null;
  isRestored: boolean;
  sessions: ChatSessionSummary[]; // 현재 historyId의 모든 세션

  // Actions
  startSession: (products: ProductContext[], category: string, historyId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  endSession: () => Promise<void>;
  toggleSidebar: () => void;
  clearError: () => void;
  startNewChat: () => Promise<void>; // 새 채팅 시작
  switchSession: (targetThreadId: string) => Promise<void>; // 세션 전환
  loadSessions: () => Promise<void>; // 세션 목록 로드
}

// 컨텍스트 저장용 (새 채팅 시 필요)
let currentContext: {
  products: ProductContext[];
  category: string;
  historyId: string;
} | null = null;

export function useChatbot(): UseChatbotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);

  /**
   * 세션 목록 로드
   */
  const loadSessions = useCallback(async () => {
    if (!currentContext?.historyId) return;

    try {
      const allSessions = await getChatSessionsByHistoryId(currentContext.historyId);
      const summaries: ChatSessionSummary[] = [];

      for (const session of allSessions) {
        const msgs = await getChatMessages(session.threadId);
        const firstUserMsg = msgs.find(m => m.role === 'user');
        summaries.push({
          threadId: session.threadId,
          firstMessage: firstUserMsg?.content.slice(0, 30) || '새 채팅',
          updatedAt: session.updatedAt,
          messageCount: msgs.length,
        });
      }

      setSessions(summaries);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }, []);

  /**
   * 세션 전환
   */
  const switchSession = useCallback(async (targetThreadId: string) => {
    try {
      const session = await getChatSession(targetThreadId);
      if (!session) return;

      const storedMessages = await getChatMessages(targetThreadId);
      const uiMessages = storedMessages.map(toUIChatMessage);

      setThreadId(session.threadId);
      setWelcomeMessage(session.welcomeMessage);
      setMessages(uiMessages);
      setIsRestored(true);
    } catch (err) {
      console.error('Failed to switch session:', err);
    }
  }, []);

  /**
   * 기존 세션 복원 시도
   */
  const restoreSession = useCallback(async (targetHistoryId: string): Promise<boolean> => {
    try {
      const existingSession = await getChatSessionByHistoryId(targetHistoryId);

      if (existingSession) {
        const storedMessages = await getChatMessages(existingSession.threadId);
        const uiMessages = storedMessages.map(toUIChatMessage);

        setThreadId(existingSession.threadId);
        setWelcomeMessage(existingSession.welcomeMessage);
        setMessages(uiMessages);
        setIsRestored(true);
        setIsOpen(true);

        // 세션 목록도 로드
        await loadSessions();

        return true;
      }

      return false;
    } catch (err) {
      console.error('Failed to restore chat session:', err);
      return false;
    }
  }, [loadSessions]);

  /**
   * 새 채팅 시작 (API 호출)
   */
  const createNewSession = useCallback(async () => {
    if (!currentContext) return;

    const { products, category, historyId } = currentContext;

    try {
      setIsLoading(true);
      setError(null);

      const response = await startChatbot({
        category,
        products,
      });

      const productNames = products.map(p => p.product_name);
      const newSession: StoredChatSession = {
        threadId: response.thread_id,
        historyId,
        category,
        productNames,
        welcomeMessage: response.welcome_message,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveChatSession(newSession);

      setThreadId(response.thread_id);
      setWelcomeMessage(response.welcome_message);
      setMessages([]);
      setIsRestored(false);
      setIsOpen(true);

      // 세션 목록 갱신
      await loadSessions();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start chatbot session';
      setError(errorMessage);
      console.error('Chatbot start error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadSessions]);

  /**
   * 새 채팅 버튼 클릭 시
   */
  const startNewChat = useCallback(async () => {
    await createNewSession();
  }, [createNewSession]);

  /**
   * 챗봇 세션 시작 (페이지 로드 시)
   */
  const startSession = useCallback(
    async (products: ProductContext[], category: string, historyId: string) => {
      // 컨텍스트 저장
      currentContext = { products, category, historyId };

      // 기존 세션 복원 시도
      const restored = await restoreSession(historyId);
      if (restored) {
        return;
      }

      // 새 세션 시작
      await createNewSession();
    },
    [restoreSession, createNewSession]
  );

  /**
   * 메시지 전송 (스트리밍)
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!threadId || !message.trim()) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: message.trim(),
        timestamp: Date.now(),
      };

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);
      setError(null);

      await saveChatMessage(toStoredChatMessage(userMessage, threadId));

      try {
        let accumulatedContent = '';
        let sources: string[] = [];

        for await (const event of streamChatMessage(threadId, message)) {
          if (event.type === 'token') {
            accumulatedContent += event.content;

            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: accumulatedContent,
                };
              }
              return updated;
            });
          } else if (event.type === 'done') {
            sources = event.sources || [];

            setMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: accumulatedContent,
                  sources,
                  isStreaming: false,
                };
              }
              return updated;
            });

            const finalAssistantMessage: ChatMessage = {
              ...assistantMessage,
              content: accumulatedContent,
              sources,
              isStreaming: false,
            };
            await saveChatMessage(toStoredChatMessage(finalAssistantMessage, threadId));

            // 세션 목록 갱신 (첫 메시지가 추가됐을 수 있음)
            await loadSessions();
          } else if (event.type === 'error') {
            throw new Error(event.content);
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        console.error('Chatbot message error:', err);

        const errorContent = '응답 생성 중 오류가 발생했습니다.';
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
            updated[updated.length - 1] = {
              ...lastMsg,
              content: errorContent,
              isStreaming: false,
            };
          }
          return updated;
        });

        await updateChatMessage(assistantMessage.id, {
          content: errorContent,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [threadId, loadSessions]
  );

  /**
   * 세션 종료
   */
  const endSession = useCallback(async () => {
    if (threadId) {
      try {
        await endChatbot(threadId);
      } catch (err) {
        console.error('Failed to end chatbot session:', err);
      }
    }

    setThreadId(null);
    setMessages([]);
    setWelcomeMessage(null);
    setIsRestored(false);
    setIsOpen(false);
    setSessions([]);
    currentContext = null;
  }, [threadId]);

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    threadId,
    isOpen,
    welcomeMessage,
    isRestored,
    sessions,
    startSession,
    sendMessage,
    endSession,
    toggleSidebar,
    clearError,
    startNewChat,
    switchSession,
    loadSessions,
  };
}
