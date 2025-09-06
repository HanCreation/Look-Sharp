// IndexedDB utilities for try-on storage
// Based on the data model plan for browser-side database

export interface TryOnRecord {
  id: string;
  glassesId?: string;
  imageBlob: Blob;
  modelId?: string;
  promptVersion?: string;
  createdAt: string;
  notes?: string;
  // Additional metadata for compatibility with existing code
  imageDataUrl?: string;
  brand?: string;
  name?: string;
  shape?: string | null;
  style?: string | null;
  color?: string | null;
  price_cents?: number | null;
  source?: 'product' | 'custom';
}

const DB_NAME = 'looksharp';
const DB_VERSION = 1;
const STORE_NAME = 'pictures';

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // Create indexes for efficient querying
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('glassesId', 'glassesId');
        }
      };
    });
  }

  async saveTryOn(record: Omit<TryOnRecord, 'id'>): Promise<string> {
    if (!this.db) await this.init();

    const id = `pic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const recordWithId: TryOnRecord = { ...record, id };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(recordWithId);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTryOns(): Promise<TryOnRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result as TryOnRecord[];
        // Sort by createdAt descending (newest first)
        records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getTryOnById(id: string): Promise<TryOnRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTryOn(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllTryOns(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageEstimate(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      };
    }
    return { used: 0, available: 0 };
  }
}

// Singleton instance
const dbManager = new IndexedDBManager();

// Initialize on first use
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await dbManager.init();
    initialized = true;
  }
}

export async function saveTryOnToDB(dataUrl: string, metadata?: Partial<TryOnRecord>): Promise<string> {
  await ensureInitialized();

  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const record = {
    imageBlob: blob,
    imageDataUrl: dataUrl, // Keep for compatibility with existing code
    createdAt: new Date().toISOString(),
    modelId: 'gemini-2.5-flash-image-preview',
    promptVersion: 'v1',
    ...metadata,
  };

  return dbManager.saveTryOn(record);
}

export async function getAllTryOnsFromDB(): Promise<TryOnRecord[]> {
  await ensureInitialized();
  return dbManager.getAllTryOns();
}

export async function deleteTryOnFromDB(id: string): Promise<void> {
  await ensureInitialized();
  return dbManager.deleteTryOn(id);
}

export async function clearAllTryOnsFromDB(): Promise<void> {
  await ensureInitialized();
  return dbManager.clearAllTryOns();
}

export async function getStorageEstimate(): Promise<{ used: number; available: number }> {
  await ensureInitialized();
  return dbManager.getStorageEstimate();
}
