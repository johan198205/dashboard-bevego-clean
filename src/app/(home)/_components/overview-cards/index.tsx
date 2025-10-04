"use client";

import { useEffect, useMemo, useState } from "react";
import { compactFormat } from "@/lib/format-number";
import { getOverviewData } from "../../fetch";
import { OverviewCard } from "./card";
import { CwvTotalStatusCard } from "@/components/shared/CwvTotalStatusCard";
import { useCwvData } from "@/hooks/useCwvData";
import { getKpi } from "@/lib/resolver";
import * as icons from "./icons";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import { useFilters } from "@/components/GlobalFilters";
import { generateTimeseries, aggregate } from "@/lib/mockData/generators";

// TODO replace with UI settings
const KPI_PROGRESS_ENABLED_METRICS = ['mau', 'pageviews'];
const KPI_ANNUAL_GOALS = {
  mau: 100000, // Monthly Active Users
  pageviews: 1500000, // Page views
};

type OverviewData = {
  views: { value: number; growthRate: number };
  profit: { value: number; growthRate: number };
  products: { value: number; growthRate: number };
  users: { value: number; growthRate: number };
};

export function OverviewCardsGroup() {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const { summary: cwvSummary, loading: cwvLoading } = useCwvData();
  const { state } = useFilters();
  const [drawer, setDrawer] = useState<{ metricId: string; title: string } | null>(null);
  const [tasksRateData, setTasksRateData] = useState<{ value: number; growthRate: number } | null>(null);
  const [featuresRateData, setFeaturesRateData] = useState<{ value: number; growthRate: number } | null>(null);
  const [mauSummary, setMauSummary] = useState<{ value: number; growthRate: number; source: string } | null>(null);
  const [pageviewsSummary, setPageviewsSummary] = useState<{ value: number; growthRate: number; source: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const overview = await getOverviewData();
      setOverviewData(overview);
    };
    loadData();
  }, []);

  // Load rate data
  useEffect(() => {
    const loadRateData = async () => {
      try {
        console.log("Loading rate data...", { start: state.range.start, end: state.range.end, grain: state.range.grain, comparisonMode: state.range.comparisonMode });
        const [tasksRateRes, featuresRateRes] = await Promise.all([
          getKpi({ metric: "tasks_rate", range: { start: state.range.start, end: state.range.end, grain: state.range.grain, comparisonMode: state.range.comparisonMode } }),
          getKpi({ metric: "features_rate", range: { start: state.range.start, end: state.range.end, grain: state.range.grain, comparisonMode: state.range.comparisonMode } })
        ]);
        
        console.log("Tasks rate result:", tasksRateRes);
        console.log("Features rate result:", featuresRateRes);
        
        setTasksRateData({
          value: tasksRateRes.summary.current,
          growthRate: tasksRateRes.summary.yoyPct
        });
        
        setFeaturesRateData({
          value: featuresRateRes.summary.current,
          growthRate: featuresRateRes.summary.yoyPct
        });
        
        console.log("Rate data set:", { tasks: tasksRateRes.summary.current, features: featuresRateRes.summary.current });
      } catch (error) {
        console.error("Failed to load rate data:", error);
      }
    };
    
    loadRateData();
  }, [state.range.start, state.range.end, state.range.grain, state.range.comparisonMode]);

  // Load MAU & Pageviews summary from resolver (GA4/Mock)
  useEffect(() => {
    const loadSummaries = async () => {
      try {
        const qs = (m: string) => new URLSearchParams({
          metric: m,
          start: state.range.start,
          end: state.range.end,
          grain: state.range.grain || 'day',
          comparisonMode: state.range.comparisonMode || 'none'
        }).toString();
        const mauResp = await fetch(`/api/kpi?${qs('mau')}`);
        let mauRes: any = null;
        if (mauResp.ok) {
          mauRes = await mauResp.json();
        } else {
          mauRes = null; // treat as no data
        }
        const pvRes = await fetch(`/api/kpi?${qs('pageviews')}`).then(r => r.json());
        const extractSource = (notes?: string[]) => {
          const n = (notes || []).find((s) => s.startsWith("Källa:"));
          return n ? n.replace("Källa:", "").trim() : "Mock";
        };
        if (mauRes) {
          const mauSource = extractSource(mauRes.notes);
          setMauSummary({ value: mauRes.summary.current, growthRate: mauRes.summary.yoyPct, source: mauSource });
        } else {
          setMauSummary(null);
        }
        setPageviewsSummary({ value: pvRes.summary.current, growthRate: pvRes.summary.yoyPct, source: extractSource(pvRes.notes) });
      } catch (error) {
        console.error("Failed to load summaries:", error);
      }
    };
    loadSummaries();
  }, [state.range.start, state.range.end, state.range.grain, state.range.comparisonMode]);

  // Minimal providers mapping → returns series aligned with TimeSeries widget style
  const providers = useMemo(() => ({
    mau: async ({ start, end, grain, filters }: any) => {
      const res = await getKpi({ metric: "mau", range: { start, end, grain, comparisonMode: state.range.comparisonMode }, filters });
      return (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    pageviews: async ({ start, end, grain, filters }: any) => {
      const res = await getKpi({ metric: "pageviews", range: { start, end, grain, comparisonMode: state.range.comparisonMode }, filters });
      return (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    // Rate metrics using server-backed data
    tasks_rate: async ({ start, end, grain, filters }: any) => {
      const res = await getKpi({ metric: "tasks_rate", range: { start, end, grain, comparisonMode: state.range.comparisonMode }, filters });
      return (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    features_rate: async ({ start, end, grain, filters }: any) => {
      const res = await getKpi({ metric: "features_rate", range: { start, end, grain, comparisonMode: state.range.comparisonMode }, filters });
      return (res.timeseries || []).map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    tasks: async ({ start, end, grain }: any) => {
      const daily = generateTimeseries({ start, end }, { base: 1200, seasonalityByMonth: [0.9,0.92,0.95,1.0,1.1,1.15,1.2,1.18,1.05,0.98,0.95,0.92], noise: 0.08, seedKey: "tasks" });
      const agg = aggregate(daily, grain);
      return agg.map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    features: async ({ start, end, grain }: any) => {
      const daily = generateTimeseries({ start, end }, { base: 80, seasonalityByMonth: [0.8,0.85,0.9,0.95,1.0,1.05,1.2,1.25,1.1,1.0,0.95,0.9], noise: 0.1, seedKey: "features" });
      const agg = aggregate(daily, grain);
      return agg.map((p) => ({ x: new Date(p.date).getTime(), y: p.value }));
    },
    cwv_total: async ({ start, end, grain }: any) => {
      const daily = generateTimeseries({ start, end }, { base: 65, seasonalityByMonth: [0.9,0.92,0.95,1.0,1.05,1.08,1.1,1.12,1.1,1.05,0.98,0.95], noise: 0.06, seedKey: "cwv_total" });
      const agg = aggregate(daily, grain);
      return agg.map((p) => ({ x: new Date(p.date).getTime(), y: Math.max(0, Math.min(100, p.value)) }));
    },
  }), [state.range.comparisonMode]);

  if (cwvLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const { views, profit, products, users } = overviewData || { views: { value: 0, growthRate: 0 }, profit: { value: 0, growthRate: 0 }, products: { value: 0, growthRate: 0 }, users: { value: 0, growthRate: 0 } };

  // Get comparison label based on current comparison mode
  const getComparisonLabel = (metricId?: string) => {
    switch (state.range.comparisonMode) {
      case 'yoy': return 'vs. föregående år';
      case 'prev': return 'vs. föregående period';
      case 'none': return undefined; // No comparison label when none is selected
      default: return 'vs. föregående period';
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      {/* CWV Total Status - Hidden for now */}
      {/* {cwvSummary && (
        <CwvTotalStatusCard
          label="CWV total status"
          data={{
            value: `${cwvSummary.totalStatus.percentage.toFixed(1)}%`,
            percentage: cwvSummary.totalStatus.percentage,
            status: cwvSummary.totalStatus.percentage >= 75 ? 'Pass' : 'Needs Improvement',
            target: "> 75%",
            description: "Klarar alla tre"
          }}
          comparisonLabel={undefined}
          onClick={() => setDrawer({ metricId: "cwv_total", title: "CWV total status" })}
        />
      )} */}

      <OverviewCard
        label="Total Views"
        data={{
          value: compactFormat(pageviewsSummary?.value ?? views.value),
          growthRate: pageviewsSummary?.growthRate ?? views.growthRate,
        }}
        Icon={icons.Views}
        variant="success"
        appearance="analytics"
        comparisonLabel={getComparisonLabel("pageviews")}
        metricId="pageviews"
        // Pageviews metric
        onClick={() => setDrawer({ metricId: "pageviews", title: "Sidvisningar" })}
        // Provide sparkline data
        getSeries={providers.pageviews}
        source={pageviewsSummary?.source}
      />

      <OverviewCard
        label="Tasks"
        data={{
          value: `${tasksRateData?.value?.toFixed(2) || '0.00'}%`,
          growthRate: tasksRateData?.growthRate || 0,
        }}
        Icon={icons.Profit}
        variant="warning"
        appearance="analytics"
        comparisonLabel={getComparisonLabel("tasks_rate")}
        onClick={() => setDrawer({ metricId: "tasks_rate", title: "Tasks" })}
        getSeries={providers.tasks_rate}
      />

      <OverviewCard
        label="Funktioner"
        data={{
          value: `${featuresRateData?.value?.toFixed(2) || '0.00'}%`,
          growthRate: featuresRateData?.growthRate || 0,
        }}
        Icon={icons.Product}
        variant="info"
        appearance="analytics"
        comparisonLabel={getComparisonLabel("features_rate")}
        onClick={() => setDrawer({ metricId: "features_rate", title: "Funktioner" })}
        getSeries={providers.features_rate}
      />

      <OverviewCard
        label="Total Users"
        data={{
          value: mauSummary ? compactFormat(mauSummary.value) : "No Data",
          growthRate: mauSummary?.growthRate ?? 0,
        }}
        Icon={icons.Users}
        variant="primary"
        appearance="analytics"
        comparisonLabel={getComparisonLabel("mau")}
        metricId="mau"
        onClick={() => setDrawer({ metricId: "mau", title: "Total users" })}
        getSeries={providers.mau}
        source={mauSummary?.source}
      />

      {drawer && (
        <ScorecardDetailsDrawer
          open={!!drawer}
          onClose={() => setDrawer(null)}
          metricId={drawer.metricId}
          title={drawer.title}
          sourceLabel={(() => {
            if (drawer.metricId === 'mau') return mauSummary?.source || 'GA4';
            if (drawer.metricId === 'pageviews') return pageviewsSummary?.source || 'GA4';
            if (drawer.metricId === 'cwv_total') return cwvSummary ? 'CrUX API' : 'Mock';
            return 'Mock';
          })()}
          getSeries={providers[drawer.metricId as keyof typeof providers]}
          getCompareSeries={async (args) => {
            // Where resolver provides compare series, align by index
            if (drawer.metricId === "mau" || drawer.metricId === "pageviews" || drawer.metricId === "tasks_rate" || drawer.metricId === "features_rate") {
              const { getKpi } = await import("@/lib/resolver");
              const res = await getKpi({ metric: drawer.metricId as any, range: { start: args.start, end: args.end, grain: args.grain, comparisonMode: state.range.comparisonMode }, filters: args.filters });
              const points = res.compareTimeseries || [];
              const mainSeries = await providers[drawer.metricId as keyof typeof providers](args);
              return points.map((p, i) => ({ x: mainSeries[i]?.x ?? new Date(p.date).getTime(), y: p.value }));
            }
            return [];
          }}
        />
      )}
    </div>
  );
}
