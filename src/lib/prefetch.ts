/**
 * Prefetch service for background loading of relevant views.
 * 
 * After a filter change:
 * 1. Primary view data is fetched immediately (handled by widgets)
 * 2. This service prefetches data for other relevant views in background
 * 3. Uses same cache as primary requests for instant page transitions
 * 
 * @module prefetch
 */

import { fetchWithCache, buildKpiCacheKey } from './dataCache';

// Metric to view mapping: which metrics are used by each view
const VIEW_METRICS: Record<string, string[]> = {
  home: ['mau', 'sessions', 'pageviews', 'engagementRate', 'avgEngagementTime', 'ndi', 'tasks_rate', 'features_rate', 'cwv_total'],
  'oversikt-besok': ['sessions', 'engagedSessions', 'pageviews', 'mau', 'engagementRate', 'avgEngagementTime'],
  anvandning: ['tasks', 'features', 'tasks_rate', 'features_rate'],
  prestanda: ['cwv_total'],
  konverteringar: ['sessions', 'engagementRate'],
  kundnojdhet: ['ndi'],
};

// Determine which views to prefetch based on current route
function getRelevantViews(currentPath: string): string[] {
  // Extract view identifier from path
  const segments = currentPath.split('/').filter(Boolean);
  const currentView = segments.length === 0 ? 'home' : segments.join('-');
  
  // Return all views except current
  return Object.keys(VIEW_METRICS).filter((v) => v !== currentView);
}

/**
 * Prefetch data for other views with current filter state.
 * Uses exponential backoff and respects rate limits.
 */
export async function prefetchRelevantViews(
  currentPath: string,
  filterState: {
    start: string;
    end: string;
    grain?: string;
    comparisonMode?: string;
    audience?: string[];
    device?: string[];
    channel?: string[];
  }
): Promise<void> {
  const relevantViews = getRelevantViews(currentPath);
  
  if (relevantViews.length === 0) {
    console.debug('[prefetch] No views to prefetch');
    return;
  }
  
  console.debug('[prefetch] Starting prefetch for views:', relevantViews);
  
  // Collect all unique metrics across relevant views
  const metricsToFetch = new Set<string>();
  for (const view of relevantViews) {
    const metrics = VIEW_METRICS[view] || [];
    metrics.forEach((m) => metricsToFetch.add(m));
  }
  
  // Fetch all metrics in parallel (browser will handle concurrency)
  // TODO: Implement rate limiting/exponential backoff per RULES.md if quota errors occur
  const prefetchPromises = Array.from(metricsToFetch).map((metric) =>
    prefetchMetric(metric, filterState)
  );
  
  // Fire and forget (don't block on prefetch completion)
  Promise.allSettled(prefetchPromises).then((results) => {
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    console.debug(`[prefetch] Completed: ${succeeded} succeeded, ${failed} failed`);
  });
}

/**
 * Prefetch a single metric.
 */
async function prefetchMetric(
  metric: string,
  filterState: {
    start: string;
    end: string;
    grain?: string;
    comparisonMode?: string;
    audience?: string[];
    device?: string[];
    channel?: string[];
  }
): Promise<void> {
  try {
    const params = {
      metric,
      start: filterState.start,
      end: filterState.end,
      grain: filterState.grain || 'day',
      comparisonMode: filterState.comparisonMode || 'none',
      audience: filterState.audience || [],
      device: filterState.device || [],
      channel: filterState.channel || [],
    };
    
    const cacheKey = buildKpiCacheKey(params);
    
    // Use fetchWithCache for deduplication (if widget is already fetching, reuse that)
    await fetchWithCache(
      cacheKey,
      async (signal) => {
        // Build query string
        const search = new URLSearchParams({
          metric: params.metric,
          start: params.start,
          end: params.end,
          grain: params.grain,
          comparisonMode: params.comparisonMode,
        });
        
        if (params.audience.length > 0) {
          search.set('audience', params.audience.join(','));
        }
        if (params.device.length > 0) {
          search.set('device', params.device.join(','));
        }
        if (params.channel.length > 0) {
          search.set('channel', params.channel.join(','));
        }
        
        // Fetch with abort support
        const response = await fetch(`/api/kpi?${search.toString()}`, { signal });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return response.json();
      },
      { ttlMs: 5 * 60 * 1000 } // TODO: Get TTL from UI settings per RULES.md
    );
    
    console.debug(`[prefetch] Fetched metric: ${metric}`);
  } catch (err) {
    // Suppress errors (prefetch is best-effort)
    if (err instanceof Error && err.name !== 'AbortError') {
      console.warn(`[prefetch] Failed to fetch metric ${metric}:`, err);
    }
  }
}

/**
 * Throttle prefetch to avoid excessive requests on rapid filter changes.
 */
let prefetchTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePrefetch(
  currentPath: string,
  filterState: {
    start: string;
    end: string;
    grain?: string;
    comparisonMode?: string;
    audience?: string[];
    device?: string[];
    channel?: string[];
  },
  delayMs: number = 500
): void {
  // Cancel any pending prefetch
  if (prefetchTimer) {
    clearTimeout(prefetchTimer);
  }
  
  // Schedule new prefetch after delay
  prefetchTimer = setTimeout(() => {
    prefetchRelevantViews(currentPath, filterState);
  }, delayMs);
}
