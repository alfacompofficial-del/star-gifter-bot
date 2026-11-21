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
 * Р§С‚РµРЅРёРµ РєСЌС€Р° РёР· localStorage (СЃРёРЅС…СЂРѕРЅРЅРѕ, 0 РјСЃ)
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
 * РЎРѕС…СЂР°РЅРµРЅРёРµ РєСЌС€Р° РІ localStorage
 */
function writeLocalStorageCache(payload: CachedProductsPayload): void {
  try {
    if (typeof window === "undefined") return;
    // Strip base64 image_url values before saving to avoid QuotaExceededError
    const safePayload: CachedProductsPayload = {
      ...payload,
      products: payload.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        image_url: p.image_url && p.image_url.startsWith("data:") ? "" : p.image_url,
        in_stock: p.in_stock,
        rating: p.rating,
      } as Product)),
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(safePayload));
    } catch (_) {
      try {
        localStorage.removeItem("alfacomp_products_cache");
        localStorage.removeItem("alfacomp_products_cache_v1");
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch ($_) {}
    }
  } catch (_) {}
}

/**
 * Р§С‚РµРЅРёРµ РєСЌС€РёСЂРѕРІР°РЅРЅРѕРіРѕ РєР°С‚Р°Р»РѕРіР° С‚РѕРІР°СЂРѕРІ РёР· IndexedDB
 */
export async function getCachedProducts(): Promise<CachedProductsPayload | null> {
  // 1. РњРіРЅРѕРІРµРЅРЅР°СЏ РѕС‚РґР°С‡Р° РёР· РїР°РјСЏС‚Рё / localStorage
  if (memoryPreload && memoryPreload.products.length > 0) {
    return memoryPreload;
  }
  const local = readLocalStorageCache();
  if (local && local.products.length > 0) {
    memoryPreload = local;
    return local;
  }

  // 2. Р§С‚РµРЅРёРµ РёР· IndexedDB
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
 * РЎРѕС…СЂР°РЅРµРЅРёРµ РєР°С‚Р°Р»РѕРіР° С‚РѕРІР°СЂРѕРІ РІ РєСЌС€ (РїР°РјСЏС‚СЊ + localStorage + IndexedDB)
 */
export async function setCachedProducts(products: Product[]): Promise<void> {
  if (!products || products.length === 0) return;
  const payload: CachedProductsPayload = {
    products,
    timestamp: Date.now(),
    version: 2,
  };

  // 1. РќРµРјРµРґР»РµРЅРЅРѕ РІ РїР°РјСЏС‚СЊ Рё localStorage (0 РјСЃ РґРѕСЃС‚СѓРї)
  memoryPreload = payload;
  writeLocalStorageCache(payload);

  // 2. Р’ IndexedDB РІ С„РѕРЅРµ
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
 * РћС‡РёСЃС‚РєР° РєСЌС€Р° С‚РѕРІР°СЂРѕРІ РІРѕ РІСЃРµС… СЃР»РѕСЏС…
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

  // РћРїРѕРІРµС‰Р°РµРј РІСЃРµ РІРєР»Р°РґРєРё Рё РєРѕРјРїРѕРЅРµРЅС‚С‹ РѕР± РѕС‡РёСЃС‚РєРµ
  broadcastProductsUpdate();
}

// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ РјРµР¶РґСѓ РІРєР»Р°РґРєР°РјРё Р±СЂР°СѓР·РµСЂР° (BroadcastChannel)
// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

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
 * РћС‚РїСЂР°РІР»СЏРµС‚ СЃРёРіРЅР°Р» РѕР±РЅРѕРІР»РµРЅРёСЏ С‚РѕРІР°СЂРѕРІ РІРѕ РІСЃРµ РІРєР»Р°РґРєРё Рё Р»РѕРєР°Р»СЊРЅС‹Рµ РєРѕРјРїРѕРЅРµРЅС‚С‹
 */
export function broadcastProductsUpdate(): void {
  // 1. Р›РѕРєР°Р»СЊРЅРѕРµ СЃРѕР±С‹С‚РёРµ РІ С‚РµРєСѓС‰РµРј РѕРєРЅРµ
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("products-updated"));
  }

  // 2. РњРµР¶РІРєР»Р°РґРѕС‡РЅРѕРµ СЃРѕР±С‹С‚РёРµ С‡РµСЂРµР· BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "PRODUCTS_UPDATED", timestamp: Date.now() });
    } catch (e) {
      console.warn("[BroadcastChannel] Error posting message:", e);
    }
  }
}

/**
 * РџРѕРґРїРёСЃРєР° РЅР° РѕР±РЅРѕРІР»РµРЅРёРµ С‚РѕРІР°СЂРѕРІ РёР· РґСЂСѓРіРёС… РІРєР»Р°РґРѕРє Рё Р»РѕРєР°Р»СЊРЅС‹С… СЃРѕР±С‹С‚РёР№
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

// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// РќРµРјРµРґР»РµРЅРЅС‹Р№ Р·Р°РїСѓСЃРє С‡С‚РµРЅРёСЏ РєСЌС€Р° РїСЂРё РїР°СЂСЃРёРЅРіРµ Р±Р°РЅРґР»Р° (0 РјСЃ)
// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

// Р”РѕР±Р°РІР»СЏРµРј РіР»РѕР±Р°Р»СЊРЅСѓСЋ С„СѓРЅРєС†РёСЋ РІ window РґР»СЏ РѕС‚Р»Р°РґРєРё Рё СЂСѓС‡РЅРѕР№ РѕС‡РёСЃС‚РєРё РєСЌС€Р° РёР· РєРѕРЅСЃРѕР»Рё
if (typeof window !== "undefined") {
  (window as any).alfaClearCache = clearProductsCache;
}
