"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params, Grain } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import InfoTooltip from "@/components/InfoTooltip";

type Props = { title: string; metric: Params["metric"]; range: Params["range"] };

export default function TimeSeries({ title, metric, range }: Props) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const { state } = useFilters();

  // Local aggregation control: Dag | Vecka | Månad
  const [localGrain, setLocalGrain] = useState<Grain>(range.grain || "day");

  useEffect(() => {
    const effectiveRange = { ...range, grain: localGrain };
    getKpi({ metric, range: effectiveRange, filters: { audience: state.audience, device: state.device, channel: state.channel } }).then(setData);
  }, [metric, range.start, range.end, range.compareYoy, localGrain, state.audience.join(","), state.device.join(","), state.channel.join(",")]);

  const Chart = useMemo(() => dynamic(() => import("react-apexcharts"), { ssr: false }), []);

  const seriesData = useMemo(() => {
    const points = data?.timeseries || [];
    return points.map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
  }, [data?.timeseries]);

  const compareSeries = useMemo(() => {
    const points = data?.compareTimeseries || [];
    if (!points || points.length === 0) return [] as { x: number; y: number }[];
    // Index-align: map to same x as current by index to overlay
    return points.map((p, i) => ({ x: seriesData[i]?.x ?? new Date(p.date).getTime(), y: p.value }));
  }, [data?.compareTimeseries, seriesData]);

  const options: ApexOptions = useMemo(() => ({
    chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit", animations: { enabled: true } },
    stroke: { 
      curve: "smooth", 
      width: [4, 2], // Current line thicker, comparison thinner
      dashArray: [0, 8] // Current solid, comparison dashed
    },
    grid: { 
      strokeDashArray: 5, 
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } }
    },
    dataLabels: { enabled: false },
    xaxis: { 
      type: "datetime", 
      axisBorder: { show: false }, 
      axisTicks: { show: false }, 
      labels: { 
        datetimeUTC: false,
        style: { colors: "#6B7280", fontSize: "12px" }
      } 
    },
    yaxis: { 
      decimalsInFloat: 0,
      labels: {
        style: { colors: "#6B7280", fontSize: "12px" }
      }
    },
    tooltip: { 
      x: { format: localGrain === "month" ? "MMM ''yy" : "dd MMM yyyy" },
      style: { fontSize: "14px" }
    },
    colors: ["#E01E26", "#9CA3AF"], // Primary red for current, neutral gray for comparison
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "14px",
      fontFamily: "inherit",
      markers: {
        size: 10,
        strokeWidth: 3
      },
      itemMargin: {
        horizontal: 16,
        vertical: 8
      }
    },
  }), [localGrain]);

  return (
    <div className="card" suppressHydrationWarning>
      <div className="mb-2 flex items-center justify-between">
        <div className="title">{title}</div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
            <button className={`${localGrain === "day" ? "font-semibold" : "opacity-70"}`} onClick={() => setLocalGrain("day")}>Dag</button>
            <span className="opacity-30">|</span>
            <button className={`${localGrain === "week" ? "font-semibold" : "opacity-70"}`} onClick={() => setLocalGrain("week")}>Vecka</button>
            <span className="opacity-30">|</span>
            <button className={`${localGrain === "month" ? "font-semibold" : "opacity-70"}`} onClick={() => setLocalGrain("month")}>Månad</button>
          </div>
          <span className="badge">Källa: Mock</span>
          <InfoTooltip text={`Tidsserie för ${metric}. Mockdata.`} />
        </div>
      </div>
      {seriesData.length === 0 ? (
        <div className="h-32 w-full bg-gray-100" aria-label="diagram placeholder" />
      ) : (
        <div className="-ml-1 -mr-1 h-40" aria-label={title}>
          <Chart 
            options={options} 
            series={[
              { name: 'Nuvarande', data: seriesData }, 
              ...(compareSeries.length ? [{ name: 'Jämförelse', data: compareSeries }] : [])
            ]} 
            type="line" 
            height={160} 
          />
        </div>
      )}
      <div className="mt-2 text-xs text-gray-500">{data?.timeseries.length || 0} punkter</div>
    </div>
  );
}


