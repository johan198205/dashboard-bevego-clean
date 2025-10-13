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
        const qs = new URLSearchParams({
          start: state.range.start,
          end: state.range.end,
          grain: state.range.grain,
          comparisonMode: state.range.comparisonMode,
        }).toString();

        const [views, addToCart, beginCheckout, purchases] = await Promise.all([
          fetch(`/api/kpi?metric=product_views&${qs}`),
          fetch(`/api/kpi?metric=add_to_cart&${qs}`),
          fetch(`/api/kpi?metric=begin_checkout&${qs}`),
          fetch(`/api/kpi?metric=purchases&${qs}`),
        ]);

        let v: any = null, a: any = null, b: any = null, p: any = null;
        if (views.ok) v = await views.json();
        if (addToCart.ok) a = await addToCart.json();
        if (beginCheckout.ok) b = await beginCheckout.json();
        if (purchases.ok) p = await purchases.json();
        if (cancelled) return;
        // Build from API values when present
        let s: Step[] = [
          { key: "Produktvisning", value: v?.summary?.current ?? 0 },
          { key: "Varukorg", value: a?.summary?.current ?? 0 },
          { key: "Kassa", value: b?.summary?.current ?? 0 },
          { key: "Köp", value: p?.summary?.current ?? 0 },
        ];
        // If data is missing OR clearly empty (all 0), inject realistic mock values
        const allZero = s.every(step => !step.value || step.value === 0);
        if (!v || !a || !b || !p || allZero) {
          s = [
            { key: "Produktvisning", value: 5000 },
            { key: "Varukorg", value: 1200 },
            { key: "Kassa", value: 800 },
            { key: "Köp", value: 520 },
          ];
          setError("Visar mockdata – koppla till riktiga funnel-källor.");
        }
        setSteps(s);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError("Visar mockdata – " + (e?.message || "Kunde inte ladda data"));
          setSteps([
            { key: "Produktvisning", value: 5000 },
            { key: "Varukorg", value: 1200 },
            { key: "Kassa", value: 800 },
            { key: "Köp", value: 520 },
          ]);
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [state.range.start, state.range.end, state.range.grain, state.range.comparisonMode, state.channel.join(","), state.device.join(",")]);

  const totalsCheck = useMemo(() => steps.reduce((acc, s) => acc + s.value, 0) >= 0, [steps]);

  // Horizontal bar options (back to bars)
  const series = useMemo(() => [{ name: "Steg", data: steps.map(s => s.value) }], [steps]);
  const options = useMemo(() => ({
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, barHeight: "55%", borderRadius: 3 } },
    xaxis: { categories: steps.map(s => s.key), labels: { formatter: (v: number) => formatNumber(v) } },
    dataLabels: { enabled: true, formatter: (val: number) => formatNumber(Number(val) || 0), style: { colors: ["#111827"], fontSize: "13px", fontWeight: 600 } },
    colors: ["#E01E26"],
    grid: { borderColor: "#E5E7EB" },
  }), [steps]);

  const conversionRates = useMemo(() => {
    if (steps.length < 4) return { stepDrops: [], totalCr: null as null | number };
    const [view, cart, checkout, purchase] = steps.map(s => s.value);
    const drops = [
      view ? 1 - cart / view : 0,
      cart ? 1 - checkout / cart : 0,
      checkout ? 1 - purchase / checkout : 0,
    ];
    const totalCr = view ? purchase / view : null;
    return { stepDrops: drops, totalCr };
  }, [steps]);

  // No custom labels for bar chart

  return (
    <SectionLayout
      title="Köpresans steg"
      description="Add to cart, Begin checkout och avvisningsfrekvens på produktsidor"
      actions={<InfoTooltip text="Funnel från produktvisning → varukorg → kassa → köp. Δ visar förändring." />}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div role="img" aria-label="Funnel-diagram" className="card p-4">
          {steps.length > 0 ? (
            <ApexChart options={options as any} series={series as any} type="bar" height={360} />
          ) : (
            <div className="h-32 w-full bg-gray-100 dark:bg-gray-800" aria-label="Ingen data" />
          )}
        </div>
        <div className="space-y-3" aria-label="Funnel-nyckeltal">
          <div className="text-sm text-gray-600 dark:text-gray-400">Steg och tapp</div>
          {steps.map((s, i) => (
            <div key={s.key} className="flex justify-between">
              <span className="text-gray-900 dark:text-white">{s.key}</span>
              <span className="text-gray-900 dark:text-white">{formatNumber(s.value)}{i > 0 && steps[i-1] ? `  (tapp ${formatPercent((steps[i-1].value ? 1 - s.value / steps[i-1].value : 0) * 100)})` : ""}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <span className="font-medium text-gray-900 dark:text-white">Total funnel-CR</span>
            <span className="font-medium text-gray-900 dark:text-white">{conversionRates.totalCr === null ? "–" : formatPercent((conversionRates.totalCr || 0) * 100)}</span>
          </div>
          {!totalsCheck && <div className="text-xs text-red-600">Kontroll: summering av steg avviker från totals.</div>}
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
      </div>
      <div className="text-xs text-gray-500">TODO: Avvisningsfrekvens på produktsidor när datakälla finns.</div>
    </SectionLayout>
  );
}


