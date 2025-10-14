"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params, Grain } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import { alignYoySeries } from "@/lib/yoy";
import InfoTooltip from "@/components/InfoTooltip";

type Props = { title: string; metric: Params["metric"]; range: Params["range"] };

type ChartType = 'line' | 'bar';

export default function TimeSeries({ title, metric, range }: Props) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const { state } = useFilters();

  // Local aggregation control: Dag | Vecka | Månad
  const [localGrain, setLocalGrain] = useState<Grain>(range.grain || "day");
  
  // Chart type control: Linje | Stapeldiagram
  const [chartType, setChartType] = useState<ChartType>('line');

  useEffect(() => {
    const effectiveRange = { ...range, grain: localGrain };
    getKpi({ metric, range: effectiveRange, filters: { device: state.device, channel: state.channel } }).then(setData);
  }, [metric, range.start, range.end, range.compareYoy, localGrain, state.device.join(","), state.channel.join(",")]);

  const Chart = useMemo(() => dynamic(() => import('react-apexcharts'), { ssr: false }), []);

  const seriesData = useMemo(() => {
    const points = data?.timeseries || [];
    return points.map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
  }, [data?.timeseries]);

  const compareSeries = useMemo(() => {
    const currentPoints = data?.timeseries || [];
    const comparisonPoints = data?.compareTimeseries || [];
    if (!comparisonPoints || comparisonPoints.length === 0) return [] as { x: number; y: number }[];
    
    // Use alignYoySeries to properly align comparison data with current period
    const alignedData = alignYoySeries(currentPoints, comparisonPoints);
    
    return alignedData.map(({ current, previous }) => {
      if (!current || !previous) return null;
      return { 
        x: new Date(current.date).getTime(), 
        y: previous.value 
      };
    }).filter(Boolean);
  }, [data?.timeseries, data?.compareTimeseries]);

  // Format date labels based on granularity for Swedish locale
  const formatDateLabel = (timestamp: number, grain: Grain): string => {
    const date = new Date(timestamp);
    
    switch (grain) {
      case 'day':
        return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      case 'week':
        const weekNumber = getWeekNumber(date);
        return `v. ${weekNumber} ${date.getFullYear()}`;
      case 'month':
        return date.toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' });
      default:
        return date.toLocaleDateString('sv-SE');
    }
  };

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const options: ApexOptions = useMemo(() => {
    const baseOptions: ApexOptions = {
      chart: { 
        type: chartType, 
        toolbar: { show: false }, 
        fontFamily: "inherit", 
        animations: { enabled: true } 
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
          style: { colors: "#6B7280", fontSize: "12px" },
          formatter: (value: string) => formatDateLabel(Number(value), localGrain)
        } 
      },
      yaxis: { 
        decimalsInFloat: 0,
        labels: {
          style: { colors: "#6B7280", fontSize: "12px" }
        }
      },
      tooltip: { 
        x: { 
          format: localGrain === "month" ? "MMM yyyy" : 
                 localGrain === "week" ? "v. w yyyy" : 
                 "dd MMM yyyy" 
        },
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
    };

    // Add chart-specific options
    if (chartType === 'line') {
      baseOptions.stroke = { 
        curve: "smooth", 
        width: [4, 2], // Current line thicker, comparison thinner
        dashArray: [0, 8] // Current solid, comparison dashed
      };
    } else if (chartType === 'bar') {
      baseOptions.plotOptions = {
        bar: {
          columnWidth: '60%',
          borderRadius: 4,
        }
      };
    }

    return baseOptions;
  }, [localGrain, chartType]);

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
          <div className="hidden md:flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
            <button className={`${chartType === "line" ? "font-semibold" : "opacity-70"}`} onClick={() => setChartType("line")}>Linje</button>
            <span className="opacity-30">|</span>
            <button className={`${chartType === "bar" ? "font-semibold" : "opacity-70"}`} onClick={() => setChartType("bar")}>Stapel</button>
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
              {
                name: title,
                data: seriesData
              },
              ...(compareSeries.length > 0 ? [{
                name: `${title} (föregående)`,
                data: compareSeries
              }] : [])
            ]}
            type={chartType}
            height={160}
            width="100%"
          />
        </div>
      )}
      <div className="mt-2 text-xs text-gray-500">{data?.timeseries.length || 0} punkter</div>
    </div>
  );
}


