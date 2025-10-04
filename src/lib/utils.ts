import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Legacy cache (kept for backwards compatibility, but enhanced cache in dataCache.ts is preferred)
type CacheEntry<T> = { value: T; expiresAt: number }
const memoryCache = new Map<string, CacheEntry<any>>()

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }
  return entry.value as T
}

export function setCached<T>(key: string, value: T, ttlMs: number) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/**
 * Build stable cache key from parts.
 * Exported for reuse in enhanced cache layer.
 */
export function makeCacheKey(parts: Record<string, unknown>): string {
  // Stable stringify with sorted keys
  return Object.keys(parts)
    .sort()
    .map((k) => `${k}:${JSON.stringify((parts as any)[k])}`)
    .join("|")
}
