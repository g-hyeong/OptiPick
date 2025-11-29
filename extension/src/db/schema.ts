/**
 * Dexie.js DB 스키마 정의
 */
import Dexie, { type Table } from 'dexie';
import type {
  StoredProduct,
  AnalysisTask,
  ComparisonTask,
  ComparisonTemplate,
  AnalysisHistoryItem,
  CategoryHistory,
} from '@/types/storage';

/**
 * OptiPick IndexedDB 데이터베이스
 */
class OptiPickDB extends Dexie {
  products!: Table<StoredProduct, string>;
  analysisHistory!: Table<AnalysisHistoryItem, string>;
  categoryHistory!: Table<CategoryHistory, string>;
  comparisonTemplates!: Table<ComparisonTemplate, string>;
  currentTask!: Table<AnalysisTask, string>;
  currentComparisonTask!: Table<ComparisonTask, string>;

  constructor() {
    super('OptiPickDB');

    this.version(1).stores({
      // id: PK, category/addedAt/url: 인덱스
      products: 'id, category, addedAt, url',
      // id: PK, category/date/isFavorite: 인덱스
      analysisHistory: 'id, category, date, isFavorite',
      // category: PK
      categoryHistory: 'category',
      // id: PK, category: 인덱스
      comparisonTemplates: 'id, category',
      // taskId: PK (싱글톤 레코드)
      currentTask: 'taskId',
      // taskId: PK (싱글톤 레코드)
      currentComparisonTask: 'taskId',
    });
  }
}

export const db = new OptiPickDB();
