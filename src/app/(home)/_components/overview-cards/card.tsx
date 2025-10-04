import { ScoreCard } from "@/components/ui/scorecard";
import type { JSX, SVGProps } from "react";

// TODO replace with UI settings
const KPI_PROGRESS_ENABLED_METRICS = ['mau', 'pageviews', 'clarity_score'];
const KPI_ANNUAL_GOALS = {
  mau: 100000, // Monthly Active Users
  pageviews: 1500000, // Page views
  clarity_score: 80, // Clarity Score (out of 100)
};

type PropsType = {
  label: string;
  data: {
    value: number | string;
    growthRate: number;
  };
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  appearance?: "default" | "analytics";
  comparisonLabel?: string;
  metricId?: string;
  source?: string;
};

export function OverviewCard({ label, data, Icon, variant = "default", appearance = "analytics", comparisonLabel, metricId, source, ...rest }: PropsType & { onClick?: () => void; getSeries?: any }) {
  // Force analytics appearance for all overview cards
  const finalAppearance = "analytics";
  
  // Check if this metric should show progress bar
  const showProgress = Boolean(metricId && KPI_PROGRESS_ENABLED_METRICS.includes(metricId));
  const progressGoal = metricId ? KPI_ANNUAL_GOALS[metricId as keyof typeof KPI_ANNUAL_GOALS] : undefined;
  
  // Determine unit based on metric
  const getProgressUnit = () => {
    switch (metricId) {
      case 'mau':
        return '';
      case 'pageviews':
        return '';
      case 'clarity_score':
        return '';
      default:
        return '';
    }
  };
  
  return (
    <ScoreCard
      label={label}
      value={data.value}
      growthRate={data.growthRate}
      Icon={Icon}
      variant={variant}
      appearance={finalAppearance}
      comparisonLabel={comparisonLabel}
      source={source || "Mock"}
      getSeries={rest.getSeries}
      showProgress={showProgress}
      progressGoal={progressGoal}
      progressUnit={getProgressUnit()}
      {...rest}
    />
  );
}
