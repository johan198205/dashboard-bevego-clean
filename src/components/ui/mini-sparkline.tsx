"use client";

import { useEffect, useMemo, useState } from "react";
import { useFilters } from "@/components/GlobalFilters";
import type { Grain } from "@/lib/types";

export type TimePoint = { x: number; y: number };

type MiniSparklineProps = {
  getSeries?: (args: { start: string; end: string; grain: Grain; filters: any }) => Promise<TimePoint[]>;
  className?: string;
  colorClassName?: string; // use Tailwind text-* classes; stroke uses currentColor
  height?: number;
  amplify?: number; // exaggerate min/max delta for clearer visual
  auto?: boolean; // auto amplify if series is too flat
};

export function MiniSparkline({ getSeries, className, colorClassName = "text-red", height = 36, amplify = 1.4, auto = true }: MiniSparklineProps) {
  const { state } = useFilters();
  const [series, setSeries] = useState<TimePoint[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    if (!getSeries) {
      setSeries([]);
      return;
    }
    setLoading(true);
    const args = {
      start: state.range.start,
      end: state.range.end,
      grain: state.range.grain,
      filters: { audience: state.audience, device: state.device, channel: state.channel },
    } as const;
    getSeries(args)
      .then((points) => {
        if (!mounted) return;
        setSeries(points || []);
      })
      .catch(() => mounted && setSeries([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [getSeries, state.range.start, state.range.end, state.range.grain, state.audience, state.device, state.channel]);

  const pathData = useMemo(() => {
    if (!series || series.length === 0) return null;
    const width = 200; // viewBox width; svg will scale to container
    const h = height;
    const xs = series.map((p) => p.x);
    const ys = series.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const deltaRatio = maxY === 0 ? 0 : (maxY - minY) / Math.max(1, maxY);
    const usedAmplify = auto ? Math.max(amplify, deltaRatio < 0.12 ? 5 : 3) : amplify;
    const xScale = (x: number) => (maxX === minX ? width : ((x - minX) / (maxX - minX)) * width);
    const yScale = (y: number) => {
      if (maxY === minY) return h / 2;
      let t = (y - minY) / (maxY - minY);
      // amplify variation to avoid flat look on tiny deltas
      t = 0.5 + (t - 0.5) * usedAmplify;
      t = Math.max(0, Math.min(1, t));
      return h - t * h; // invert Y
    };
    const pts = series.map((p) => `${xScale(p.x)},${yScale(p.y)}`);
    // add small baseline padding to highlight shifts
    const area = `M0,${h - 0.5} L ${pts.join(" L ")} L ${width},${h - 0.5} Z`;
    const line = `M ${pts[0]} ${pts.slice(1).map((p) => `L ${p}`).join(" ")}`;
    return { area, line };
  }, [series, height]);

  return (
    <div className={className} aria-hidden="true" role="presentation">
      {loading ? (
        <div className="h-[36px] w-full animate-pulse rounded-md bg-dark-2/10 dark:bg-white/10" />
      ) : !pathData ? (
        // Fallback mini sparkline when data is unavailable
        <svg viewBox={`0 0 200 ${height}`} width="100%" height={height} preserveAspectRatio="none">
          <path d={`M0 ${height - 6} L 60 ${height - 10} L 120 ${height - 18} L 200 ${height - 12}`} fill="none" stroke="#E01E26" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M0 ${height} L 0 ${height} L 200 ${height} Z`} fill="#E01E26" opacity="0.08" />
        </svg>
      ) : (
        <svg viewBox={`0 0 200 ${height}`} width="100%" height={height} className={colorClassName} preserveAspectRatio="none">
          <path d={pathData.area} fill="currentColor" opacity="0.12" />
          <path d={pathData.line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

export default MiniSparkline;


