import "server-only";

/**
 * Minimal Finnhub client + a tiny in-memory TTL cache with last-good fallback.
 *
 * The cache is a module-level Map, so it is shared across requests within a
 * single server process — exactly what the 5-minute (calendar) and 3-minute
 * (news) caching requirements need without any external store. On a fetch
 * failure we serve the last successful payload (marked `stale`) so the UI can
 * show cached data + a subtle warning instead of breaking the layout.
 */

const FINNHUB_BASE = "https://finnhub.io/api/v1";

export function finnhubKey(): string {
  return process.env.FINNHUB_API_KEY ?? "";
}

export interface CacheResult<T> {
  data: T;
  /** True when serving a previous payload because the live fetch failed. */
  stale: boolean;
  /** True when this payload came from a live (successful) fetch. */
  live: boolean;
  /** When the served payload was originally fetched. */
  fetchedAt: number;
}

interface CacheEntry<T> {
  data: T;
  at: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Return cached data when fresh; otherwise run `loader`. If the loader throws
 * and we have a previous value, serve it as `stale`. If there is no previous
 * value, the error propagates so the caller can decide on a fallback.
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<CacheResult<T>> {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  if (hit && now - hit.at < ttlMs) {
    return { data: hit.data, stale: false, live: false, fetchedAt: hit.at };
  }

  try {
    const data = await loader();
    store.set(key, { data, at: now });
    return { data, stale: false, live: true, fetchedAt: now };
  } catch (err) {
    if (hit) {
      return { data: hit.data, stale: true, live: false, fetchedAt: hit.at };
    }
    throw err;
  }
}

/** GET a Finnhub endpoint as JSON. Throws on non-2xx or Finnhub error bodies. */
export async function finnhubGet<T>(
  path: string,
  params: Record<string, string> = {},
  timeoutMs = 8000
): Promise<T> {
  const key = finnhubKey();
  if (!key) throw new Error("FINNHUB_API_KEY is not configured");

  const qs = new URLSearchParams({ ...params, token: key });
  const url = `${FINNHUB_BASE}${path}?${qs.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Finnhub ${path} → HTTP ${res.status}`);
    }
    const json = (await res.json()) as T & { error?: string };
    if (json && typeof json === "object" && "error" in json && json.error) {
      throw new Error(`Finnhub ${path} → ${json.error}`);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}
