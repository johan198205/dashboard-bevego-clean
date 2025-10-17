"use client";
import SectionLayout from "@/components/oversikt-besok/SectionLayout";
import InfoTooltip from "@/components/InfoTooltip";
import dynamic from "next/dynamic";
import { useFilters } from "@/components/GlobalFilters";
import { useEffect, useMemo, useState } from "react";
import { formatNumber, formatPercent } from "@/lib/format";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Step = { key: string; value: number };

export default function FunnelBlock() {
  const { state } = useFilters();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query parameters with filters
        const qs = new URLSearchParams({
          start: state.range.start,
          end: state.range.end,
          grain: state.range.grain,
          comparisonMode: state.range.comparisonMode,
        });
        
        // Add channel and device filters if present
        if (state.channel.length > 0) {
          qs.append('channel', state.channel.join(','));
        }
        if (state.device.length > 0) {
          qs.append('device', state.device.join(','));
        }

        const [sessionStart, viewItemList, views, addToCart, beginCheckout, purchases] = await Promise.all([
          fetch(`/api/kpi?metric=session_start&${qs}`),
          fetch(`/api/kpi?metric=view_item_list&${qs}`),
          fetch(`/api/kpi?metric=product_views&${qs}`),
          fetch(`/api/kpi?metric=add_to_cart&${qs}`),
          fetch(`/api/kpi?metric=begin_checkout&${qs}`),
          fetch(`/api/kpi?metric=purchases&${qs}`),
        ]);

        let ss: any = null, vil: any = null, v: any = null, a: any = null, b: any = null, p: any = null;
        if (sessionStart.ok) ss = await sessionStart.json();
        if (viewItemList.ok) vil = await viewItemList.json();
        if (views.ok) v = await views.json();
        if (addToCart.ok) a = await addToCart.json();
        if (beginCheckout.ok) b = await beginCheckout.json();
        if (purchases.ok) p = await purchases.json();
        
        if (cancelled) return;
        
        // Build funnel steps from API data (in correct order)
        const funnelSteps: Step[] = [
          { key: "Alla sessions", value: ss?.summary?.current ?? 0 },
          { key: "Kategorisidor", value: vil?.summary?.current ?? 0 },
          { key: "Produktvisning", value: v?.summary?.current ?? 0 },
          { key: "Varukorg", value: a?.summary?.current ?? 0 },
          { key: "Kassa", value: b?.summary?.current ?? 0 },
          { key: "Köp", value: p?.summary?.current ?? 0 },
        ];
        
        // Use real data only
        setSteps(funnelSteps);
        setError(null);
        
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError("Kunde inte ladda data: " + (e?.message || "Okänt fel"));
          setSteps([]);
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [state.range.start, state.range.end, state.range.grain, state.range.comparisonMode, state.channel.join(","), state.device.join(",")]);

  // Calculate step percentages relative to first step and total conversion rate
  const funnelMetrics = useMemo(() => {
    if (steps.length < 6) return { stepPercentages: [], totalCr: 0 };
    
    const firstStepValue = steps[0]?.value || 0;
    
    // Calculate step percentages (percentage relative to first step)
    const stepPercentages = steps.map(step => 
      firstStepValue > 0 ? (step.value / firstStepValue) * 100 : 0
    );
    
    // Total funnel conversion rate (last step / first step)
    const totalCr = firstStepValue > 0 ? (steps[steps.length - 1]?.value || 0) / firstStepValue * 100 : 0;
    
    return { stepPercentages, totalCr };
  }, [steps]);

  // Chart configuration - Vertical bars
  const series = useMemo(() => [
    { 
      name: "Sessions", 
      data: steps.map(s => s.value)
    }
  ], [steps]);
  const options = useMemo(() => {
    return {
      chart: { 
        type: "bar", 
        toolbar: { show: false }, 
        fontFamily: "inherit" 
      },
      plotOptions: { 
        bar: { 
          horizontal: false, // Vertical bars
          borderRadius: 3,
          dataLabels: {
            position: 'top' // show labels above bars
          }
        } 
      },
      xaxis: { 
        categories: steps.map(s => s.key),
        labels: {
          rotate: -40,
          rotateAlways: true,
          trim: false,
          maxHeight: 120,
          offsetY: 5,
          style: {
            fontSize: '12px'
          }
        },
        tickPlacement: 'on'
      },
      yaxis: {
        labels: {
          formatter: (val: number) => formatNumber(val)
        }
      },
      dataLabels: { 
        enabled: true,
        offsetY: -18, // Raise labels further above bars for readability
        formatter: (val: number, opts: any) => {
          const dataPointIndex = opts.dataPointIndex;
          const percentage = funnelMetrics.stepPercentages[dataPointIndex];
          if (percentage !== undefined && dataPointIndex > 0 && val > 0) {
            return formatPercent(percentage, { decimals: 2, showSign: false });
          }
          return '';
        }, 
        style: { 
          colors: ["#111827"], 
          fontSize: "12px", 
          fontWeight: 600
        },
        background: {
          enabled: false,
        }
      },
      colors: ["#E01E26"],
      grid: { 
        borderColor: "#E5E7EB",
        strokeDashArray: 3,
        padding: {
          bottom: 16
        }
      },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            const dataPointIndex = opts.dataPointIndex;
            const percentage = funnelMetrics.stepPercentages[dataPointIndex];
            if (percentage !== undefined && dataPointIndex > 0) {
              return `${formatNumber(val)} sessions (${formatPercent(percentage, { decimals: 2, showSign: false })})`;
            }
            return `${formatNumber(val)} sessions`;
          }
        }
      }
    };
  }, [steps, funnelMetrics.stepPercentages]);

  // Loading state
  if (loading) {
    return (
      <SectionLayout
        title="Köpresans steg"
        description="Add to cart, Begin checkout och avvisningsfrekvens på produktsidor"
        actions={<InfoTooltip text="Funnel från produktvisning → varukorg → kassa → köp. Δ visar förändring." />}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-4">
            <div className="h-80 w-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
          <div className="card p-4">
            <div className="h-80 w-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
      </SectionLayout>
    );
  }

  // Empty state
  if (steps.length === 0) {
    return (
      <SectionLayout
        title="Köpresans steg"
        description="Add to cart, Begin checkout och avvisningsfrekvens på produktsidor"
        actions={<InfoTooltip text="Funnel från produktvisning → varukorg → kassa → köp. Δ visar förändring." />}
      >
        <div className="card p-8 text-center">
          <div className="text-gray-500">No data</div>
        </div>
      </SectionLayout>
    );
  }

  return (
    <SectionLayout
      title="Köpresans steg"
      description="Add to cart, Begin checkout och avvisningsfrekvens på produktsidor"
      actions={<InfoTooltip text="Funnel från produktvisning → varukorg → kassa → köp. Δ visar förändring." />}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div role="img" aria-label="Funnel-diagram" className="card p-4">
          <ApexChart options={options as any} series={series as any} type="bar" height={360} />
        </div>
        
        <div className="card p-4 space-y-3" aria-label="Funnel-nyckeltal">
          <div className="mb-2 text-base font-bold text-gray-900 dark:text-white">Steg och tapp</div>
          
          {steps.map((step, i) => (
            <div key={step.key} className="flex justify-between">
              <span className="text-gray-900 dark:text-white">{step.key}</span>
              <span className="text-gray-900 dark:text-white">
                {formatNumber(step.value)}
                {i > 0 && funnelMetrics.stepPercentages[i] > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({formatPercent(funnelMetrics.stepPercentages[i], { decimals: 2, showSign: false })})
                  </span>
                )}
              </span>
            </div>
          ))}
          
          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <span className="font-medium text-gray-900 dark:text-white">Total funnel-CR</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatPercent(funnelMetrics.totalCr, { decimals: 2, showSign: false })}
            </span>
          </div>
          
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
      </div>
      
      {/* Bounce-rate TODO removed per request */}
    </SectionLayout>
  );
}


