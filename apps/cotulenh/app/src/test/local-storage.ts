type StorageMap = Map<string, string>;

function createStorage(store: StorageMap): Storage {
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    }
  };
}

export function installMockLocalStorage(seed: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(seed));
  const localStorage = createStorage(store);

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorage
  });

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorage
  });

  return localStorage;
}
