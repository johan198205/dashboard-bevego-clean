import { Diff, KpiPoint } from './types';

export function safeDivide(numerator: number, denominator: number): number {
  if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0) return 0;
  return numerator / denominator;
}

export function toPct(value: number): number {
  if (!isFinite(value)) return 0;
  return Math.round(value * 10000) / 100; // two decimals percent
}

export function computeDiff(current: number, previous: number): Diff {
  const delta = current - previous;
  const yoyPct = toPct(safeDivide(delta, Math.max(previous, 0.000001)));
  return { current, prev: previous, yoyPct };
}

export function alignYoySeries(current: KpiPoint[], previous: KpiPoint[]): Array<{ current?: KpiPoint; previous?: KpiPoint }> {
  // For YoY comparisons, we need to match the same period from the previous year
  // This means matching month-day for monthly data, week for weekly data, etc.
  const prevMap = new Map<string, KpiPoint>();
  
  for (const p of previous) {
    // Extract the period key based on the date format
    // For monthly data (YYYY-MM-01), use MM-DD
    // For weekly data, use week number
    // For daily data, use MM-DD
    const date = new Date(p.date);
    let periodKey: string;
    
    if (p.date.endsWith('-01')) {
      // Monthly data: match by month (MM)
      periodKey = (date.getMonth() + 1).toString().padStart(2, '0');
    } else {
      // Daily or weekly data: match by month-day (MM-DD)
      periodKey = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
    
    prevMap.set(periodKey, p);
  }
  
  return current.map((c) => {
    const currentDate = new Date(c.date);
    let periodKey: string;
    
    if (c.date.endsWith('-01')) {
      // Monthly data: match by month (MM)
      periodKey = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    } else {
      // Daily or weekly data: match by month-day (MM-DD)
      periodKey = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    }
    
    return { current: c, previous: prevMap.get(periodKey) };
  });
}

export function sumSeries(series: KpiPoint[]): number {
  return series.reduce((acc, p) => acc + (p.value || 0), 0);
}


