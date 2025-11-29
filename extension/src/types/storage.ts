import type { ProductAnalysis } from './content';

/**
 * Storage에 저장되는 제품 정보
 */
export interface StoredProduct {
  /** 제품 고유 ID (UUID) */
  id: string;
  /** 제품 카테고리 (예: 노트북, 스마트폰) */
  category: string;
  /** 제품 페이지 URL */
  url: string;
  /** 제품명 */
  title: string;
  /** 가격 */
  price: string;
  /** 간단 요약 */
  summary: string;
  /** 썸네일 이미지 URL */
  thumbnailUrl?: string;
  /** 전체 분석 결과 */
  fullAnalysis: ProductAnalysis;
  /** 저장 시각 (Unix timestamp) */
  addedAt: number;
  /** 사용자 메모 */
  notes?: string;
  /** 사용자 태그 */
  tags?: string[];
  /** LLM input으로 사용한 원본 HTML body (향후 챗봇 기능용) */
  rawContent?: string;
}

/**
 * Chrome Storage 구조
 */
export interface ProductStorage {
  products: StoredProduct[];
}

/**
 * 분석 작업 상태
 */
export type AnalysisTaskStatus =
  | 'idle'
  | 'extracting'
  | 'analyzing'
  | 'saving'
  | 'completed'
  | 'failed';

/**
 * 진행 중인 분석 작업
 */
export interface AnalysisTask {
  /** 작업 ID */
  taskId: string;
  /** 카테고리 */
  category: string;
  /** 페이지 URL */
  url: string;
  /** 페이지 제목 */
  title: string;
  /** 작업 상태 */
  status: AnalysisTaskStatus;
  /** 진행 메시지 */
  message: string;
  /** 에러 메시지 (실패 시) */
  error?: string;
  /** 시작 시간 */
  startedAt: number;
  /** 완료 시간 */
  completedAt?: number;
}

/**
 * 작업 상태 Storage
 */
export interface TaskStorage {
  currentTask: AnalysisTask | null;
}

// ========== 비교 작업 관련 타입 ==========

/**
 * 비교 작업 상태
 */
export type ComparisonTaskStatus =
  | 'idle'
  | 'step1' // 사용자 기준 입력 대기
  | 'analyzing' // 비교 분석 중
  | 'completed'
  | 'failed';

/**
 * 비교 작업
 */
export interface ComparisonTask {
  /** 작업 ID */
  taskId: string;
  /** 카테고리 */
  category: string;
  /** 선택된 제품 ID 목록 */
  selectedProductIds: string[];
  /** 사용자가 입력한 중요 기준 */
  userCriteria: string[];
  /** 작업 상태 */
  status: ComparisonTaskStatus;
  /** 진행 메시지 */
  message: string;
  /** Agent API thread ID */
  threadId?: string;
  /** 최종 비교 리포트 */
  report?: import('./content').ComparisonReportData;
  /** 에러 메시지 (실패 시) */
  error?: string;
  /** 시작 시간 */
  startedAt: number;
  /** 완료 시간 */
  completedAt?: number;
}

/**
 * 비교 작업 상태 Storage
 */
export interface ComparisonTaskStorage {
  currentComparisonTask: ComparisonTask | null;
}

// ========== 비교 템플릿 관련 타입 ==========

/**
 * 비교 템플릿
 */
export interface ComparisonTemplate {
  /** 템플릿 ID */
  id: string;
  /** 템플릿 이름 */
  name: string;
  /** 카테고리 (선택사항) */
  category?: string;
  /** 우선순위 목록 */
  priorities: string[];
  /** 생성 시각 */
  createdAt: number;
  /** 수정 시각 */
  updatedAt: number;
}

// ========== 분석 히스토리 관련 타입 ==========

/**
 * 분석 결과 히스토리 (정규화: productIds만 저장)
 */
export interface AnalysisHistoryItem {
  /** 히스토리 ID */
  id: string;
  /** 분석 일시 */
  date: number;
  /** 카테고리 */
  category: string;
  /** 비교 대상 제품 수 */
  productCount: number;
  /** 제품 ID 목록 (정규화) */
  productIds: string[];
  /** 비교 기준 */
  criteria?: string[];
  /** 사용자 우선순위 */
  userPriorities?: string[];
  /** 비교 리포트 데이터 */
  reportData?: import('./content').ComparisonReportData;
  /** 즐겨찾기 여부 */
  isFavorite?: boolean;
}

// ========== 카테고리 히스토리 관련 타입 ==========

/**
 * 카테고리 사용 히스토리
 */
export interface CategoryHistory {
  /** 카테고리 이름 */
  category: string;
  /** 사용 횟수 */
  count: number;
  /** 마지막 사용 시각 */
  lastUsed: number;
}
