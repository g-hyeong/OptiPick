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
  | 'step1' // Agent에 사용자 기준 전송 대기
  | 'step2' // Agent가 추출한 기준으로 우선순위 입력 대기
  | 'analyzing' // 최종 분석 중
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
  /** 사용자가 선택한 우선순위 (순서대로 1~5개) */
  userPriorities?: string[];
  /** 작업 상태 */
  status: ComparisonTaskStatus;
  /** 진행 메시지 */
  message: string;
  /** Agent API thread ID */
  threadId?: string;
  /** Agent가 추출한 전체 비교 기준 */
  extractedCriteria?: string[];
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
