// Safe wrapper for localStorage to prevent crashes in private browsing, iframes, or iOS Safari with blocked cookies.

const inMemoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to read key "${key}" from localStorage, falling back to in-memory store:`, e);
      return inMemoryStorage[key] || null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[Storage] Failed to write key "${key}" to localStorage, falling back to in-memory store:`, e);
      inMemoryStorage[key] = value;
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[Storage] Failed to remove key "${key}" from localStorage:`, e);
      delete inMemoryStorage[key];
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('[Storage] Failed to clear localStorage:', e);
      for (const key in inMemoryStorage) {
        delete inMemoryStorage[key];
      }
    }
  }
};
