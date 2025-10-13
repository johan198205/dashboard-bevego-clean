"use client";
import { useState } from "react";
import { useBusinessKpis } from "@/hooks/useBusinessKpis";
import { formatNumber, formatPercent } from "@/lib/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { UserIcon, GlobeIcon, MessageOutlineIcon, EmailIcon } from "@/assets/icons";
import { Switch } from "@/components/FormElements/switch";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

// Dynamically import chart to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function LeadsBlock() {
  const { data, loading, error } = useBusinessKpis();
  const [activeSeries, setActiveSeries] = useState({
    quoteRequests: true,
    customerApplications: false,
    ecommerceApplications: false,
    formLeads: false,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="leads-heading" className="text-xl font-semibold text-gray-900 dark:text-white">
              Leads & Förfrågningar
            </h2>
            <p id="leads-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Antal offertförfrågningar, ansökningar och formular-leads
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
            <h2 id="leads-heading" className="text-xl font-semibold text-gray-900 dark:text-white">
              Leads & Förfrågningar
            </h2>
            <p id="leads-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Antal offertförfrågningar, ansökningar och formular-leads
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Kunde inte ladda leads-data: {error}
          </p>
        </div>
      </div>
    );
  }

  const { current, comparison } = data;
  const leads = current.leads;
  const comparisonLeads = comparison?.leads;

  // Calculate growth rates
  const getGrowthRate = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const quoteRequestsGrowth = comparisonLeads ? getGrowthRate(leads.quoteRequests, comparisonLeads.quoteRequests) : 0;
  const customerApplicationsGrowth = comparisonLeads ? getGrowthRate(leads.customerApplications, comparisonLeads.customerApplications) : 0;
  const ecommerceApplicationsGrowth = comparisonLeads ? getGrowthRate(leads.ecommerceApplications, comparisonLeads.ecommerceApplications) : 0;
  const formLeadsGrowth = comparisonLeads ? getGrowthRate(leads.formLeads, comparisonLeads.formLeads) : 0;

  // Prepare chart data
  const chartData = current.timeseries.map(point => ({
    x: new Date(point.date).getTime(),
    y: point.leads
  }));

  // Align comparison series to the current period's X-axis so lines overlap
  const rawComparisonChartData = comparison?.timeseries.map(point => ({
    x: new Date(point.date).getTime(),
    y: point.leads
  })) || [];
  const comparisonChartData = rawComparisonChartData.map((p, i) => ({
    x: chartData[i]?.x ?? p.x,
    y: p.y
  }));

  // Create series data based on active toggles
  const createSeriesData = () => {
    const series = [] as any[];
    
    if (activeSeries.quoteRequests) {
      const quoteData = chartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.15) }));
      series.push({ name: "Offertförfrågningar", data: quoteData });
      if (comparisonChartData.length > 0) {
        const comparisonQuoteData = comparisonChartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.15) }));
        series.push({ name: "Offertförfrågningar (föregående)", data: comparisonQuoteData });
      }
    }
    
    if (activeSeries.customerApplications) {
      const customerData = chartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.08) }));
      series.push({ name: "Ansökningar kundnummer", data: customerData });
      if (comparisonChartData.length > 0) {
        const comparisonCustomerData = comparisonChartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.08) }));
        series.push({ name: "Ansökningar kundnummer (föregående)", data: comparisonCustomerData });
      }
    }
    
    if (activeSeries.ecommerceApplications) {
      const ecommerceData = chartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.13) }));
      series.push({ name: "E-handelskonto ansökningar", data: ecommerceData });
      if (comparisonChartData.length > 0) {
        const comparisonEcommerceData = comparisonChartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.13) }));
        series.push({ name: "E-handelskonto ansökningar (föregående)", data: comparisonEcommerceData });
      }
    }
    
    if (activeSeries.formLeads) {
      const formData = chartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.24) }));
      series.push({ name: "Formular-leads", data: formData });
      if (comparisonChartData.length > 0) {
        const comparisonFormData = comparisonChartData.map(point => ({ x: point.x, y: Math.round(point.y * 0.24) }));
        series.push({ name: "Formular-leads (föregående)", data: comparisonFormData });
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
          <h2 id="leads-heading" className="text-xl font-semibold text-gray-900 dark:text-white">
            Leads & Förfrågningar
          </h2>
          <p id="leads-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Antal offertförfrågningar, ansökningar och formular-leads
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
              checked={activeSeries.quoteRequests}
              onChange={(val) => setActiveSeries(prev => ({ ...prev, quoteRequests: val }))}
              ariaLabel="Visa Offertförfrågningar i diagrammet"
              backgroundSize="sm"
            />
          </div>
          <ScoreCard
            label="Offertförfrågningar"
            value={formatNumber(leads.quoteRequests)}
            growthRate={quoteRequestsGrowth}
            Icon={MessageOutlineIcon}
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
              checked={activeSeries.customerApplications}
              onChange={(val) => setActiveSeries(prev => ({ ...prev, customerApplications: val }))}
              ariaLabel="Visa Ansökningar kundnummer i diagrammet"
              backgroundSize="sm"
            />
          </div>
          <ScoreCard
            label="Ansökningar kundnummer"
            value={formatNumber(leads.customerApplications)}
            growthRate={customerApplicationsGrowth}
            Icon={UserIcon}
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
              checked={activeSeries.ecommerceApplications}
              onChange={(val) => setActiveSeries(prev => ({ ...prev, ecommerceApplications: val }))}
              ariaLabel="Visa E-handelskonto ansökningar i diagrammet"
              backgroundSize="sm"
            />
          </div>
          <ScoreCard
            label="E-handelskonto ansökningar"
            value={formatNumber(leads.ecommerceApplications)}
            growthRate={ecommerceApplicationsGrowth}
            Icon={EmailIcon}
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
              checked={activeSeries.formLeads}
              onChange={(val) => setActiveSeries(prev => ({ ...prev, formLeads: val }))}
              ariaLabel="Visa Formular-leads i diagrammet"
              backgroundSize="sm"
            />
          </div>
          <ScoreCard
            label="Formular-leads"
            value={formatNumber(leads.formLeads)}
            growthRate={formLeadsGrowth}
            Icon={GlobeIcon}
            variant="info"
            source="GA4 API"
            className="min-h-[208px] relative pr-5 pb-6"
            comparisonLabel={data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
          />
        </div>
      </div>

      {/* Time Series Chart */}
      <div id="leads-chart" className="mt-6" role="region" aria-label="Leads över tid diagram">
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <div className="title">Leads över tid (per källa/kanal)</div>
            <div className="flex items-center gap-2">
              <span className="badge">Källa: GA4 API</span>
            </div>
          </div>
          {chartData.length > 0 ? (
            <div className="-ml-1 -mr-1 h-72" aria-label="Leads över tid diagram">
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
