import type {
  ProductAnalysisRequest,
  ProductAnalysisResponse,
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
