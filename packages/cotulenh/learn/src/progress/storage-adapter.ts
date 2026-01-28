/**
 * Storage adapter interface for framework-agnostic persistence.
 * Implement this interface to integrate with any storage system
 * (localStorage, AsyncStorage, database, etc.)
 */
export interface StorageAdapter {
  /**
   * Get a value from storage
   * @param key Storage key
   * @returns The stored value or null if not found
   */
  get<T>(key: string): T | null;

  /**
   * Set a value in storage
   * @param key Storage key
   * @param value Value to store
   */
  set<T>(key: string, value: T): void;

  /**
   * Remove a value from storage
   * @param key Storage key
   */
  remove(key: string): void;
}

/**
 * In-memory storage adapter for testing or SSR environments
 */
export class MemoryStorageAdapter implements StorageAdapter {
  #storage = new Map<string, unknown>();

  get<T>(key: string): T | null {
    const value = this.#storage.get(key);
    return value !== undefined ? (value as T) : null;
  }

  set<T>(key: string, value: T): void {
    this.#storage.set(key, value);
  }

  remove(key: string): void {
    this.#storage.delete(key);
  }

  clear(): void {
    this.#storage.clear();
  }
}

/**
 * Browser localStorage adapter
 */
export class LocalStorageAdapter implements StorageAdapter {
  get<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }

  remove(key: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  }
}
