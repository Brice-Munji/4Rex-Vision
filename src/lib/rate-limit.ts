import "server-only";
import { headers } from "next/headers";

/**
 * Tiny in-memory fixed-window rate limiter. Process-local (fine for a single
 * server / dev); swap the store for Redis if you scale horizontally.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Consume one unit against `key`. Allows up to `limit` hits per `windowMs`.
 * Returns ok=false (without consuming beyond the cap) once the limit is hit.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const b = store.get(key);

  if (!b || now >= b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }

  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterMs: b.resetAt - now };
}

/** Best-effort client IP from proxy headers (falls back to "unknown"). */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return h.get("x-real-ip") ?? "unknown";
  } catch {
    return "unknown";
  }
}
