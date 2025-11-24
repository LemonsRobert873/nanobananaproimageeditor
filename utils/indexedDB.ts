

const DB_NAME = 'NanoBananaDB';
const HISTORY_STORE = 'history';
const IMAGE_STORE = 'state_images';
const DB_VERSION = 2;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE);
      }
    };
  });
};

export const saveHistoryItem = async (item: any) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const request = store.put(item); 
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save to IndexedDB:", error);
  }
};

export const getHistoryItems = async (): Promise<any[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readonly');
      const store = tx.objectStore(HISTORY_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        // Sort by timestamp descending (newest first)
        const results = request.result;
        results.sort((a: any, b: any) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to load from IndexedDB:", error);
    return [];
  }
};

export const deleteHistoryItem = async (id: string) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to delete from IndexedDB:", error);
  }
};

export const clearAllHistory = async () => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HISTORY_STORE, 'readwrite');
      const store = tx.objectStore(HISTORY_STORE);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to clear IndexedDB history:", error);
  }
};

// --- Image State Persistence ---

export const saveStateImage = async (key: string, file: File | null) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, 'readwrite');
      const store = tx.objectStore(IMAGE_STORE);
      
      if (file) {
        // Store as Blob with metadata
        const data = {
          buffer: file,
          type: file.type,
          name: file.name,
          lastModified: file.lastModified
        };
        const request = store.put(data, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } else {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }
    });
  } catch (error) {
    console.error("Failed to save state image:", error);
  }
};

export const getStateImage = async (key: string): Promise<File | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, 'readonly');
      const store = tx.objectStore(IMAGE_STORE);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.buffer) {
          // Reconstruct File object
          const file = new File([result.buffer], result.name, {
            type: result.type,
            lastModified: result.lastModified
          });
          resolve(file);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => {
        // Key not found is not an error
        resolve(null);
      };
    });
  } catch (error) {
    console.error("Failed to load state image:", error);
    return null;
  }
};

export const clearAllStateImages = async () => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IMAGE_STORE, 'readwrite');
      const store = tx.objectStore(IMAGE_STORE);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to clear state images:", error);
  }
};
