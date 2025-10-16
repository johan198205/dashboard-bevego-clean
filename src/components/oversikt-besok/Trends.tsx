'use client';

import { useState, useEffect } from 'react';
import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { LineChart, BarChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumber, formatPercent, formatDateTooltip } from '@/utils/format';
import { useFilters } from '@/components/GlobalFilters';
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
    pagesPerSession: boolean;
  };
  granularity?: 'day' | 'week' | 'month';
  onGranularityChange?: (granularity: 'day' | 'week' | 'month') => void;
};

type ChartType = 'line' | 'bar';

export function Trends({ data, activeSeries, granularity = 'day', onGranularityChange }: Props) {
  const { state } = useFilters();
  // Chart type control: Linje | Stapeldiagram
  const [chartType, setChartType] = useState<ChartType>('line');
  
  // State for GA4 timeseries data
  const [timeseriesData, setTimeseriesData] = useState<TimePoint[]>([]);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);

  // Fetch GA4 timeseries data when granularity or date range changes
  useEffect(() => {
    const fetchTimeseriesData = async () => {
      setTimeseriesLoading(true);
      try {
        const params = new URLSearchParams({ 
          start: state.range.start, 
          end: state.range.end, 
          grain: granularity,
          compare: 'none'
        });
        
        const url = `/api/ga4/overview?${params.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const payload = await res.json();
          setTimeseriesData(payload.timeseries || []);
        }
      } catch (error) {
        console.error('Failed to fetch timeseries data:', error);
        setTimeseriesData([]);
      } finally {
        setTimeseriesLoading(false);
      }
    };

    fetchTimeseriesData();
  }, [state.range.start, state.range.end, granularity]);

  // Helper function to get week number (reused from leads chart)
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Format date labels based on granularity (reused from leads chart pattern)
  // See: src/app/primara-kpi/_components/LeadsBlock.tsx for original implementation
  const formatDateLabel = (dateStr: string, granularity: 'day' | 'week' | 'month'): string => {
    const date = new Date(dateStr);
    
    switch (granularity) {
      case 'day':
        return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      case 'week':
        const weekNumber = getWeekNumber(date);
        return `v. ${weekNumber}`;
      case 'month':
        return date.toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' });
      default:
        return date.toLocaleDateString('sv-SE');
    }
  };

  // Transform data for the chart - use fetched timeseries data
  const chartData = timeseriesData.map(point => ({
    ...point,
    // Format date for display based on granularity
    dateFormatted: formatDateLabel(point.date, granularity)
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
    pagesPerSession: '#EF4444', // Medium red
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
            {activeSeries?.pagesPerSession && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pagesPerSession }}></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Pages/session:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{data.pagesPerSession?.toFixed(1).replace('.', ',') || '0,0'}</span>
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
    const keys: Array<{ key: keyof typeof timeseriesData[number]; enabled: boolean }> = [
      { key: 'sessions', enabled: activeSeries?.sessions !== false },
      { key: 'engagedSessions', enabled: activeSeries?.engagedSessions !== false },
      { key: 'engagementRatePct', enabled: !!activeSeries?.engagementRatePct },
      { key: 'pagesPerSession', enabled: !!activeSeries?.pagesPerSession },
    ];
    const anyEnabled = keys.some(k => k.enabled);
    const effectiveKeys = keys.filter(k => k.enabled);
    if (!anyEnabled) {
      // Fallback to sessions if nothing is enabled (shouldn't happen)
      return Math.max(...timeseriesData.map(d => d.sessions));
    }
    return Math.max(
      1,
      ...timeseriesData.map(d => Math.max(...effectiveKeys.map(k => Number((d as any)[k.key] || 0))))
    );
  })();
  const maxPct = 100;
  const maxTime = 100; // Fixed max for percentage values

  return (
    <AnalyticsBlock
      title="Tidsutveckling"
      description="Utveckling över tid för valda metrik"
      headerRight={
        <div className="flex items-center gap-3">
          {/* Granularity Controls (reused from leads chart - see LeadsBlock.tsx) */}
          {onGranularityChange && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Granularitet:</label>
              <div className="flex gap-1">
                <button
                  onClick={() => onGranularityChange('day')}
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
                  onClick={() => onGranularityChange('week')}
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
                  onClick={() => onGranularityChange('month')}
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
          )}

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
        </div>
      }
    >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
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
                tickFormatter={(value) => {
                  // Show decimals for Pages/session, integers for others
                  if (activeSeries?.pagesPerSession && !activeSeries?.sessions && !activeSeries?.engagedSessions) {
                    return value.toFixed(1).replace('.', ',');
                  }
                  return formatNumber(value);
                }}
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

              {/* Pages per session */}
              {activeSeries?.pagesPerSession && (
                <Line
                  yAxisId="counts"
                  type="monotone"
                  dataKey="pagesPerSession"
                  stroke={COLORS.pagesPerSession}
                  strokeWidth={2}
                  dot={{ fill: COLORS.pagesPerSession, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: COLORS.pagesPerSession, strokeWidth: 2 }}
                  name="Pages/session"
                />
              )}
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                tickFormatter={(value) => {
                  if (activeSeries?.pagesPerSession && !activeSeries?.sessions && !activeSeries?.engagedSessions) {
                    return value.toFixed(1).replace('.', ',');
                  }
                  return formatNumber(value);
                }}
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
              
              {/* Sessions bar */}
              {activeSeries?.sessions !== false && (
                <Bar
                  yAxisId="counts"
                  dataKey="sessions"
                  fill={COLORS.sessions}
                  name="Sessions"
                  radius={[2, 2, 0, 0]}
                />
              )}
              
              {/* Engaged sessions bar */}
              {activeSeries?.engagedSessions !== false && (
                <Bar
                  yAxisId="counts"
                  dataKey="engagedSessions"
                  fill={COLORS.engagedSessions}
                  name="Engagerade sessioner"
                  radius={[2, 2, 0, 0]}
                />
              )}
              
              {/* Engagement rate bar (secondary axis) */}
              {activeSeries?.engagementRatePct !== false && (
                <Bar
                  yAxisId="percent"
                  dataKey="engagementRatePct"
                  fill={COLORS.engagementRatePct}
                  name="Engagemangsgrad (%)"
                  radius={[2, 2, 0, 0]}
                />
              )}

              {/* Total users */}
              {activeSeries?.totalUsers && (
                <Bar
                  yAxisId="counts"
                  dataKey="totalUsers"
                  fill={COLORS.totalUsers}
                  name="Total users"
                  radius={[2, 2, 0, 0]}
                />
              )}

              {/* Returning users */}
              {activeSeries?.returningUsers && (
                <Bar
                  yAxisId="counts"
                  dataKey="returningUsers"
                  fill={COLORS.returningUsers}
                  name="Returning users"
                  radius={[2, 2, 0, 0]}
                />
              )}

              {/* Pageviews */}
              {activeSeries?.pageviews && (
                <Bar
                  yAxisId="counts"
                  dataKey="pageviews"
                  fill={COLORS.pageviews}
                  name="Sidvisningar"
                  radius={[2, 2, 0, 0]}
                />
              )}

              {/* Avg engagement time (seconds) */}
              {activeSeries?.avgEngagementTimeSec && (
                <Bar
                  yAxisId="time"
                  dataKey="avgEngagementTimeSec"
                  fill={COLORS.avgEngagementTimeSec}
                  name="Genomsnittlig engagemangstid (sek)"
                  radius={[2, 2, 0, 0]}
                />
              )}

              {/* Pages per session */}
              {activeSeries?.pagesPerSession && (
                <Bar
                  yAxisId="counts"
                  dataKey="pagesPerSession"
                  fill={COLORS.pagesPerSession}
                  name="Pages/session"
                  radius={[2, 2, 0, 0]}
                />
              )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Footer with data points count (reused from leads chart pattern) */}
        <div className="mt-2 text-xs text-gray-500">
          {chartData.length} datapunkter ({granularity === 'day' ? 'daglig' : granularity === 'week' ? 'veckovis' : 'månadsvis'} granularitet)
        </div>
    </AnalyticsBlock>
  );
}
