"use client";
import { useEffect, useMemo, useState } from "react";
import { useFilters } from "@/components/GlobalFilters";
import { formatNumber, formatPercent } from "@/lib/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { UserIcon } from "@/assets/icons";
import ScorecardDetailsDrawer from "@/components/ScorecardDetailsDrawer";

type Props = {
  title: string;
  range: { start: string; end: string; grain: string };
};

export default function SimpleTotalUsersCard({ title, range }: Props) {
  const { state } = useFilters();
  const [open, setOpen] = useState(false);
  const [mockData, setMockData] = useState<{
    value: number;
    growthRate: number;
    source: string;
  } | null>(null);

  // Generate mock data based on date range
  useEffect(() => {
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Base value that varies by season (higher in Q4, lower in summer)
    const month = startDate.getMonth();
    const seasonalMultiplier = 1 + (month >= 9 ? 0.3 : month >= 6 ? -0.2 : 0.1); // Q4 higher, summer lower
    
    // Generate base value between 1200-2500 users
    const baseValue = Math.floor(1200 + Math.random() * 1300) * seasonalMultiplier;
    
    // Generate growth rate between -5% and +15%
    const growthRate = -5 + Math.random() * 20;
    
    setMockData({
      value: Math.floor(baseValue),
      growthRate: Number(growthRate.toFixed(2)),
      source: "Mockdata"
    });
  }, [range.start, range.end]);

  // Get comparison label based on current comparison mode
  const getComparisonLabel = () => {
    switch (state.range.comparisonMode) {
      case 'yoy': return 'vs. föregående år';
      case 'prev': return 'vs. föregående period';
      case 'none': return null;
      default: return 'vs. föregående period';
    }
  };

  // Mock progress goal (100,000 users annually)
  const progressGoal = 100000;
  const progressPercentage = mockData ? Math.min(100, (mockData.value / progressGoal) * 100) : 0;

  // Mock series data for chart
  const getSeries = useMemo(() => async ({ start, end, grain }: any) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const day = 1000 * 60 * 60 * 24;
    const points: { x: number; y: number }[] = [];
    const baseValue = mockData?.value || 1500;
    
    for (let t = s; t <= e; t += day) {
      const noise = Math.random() * 0.1 - 0.05; // ±5% variation
      const dailyValue = Math.floor(baseValue * (1 + noise));
      points.push({ x: t, y: Math.max(0, dailyValue) });
    }
    return points;
  }, [mockData]);

  if (!mockData) {
    return (
      <ScoreCard
        label={title}
        value="Laddar..."
        Icon={UserIcon}
        variant="primary"
        source="Mockdata"
        className="min-h-[208px]"
        showProgress={true}
        progressGoal={progressGoal}
        progressUnit=""
        comparisonLabel={getComparisonLabel()}
        onClick={() => setOpen(true)}
      />
    );
  }

  return (
    <div className="relative">
      <ScoreCard
        label={title}
        value={formatNumber(mockData.value)}
        growthRate={mockData.growthRate}
        Icon={UserIcon}
        variant="primary"
        source={mockData.source}
        className="min-h-[208px]"
        showProgress={true}
        progressGoal={progressGoal}
        progressUnit=""
        comparisonLabel={getComparisonLabel()}
        onClick={() => setOpen(true)}
      />
      
      <ScorecardDetailsDrawer
        open={open}
        onClose={() => setOpen(false)}
        metricId="total_users"
        title={title}
        sourceLabel="Mockdata"
        getSeries={getSeries}
        getCompareSeries={async () => []}
      />
    </div>
  );
}
