import { BreakdownRow, Diff, Grain, KpiPoint, KpiResponse } from "../types";
import { alignYoySeries, computeDiff, sumSeries } from "../yoy";

type SeedConfig = {
  base: number;
  seasonalityByMonth?: number[]; // 12 length multipliers
  noise?: number; // 0..1
  seedKey?: string; // optional to diversify series per metric/source
};

export function generateDateRange(start: string, end: string, grain: Grain = "day"): string[] {
  // Always generate daily dates; higher-level grains will be aggregated from these.
  const out: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function generateTimeseries(range: { start: string; end: string; grain?: Grain }, seed: SeedConfig): KpiPoint[] {
  // Ignore input grain here; always produce daily series and aggregate later.
  const dates = generateDateRange(range.start, range.end, "day");
  const months = seed.seasonalityByMonth || [1, 0.95, 1.02, 1.04, 1.05, 1.01, 0.85, 0.98, 1.03, 1.04, 1.02, 1.01];
  const noise = seed.noise ?? 0.08;
  return dates.map((d) => {
    const dt = new Date(d);
    const m = dt.getUTCMonth();
    const seasonal = months[m] || 1;
    // Deterministic pseudo-random per date to keep Day/Week/Month consistent across requests
    const r = deterministicRandom(seed.seedKey ? `${d}|${seed.seedKey}` : d);
    const jitter = 1 + (r * 2 - 1) * noise;
    const value = Math.max(0, Math.round(seed.base * seasonal * jitter));
    return { date: d, value };
  });
}

export function aggregate(series: KpiPoint[], grain: Grain): KpiPoint[] {
  if (grain === "day") {
    // Ensure sorted ascending by date
    return [...series].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  const buckets = new Map<string, number>();
  for (const p of series) {
    const dt = new Date(p.date);
    let key = p.date;
    if (grain === "week") {
      // Bucket to Monday of the week (week starts on Monday)
      const monday = startOfWeekMonday(dt);
      key = monday.toISOString().slice(0, 10);
    } else if (grain === "month") {
      // First day of the month
      const first = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1));
      key = first.toISOString().slice(0, 10);
    }
    buckets.set(key, (buckets.get(key) || 0) + p.value);
  }
  return Array.from(buckets.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Special aggregation function for average metrics (like avgEngagementTime)
export function aggregateAverage(series: KpiPoint[], grain: Grain): KpiPoint[] {
  if (grain === "day") {
    // Ensure sorted ascending by date
    return [...series].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const p of series) {
    const dt = new Date(p.date);
    let key = p.date;
    if (grain === "week") {
      // Bucket to Monday of the week (week starts on Monday)
      const monday = startOfWeekMonday(dt);
      key = monday.toISOString().slice(0, 10);
    } else if (grain === "month") {
      // First day of the month
      const first = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1));
      key = first.toISOString().slice(0, 10);
    }
    const existing = buckets.get(key) || { sum: 0, count: 0 };
    buckets.set(key, { sum: existing.sum + p.value, count: existing.count + 1 });
  }
  return Array.from(buckets.entries())
    .map(([date, data]) => ({ date, value: data.sum / data.count }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function startOfWeekMonday(date: Date): Date {
  // Create a UTC date at 00:00 and move back to Monday
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const diff = (day === 0 ? -6 : 1 - day); // if Sunday, go back 6 days; else back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function deterministicRandom(key: string): number {
  // Simple string hash → [0,1). Not cryptographic, just stable.
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  // Convert to positive 32-bit and normalize
  const x = (h >>> 0) / 4294967295;
  return x;
}

export function computeYoy(currentSeries: KpiPoint[], previousSeries: KpiPoint[]): { summary: Diff; pairs: Array<{ current?: KpiPoint; previous?: KpiPoint }>; } {
  const pairs = alignYoySeries(currentSeries, previousSeries);
  const currentTotal = sumSeries(currentSeries);
  const previousTotal = sumSeries(previousSeries);
  return { summary: computeDiff(currentTotal, previousTotal), pairs };
}

export function buildBreakdown(keys: string[], total: number, previousBreakdown?: BreakdownRow[]): BreakdownRow[] {
  const rows: BreakdownRow[] = [];
  let remaining = total;
  const parts = keys.length;
  
  // Create a map of previous values for comparison
  const prevMap = new Map<string, number>();
  if (previousBreakdown) {
    previousBreakdown.forEach(row => {
      prevMap.set(row.key, row.value);
    });
  }
  
  for (let i = 0; i < parts; i++) {
    const isLast = i === parts - 1;
    const portion = isLast ? remaining : Math.round((total / parts) * (0.7 + Math.random() * 0.6));
    remaining -= portion;
    
    // Calculate percentage change if we have previous data
    let yoyPct: number | undefined;
    const currentValue = Math.max(0, portion);
    const prevValue = prevMap.get(keys[i]);
    if (prevValue !== undefined && prevValue !== null && prevValue !== 0) {
      yoyPct = ((currentValue - prevValue) / prevValue) * 100;
    } else {
      // Fallback to random value if no previous data
      yoyPct = Math.round((Math.random() * 20 - 10) * 100) / 100;
    }
    
    rows.push({ key: keys[i], value: currentValue, yoyPct });
  }
  // Stable sorting: primary by value desc, tiebreak by key asc (alphabetical)
  const sorted = rows.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return a.key.localeCompare(b.key);
  });
  // Return all rows; UI can limit visible rows via scroll
  return sorted;
}

export function buildKpiResponse(metric: string, series: KpiPoint[], previous?: KpiPoint[], breakdownKeys?: string[], notes?: string[], source: "mock" | "ga4" = 'mock', previousBreakdown?: BreakdownRow[]): KpiResponse {
  const currentAgg = sumSeries(series);
  let summary: Diff = { current: currentAgg, prev: 0, yoyPct: 0 };
  if (previous) {
    const prevAgg = sumSeries(previous);
    summary = computeDiff(currentAgg, prevAgg);
  }
  const breakdown = breakdownKeys ? buildBreakdown(breakdownKeys, currentAgg, previousBreakdown) : undefined;
  return {
    meta: { source, metric, dims: [] },
    summary,
    timeseries: series,
    compareTimeseries: previous,
    breakdown,
    notes,
  };
}

// Special build function for average metrics (like avgEngagementTime)
export function buildAverageKpiResponse(metric: string, series: KpiPoint[], previous?: KpiPoint[], breakdownKeys?: string[], notes?: string[], source: "mock" | "ga4" = 'mock', previousBreakdown?: BreakdownRow[]): KpiResponse {
  const currentAvg = series.length > 0 ? series.reduce((sum, p) => sum + p.value, 0) / series.length : 0;
  let summary: Diff = { current: currentAvg, prev: 0, yoyPct: 0 };
  if (previous && previous.length > 0) {
    const prevAvg = previous.reduce((sum, p) => sum + p.value, 0) / previous.length;
    summary = computeDiff(currentAvg, prevAvg);
  }
  const breakdown = breakdownKeys ? buildBreakdown(breakdownKeys, currentAvg, previousBreakdown) : undefined;
  return {
    meta: { source, metric, dims: [] },
    summary,
    timeseries: series,
    compareTimeseries: previous,
    breakdown,
    notes,
  };
}


