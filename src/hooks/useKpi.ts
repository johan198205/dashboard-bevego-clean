"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilters } from "@/components/GlobalFilters";
import { usePathname } from "next/navigation";
import { fetchWithCache, buildKpiCacheKey, abortAllRequests } from "@/lib/dataCache";
import { schedulePrefetch } from "@/lib/prefetch";

type UseKpiOptions = {
  metric: string;
  ttlMs?: number; // cache time, default 5 min
};

type KpiSummary = { value: number | string; growthRate: number };

export function useKpi({ metric, ttlMs = 5 * 60 * 1000 }: UseKpiOptions) {
  const { state } = useFilters();
  const { range, audience, device, channel } = state as any;
  const pathname = usePathname();

  const params = useMemo(() => {
    const effectiveComparison = range.comparisonMode || "yoy";
    return {
      metric,
      start: range.start,
      end: range.end,
      grain: range.grain || "day",
      comparisonMode: effectiveComparison,
      audience,
      device,
      channel,
    };
  }, [metric, range.start, range.end, range.grain, range.comparisonMode, audience, device, channel]);

  const cacheKey = useMemo(() => buildKpiCacheKey(params), [params]);

  const [data, setData] = useState<KpiSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    // Fetch with enhanced cache (deduplication, abort support, stale-while-revalidate)
    fetchWithCache(
      cacheKey,
      async (signal) => {
        const search = new URLSearchParams({
          metric: params.metric,
          start: params.start,
          end: params.end,
          grain: params.grain,
          comparisonMode: params.comparisonMode,
        });
        
        if ((params.audience as string[] | undefined)?.length) {
          search.set('audience', (params.audience as string[]).join(','));
        }
        if ((params.device as string[] | undefined)?.length) {
          search.set('device', (params.device as string[]).join(','));
        }
        if ((params.channel as string[] | undefined)?.length) {
          search.set('channel', (params.channel as string[]).join(','));
        }

        const res = await fetch(`${window.location.origin}/api/kpi?${search.toString()}`, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      },
      { ttlMs }
    )
      .then((json) => {
        if (cancelled) return;
        
        const valueRaw = json.summary.current;
        const summary: KpiSummary = {
          value: valueRaw,
          growthRate: json.summary.yoyPct ?? 0,
        };
        
        setData(summary);
        const src = (json.notes || []).find?.((n: string) => n.startsWith("Källa:"))?.replace("Källa:", "").trim();
        setSource(src);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e.name === 'AbortError') {
          // Aborted fetch is expected on filter change
          console.debug('[useKpi] Request aborted for metric:', metric);
          return;
        }
        setError(e?.message || "Unknown error");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, params, ttlMs]);

  // Trigger prefetch on filter change (throttled)
  useEffect(() => {
    if (pathname) {
      schedulePrefetch(pathname, {
        start: range.start,
        end: range.end,
        grain: range.grain || 'day',
        comparisonMode: range.comparisonMode || 'none',
        audience,
        device,
        channel,
      });
    }
  }, [pathname, range.start, range.end, range.grain, range.comparisonMode, audience, device, channel]);

  return { data, loading, error, source };
}


