# Manuell uppdatering av AI-insikter caching

Filen `src/components/ScorecardDetailsDrawer.tsx` behöver uppdateras för att använda enhanced cache system.

## Steg 1: Lägg till import (rad ~53)

**Ersätt:**
```typescript
// Cache for insights to avoid redundant OpenAI calls
const insightsCache = new Map<string, { insight: Insight; usedOpenAI: boolean; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

function getCacheKey(metricId: string, dateRange: { start: string; end: string }, filters: any): string {
  const filterKey = JSON.stringify({
    device: filters?.device || [],
    channel: filters?.channel || [],
    audience: filters?.audience || []
  });
  return `${metricId}-${dateRange.start}-${dateRange.end}-${filterKey}`;
}
```

**Med:**
```typescript
// Import enhanced cache system with sessionStorage persistence
import { fetchWithCache, buildInsightsCacheKey, getCacheTTL, rateLimiter } from "@/lib/dataCache";
```

## Steg 2: Uppdatera generateInsights funktionen (rad ~66)

**Ersätt början av funktionen:**
```typescript
async function generateInsights(metricId: string, series: TimePoint[], anomalies: Anomaly[], filters: any, dateRange: { start: string; end: string }, comparisonSeries?: TimePoint[]): Promise<{ insight: Insight; usedOpenAI: boolean }> {
  // Check cache first
  const cacheKey = getCacheKey(metricId, dateRange, filters);
  const cached = insightsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('✓ Using cached insights');
    return cached;
  }
```

**Med:**
```typescript
async function generateInsights(metricId: string, series: TimePoint[], anomalies: Anomaly[], filters: any, dateRange: { start: string; end: string }, comparisonSeries?: TimePoint[]): Promise<{ insight: Insight; usedOpenAI: boolean }> {
  const cacheKey = buildInsightsCacheKey({
    metricId,
    start: dateRange.start,
    end: dateRange.end,
    device: filters?.device || [],
    channel: filters?.channel || [],
    audience: filters?.audience || []
  });

  const rateLimitCheck = rateLimiter.shouldAllow(`insights:${metricId}`);
  if (!rateLimitCheck.allowed) {
    console.warn(`[Insights] Rate limited, waiting ${rateLimitCheck.waitMs}ms`);
    try {
      const cached = await fetchWithCache<{ insight: Insight; usedOpenAI: boolean }>(
        cacheKey,
        async () => { throw new Error('Rate limited'); },
        { ttlMs: getCacheTTL('insights'), forceRefresh: false }
      );
      console.log('✓ Using cached insights (rate limited)');
      return cached;
    } catch {
      // Fall through to mock
    }
  }

  try {
    return await fetchWithCache(
      cacheKey,
      async (signal) => {
```

## Steg 3: Uppdatera fetch-anropet (rad ~117)

**I fetch-anropet, lägg till abort signal:**
```typescript
const response = await fetch('/api/insights', {
  method: 'POST',
  signal, // <-- Lägg till denna rad
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

## Steg 4: Uppdatera error handling (rad ~135-140)

**Ersätt:**
```typescript
if (response.ok) {
  const data = await response.json();
  if (!data.useMock && data.observations) {
    console.log('✓ Using real OpenAI insights');
    const result = { insight: data as Insight, usedOpenAI: true };
    insightsCache.set(cacheKey, { ...result, timestamp: Date.now() });
    return result;
  }
}
```

**Med:**
```typescript
if (response.ok) {
  const data = await response.json();
  if (!data.useMock && data.observations) {
    console.log('✓ Using real OpenAI insights (cached to sessionStorage)');
    const result = { insight: data as Insight, usedOpenAI: true };
    rateLimiter.recordSuccess(`insights:${metricId}`);
    return result;
  }
} else if (response.status === 429 || response.status === 403) {
  rateLimiter.recordFailure(`insights:${metricId}`, true);
  throw new Error('Rate limit exceeded');
}
```

## Steg 5: Uppdatera catch-block (rad ~150-155)

**Ersätt:**
```typescript
} catch (error) {
  console.error('Failed to fetch OpenAI insights:', error);
}
```

**Med:**
```typescript
} catch (error: any) {
  console.error('Failed to fetch OpenAI insights:', error);
  if (rateLimiter.isQuotaError(error)) {
    rateLimiter.recordFailure(`insights:${metricId}`, true);
  } else {
    rateLimiter.recordFailure(`insights:${metricId}`, false);
  }
  if (error.name === 'AbortError') {
    throw error;
  }
}
```

## Steg 6: Uppdatera slutet av funktionen (rad ~190-195)

**Ersätt slutet:**
```typescript
  const result = { insight: { observations, insights, recommendations }, usedOpenAI: false };
  insightsCache.set(cacheKey, { ...result, timestamp: Date.now() });
  return result;
}
```

**Med:**
```typescript
        return { insight: { observations, insights, recommendations }, usedOpenAI: false };
      },
      { ttlMs: getCacheTTL('insights') }
    );
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('[Insights] Cache fetch failed:', error);
    return {
      insight: {
        observations: ['Kunde inte hämta insikter'],
        insights: ['Försök igen senare'],
        recommendations: []
      },
      usedOpenAI: false
    };
  }
}
```

## Resultat

Efter dessa ändringar kommer AI-insikter att:
- ✅ Cachas i sessionStorage (kvarstår vid reload)
- ✅ Använda rate limiting med exponential backoff
- ✅ Stödja abort vid snabba filterändringar
- ✅ Respektera TTL från UI-inställningar (när implementerad)

## Verifiering

1. Öppna en scorecard (klicka på KPI-kort)
2. Se AI-insikter laddas
3. Stäng drawern
4. Reload sidan (F5)
5. Öppna samma scorecard igen
6. **Förväntat**: Insikter laddas omedelbart från cache (se `"✓ Using cached insights"` i konsol)
