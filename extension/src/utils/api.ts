import type {
  ProductAnalysisRequest,
  ProductAnalysisResponse,
  ComparisonStartRequest,
  ComparisonStartResponse,
  ComparisonContinueRequest,
  ComparisonContinueResponse,
} from '@/types/content';

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
