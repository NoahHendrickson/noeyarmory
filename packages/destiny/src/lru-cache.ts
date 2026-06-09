/** Minimal insertion-ordered LRU cache (Map-backed). */
export interface LruCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  clear(): void;
  readonly size: number;
}

/**
 * Create a bounded LRU cache. Reads promote the entry to most-recently-used;
 * writes evict the least-recently-used once `maxSize` is exceeded. Intended for
 * memoizing keystroke-rate search results across growing queries.
 */
export function createLruCache<K, V>(maxSize: number): LruCache<K, V> {
  const map = new Map<K, V>();
  return {
    get(key) {
      const value = map.get(key);
      if (value === undefined && !map.has(key)) return undefined;
      map.delete(key);
      map.set(key, value as V);
      return value;
    },
    set(key, value) {
      if (map.has(key)) map.delete(key);
      map.set(key, value);
      while (map.size > maxSize) {
        const oldest = map.keys().next().value as K;
        map.delete(oldest);
      }
    },
    has(key) {
      return map.has(key);
    },
    clear() {
      map.clear();
    },
    get size() {
      return map.size;
    },
  };
}
