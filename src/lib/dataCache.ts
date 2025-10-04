/**
 * Enhanced data cache with request deduplication, cancellation, and prefetch support.
 * 
 * Features:
 * - Request deduplication: multiple calls with same params return same promise
 * - Request cancellation: abort in-flight requests on filter change
 * - Stale-while-revalidate: return cached data immediately, revalidate in background
 * - Persistence: sessionStorage for cross-page cache, memory for fast access
 * - TTL/invalidation: controlled by caller (no hardcoded defaults per RULES.md)
 * 
 * @module dataCache
 */

import { makeCacheKey } from "./utils";

// Cache entry structure
type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  staleAt: number; // When to trigger background revalidation
};

// In-flight request tracking for deduplication
type InFlightRequest<T> = {
  promise: Promise<T>;
  controller: AbortController;
};

// Dual-layer cache: memory (fast) + sessionStorage (persistent)
const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, InFlightRequest<any>>();

// Cache TTL configuration
// NOTE: Can be overridden by getCacheTTL() which reads from UI settings
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_INSIGHTS_TTL_MS = 60 * 60 * 1000; // 1 hour for AI insights (expensive to regenerate)
const STALE_THRESHOLD = 0.8; // 80% of TTL = start background revalidation

/**
 * Get cache TTL from UI settings or fall back to default.
 * TODO: Implement UI settings store for cache configuration per RULES.md
 */
export function getCacheTTL(type: 'kpi' | 'insights' | 'overview' = 'kpi'): number {
  // Check if we have UI settings in localStorage
  if (typeof window !== 'undefined') {
    try {
      const settings = localStorage.getItem('cache-settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (type === 'insights' && parsed.insightsTtlMs) {
          return parsed.insightsTtlMs;
        }
        if (type === 'kpi' && parsed.kpiTtlMs) {
          return parsed.kpiTtlMs;
        }
        if (type === 'overview' && parsed.overviewTtlMs) {
          return parsed.overviewTtlMs;
        }
      }
    } catch (err) {
      console.warn('[dataCache] Failed to read cache settings:', err);
    }
  }
  
  // Fall back to defaults
  return type === 'insights' ? DEFAULT_INSIGHTS_TTL_MS : DEFAULT_TTL_MS;
}

/**
 * Get cached value if available and not expired.
 * Returns stale status to enable stale-while-revalidate.
 */
export function getCachedWithMeta<T>(key: string): { value: T; isStale: boolean } | null {
  // Check memory first
  let entry = memoryCache.get(key);
  
  // Fall back to sessionStorage if not in memory
  if (!entry && typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`cache:${key}`);
      if (stored) {
        entry = JSON.parse(stored);
        // Restore to memory cache
        if (entry) memoryCache.set(key, entry);
      }
    } catch (err) {
      console.warn('[dataCache] sessionStorage read error:', err);
    }
  }
  
  if (!entry) return null;
  
  const now = Date.now();
  
  // Hard expiration
  if (now > entry.expiresAt) {
    memoryCache.delete(key);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(`cache:${key}`);
      } catch {}
    }
    return null;
  }
  
  // Return with stale status
  const isStale = now > entry.staleAt;
  return { value: entry.value as T, isStale };
}

/**
 * Set cached value with TTL. Persists to both memory and sessionStorage.
 */
export function setCachedData<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS) {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    value,
    expiresAt: now + ttlMs,
    staleAt: now + (ttlMs * STALE_THRESHOLD),
  };
  
  memoryCache.set(key, entry);
  
  // Persist to sessionStorage for cross-page cache
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`cache:${key}`, JSON.stringify(entry));
    } catch (err) {
      // Quota exceeded or other error; degrade gracefully
      console.warn('[dataCache] sessionStorage write error:', err);
    }
  }
}

/**
 * Fetch with deduplication and abort support.
 * Multiple concurrent calls with same key will share the same request.
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: { ttlMs?: number; forceRefresh?: boolean } = {}
): Promise<T> {
  const { ttlMs = DEFAULT_TTL_MS, forceRefresh = false } = options;
  
  // Check cache first (unless forced refresh)
  if (!forceRefresh) {
    const cached = getCachedWithMeta<T>(key);
    if (cached && !cached.isStale) {
      return cached.value;
    }
    
    // Stale-while-revalidate: return stale immediately, revalidate in background
    if (cached && cached.isStale) {
      // Trigger background revalidation (don't await)
      fetchInBackground(key, fetcher, ttlMs).catch((err) => {
        console.debug('[dataCache] background revalidation failed:', err);
      });
      return cached.value;
    }
  }
  
  // Check if request is already in-flight (deduplication)
  const existing = inFlightRequests.get(key);
  if (existing && !forceRefresh) {
    return existing.promise;
  }
  
  // Abort any existing request if forcing refresh
  if (existing && forceRefresh) {
    existing.controller.abort();
    inFlightRequests.delete(key);
  }
  
  // Create new request
  const controller = new AbortController();
  const promise = fetcher(controller.signal)
    .then((data) => {
      setCachedData(key, data, ttlMs);
      inFlightRequests.delete(key);
      return data;
    })
    .catch((err) => {
      inFlightRequests.delete(key);
      // Don't throw if aborted (expected behavior)
      if (err.name === 'AbortError') {
        console.debug('[dataCache] Request aborted:', key);
        throw err;
      }
      throw err;
    });
  
  inFlightRequests.set(key, { promise, controller });
  return promise;
}

/**
 * Background revalidation (fire-and-forget).
 */
async function fetchInBackground<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  ttlMs: number
): Promise<void> {
  const controller = new AbortController();
  try {
    const data = await fetcher(controller.signal);
    setCachedData(key, data, ttlMs);
  } catch (err) {
    // Suppress errors in background revalidation
    if (err instanceof Error && err.name !== 'AbortError') {
      console.warn('[dataCache] Background fetch failed:', err);
    }
  }
}

/**
 * Cancel all in-flight requests (useful on filter change).
 */
export function abortAllRequests() {
  for (const [key, req] of inFlightRequests.entries()) {
    req.controller.abort();
  }
  inFlightRequests.clear();
  console.debug('[dataCache] Aborted all in-flight requests');
}

/**
 * Clear cache (optionally by prefix).
 */
export function clearCache(prefix?: string) {
  if (prefix) {
    // Clear matching keys
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem(`cache:${key}`);
          } catch {}
        }
      }
    }
  } else {
    // Clear all
    memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        // Clear all cache: prefixed items
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('cache:')) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {}
    }
  }
}

/**
 * Build cache key for KPI requests (reuses existing makeCacheKey).
 */
export function buildKpiCacheKey(params: {
  metric: string;
  start: string;
  end: string;
  grain?: string;
  comparisonMode?: string;
  audience?: string[];
  device?: string[];
  channel?: string[];
}): string {
  return makeCacheKey({
    dataset: 'ga4', // Add dataset discriminator per requirements
    type: 'kpi',
    ...params,
  });
}

/**
 * Build cache key for AI insights.
 */
export function buildInsightsCacheKey(params: {
  metricId: string;
  start: string;
  end: string;
  device?: string[];
  channel?: string[];
  audience?: string[];
}): string {
  return makeCacheKey({
    dataset: 'ga4',
    type: 'insights',
    ...params,
  });
}

/**
 * Rate limiter with exponential backoff for API requests.
 */
class RateLimiter {
  private attempts = new Map<string, { count: number; lastAttempt: number; backoffMs: number }>();
  private readonly maxAttempts = 3;
  private readonly baseBackoffMs = 1000; // Start with 1 second
  private readonly maxBackoffMs = 60000; // Max 60 seconds

  /**
   * Check if request should be allowed or if we're in backoff period.
   * Returns { allowed: boolean, waitMs?: number }
   */
  shouldAllow(key: string): { allowed: boolean; waitMs?: number } {
    const now = Date.now();
    const state = this.attempts.get(key);

    if (!state) {
      return { allowed: true };
    }

    // Check if we're still in backoff period
    const timeSinceLastAttempt = now - state.lastAttempt;
    if (timeSinceLastAttempt < state.backoffMs) {
      const waitMs = state.backoffMs - timeSinceLastAttempt;
      console.warn(`[RateLimiter] Backoff active for ${key}, wait ${waitMs}ms`);
      return { allowed: false, waitMs };
    }

    // Backoff period expired, allow request
    return { allowed: true };
  }

  /**
   * Record a successful request (resets backoff).
   */
  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Record a failed request (increases backoff exponentially).
   */
  recordFailure(key: string, isQuotaError: boolean = false): void {
    const state = this.attempts.get(key) || { count: 0, lastAttempt: 0, backoffMs: this.baseBackoffMs };
    
    state.count += 1;
    state.lastAttempt = Date.now();
    
    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    state.backoffMs = Math.min(
      this.baseBackoffMs * Math.pow(2, state.count - 1),
      this.maxBackoffMs
    );

    // For quota errors, use longer backoff
    if (isQuotaError) {
      state.backoffMs = Math.max(state.backoffMs, 30000); // At least 30 seconds for quota
    }

    this.attempts.set(key, state);
    
    console.warn(
      `[RateLimiter] Recorded failure for ${key}. ` +
      `Attempts: ${state.count}, Backoff: ${state.backoffMs}ms`
    );
  }

  /**
   * Check if error is a quota/rate limit error.
   */
  isQuotaError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.statusCode;
    
    return (
      status === 429 || // Too Many Requests
      status === 403 || // Forbidden (quota)
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('too many requests')
    );
  }
}

export const rateLimiter = new RateLimiter();
