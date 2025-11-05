import type { StoredProduct, ProductStorage } from '@/types/storage';

const STORAGE_KEY = 'products';

/**
 * UUID v4 생성
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Storage에서 전체 제품 데이터 가져오기
 */
async function getStorageData(): Promise<ProductStorage> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  // products 키의 값이 배열이면 { products: [...] } 형태로 반환
  // 객체면 그대로 반환 (하위 호환성)
  const data = result[STORAGE_KEY];
  if (Array.isArray(data)) {
    return { products: data };
  }
  return data || { products: [] };
}

/**
 * Storage에 전체 제품 데이터 저장하기
 */
async function setStorageData(data: ProductStorage): Promise<void> {
  // 배열만 저장 (중첩 구조 제거)
  await chrome.storage.local.set({ [STORAGE_KEY]: data.products });
}

/**
 * 제품 저장
 */
export async function saveProduct(
  product: Omit<StoredProduct, 'id' | 'addedAt'>
): Promise<StoredProduct> {
  const storage = await getStorageData();

  const newProduct: StoredProduct = {
    ...product,
    id: generateUUID(),
    addedAt: Date.now(),
  };

  storage.products.push(newProduct);
  await setStorageData(storage);

  return newProduct;
}

/**
 * 전체 제품 조회 (최신순)
 */
export async function getProducts(): Promise<StoredProduct[]> {
  const storage = await getStorageData();
  return storage.products.sort((a, b) => b.addedAt - a.addedAt);
}

/**
 * 카테고리별 제품 조회 (최신순)
 */
export async function getProductsByCategory(
  category: string
): Promise<StoredProduct[]> {
  const storage = await getStorageData();
  return storage.products
    .filter((p) => p.category === category)
    .sort((a, b) => b.addedAt - a.addedAt);
}

/**
 * 제품 삭제
 */
export async function deleteProduct(id: string): Promise<void> {
  const storage = await getStorageData();
  storage.products = storage.products.filter((p) => p.id !== id);
  await setStorageData(storage);
}

/**
 * 저장된 카테고리 목록 조회 (중복 제거)
 */
export async function getCategories(): Promise<string[]> {
  const storage = await getStorageData();
  const categories = new Set(storage.products.map((p) => p.category));
  return Array.from(categories).sort();
}

/**
 * 전체 제품 삭제 (초기화)
 */
export async function clearAllProducts(): Promise<void> {
  await setStorageData({ products: [] });
}
