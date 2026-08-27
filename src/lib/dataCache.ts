/**
 * Lightweight SWR-style in-memory cache.
 *
 * Pattern: stale-while-revalidate
 * - First visit:       no cache → fetch → cache → render
 * - Return visit:      cache hit → render immediately → revalidate in background (silently)
 * - Stale threshold:   4 minutes — triggers a silent background revalidation
 *
 * This lives in module scope, so it survives React re-renders and route changes
 * within the same browser session.
 */

const STALE_MS = 4 * 60 * 1000; // 4 minutes

interface Entry<T> {
  data: T;
  ts: number;
}

const store = new Map<string, Entry<any>>();

export const dataCache = {
  /** Return cached data if it exists (whether stale or fresh). */
  get<T>(key: string): T | undefined {
    return store.get(key)?.data as T | undefined;
  },

  /** Store data with the current timestamp. */
  set<T>(key: string, data: T): void {
    store.set(key, { data, ts: Date.now() });
  },

  /** True if no cache entry exists OR the entry is older than STALE_MS. */
  isStale(key: string): boolean {
    const entry = store.get(key);
    if (!entry) return true;
    return Date.now() - entry.ts > STALE_MS;
  },

  has(key: string): boolean {
    return store.has(key);
  },
};
