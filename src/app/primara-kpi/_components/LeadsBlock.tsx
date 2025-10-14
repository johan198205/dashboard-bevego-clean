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

// Helper function to get ISO week number (week starts on Monday)
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // (Sunday=0, Monday=1, etc. so Thursday is 4)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

type ChartType = 'line' | 'bar';
type Granularity = 'day' | 'week' | 'month';

// Helper function to aggregate daily data by granularity
const aggregateDataByGranularity = (data: any[], granularity: Granularity) => {
  if (granularity === 'day') return data;
  
  const aggregated = new Map<string, any>();
  
  data.forEach(point => {
    const date = new Date(point.date);
    let key: string;
    
    if (granularity === 'week') {
      // Get Monday of the week
      const monday = new Date(date);
      monday.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
      key = monday.toISOString().split('T')[0];
    } else if (granularity === 'month') {
      // Get first day of month
      const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      key = firstOfMonth.toISOString().split('T')[0];
    } else {
      key = point.date;
    }
    
    if (aggregated.has(key)) {
      const existing = aggregated.get(key);
      aggregated.set(key, {
        date: key,
        leads: existing.leads + point.leads,
        sales: existing.sales + point.sales,
        conversion: existing.conversion + point.conversion,
        ansok_klick: existing.ansok_klick + point.ansok_klick,
        ehandel_ansok: existing.ehandel_ansok + point.ehandel_ansok,
        form_submit: existing.form_submit + point.form_submit,
      });
    } else {
      aggregated.set(key, { ...point, date: key });
    }
  });
  
  return Array.from(aggregated.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export function LeadsBlock() {
  const { data, loading, error } = useBusinessKpis();
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [activeSeries, setActiveSeries] = useState({
    quoteRequests: false,
    customerApplications: true,
    ecommerceApplications: false,
    formLeads: false,
  });
  // Local toggle to optionally show comparison series (default off)
  const [showCompare, setShowCompare] = useState(false);
  // Chart type controls
  const [chartType, setChartType] = useState<ChartType>('line');

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

  // Calculate growth rates using same method as rest of system (computeDiff)
  const getGrowthRate = (current: number, previous: number) => {
    const delta = current - previous;
    // Use Math.max to avoid division by zero, consistent with computeDiff in yoy.ts
    const denominator = Math.max(Math.abs(previous), 0.000001);
    return Math.round((delta / denominator) * 10000) / 100; // Two decimal places like toPct
  };

  const quoteRequestsGrowth = comparisonLeads ? getGrowthRate(leads.quoteRequests, comparisonLeads.quoteRequests) : 0;
  const customerApplicationsGrowth = comparisonLeads ? getGrowthRate(leads.customerApplications, comparisonLeads.customerApplications) : 0;
  const ecommerceApplicationsGrowth = comparisonLeads ? getGrowthRate(leads.ecommerceApplications, comparisonLeads.ecommerceApplications) : 0;
  const formLeadsGrowth = comparisonLeads ? getGrowthRate(leads.formLeads, comparisonLeads.formLeads) : 0;

  // Prepare real GA4 lead event timeseries per requirement with granularity aggregation
  const currentTimeseries = aggregateDataByGranularity(current.timeseries, granularity);
  const comparisonTimeseries = comparison?.timeseries ? aggregateDataByGranularity(comparison.timeseries, granularity) : [];
  
  // Create proper x-axis labels based on granularity
  const xAxisLabels = currentTimeseries.map((pt, index, arr) => {
    const date = new Date(pt.date);
    if (granularity === 'day') {
      const currentMonth = date.getMonth();
      const currentDay = date.getDate();
      const prevDate = index > 0 ? new Date(arr[index - 1].date) : null;
      const prevMonth = prevDate ? prevDate.getMonth() : -1;

      if (index === 0 || currentMonth !== prevMonth) {
        return date.toLocaleDateString('sv-SE', { day: '2-digit', month: 'short' });
      } else {
        return currentDay.toString();
      }
    } else if (granularity === 'week') {
      // pt.date is already the Monday of the week due to aggregation
      const dayOfMonth = date.getDate();
      const monthName = date.toLocaleDateString('sv-SE', { month: 'short' });

      // Show month name only for first week or when month changes
      let showMonth = false;
      if (index === 0) {
        showMonth = true; // Always show month for first week
      } else {
        // Compare current month with previous week's month
        const prevPt = arr[index - 1];
        const prevDate = new Date(prevPt.date);
        if (date.getMonth() !== prevDate.getMonth()) {
          showMonth = true;
        }
      }

      if (showMonth) {
        return `${dayOfMonth} ${monthName}`;
      } else {
        return String(dayOfMonth);
      }
    } else { // month
      return date.toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' });
    }
  });
  
  const currentSeriesByEvent = {
    customerApplications: currentTimeseries.map(pt => pt.ansok_klick || 0),
    ecommerceApplications: currentTimeseries.map(pt => pt.ehandel_ansok || 0),
    formLeads: currentTimeseries.map(pt => pt.form_submit || 0),
  };
  
  // For comparison data, align with current period for proper comparison
  const compareSeriesByEvent = {
    customerApplications: comparisonTimeseries.map(pt => pt.ansok_klick || 0),
    ecommerceApplications: comparisonTimeseries.map(pt => pt.ehandel_ansok || 0),
    formLeads: comparisonTimeseries.map(pt => pt.form_submit || 0),
  };

  // For tooltip: map current x to the exact comparison date label (aligned by index)
  const compareDateByIndex = comparisonTimeseries.map(pt => pt?.date || '');
  const comparisonModeText = data?.comparisonMode === 'yoy' ? 'föregående år' : data?.comparisonMode === 'prev' ? 'föregående period' : '';

  // Create series data based on active toggles
  const createSeriesData = () => {
    const series = [] as any[];
    
    if (activeSeries.quoteRequests) {
      // No GA4 event available → render empty series when toggled
      const empty = Array(xAxisLabels.length).fill(0);
      series.push({ name: "Offertförfrågningar", data: empty });
      if (showCompare && data.comparisonMode !== 'none') {
        series.push({ name: "Offertförfrågningar (föregående)", data: empty });
      }
    }
    
    if (activeSeries.customerApplications) {
      series.push({ name: "Ansökningar kundnummer", data: currentSeriesByEvent.customerApplications });
      if (showCompare && data.comparisonMode !== 'none') {
        series.push({ name: "Ansökningar kundnummer (föregående)", data: compareSeriesByEvent.customerApplications });
      }
    }
    
    if (activeSeries.ecommerceApplications) {
      series.push({ name: "E-handelskonto ansökningar", data: currentSeriesByEvent.ecommerceApplications });
      if (showCompare && data.comparisonMode !== 'none') {
        series.push({ name: "E-handelskonto ansökningar (föregående)", data: compareSeriesByEvent.ecommerceApplications });
      }
    }
    
    if (activeSeries.formLeads) {
      series.push({ name: "Formular-leads", data: currentSeriesByEvent.formLeads });
      if (showCompare && data.comparisonMode !== 'none') {
        series.push({ name: "Formular-leads (föregående)", data: compareSeriesByEvent.formLeads });
      }
    }
    
    return series;
  };

  const seriesData = createSeriesData();
  const maxY = Math.max(0, ...seriesData.flatMap((s: any) => s.data.map((p: any) => Number(p.y) || 0)));

  // Red theme colors per metric and lighter variants for comparison
  const baseColorMap: Record<string, string> = {
    'Offertförfrågningar': '#ef4444',
    'Ansökningar kundnummer': '#dc2626',
    'E-handelskonto ansökningar': '#b91c1c',
    'Formular-leads': '#991b1b',
  };
  const lightColorMap: Record<string, string> = {
    'Offertförfrågningar': '#fca5a5',
    'Ansökningar kundnummer': '#f87171',
    'E-handelskonto ansökningar': '#fecaca',
    'Formular-leads': '#fee2e2',
  };
  const colors = seriesData.map((s: any) => {
    const isPrev = s.name.includes('(föregående)');
    const baseName = s.name.replace(' (föregående)', '');
    return isPrev ? (lightColorMap[baseName] || '#fca5a5') : (baseColorMap[baseName] || '#ef4444');
  });
  const dashArray = seriesData.map((s: any) => (s.name.includes('(föregående)') ? 8 : 0));

  const chartOptions: ApexOptions = {
    chart: { 
      type: chartType, 
      toolbar: { show: false }, 
      fontFamily: "inherit",
      animations: { enabled: true },
      width: "100%",
      height: "100%"
    },
    stroke: chartType === 'line' ? { 
      curve: "smooth", 
      width: 3,
      dashArray
    } : {},
    plotOptions: chartType === 'bar' ? {
      bar: {
        borderRadius: 2,
        columnWidth: '60%',
      }
    } : {},
    grid: { 
      strokeDashArray: 0, 
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } }
    },
    dataLabels: { enabled: false },
      xaxis: { 
        type: "category",
        categories: xAxisLabels,
        axisBorder: { show: false }, 
        axisTicks: { show: false }, 
        labels: { 
          style: { colors: "#6B7280", fontSize: "12px" },
          ...(granularity === 'day' ? {
            rotate: 0,
            hideOverlappingLabels: false,
            trim: false,
            maxHeight: 60,
            offsetX: 0,
            offsetY: 0
          } : {
            rotate: -45,
            maxHeight: 60,
            trim: true,
            hideOverlappingLabels: true
          })
        },
        tooltip: { enabled: false },
        tickPlacement: 'on'
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
      shared: true,
      intersect: false,
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const currentLabel = w.globals.labels[dataPointIndex];
        const currentValues = series[0][dataPointIndex];
        const comparisonValues = series[1] ? series[1][dataPointIndex] : null;
        
        // Get the actual date from the current timeseries data
        const currentDataPoint = currentTimeseries[dataPointIndex];
        const comparisonDataPoint = comparisonTimeseries[dataPointIndex];
        
        let currentDateLabel = currentLabel;
        let comparisonDateLabel = "";
        
        if (currentDataPoint) {
          const date = new Date(currentDataPoint.date);
          if (granularity === 'day') {
            currentDateLabel = date.toLocaleDateString('sv-SE', { day: '2-digit', month: 'short' });
          } else if (granularity === 'week') {
            const monday = new Date(date);
            monday.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
            const week = getWeekNumber(monday);
            currentDateLabel = `v. ${week}`;
          } else { // month
            currentDateLabel = date.toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' });
          }
        }
        
        if (comparisonDataPoint) {
          const compareDate = new Date(comparisonDataPoint.date);
          if (granularity === 'day') {
            comparisonDateLabel = compareDate.toLocaleDateString('sv-SE', { day: '2-digit', month: 'short' });
          } else if (granularity === 'week') {
            const monday = new Date(compareDate);
            monday.setDate(compareDate.getDate() - (compareDate.getDay() === 0 ? 6 : compareDate.getDay() - 1));
            const week = getWeekNumber(monday);
            comparisonDateLabel = `v. ${week}`;
          } else { // month
            comparisonDateLabel = compareDate.toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' });
          }
        }
        
        let tooltipContent = `
          <div style="padding: 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); font-family: inherit;">
            <div style="font-weight: 600; margin-bottom: 8px; color: #374151;">
              ${currentDateLabel}
            </div>
        `;
        
        if (comparisonValues !== null && comparisonValues !== undefined && comparisonDateLabel) {
          tooltipContent += `
            <div style="margin-bottom: 8px; font-size: 12px; color: #6B7280;">
              Jämför med (föregående år): ${comparisonDateLabel}
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #dc2626; font-weight: 500;">Ansökningar kundnummer:</span>
              <span style="font-weight: 600; margin-left: 4px;">${currentValues || 0}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #dc2626; font-weight: 500;">Ansökningar kundnummer (föregående):</span>
              <span style="font-weight: 600; margin-left: 4px;">${comparisonValues || 0}</span>
            </div>
          `;
        } else {
          tooltipContent += `
            <div style="margin-bottom: 4px;">
              <span style="color: #dc2626; font-weight: 500;">Ansökningar kundnummer:</span>
              <span style="font-weight: 600; margin-left: 4px;">${currentValues || 0}</span>
            </div>
          `;
        }
        
        tooltipContent += `</div>`;
        return tooltipContent;
      }
    },
    colors,
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "14px",
      fontFamily: "inherit"
    }
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
          {/* Toggle switch (disabled - no data) */}
          <div className="absolute right-4 bottom-4 z-10 pointer-events-none opacity-50">
            <Switch
              checked={false}
              onChange={() => {}}
              ariaLabel="Offertförfrågningar är inaktiverad (ingen data)"
              backgroundSize="sm"
            />
          </div>
          <ScoreCard
            label="Offertförfrågningar"
            value={"No data"}
            growthRate={0}
            Icon={MessageOutlineIcon}
            variant="primary"
            source="GA4 API"
            className="min-h-[208px] relative pr-5 pb-6 opacity-50 grayscale pointer-events-none"
            comparisonLabel={undefined}
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
            <div className="title">Leads & Förfrågningar över tid</div>
            <div className="flex items-center gap-3">
              {/* Granularity Controls */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">Granularitet:</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setGranularity('day')}
                    className={`px-2 py-1 text-xs rounded ${
                      granularity === 'day'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label="Visa daglig granularitet"
                  >
                    Dag
                  </button>
                  <button
                    onClick={() => setGranularity('week')}
                    className={`px-2 py-1 text-xs rounded ${
                      granularity === 'week'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label="Visa veckovis granularitet"
                  >
                    Vecka
                  </button>
                  <button
                    onClick={() => setGranularity('month')}
                    className={`px-2 py-1 text-xs rounded ${
                      granularity === 'month'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label="Visa månadsvis granularitet"
                  >
                    Månad
                  </button>
                </div>
              </div>

              {/* Chart Type Controls */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">Typ:</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setChartType('line')}
                    className={`px-2 py-1 text-xs rounded ${
                      chartType === 'line'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label="Visa som linjediagram"
                  >
                    Linje
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-2 py-1 text-xs rounded ${
                      chartType === 'bar'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label="Visa som stapeldiagram"
                  >
                    Stapel
                  </button>
                </div>
              </div>
              
              <span className="badge">Källa: GA4 API</span>
              <div className="hidden md:flex items-center gap-2 text-xs">
                <span>{data?.comparisonMode === 'prev' ? 'Jämför föregående period' : 'Jämför föregående år'}</span>
                <Switch
                  checked={showCompare}
                  onChange={(v) => setShowCompare(v)}
                  ariaLabel="Visa föregående period i diagrammet"
                  backgroundSize="sm"
                />
              </div>
            </div>
          </div>
          {xAxisLabels.length > 0 ? (
            <div className="-ml-1 -mr-1 h-72 overflow-hidden" aria-label="Leads över tid diagram">
              <Chart
                options={chartOptions}
                series={seriesData}
                type={chartType}
                height="100%"
                width="100%"
              />
            </div>
          ) : (
            <div className="h-32 w-full bg-gray-100 dark:bg-gray-800" aria-label="Ingen data tillgänglig" />
          )}
          <div className="mt-2 text-xs text-gray-500">
            {xAxisLabels.length} datapunkter ({granularity === 'day' ? 'daglig' : granularity === 'week' ? 'veckovis' : 'månadsvis'} granularitet)
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
