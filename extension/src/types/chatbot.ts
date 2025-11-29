/**
 * 챗봇 관련 타입 정의
 */

// API Request/Response 타입

export interface ProductContext {
  product_name: string;
  price: string;
  raw_content: string;
}

export interface ChatbotStartRequest {
  category: string;
  products: ProductContext[];
}

export interface ChatbotStartResponse {
  thread_id: string;
  welcome_message: string;
}

export interface ChatbotMessageRequest {
  message: string;
}

export interface ChatbotMessageResponse {
  response: string;
  sources: string[];
}

export interface ChatMessageSchema {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotHistoryResponse {
  messages: ChatMessageSchema[];
}

// SSE 스트림 이벤트 타입

export interface ChatbotStreamTokenEvent {
  type: 'token';
  content: string;
}

export interface ChatbotStreamDoneEvent {
  type: 'done';
  content: string;
  sources: string[];
}

export interface ChatbotStreamErrorEvent {
  type: 'error';
  content: string;
}

export type ChatbotStreamEvent =
  | ChatbotStreamTokenEvent
  | ChatbotStreamDoneEvent
  | ChatbotStreamErrorEvent;

// UI 컴포넌트용 타입

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: string[];
  isStreaming?: boolean;
}

export interface ChatSession {
  threadId: string;
  historyId: string; // 비교분석 히스토리 ID와 연결
  category: string;
  productNames: string[];
  welcomeMessage: string;
  createdAt: number;
  updatedAt: number;
}

// IndexedDB 저장용 (messages는 별도 테이블)
export interface StoredChatSession {
  threadId: string; // PK
  historyId: string; // 비교분석 히스토리 ID
  category: string;
  productNames: string[];
  welcomeMessage: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredChatMessage {
  id: string; // PK
  threadId: string; // FK to ChatSession
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: string[];
}
