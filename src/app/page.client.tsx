"use client";
import { useState } from "react";
import TotalDiffCard from "@/widgets/TotalDiffCard";
import GaugeCard from "@/widgets/GaugeCard";
// TODO(modal): Re-enable chart via modal on card
// import TimeSeries from "@/widgets/TimeSeries";
// import ChannelTable from "@/widgets/ChannelTable";
// Tables moved to Användning page only
// import TasksTable from "@/widgets/TasksTable";
// import FeaturesTable from "@/widgets/FeaturesTable";
// TODO: Re-enable these cards if needed
// import PerfCard from "@/widgets/PerfCard";
// import WcagCard from "@/widgets/WcagCard";
import { useFilters } from "@/components/GlobalFilters";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";
import { useCwvData } from "@/hooks/useCwvData";
import { CwvTotalStatusCard } from "@/components/shared/CwvTotalStatusCard";

export default function ClientHome() {
  const { state } = useFilters();
  const range = state.range;
  const { summary: cwvSummary } = useCwvData();
  const [drawer, setDrawer] = useState<{ metricId: string; title: string } | null>(null);
  return (
    <div className="space-y-6">
      {/* Gauge Cards Section - 2 compact cards in top row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GaugeCard title="Tasks" metric="tasks_rate" range={range} compact={true} />
        <GaugeCard title="Funktioner" metric="features_rate" range={range} compact={true} />
        {/* CWV card hidden for now */}
        {/* {cwvSummary ? (
          <CwvTotalStatusCard
            label="CWV total status"
            data={{
              value: `${cwvSummary.totalStatus.percentage.toFixed(1)}%`,
              percentage: cwvSummary.totalStatus.percentage,
              status: cwvSummary.totalStatus.percentage >= 75 ? 'Pass' : 'Needs Improvement',
              target: "> 75%",
              description: "Klarar alla tre"
            }}
          />
        ) : (
          <GaugeCard title="CWV total status" metric="cwv_total" range={range} compact={true} />
        )} */}
      </div>

      {/* Other KPI Cards Section - 4 larger cards in bottom row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TotalDiffCard title="Total users" metric="mau" range={range} />
        <TotalDiffCard title="Användning — Sidvisningar" metric="pageviews" range={range} />
        {/* ClarityScoreCard removed */}
      </div>

      {drawer && (
        <ScorecardDetailsDrawer
          open={!!drawer}
          onClose={() => setDrawer(null)}
          metricId={drawer.metricId}
          title={drawer.title}
          sourceLabel="Mock"
          showChart={false}
          // Provide a simple flat mock series so AI-insikter inte visar 0
          getSeries={async ({ start, end }: any) => {
            const s = new Date(start).getTime();
            const e = new Date(end).getTime();
            const day = 1000 * 60 * 60 * 24;
            const points: { x: number; y: number }[] = [];
            const base = 75; // Default clarity score
            for (let t = s; t <= e; t += day) {
              const noise = Math.random() * 2 - 1; // small ±1 variation
              points.push({ x: t, y: Math.max(0, Math.min(100, Math.round(base + noise))) });
            }
            return points;
          }}
          getCompareSeries={async () => []}
        />
      )}

      {/* Tables moved to Användning page only */}
      {/* <TasksTable range={range} /> */}
      {/* <FeaturesTable range={range} /> */}

      {/* TODO: Re-enable these cards if needed
      <PerfCard title="Svarstid" value="420 ms" note="Placeholder" />
      <PerfCard title="Uptime" value="99,6%" note="Placeholder" />
      <WcagCard />
      */}
    </div>
  );
}


