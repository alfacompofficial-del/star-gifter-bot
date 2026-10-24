import type { Product } from "@/hooks/useProducts";

const DB_NAME = "alfacomp_cache_db";
const DB_VERSION = 1;
const STORE_NAME = "products_store";
const KEY_NAME = "catalog_products";

export interface CachedProductsPayload {
  products: Product[];
  timestamp: number;
  version: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB is not supported in this environment"));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error("Failed to open IndexedDB"));
      };

      request.onblocked = () => {
        console.warn("[IndexedDB] Database open request is blocked");
      };
    });
  }

  return dbPromise;
}

const LOCAL_STORAGE_KEY = "alfacomp_products_cache_v2";

/**
 * Чтение кэша из localStorage (синхронно, 0 мс)
 */
function readLocalStorageCache(): CachedProductsPayload | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.products) && parsed.products.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn("[Cache] LocalStorage read failed:", e);
  }
  return null;
}

/**
 * Сохранение кэша в localStorage
 */
function writeLocalStorageCache(payload: CachedProductsPayload): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("[Cache] LocalStorage quota or write error:", e);
  }
}

/**
 * Чтение кэшированного каталога товаров из IndexedDB
 */
export async function getCachedProducts(): Promise<CachedProductsPayload | null> {
  // 1. Мгновенная отдача из памяти / localStorage
  if (memoryPreload && memoryPreload.products.length > 0) {
    return memoryPreload;
  }
  const local = readLocalStorageCache();
  if (local && local.products.length > 0) {
    memoryPreload = local;
    return local;
  }

  // 2. Чтение из IndexedDB
  try {
    const db = await getDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);

      req.onsuccess = () => {
        const res = (req.result as CachedProductsPayload) || null;
        if (res && res.products.length > 0) {
          memoryPreload = res;
          writeLocalStorageCache(res);
        }
        resolve(res);
      };

      req.onerror = () => {
        reject(req.error || new Error("Failed to read from IndexedDB"));
      };
    });
  } catch (error) {
    console.warn("[IndexedDB] Could not load cached products:", error);
    return null;
  }
}

/**
 * Сохранение каталога товаров в кэш (память + localStorage + IndexedDB)
 */
export async function setCachedProducts(products: Product[]): Promise<void> {
  if (!products || products.length === 0) return;
  const payload: CachedProductsPayload = {
    products,
    timestamp: Date.now(),
    version: 2,
  };

  // 1. Немедленно в память и localStorage (0 мс доступ)
  memoryPreload = payload;
  writeLocalStorageCache(payload);

  // 2. В IndexedDB в фоне
  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload, KEY_NAME);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("Failed to write to IndexedDB"));
    });
  } catch (error) {
    console.warn("[IndexedDB] Could not save products to cache:", error);
  }
}

/**
 * Очистка кэша товаров во всех слоях
 */
export async function clearProductsCache(): Promise<void> {
  memoryPreload = null;
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {}

  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_NAME);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error("Failed to delete from IndexedDB"));
    });
  } catch (error) {
    console.warn("[IndexedDB] Could not clear products cache:", error);
  }

  // Оповещаем все вкладки и компоненты об очистке
  broadcastProductsUpdate();
}

// ─────────────────────────────────────────────────────────────
// Синхронизация между вкладками браузера (BroadcastChannel)
// ─────────────────────────────────────────────────────────────

const CHANNEL_NAME = "alfacomp_products_sync";
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn("[BroadcastChannel] Not available:", e);
  }
}

/**
 * Отправляет сигнал обновления товаров во все вкладки и локальные компоненты
 */
export function broadcastProductsUpdate(): void {
  // 1. Локальное событие в текущем окне
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("products-updated"));
  }

  // 2. Межвкладочное событие через BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "PRODUCTS_UPDATED", timestamp: Date.now() });
    } catch (e) {
      console.warn("[BroadcastChannel] Error posting message:", e);
    }
  }
}

/**
 * Подписка на обновление товаров из других вкладок и локальных событий
 */
export function subscribeToProductsUpdate(callback: () => void): () => void {
  const handleLocal = () => callback();
  const handleChannel = (event: MessageEvent) => {
    if (event?.data?.type === "PRODUCTS_UPDATED") {
      callback();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("products-updated", handleLocal);
  }

  if (broadcastChannel) {
    broadcastChannel.addEventListener("message", handleChannel);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("products-updated", handleLocal);
    }
    if (broadcastChannel) {
      broadcastChannel.removeEventListener("message", handleChannel);
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Немедленный запуск чтения кэша при парсинге бандла (0 мс)
// ─────────────────────────────────────────────────────────────
let memoryPreload: CachedProductsPayload | null = readLocalStorageCache();
let preloadPromise: Promise<CachedProductsPayload | null> | null = null;

if (typeof window !== "undefined") {
  preloadPromise = getCachedProducts().then((res) => {
    if (res && res.products.length > 0) {
      memoryPreload = res;
    }
    return res;
  });
}

export function getSynchronousPreload(): CachedProductsPayload | null {
  if (!memoryPreload) {
    memoryPreload = readLocalStorageCache();
  }
  return memoryPreload;
}

export function waitForPreload(): Promise<CachedProductsPayload | null> {
  if (memoryPreload && memoryPreload.products.length > 0) {
    return Promise.resolve(memoryPreload);
  }
  return preloadPromise ?? Promise.resolve(readLocalStorageCache());
}

// Добавляем глобальную функцию в window для отладки и ручной очистки кэша из консоли
if (typeof window !== "undefined") {
  (window as any).alfaClearCache = clearProductsCache;
}
