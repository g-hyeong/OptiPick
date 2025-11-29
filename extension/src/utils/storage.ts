/**
 * 제품 Storage 유틸리티 (IndexedDB via Dexie)
 */
import { db } from '@/db';
import type { StoredProduct } from '@/types/storage';

/**
 * UUID v4 생성
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 제품 저장
 */
export async function saveProduct(
  product: Omit<StoredProduct, 'id' | 'addedAt'>
): Promise<StoredProduct> {
  const newProduct: StoredProduct = {
    ...product,
    id: generateUUID(),
    addedAt: Date.now(),
  };

  await db.products.add(newProduct);
  return newProduct;
}

/**
 * 전체 제품 조회 (최신순)
 */
export async function getProducts(): Promise<StoredProduct[]> {
  return db.products.orderBy('addedAt').reverse().toArray();
}

/**
 * 카테고리별 제품 조회 (최신순)
 */
export async function getProductsByCategory(
  category: string
): Promise<StoredProduct[]> {
  return db.products
    .where('category')
    .equals(category)
    .reverse()
    .sortBy('addedAt');
}

/**
 * ID로 제품 조회
 */
export async function getProductById(id: string): Promise<StoredProduct | undefined> {
  return db.products.get(id);
}

/**
 * 여러 ID로 제품 조회
 */
export async function getProductsByIds(ids: string[]): Promise<StoredProduct[]> {
  const products = await db.products.where('id').anyOf(ids).toArray();
  // ID 순서 유지
  const productMap = new Map(products.map((p) => [p.id, p]));
  return ids.map((id) => productMap.get(id)).filter((p): p is StoredProduct => !!p);
}

/**
 * 제품 삭제
 */
export async function deleteProduct(id: string): Promise<void> {
  await db.products.delete(id);
}

/**
 * 여러 제품 삭제
 */
export async function deleteProducts(ids: string[]): Promise<void> {
  await db.products.bulkDelete(ids);
}

/**
 * 제품 업데이트
 */
export async function updateProduct(
  id: string,
  changes: Partial<Omit<StoredProduct, 'id' | 'addedAt'>>
): Promise<void> {
  await db.products.update(id, changes);
}

/**
 * 저장된 카테고리 목록 조회 (중복 제거)
 */
export async function getCategories(): Promise<string[]> {
  const products = await db.products.toArray();
  const categories = new Set(products.map((p) => p.category));
  return Array.from(categories).sort();
}

/**
 * 전체 제품 삭제 (초기화)
 */
export async function clearAllProducts(): Promise<void> {
  await db.products.clear();
}

/**
 * 카테고리별 제품 삭제
 */
export async function deleteProductsByCategory(category: string): Promise<void> {
  await db.products.where('category').equals(category).delete();
}

/**
 * 카테고리 이름 변경
 */
export async function renameProductCategory(
  oldCategory: string,
  newCategory: string
): Promise<void> {
  await db.products
    .where('category')
    .equals(oldCategory)
    .modify({ category: newCategory });
}
