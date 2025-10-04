'use client';

import { useMemo, useState } from 'react';
import { ScoreCard } from '@/components/ui/scorecard';
import { Switch } from '@/components/FormElements/switch';
import { Users, MousePointer, TrendingUp, Clock, UserCheck, Eye } from 'lucide-react';
import { formatNumber, formatPercent, formatTime } from '@/utils/format';
import type { Summary } from '@/app/api/ga4/overview/route';
import ScorecardDetailsDrawer from '@/components/ScorecardDetailsDrawer';
import { useFilters } from '@/components/GlobalFilters';

type Props = {
  data: Summary;
  activeSeries?: {
    sessions: boolean;
    totalUsers: boolean;
    returningUsers: boolean;
    engagedSessions: boolean;
    engagementRatePct: boolean;
    avgEngagementTimeSec: boolean;
    pageviews: boolean;
  };
  onToggleSeries?: (key: keyof NonNullable<Props['activeSeries']>, value: boolean) => void;
};

export function KpiCards({ data, activeSeries, onToggleSeries }: Props) {
  const { state: filterState } = useFilters();
  const [openDrawer, setOpenDrawer] = useState<{ metricId: string; title: string } | null>(null);
  
  // choose label based on Delta source: when we compute prev-period we still store in deltasYoY
  // so detect via window.location if compare=prev to show correct label
  let comparisonLabel = 'vs föregående år';
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('compare') === 'prev') comparisonLabel = 'vs föregående period';
    if (sp.get('compare') === 'none') comparisonLabel = '';
  }
  const kpis = [
    {
      title: 'Sessions',
      value: data.sessions,
      delta: data.deltasYoY?.sessions,
      icon: Users,
      description: 'Antal besökssessioner',
      seriesKey: 'sessions' as const,
      metricId: 'sessions',
    },
    {
      title: 'Total users',
      value: data.totalUsers ?? 0,
      delta: data.deltasYoY?.totalUsers,
      icon: Users,
      description: 'Totalt antal användare',
      seriesKey: 'totalUsers' as const,
      metricId: 'totalUsers',
    },
    {
      title: 'Returning users',
      value: data.returningUsers ?? 0,
      delta: data.deltasYoY?.returningUsers,
      icon: UserCheck,
      description: 'Återkommande användare (totalUsers − newUsers)',
      seriesKey: 'returningUsers' as const,
      metricId: 'returningUsers',
    },
    {
      title: 'Engagerade sessioner',
      value: data.engagedSessions,
      delta: data.deltasYoY?.engagedSessions,
      icon: MousePointer,
      description: 'Sessioner med engagemang (≥10s eller ≥2 sidvisningar)',
      seriesKey: 'engagedSessions' as const,
      metricId: 'engagedSessions',
    },
    {
      title: 'Engagemangsgrad',
      value: data.engagementRatePct,
      delta: data.deltasYoY?.engagementRatePct,
      icon: TrendingUp,
      description: 'Procent engagerade sessioner',
      isPercentage: true,
      seriesKey: 'engagementRatePct' as const,
      metricId: 'engagementRate',
    },
    {
      title: 'Avg. Engagement time',
      value: data.avgEngagementTimeSec,
      delta: data.deltasYoY?.avgEngagementTimePct,
      icon: Clock,
      description: 'Genomsnittlig tid per session',
      isTime: true,
      seriesKey: 'avgEngagementTimeSec' as const,
      metricId: 'avgEngagementTime',
    },
    {
      title: 'Sidvisningar',
      value: data.pageviews ?? 0,
      delta: data.deltasYoY?.pageviews,
      icon: Eye,
      description: 'Antal sidvisningar',
      seriesKey: 'pageviews' as const,
      metricId: 'pageviews',
    },
  ];

  // getSeries provider per metric: fetch timeseries from GA4 API
  const createGetSeries = useMemo(() => (metricKey: string) => {
    return async ({ start, end, filters }: any) => {
      const params = new URLSearchParams({ start, end, compare: 'none' });
      if (filters?.channel?.length) params.set('channel', filters.channel.join(','));
      if (filters?.device?.length) {
        const deviceMap: Record<string, string> = { 'Desktop': 'desktop', 'Mobil': 'mobile', 'Surfplatta': 'tablet' };
        const mapped = filters.device.map((d: string) => deviceMap[d] || d);
        params.set('device', mapped.join(','));
      }
      if (filters?.audience?.length) params.set('role', filters.audience.join(','));
      
      const url = `/api/ga4/overview?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const payload = await res.json();
      
      // Map timeseries to { x: timestamp, y: value }
      return (payload.timeseries || []).map((pt: any) => {
        const date = new Date(pt.date);
        let value = 0;
        if (metricKey === 'sessions') value = pt.sessions || 0;
        else if (metricKey === 'totalUsers') value = pt.totalUsers || 0;
        else if (metricKey === 'returningUsers') value = pt.returningUsers || 0;
        else if (metricKey === 'engagedSessions') value = pt.engagedSessions || 0;
        else if (metricKey === 'engagementRate') value = pt.engagementRatePct || 0;
        else if (metricKey === 'avgEngagementTime') value = pt.avgEngagementTimeSec || 0;
        else if (metricKey === 'pageviews') value = pt.pageviews || 0;
        return { x: date.getTime(), y: value };
      });
    };
  }, []);

  // getCompareSeries: fetch comparison period based on comparisonMode
  const createGetCompareSeries = useMemo(() => (metricKey: string) => {
    return async ({ start, end, filters }: any) => {
      // Get comparison mode from URL (same as the main page)
      const comparisonMode = typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search).get('compare') || 'yoy'
        : 'yoy';
      
      if (comparisonMode === 'none') return [];
      
      const params = new URLSearchParams({ start, end, compare: comparisonMode });
      if (filters?.channel?.length) params.set('channel', filters.channel.join(','));
      if (filters?.device?.length) {
        const deviceMap: Record<string, string> = { 'Desktop': 'desktop', 'Mobil': 'mobile', 'Surfplatta': 'tablet' };
        const mapped = filters.device.map((d: string) => deviceMap[d] || d);
        params.set('device', mapped.join(','));
      }
      if (filters?.audience?.length) params.set('role', filters.audience.join(','));
      
      const url = `/api/ga4/overview?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const payload = await res.json();
      
      // Map timeseries to { x: timestamp, y: value }
      // Note: This returns the CURRENT period data, not comparison
      // We need to calculate the comparison period dates
      // For now, return empty - the API would need to return comparison series explicitly
      return [];
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const displayValue = kpi.isTime
          ? formatTime(kpi.value)
          : kpi.isPercentage
          ? formatPercent(kpi.value)
          : formatNumber(kpi.value);

        return (
          <div key={kpi.title} className="relative">
            {/* Toggle bottom-right, smaller */}
            {kpi.seriesKey && (
              <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
                <Switch
                  checked={activeSeries ? activeSeries[kpi.seriesKey] : undefined}
                  onChange={(val) => onToggleSeries?.(kpi.seriesKey!, val)}
                  ariaLabel={`Visa ${kpi.title} i diagrammet`}
                  backgroundSize="sm"
                />
              </div>
            )}
            <ScoreCard
              key={kpi.title}
              label={kpi.title}
              value={displayValue}
              growthRate={kpi.delta ?? undefined}
              Icon={Icon}
              source="GA4 Data API"
              comparisonLabel={comparisonLabel || undefined}
              className="relative pr-5 pb-6"
              onClick={() => setOpenDrawer({ metricId: kpi.metricId, title: kpi.title })}
              getSeries={createGetSeries(kpi.metricId)}
            />
          </div>
        );
      })}

      {/* Drawer for metric details */}
      {openDrawer && (
        <ScorecardDetailsDrawer
          open={true}
          onClose={() => setOpenDrawer(null)}
          metricId={openDrawer.metricId}
          title={openDrawer.title}
          sourceLabel="GA4 Data API"
          getSeries={createGetSeries(openDrawer.metricId)}
          getCompareSeries={createGetCompareSeries(openDrawer.metricId)}
        />
      )}
    </div>
  );
}
