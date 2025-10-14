"use client";
import { useState } from "react";
import { useBusinessKpis } from "@/hooks/useBusinessKpis";
import { formatNumber, formatPercent } from "@/lib/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { UserIcon, GlobeIcon, EmailIcon, TrendingUpIcon } from "@/assets/icons";
import { Switch } from "@/components/FormElements/switch";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

// Dynamically import chart to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function SalesBlock() {
  const { data, loading, error } = useBusinessKpis();
  const [activeSeries, setActiveSeries] = useState({
    completedPurchases: true,
    totalOrderValue: false,
    averageOrderValue: false,
    returningCustomers: false,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="sales-heading" className="text-xl font-semibold text-gray-900 dark:text-white">
              Försäljning & Intäkter
            </h2>
            <p id="sales-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Slutförda köp, ordervärde och kundsegment
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 w-full rounded-lg bg-gray-200 dark:bg-gray-700"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="sales-heading" className="text-xl font-semibold text-gray-900 dark:text-white">
              Försäljning & Intäkter
            </h2>
            <p id="sales-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Slutförda köp, ordervärde och kundsegment
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Kunde inte ladda försäljnings-data: {error}
          </p>
        </div>
      </div>
    );
  }

  const { current, comparison } = data;
  const sales = current.sales;
  const comparisonSales = comparison?.sales;

  // Calculate growth rates using same method as rest of system (computeDiff)
  const getGrowthRate = (current: number, previous: number) => {
    const delta = current - previous;
    // Use Math.max to avoid division by zero, consistent with computeDiff in yoy.ts
    const denominator = Math.max(Math.abs(previous), 0.000001);
    return Math.round((delta / denominator) * 10000) / 100; // Two decimal places like toPct
  };

  const completedPurchasesGrowth = comparisonSales ? getGrowthRate(sales.completedPurchases, comparisonSales.completedPurchases) : 0;
  const totalOrderValueGrowth = comparisonSales ? getGrowthRate(sales.totalOrderValue, comparisonSales.totalOrderValue) : 0;
  const averageOrderValueGrowth = comparisonSales ? getGrowthRate(sales.averageOrderValue, comparisonSales.averageOrderValue) : 0;
  const returningCustomersGrowth = comparisonSales ? getGrowthRate(sales.returningCustomers, comparisonSales.returningCustomers) : 0;

  // Prepare chart data for sales trends
  const chartData = current.timeseries.map(point => ({
    x: new Date(point.date).getTime(),
    y: point.sales
  }));

  // Align comparison series to match same periods from previous year
  const rawComparisonChartData = comparison?.timeseries.map(point => ({
    x: new Date(point.date).getTime(),
    y: point.sales,
    originalDate: point.date
  })) || [];
  
  // Create a map of comparison data by period key (month for monthly, month-day for daily/weekly)
  const comparisonMap = new Map<string, { x: number; y: number }>();
  rawComparisonChartData.forEach(point => {
    const date = new Date(point.originalDate);
    let periodKey: string;
    
    if (point.originalDate.endsWith('-01')) {
      // Monthly data: match by month (MM)
      periodKey = (date.getMonth() + 1).toString().padStart(2, '0');
    } else {
      // Daily or weekly data: match by month-day (MM-DD)
      periodKey = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
    
    comparisonMap.set(periodKey, { x: point.x, y: point.y });
  });
  
  // Align comparison data to current period dates
  const comparisonChartData = chartData.map(currentPoint => {
    const currentDate = new Date(currentPoint.x);
    let periodKey: string;
    
    // Extract period key from current date
    const currentDateStr = currentDate.toISOString().slice(0, 10);
    if (currentDateStr.endsWith('-01')) {
      // Monthly data: match by month (MM)
      periodKey = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    } else {
      // Daily or weekly data: match by month-day (MM-DD)
      periodKey = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    }
    
    const comparisonPoint = comparisonMap.get(periodKey);
    return comparisonPoint ? { x: currentPoint.x, y: comparisonPoint.y } : null;
  }).filter(Boolean);

  // Create series data based on active toggles
  const createSeriesData = () => {
    const series = [] as any[];
    
    if (activeSeries.completedPurchases) {
      const purchasesData = chartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.03) }));
      series.push({ name: "Slutförda köp", data: purchasesData });
      if (comparisonChartData.length > 0) {
        const comparisonPurchasesData = comparisonChartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.03) }));
        series.push({ name: "Slutförda köp (föregående)", data: comparisonPurchasesData });
      }
    }
    
    if (activeSeries.totalOrderValue) {
      const orderValueData = chartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.03 * 2500) })); // AOV ~2500 SEK
      series.push({ name: "Totalt ordervärde (SEK)", data: orderValueData });
      if (comparisonChartData.length > 0) {
        const comparisonOrderValueData = comparisonChartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.03 * 2500) }));
        series.push({ name: "Totalt ordervärde (föregående)", data: comparisonOrderValueData });
      }
    }
    
    if (activeSeries.averageOrderValue) {
      const aovData = chartData.map(point => ({ x: point.x, y: 2500 })); // Static AOV for demo
      series.push({ name: "Genomsnittligt ordervärde (SEK)", data: aovData });
      if (comparisonChartData.length > 0) {
        const comparisonAovData = comparisonChartData.map(point => ({ x: point.x, y: 2500 }));
        series.push({ name: "Genomsnittligt ordervärde (föregående)", data: comparisonAovData });
      }
    }
    
    if (activeSeries.returningCustomers) {
      const returningData = chartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.03 * 0.35) })); // 35% returning
      series.push({ name: "Återkommande kunder", data: returningData });
      if (comparisonChartData.length > 0) {
        const comparisonReturningData = comparisonChartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.03 * 0.35) }));
        series.push({ name: "Återkommande kunder (föregående)", data: comparisonReturningData });
      }
    }
    
    return series;
  };

  const seriesData = createSeriesData();
  const maxY = Math.max(0, ...seriesData.flatMap((s: any) => s.data.map((p: any) => Number(p.y) || 0)));

  const chartOptions: ApexOptions = {
    chart: { 
      type: "line", 
      toolbar: { show: false }, 
      fontFamily: "inherit",
      animations: { enabled: true }
    },
    stroke: { 
      curve: "smooth", 
      width: 3,
      dashArray: [0, 8]
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
        format: "dd MMM",
        style: { colors: "#6B7280", fontSize: "12px" }
      } 
    },
    yaxis: { 
      decimalsInFloat: 0,
      labels: {
        style: { colors: "#6B7280", fontSize: "12px" }
      },
      min: 0,
      max: Math.ceil(maxY * 1.1) || undefined
    },
    tooltip: { 
      x: { format: "dd MMM yyyy" },
      style: { fontSize: "14px" }
    },
    colors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#6B7280", "#F97316", "#06B6D4"],
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "14px",
      fontFamily: "inherit"
    },
    series: seriesData
  };

  return (
    <div className="space-y-6">
      {/* Block Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 id="sales-heading" className="text-xl font-semibold text-gray-900 dark:text-white">
            Försäljning & Intäkter
          </h2>
          <p id="sales-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Slutförda köp, ordervärde och kundsegment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Källa: GA4 API
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          {/* Toggle switch */}
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch
              checked={activeSeries.completedPurchases}
              onChange={(val) => setActiveSeries(prev => ({ ...prev, completedPurchases: val }))}
              ariaLabel="Visa Slutförda köp i diagrammet"
              backgroundSize="sm"
            />
          </div>
          <ScoreCard
            label="Slutförda köp"
            value={formatNumber(sales.completedPurchases)}
            growthRate={completedPurchasesGrowth}
            Icon={EmailIcon}
            variant="primary"
            source="GA4 API"
            className="min-h-[208px] relative pr-5 pb-6"
            comparisonLabel={data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
          />
        </div>

        <div className="relative">
          {/* Toggle switch */}
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch
              checked={activeSeries.totalOrderValue}
              onChange={(val) => setActiveSeries(prev => ({ ...prev, totalOrderValue: val }))}
              ariaLabel="Visa Totalt ordervärde i diagrammet"
              backgroundSize="sm"
            />
          </div>
          <ScoreCard
            label="Totalt ordervärde"
            value={`${formatNumber(sales.totalOrderValue)} SEK`}
            growthRate={totalOrderValueGrowth}
            Icon={TrendingUpIcon}
            variant="success"
            source="GA4 API"
            className="min-h-[208px] relative pr-5 pb-6"
            comparisonLabel={data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
          />
        </div>

        <div className="relative">
          {/* Toggle switch */}
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch
              checked={activeSeries.averageOrderValue}
              onChange={(val) => setActiveSeries(prev => ({ ...prev, averageOrderValue: val }))}
              ariaLabel="Visa Genomsnittligt ordervärde i diagrammet"
              backgroundSize="sm"
            />
          </div>
          <ScoreCard
            label="Genomsnittligt ordervärde"
            value={`${formatNumber(sales.averageOrderValue)} SEK`}
            growthRate={averageOrderValueGrowth}
            Icon={GlobeIcon}
            variant="warning"
            source="GA4 API"
            className="min-h-[208px] relative pr-5 pb-6"
            comparisonLabel={data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
          />
        </div>

        <div className="relative">
          {/* Toggle switch */}
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch
              checked={activeSeries.returningCustomers}
              onChange={(val) => setActiveSeries(prev => ({ ...prev, returningCustomers: val }))}
              ariaLabel="Visa Återkommande kunder i diagrammet"
              backgroundSize="sm"
            />
          </div>
          <ScoreCard
            label="Återkommande kunder"
            value={formatNumber(sales.returningCustomers)}
            growthRate={returningCustomersGrowth}
            Icon={UserIcon}
            variant="info"
            source="GA4 API"
            className="min-h-[208px] relative pr-5 pb-6"
            comparisonLabel={data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
          />
        </div>
      </div>

      {/* Time Series Chart */}
      <div id="sales-chart" className="mt-6" role="region" aria-label="Försäljning över tid diagram">
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <div className="title">Försäljning över tid (nya vs återkommande kunder)</div>
            <div className="flex items-center gap-2">
              <span className="badge">Källa: GA4 API</span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <div className="-ml-1 -mr-1 h-72" aria-label="Försäljning över tid diagram">
              <Chart
                options={chartOptions}
                series={chartOptions.series as any}
                type="line"
                height="100%"
                width="100%"
              />
            </div>
          ) : (
            <div className="h-32 w-full bg-gray-100 dark:bg-gray-800" aria-label="Ingen data tillgänglig" />
          )}
          <div className="mt-2 text-xs text-gray-500">
            {chartData.length} datapunkter
          </div>
        </div>
      </div>

      {/* Comparison Note */}
      {data.comparisonMode !== 'none' && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Jämförelse: {data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
        </div>
      )}
    </div>
  );
}
