/**
 * Chrome Storage -> IndexedDB 마이그레이션
 */
import { db } from './schema';
import type {
  StoredProduct,
  AnalysisTask,
  ComparisonTask,
  ComparisonTemplate,
  AnalysisHistoryItem,
  CategoryHistory,
} from '@/types/storage';

const MIGRATION_FLAG_KEY = 'dexie_migration_v1_completed';

/**
 * 기존 chrome.storage.local 구조의 AnalysisHistoryItem
 * (products: StoredProduct[] 포함)
 */
interface LegacyAnalysisHistoryItem {
  id: string;
  date: number;
  category: string;
  productCount: number;
  products: StoredProduct[];
  criteria?: string[];
  userPriorities?: string[];
  reportData?: unknown;
  isFavorite?: boolean;
}

/**
 * chrome.storage.local에서 IndexedDB로 마이그레이션
 * Extension 시작 시 한 번만 실행
 */
export async function migrateFromChromeStorage(): Promise<void> {
  try {
    // 마이그레이션 완료 여부 확인
    const flagResult = await chrome.storage.local.get(MIGRATION_FLAG_KEY);
    if (flagResult[MIGRATION_FLAG_KEY]) {
      console.log('[Migration] Already migrated to IndexedDB');
      return;
    }

    console.log('[Migration] Starting migration from chrome.storage.local to IndexedDB...');

    // 기존 데이터 읽기
    const storageData = await chrome.storage.local.get([
      'products',
      'analysisHistory',
      'categoryHistory',
      'comparisonTemplates',
      'currentTask',
      'currentComparisonTask',
    ]);

    // IndexedDB로 이전 (트랜잭션)
    await db.transaction(
      'rw',
      [
        db.products,
        db.analysisHistory,
        db.categoryHistory,
        db.comparisonTemplates,
        db.currentTask,
        db.currentComparisonTask,
      ],
      async () => {
        // products 마이그레이션
        const products = extractProducts(storageData.products);
        if (products.length > 0) {
          await db.products.bulkPut(products);
          console.log(`[Migration] Migrated ${products.length} products`);
        }

        // analysisHistory 마이그레이션 (정규화: products -> productIds)
        const history = extractAnalysisHistory(storageData.analysisHistory);
        if (history.length > 0) {
          await db.analysisHistory.bulkPut(history);
          console.log(`[Migration] Migrated ${history.length} analysis history items`);
        }

        // categoryHistory 마이그레이션
        const categoryHistory = extractCategoryHistory(storageData.categoryHistory);
        if (categoryHistory.length > 0) {
          await db.categoryHistory.bulkPut(categoryHistory);
          console.log(`[Migration] Migrated ${categoryHistory.length} category history items`);
        }

        // comparisonTemplates 마이그레이션
        const templates = extractTemplates(storageData.comparisonTemplates);
        if (templates.length > 0) {
          await db.comparisonTemplates.bulkPut(templates);
          console.log(`[Migration] Migrated ${templates.length} templates`);
        }

        // currentTask 마이그레이션 (싱글톤)
        if (storageData.currentTask) {
          await db.currentTask.put(storageData.currentTask as AnalysisTask);
          console.log('[Migration] Migrated currentTask');
        }

        // currentComparisonTask 마이그레이션 (싱글톤)
        if (storageData.currentComparisonTask) {
          await db.currentComparisonTask.put(storageData.currentComparisonTask as ComparisonTask);
          console.log('[Migration] Migrated currentComparisonTask');
        }
      }
    );

    // 마이그레이션 완료 플래그 설정
    await chrome.storage.local.set({ [MIGRATION_FLAG_KEY]: true });

    console.log('[Migration] Migration completed successfully');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}

/**
 * products 데이터 추출 (하위 호환성)
 */
function extractProducts(data: unknown): StoredProduct[] {
  if (!data) return [];

  // 배열이면 그대로 사용
  if (Array.isArray(data)) {
    return data as StoredProduct[];
  }

  // { products: [...] } 형태면 products 추출
  if (typeof data === 'object' && 'products' in data && Array.isArray((data as { products: unknown }).products)) {
    return (data as { products: StoredProduct[] }).products;
  }

  return [];
}

/**
 * analysisHistory 데이터 추출 및 정규화
 * products: StoredProduct[] -> productIds: string[]
 */
function extractAnalysisHistory(data: unknown): AnalysisHistoryItem[] {
  if (!data || !Array.isArray(data)) return [];

  return (data as LegacyAnalysisHistoryItem[]).map((item) => ({
    id: item.id,
    date: item.date,
    category: item.category,
    productCount: item.productCount,
    // 정규화: products 배열에서 id만 추출
    productIds: item.products?.map((p) => p.id) || [],
    criteria: item.criteria,
    userPriorities: item.userPriorities,
    reportData: item.reportData as AnalysisHistoryItem['reportData'],
    isFavorite: item.isFavorite ?? false,
  }));
}

/**
 * categoryHistory 데이터 추출
 */
function extractCategoryHistory(data: unknown): CategoryHistory[] {
  if (!data || !Array.isArray(data)) return [];
  return data as CategoryHistory[];
}

/**
 * comparisonTemplates 데이터 추출
 */
function extractTemplates(data: unknown): ComparisonTemplate[] {
  if (!data || !Array.isArray(data)) return [];
  return data as ComparisonTemplate[];
}
