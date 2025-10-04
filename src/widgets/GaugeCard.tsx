"use client";
import { useEffect, useMemo, useState } from "react";
import { Params, KpiResponse } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import { Gauge } from "@/components/ui/gauge";
import { UserIcon, GlobeIcon, CheckIcon } from "@/assets/icons";
import InfoTooltip from "@/components/InfoTooltip";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";

type Props = {
  title: string;
  metric: Params["metric"];
  range: Params["range"];
  baseValue?: number; // Base value for percentage calculation
  compact?: boolean; // Compact size for top row
};

// Icon mapping for different metrics
const getMetricIcon = (metric: string) => {
  switch (metric) {
    case "tasks_rate":
      return UserIcon;
    case "features_rate":
      return GlobeIcon;
    case "cwv_total":
      return CheckIcon;
    default:
      return UserIcon;
  }
};

export default function GaugeCard({ title, metric, range, baseValue = 100, compact = false }: Props) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const { state } = useFilters();
  const [open, setOpen] = useState(false);
  
  // Call server API to avoid bundling GA4 SDK in client build
  const fetchKpi = async (args: { metric: Props["metric"]; start: string; end: string; grain: any; comparisonMode?: any; filters?: any }): Promise<KpiResponse> => {
    const qs = new URLSearchParams({
      metric: String(args.metric),
      start: args.start,
      end: args.end,
      grain: args.grain || "day",
      comparisonMode: args.comparisonMode || "none",
    }).toString();
    const resp = await fetch(`/api/kpi?${qs}`);
    if (!resp.ok) throw new Error(`KPI API error ${resp.status}`);
    return resp.json();
  };
  
  // Get comparison label based on current comparison mode
  const getComparisonLabel = () => {
    // NDI always shows quarter comparison regardless of global comparison mode
    if (metric === 'ndi') {
      return 'vs. föregående kvartal';
    }
    
    switch (state.range.comparisonMode) {
      case 'yoy': return 'vs. föregående år';
      case 'prev': return 'vs. föregående period';
      case 'none': return null; // No comparison label when none is selected
      default: return 'vs. föregående period';
    }
  };
  
  useEffect(() => {
    fetchKpi({ metric, start: range.start, end: range.end, grain: range.grain, comparisonMode: state.range.comparisonMode, filters: { audience: state.audience, device: state.device, channel: state.channel } })
      .then(setData)
      .catch(() => setData(null));
  }, [metric, range.start, range.end, range.compareYoy, range.grain, state.audience.join(","), state.device.join(","), state.channel.join(",")]);

  const summary = data?.summary;
  const Icon = getMetricIcon(metric);
  
  const getSeries = useMemo(() => async ({ start, end, grain, filters }: any) => {
    const res = await fetchKpi({ metric, start, end, grain, comparisonMode: state.range.comparisonMode, filters });
    return (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
  }, [metric, state.range.comparisonMode]);

  const getCompareSeries = useMemo(() => async ({ start, end, grain, filters }: any) => {
    const res = await fetchKpi({ metric, start, end, grain, comparisonMode: state.range.comparisonMode, filters });
    const points = res.compareTimeseries || [];
    const cur = (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    return points.map((p, i) => ({ x: cur[i]?.x ?? new Date(p.date).getTime(), y: p.value }));
  }, [metric, state.range.comparisonMode]);

  // Calculate percentage value
  const percentageValue = summary ? Math.min(100, Math.max(0, summary.current)) : 0;
  const displayValue = percentageValue.toFixed(2);

  return (
    <div className="relative">
      <div 
        className={`relative overflow-hidden rounded-xl border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark cursor-pointer hover:shadow-2 transition-shadow duration-200 ${
          compact ? 'px-4 py-4' : 'px-7.5 py-6'
        }`}
        onClick={() => setOpen(true)}
      >
        {/* Header - match other scorecards with icon on right */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`font-bold text-black dark:text-white ${
              compact ? 'text-sm' : 'text-title-md'
            }`}>
              {title}
            </h4>
            <p className={`font-medium text-body-color dark:text-dark-5 ${
              compact ? 'text-xs' : 'text-sm'
            }`}>{data?.notes?.find?.(n => n.startsWith("Källa:"))?.replace("Källa:", "").trim() || "Mock"}</p>
          </div>
          <div className={`flex items-center justify-center rounded-lg bg-red/10 dark:bg-red-900/30 ${
            compact ? 'h-8 w-8' : 'h-11.5 w-11.5'
          }`}>
            <Icon className={`text-red dark:text-red-400 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
          </div>
        </div>
        
        {/* Info icon in top-right corner like other scorecards */}
        <div className={`absolute ${compact ? 'top-2 right-2' : 'top-4 right-4'}`}>
          <InfoTooltip text={`Metrik: ${metric}. Mockdata och definitioner för demo.`} />
        </div>
        
        {/* Gauge */}
        <div className={`flex justify-center ${compact ? 'mt-3' : 'mt-6'}`}>
          <Gauge 
            valuePct={percentageValue} 
            size={compact ? 100 : 140}
            strokeWidth={compact ? 8 : 10}
          />
        </div>
        
        {/* Growth indicator - match other scorecards */}
        {summary && summary.yoyPct !== undefined && getComparisonLabel() && (
          <div className={`flex justify-center ${compact ? 'mt-2' : 'mt-4'}`}>
            <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              summary.yoyPct >= 0 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border dark:border-green-800' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border dark:border-red-800'
            }`}>
              <span>{summary.yoyPct >= 0 ? '↗' : '↘'}</span>
              <span>{Math.abs(summary.yoyPct).toFixed(1)}% {getComparisonLabel()}</span>
            </div>
          </div>
        )}
      </div>
      
      <ScorecardDetailsDrawer
        open={open}
        onClose={() => setOpen(false)}
        metricId={metric}
        title={title}
        sourceLabel={data?.notes?.find?.(n => n.startsWith("Källa:"))?.replace("Källa:", "").trim() || "Mock"}
        getSeries={getSeries}
        getCompareSeries={getCompareSeries}
      />
    </div>
  );
}
