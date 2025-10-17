"use client";
import SectionLayout from "@/components/oversikt-besok/SectionLayout";
import InfoTooltip from "@/components/InfoTooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import dynamic from "next/dynamic";
import { useFilters } from "@/components/GlobalFilters";
import { useEffect, useMemo, useState } from "react";
import { formatNumber, formatPercent } from "@/lib/format";

// Avoid SSR issues
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// TODO: Aktivera när GA4-offertdata finns
const OFFERT_PER_CATEGORY_DISABLED = true;

type Row = { key: string; value: number; deltaPct?: number };
type TopItemRow = {
  name: string;
  itemsViewed: number;
  itemsAddedToCart: number;
  itemsPurchased: number;
  itemRevenue: number;
};

export default function ProductCategoryBlock() {
  const { state } = useFilters();
  const [topItems, setTopItems] = useState<TopItemRow[]>([]);
  const [detailViews, setDetailViews] = useState<Row[]>([]);
  const [requestsByCategory, setRequestsByCategory] = useState<Row[]>([]);
  const [topCategoriesByConv, setTopCategoriesByConv] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryLevel, setCategoryLevel] = useState<'category1' | 'category2' | 'category3'>('category2');

  // Memoize query parameters for performance
  const queryParams = useMemo(() => {
    return new URLSearchParams({
      start: state.range.start,
      end: state.range.end,
      grain: state.range.grain,
      comparisonMode: state.range.comparisonMode,
      channel: state.channel[0] || 'Alla',
      device: state.device[0] || 'Alla',
      categoryLevel: categoryLevel,
    }).toString();
  }, [state.range.start, state.range.end, state.range.grain, state.range.comparisonMode, state.channel, state.device, categoryLevel]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Use memoized query parameters for performance
        const [itemsRes, a, bMaybe, c] = await Promise.all([
          fetch(`/api/ga4/top-items?${queryParams}`),
          fetch(`/api/kpi?metric=product_detail_views&${queryParams}`),
          OFFERT_PER_CATEGORY_DISABLED ? Promise.resolve(null) : fetch(`/api/kpi?metric=quote_requests_by_category&${queryParams}`),
          fetch(`/api/ga4/top-categories?${queryParams}`),
        ]);
        let ra: any = null, rb: any = null, rc: any = null;
        if (a.ok) ra = await a.json();
        if (bMaybe && (bMaybe as Response).ok) rb = await (bMaybe as Response).json();
        if (c.ok) rc = await c.json();
        let items: TopItemRow[] = [];
        if (itemsRes.ok) {
          const j = await itemsRes.json();
          items = Array.isArray(j.items) ? j.items : [];
        }
        if (cancelled) return;

        // If any response missing, use mock data to render the UI
        const mockDetail: Row[] = [
          { key: "Spik 90mm", value: 1240, deltaPct: 6.2 },
          { key: "Gips 13mm", value: 990, deltaPct: -2.1 },
          { key: "Mineralull 45mm", value: 820, deltaPct: 3.4 },
          { key: "Färg Inne Vit", value: 610, deltaPct: 1.1 },
        ];
        const mockRequests: Row[] = [
          { key: "Stålprofiler", value: 210, deltaPct: 4.8 },
          { key: "Fasad", value: 150, deltaPct: -1.5 },
          { key: "Träregel", value: 120, deltaPct: 2.2 },
          { key: "Isolering", value: 95, deltaPct: 0.9 },
        ];
        const mockTopConv: Row[] = [
          { key: "Fasad", value: 320 },
          { key: "Isolering", value: 280 },
          { key: "Golv", value: 240 },
          { key: "Verktyg", value: 190 },
          { key: "Färg", value: 170 },
        ];

        const dv = (ra?.breakdown || []).slice(0, 10);
        const rq = OFFERT_PER_CATEGORY_DISABLED ? [] : (rb?.breakdown || []).slice(0, 10);
        // Handle GA4 response format for top categories by revenue
        const top = rc?.categories ? rc.categories.slice(0, 5) : (rc?.breakdown || []).slice(0, 5);

        setTopItems((items || []).slice(0, 10));
        setDetailViews(dv.length ? dv : mockDetail);
        setRequestsByCategory(rq.length ? rq : (OFFERT_PER_CATEGORY_DISABLED ? [] : mockRequests));
        setTopCategoriesByConv(top.length ? top : mockTopConv);
        if (!ra || !rb || !rc) setError("Visar mockdata – koppla till riktig datakälla när klar.");
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError("Visar mockdata – " + (e?.message || "Kunde inte ladda data"));
          // Provide mock data on error
          setDetailViews([
            { key: "Spik 90mm", value: 1240, deltaPct: 6.2 },
            { key: "Gips 13mm", value: 990, deltaPct: -2.1 },
          ]);
          setRequestsByCategory([
            { key: "Stålprofiler", value: 210, deltaPct: 4.8 },
            { key: "Fasad", value: 150, deltaPct: -1.5 },
          ]);
          setTopCategoriesByConv([
            { key: "Fasad", value: 320 },
            { key: "Isolering", value: 280 },
            { key: "Golv", value: 240 },
          ]);
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [queryParams]);

  const barSeries = useMemo(() => {
    const items = topCategoriesByConv;
    return [{ name: "Försäljningsvärde (SEK)", data: items.map(r => r.value) }];
  }, [topCategoriesByConv]);

  const barOptions = useMemo(() => ({
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: "55%" } },
    dataLabels: { enabled: false },
    xaxis: { categories: topCategoriesByConv.map(r => r.key) },
    yaxis: { 
      labels: { 
        formatter: (v: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(v)
      } 
    },
    tooltip: {
      y: {
        formatter: (value: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 2 }).format(value)
      }
    },
    colors: ["#E01E26"],
  }), [topCategoriesByConv]);

  return (
    <SectionLayout
      title="Produkt- & Kategoriprestanda"
      description="Detaljvisningar, offertförfrågningar per kategori samt toppkategorier efter försäljningsvärde"
      actions={<InfoTooltip text="Källa: GA4 + affärslogik. Följer globala filter." />}
    >
      {/* Grid: tables + bar + optional heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div role="region" aria-label="Topp 10 produkter" className="card p-4">
          <div className="mb-2 text-base font-bold text-gray-900 dark:text-white">Produkter — topp 10</div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900 dark:text-white font-medium">Produkt</TableHead>
                  <TableHead className="text-right text-gray-900 dark:text-white font-medium">Produktvisningar</TableHead>
                  <TableHead className="text-right text-gray-900 dark:text-white font-medium">Varukorg</TableHead>
                  <TableHead className="text-right text-gray-900 dark:text-white font-medium">Köp</TableHead>
                  <TableHead className="text-right text-gray-900 dark:text-white font-medium">Totalt värde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topItems || []).map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="text-gray-900 dark:text-white">{r.name}</TableCell>
                    <TableCell className="text-right text-gray-900 dark:text-white">{formatNumber(r.itemsViewed || 0)}</TableCell>
                    <TableCell className="text-right text-gray-900 dark:text-white">{formatNumber(r.itemsAddedToCart || 0)}</TableCell>
                    <TableCell className="text-right text-gray-900 dark:text-white">{formatNumber(r.itemsPurchased || 0)}</TableCell>
                    <TableCell className="text-right text-gray-900 dark:text-white">{new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 2 }).format(r.itemRevenue || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {loading && <div className="mt-2 text-xs text-gray-500">Laddar…</div>}
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        </div>

        {OFFERT_PER_CATEGORY_DISABLED ? (
          <div role="region" aria-label="Offertförfrågningar per kategori tabell" className="card p-4 opacity-50 grayscale pointer-events-none">
            <div className="mb-2 text-base font-bold text-gray-900 dark:text-white">Offertförfrågningar per kategori</div>
            <div className="h-24 flex items-center justify-center">
              <span className="text-3xl font-semibold text-gray-400">No data</span>
            </div>
          </div>
        ) : (
          <div role="region" aria-label="Offertförfrågningar per kategori tabell" className="card p-4">
            <div className="mb-2 text-base font-bold text-gray-900 dark:text-white">Offertförfrågningar per kategori</div>
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-900 dark:text-white font-medium">Kategori</TableHead>
                    <TableHead className="text-right text-gray-900 dark:text-white font-medium">Antal</TableHead>
                    <TableHead className="text-right text-gray-900 dark:text-white font-medium">Δ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(requestsByCategory || []).map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="text-gray-900 dark:text-white">{r.key}</TableCell>
                      <TableCell className="text-right text-gray-900 dark:text-white">{formatNumber(r.value)}</TableCell>
                      <TableCell className="text-right text-gray-900 dark:text-white">{r.deltaPct === undefined ? "–" : formatPercent(r.deltaPct)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {loading && <div className="mt-2 text-xs text-gray-500">Laddar…</div>}
            {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div role="img" aria-label="Topp 5 kategorier efter försäljningsvärde stapeldiagram" className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-base font-bold text-gray-900 dark:text-white">Topp 5 produktkategorier efter försäljningsvärde</div>
            <div className="flex items-center gap-2">
              <label htmlFor="categoryLevel" className="text-sm text-gray-600 dark:text-gray-400">Kategori-nivå:</label>
              <select
                id="categoryLevel"
                value={categoryLevel}
                onChange={(e) => setCategoryLevel(e.target.value as 'category1' | 'category2' | 'category3')}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="category1">Category 1</option>
                <option value="category2">Category 2</option>
                <option value="category3">Category 3</option>
              </select>
            </div>
          </div>
          {topCategoriesByConv.length > 0 ? (
            <ApexChart options={barOptions as any} series={barSeries as any} type="bar" height={320} />
          ) : (
            <div className="h-32 w-full flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">Ingen data tillgänglig</span>
            </div>
          )}
        </div>
      </div>

      {/* Heatmap placeholder removed per request */}
    </SectionLayout>
  );
}


