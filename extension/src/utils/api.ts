import type {
  ProductAnalysisRequest,
  ProductAnalysisResponse,
  ComparisonStartRequest,
  ComparisonStartResponse,
  ComparisonContinueRequest,
  ComparisonContinueResponse,
} from '@/types/content';
import type {
  ChatbotStartRequest,
  ChatbotStartResponse,
  ChatbotMessageRequest,
  ChatbotMessageResponse,
  ChatbotHistoryResponse,
  ChatbotStreamEvent,
} from '@/types/chatbot';

/**
 * Agent API 엔드포인트
 */
const AGENT_ENDPOINT = import.meta.env.VITE_AGENT_ENDPOINT;

/**
 * 상품 분석 API 호출
 */
export async function analyzeProduct(
  request: ProductAnalysisRequest
): Promise<ProductAnalysisResponse> {
  if (!AGENT_ENDPOINT) {
    throw new Error('VITE_AGENT_ENDPOINT is not configured');
  }

  const url = `${AGENT_ENDPOINT}/graphs/summarize-page`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * 비교 분석 시작 API 호출
 */
export async function startComparison(
  request: ComparisonStartRequest
): Promise<ComparisonStartResponse> {
  if (!AGENT_ENDPOINT) {
    throw new Error('VITE_AGENT_ENDPOINT is not configured');
  }

  const url = `${AGENT_ENDPOINT}/graphs/compare-products/start`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * 비교 분석 계속 API 호출
 */
export async function continueComparison(
  threadId: string,
  request: ComparisonContinueRequest
): Promise<ComparisonContinueResponse> {
  if (!AGENT_ENDPOINT) {
    throw new Error('VITE_AGENT_ENDPOINT is not configured');
  }

  const url = `${AGENT_ENDPOINT}/graphs/compare-products/${threadId}/continue`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// ========== Chatbot API ==========

/**
 * 챗봇 세션 시작
 */
export async function startChatbot(
  request: ChatbotStartRequest
): Promise<ChatbotStartResponse> {
  if (!AGENT_ENDPOINT) {
    throw new Error('VITE_AGENT_ENDPOINT is not configured');
  }

  const url = `${AGENT_ENDPOINT}/graphs/chatbot/start`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * 챗봇 메시지 전송 (일반 응답)
 */
export async function sendChatMessage(
  threadId: string,
  request: ChatbotMessageRequest
): Promise<ChatbotMessageResponse> {
  if (!AGENT_ENDPOINT) {
    throw new Error('VITE_AGENT_ENDPOINT is not configured');
  }

  const url = `${AGENT_ENDPOINT}/graphs/chatbot/${threadId}/message`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * 챗봇 스트리밍 메시지 전송 (SSE)
 */
export async function* streamChatMessage(
  threadId: string,
  message: string
): AsyncGenerator<ChatbotStreamEvent, void, unknown> {
  if (!AGENT_ENDPOINT) {
    throw new Error('VITE_AGENT_ENDPOINT is not configured');
  }

  const url = `${AGENT_ENDPOINT}/graphs/chatbot/${threadId}/stream?message=${encodeURIComponent(message)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE 이벤트 파싱
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr) {
            try {
              const event = JSON.parse(jsonStr) as ChatbotStreamEvent;
              yield event;
            } catch {
              // JSON 파싱 실패 무시
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 챗봇 대화 히스토리 조회
 */
export async function getChatHistory(
  threadId: string
): Promise<ChatbotHistoryResponse> {
  if (!AGENT_ENDPOINT) {
    throw new Error('VITE_AGENT_ENDPOINT is not configured');
  }

  const url = `${AGENT_ENDPOINT}/graphs/chatbot/${threadId}/history`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * 챗봇 세션 종료
 */
export async function endChatbot(threadId: string): Promise<void> {
  if (!AGENT_ENDPOINT) {
    throw new Error('VITE_AGENT_ENDPOINT is not configured');
  }

  const url = `${AGENT_ENDPOINT}/graphs/chatbot/${threadId}`;

  await fetch(url, {
    method: 'DELETE',
  });
}
