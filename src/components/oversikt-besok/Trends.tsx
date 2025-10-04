'use client';

import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumber, formatPercent, formatDateTooltip } from '@/utils/format';
import type { TimePoint } from '@/app/api/ga4/overview/route';

type Props = {
  data: TimePoint[];
  activeSeries?: {
    sessions: boolean;
    totalUsers: boolean;
    returningUsers: boolean;
    engagedSessions: boolean;
    engagementRatePct: boolean;
    avgEngagementTimeSec: boolean;
    pageviews: boolean;
  };
};

export function Trends({ data, activeSeries }: Props) {
  // Transform data for the chart
  const chartData = data.map(point => ({
    ...point,
    // Format date for display
    dateFormatted: new Date(point.date).toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric'
    })
  }));

  // Riksbyggen red palette for all series - varied shades for distinction
  const COLORS = {
    sessions: '#E01E26', // Primary Riksbyggen red
    engagedSessions: '#DC2626', // Deep red
    engagementRatePct: '#B91C1C', // Darker red (dashed)
    totalUsers: '#F87171', // Light red
    returningUsers: '#991B1B', // Very dark red
    pageviews: '#F23030', // Bright red
    avgEngagementTimeSec: '#FCA5A5', // Lighter red
  } as const;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDateTooltip(data.date)}
          </p>
          <div className="space-y-1 mt-2">
            {activeSeries?.sessions !== false && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.sessions }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Sessions:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.sessions)}</span>
              </div>
            )}
            {activeSeries?.engagedSessions !== false && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.engagedSessions }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Engagerade:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.engagedSessions)}</span>
              </div>
            )}
            {activeSeries?.totalUsers && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.totalUsers }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Total users:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.totalUsers)}</span>
              </div>
            )}
            {activeSeries?.returningUsers && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.returningUsers }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Returning users:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.returningUsers)}</span>
              </div>
            )}
            {activeSeries?.pageviews && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pageviews }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Sidvisningar:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.pageviews)}</span>
              </div>
            )}
            {activeSeries?.engagementRatePct !== false && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.engagementRatePct }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Engagemangsgrad:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatPercent(data.engagementRatePct)}</span>
              </div>
            )}
            {activeSeries?.avgEngagementTimeSec && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.avgEngagementTimeSec }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Genomsnittlig engagemangstid:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{formatNumber(data.avgEngagementTimeSec)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Find max values for Y-axis scaling based on currently active series only
  const maxCounts = (() => {
    const keys: Array<{ key: keyof typeof data[number]; enabled: boolean }> = [
      { key: 'sessions', enabled: activeSeries?.sessions !== false },
      { key: 'engagedSessions', enabled: activeSeries?.engagedSessions !== false },
      { key: 'engagementRatePct', enabled: !!activeSeries?.engagementRatePct },
    ];
    const anyEnabled = keys.some(k => k.enabled);
    const effectiveKeys = keys.filter(k => k.enabled);
    if (!anyEnabled) {
      // Fallback to sessions if nothing is enabled (shouldn't happen)
      return Math.max(...data.map(d => d.sessions));
    }
    return Math.max(
      1,
      ...data.map(d => Math.max(...effectiveKeys.map(k => Number((d as any)[k.key] || 0))))
    );
  })();
  const maxPct = 100;
  const maxTime = 100; // Fixed max for percentage values

  return (
    <AnalyticsBlock
      title="Tidsutveckling"
      description="Utveckling över tid för valda metrik"
    >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="dateFormatted" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="counts"
                orientation="left"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, maxCounts]}
                tickFormatter={(value) => formatNumber(value)}
              />
              {activeSeries?.engagementRatePct !== false && (
                <YAxis 
                  yAxisId="percent"
                  orientation="right"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, maxPct]}
                  tickFormatter={(value) => `${value}%`}
                />
              )}
              {/* Separate right axis for time values (seconds) */}
              {activeSeries?.avgEngagementTimeSec && (
                <YAxis 
                  yAxisId="time"
                  orientation="right"
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, Math.max(maxTime, 1)]}
                  tickFormatter={(value) => formatNumber(value)}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Sessions line */}
              {activeSeries?.sessions !== false && (
                <Line
                  yAxisId="counts"
                  type="monotone"
                  dataKey="sessions"
                  stroke={COLORS.sessions}
                  strokeWidth={2}
                  dot={{ fill: COLORS.sessions, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: COLORS.sessions, strokeWidth: 2 }}
                  name="Sessions"
                />
              )}
              
              {/* Engaged sessions line */}
              {activeSeries?.engagedSessions !== false && (
                <Line
                  yAxisId="counts"
                  type="monotone"
                  dataKey="engagedSessions"
                  stroke={COLORS.engagedSessions}
                  strokeWidth={2}
                  dot={{ fill: COLORS.engagedSessions, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: COLORS.engagedSessions, strokeWidth: 2 }}
                  name="Engagerade sessioner"
                />
              )}
              
              {/* Engagement rate line (secondary axis) */}
              {activeSeries?.engagementRatePct !== false && (
                <Line
                  yAxisId="percent"
                  type="monotone"
                  dataKey="engagementRatePct"
                  stroke={COLORS.engagementRatePct}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ fill: COLORS.engagementRatePct, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: COLORS.engagementRatePct, strokeWidth: 2 }}
                  name="Engagemangsgrad (%)"
                />
              )}

              {/* Total users */}
              {activeSeries?.totalUsers && (
                <Line
                  yAxisId="counts"
                  type="monotone"
                  dataKey="totalUsers"
                  stroke={COLORS.totalUsers}
                  strokeWidth={2}
                  dot={{ fill: COLORS.totalUsers, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: COLORS.totalUsers, strokeWidth: 2 }}
                  name="Total users"
                />
              )}

              {/* Returning users */}
              {activeSeries?.returningUsers && (
                <Line
                  yAxisId="counts"
                  type="monotone"
                  dataKey="returningUsers"
                  stroke={COLORS.returningUsers}
                  strokeWidth={2}
                  dot={{ fill: COLORS.returningUsers, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: COLORS.returningUsers, strokeWidth: 2 }}
                  name="Returning users"
                />
              )}

              {/* Pageviews */}
              {activeSeries?.pageviews && (
                <Line
                  yAxisId="counts"
                  type="monotone"
                  dataKey="pageviews"
                  stroke={COLORS.pageviews}
                  strokeWidth={2}
                  dot={{ fill: COLORS.pageviews, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: COLORS.pageviews, strokeWidth: 2 }}
                  name="Sidvisningar"
                />
              )}

              {/* Avg engagement time (seconds) */}
              {activeSeries?.avgEngagementTimeSec && (
                <Line
                  yAxisId="time"
                  type="monotone"
                  dataKey="avgEngagementTimeSec"
                  stroke={COLORS.avgEngagementTimeSec}
                  strokeWidth={1.5}
                  dot={{ fill: COLORS.avgEngagementTimeSec, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: COLORS.avgEngagementTimeSec, strokeWidth: 2 }}
                  name="Genomsnittlig engagemangstid (sek)"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* legend removed as per request */}
    </AnalyticsBlock>
  );
}
