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
  const prevMap = new Map(previous.map((p) => [p.date, p] as const));
  return current.map((c) => ({ current: c, previous: prevMap.get(c.date) }));
}

export function sumSeries(series: KpiPoint[]): number {
  return series.reduce((acc, p) => acc + (p.value || 0), 0);
}


