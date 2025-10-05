'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatNumber, formatPercent } from '@/utils/format';
import type { Summary } from '@/app/api/ga4/overview/route';

type Props = {
  data: Summary;
  onClick?: () => void;
};

export function UserTypeDistribution({ data, onClick }: Props) {
  const urlSearchParams = useSearchParams();
  const [compareMode, setCompareMode] = useState<'prev' | 'yoy'>('prev');
  const [previousData, setPreviousData] = useState<Summary | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);

  // Calculate new vs returning users
  const totalUsers = data.totalUsers || 0;
  const returningUsers = data.returningUsers || 0;
  const newUsers = Math.max(0, totalUsers - returningUsers);

  // Sync with global comparison mode from URL params
  useEffect(() => {
    const compare = urlSearchParams.get('compare');
    if (compare === 'yoy' || compare === 'prev') {
      setCompareMode(compare);
    }
  }, [urlSearchParams]);

  // Build filters from URL
  function buildFilterParams(sp: URLSearchParams) {
    const apiParams = new URLSearchParams();
    const start = sp.get('start');
    const end = sp.get('end');
    const channel = sp.get('channel');
    const device = sp.get('device');
    const role = sp.get('role');
    const unit = sp.get('unit');
    if (channel) apiParams.set('channel', channel);
    if (device) apiParams.set('device', device);
    if (role) apiParams.set('role', role);
    if (unit) apiParams.set('unit', unit);
    return { start, end, apiParams } as const;
  }

  function getPrevRange(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (compareMode === 'yoy') {
      const prevStart = new Date(startDate);
      const prevEnd = new Date(endDate);
      prevStart.setFullYear(prevStart.getFullYear() - 1);
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      return {
        start: prevStart.toISOString().slice(0, 10),
        end: prevEnd.toISOString().slice(0, 10)
      };
    }
    
    // previous period same length
    const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(startDate.getTime());
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd.getTime());
    prevStart.setDate(prevStart.getDate() - (diffDays - 1));
    return {
      start: prevStart.toISOString().slice(0, 10),
      end: prevEnd.toISOString().slice(0, 10)
    };
  }

  // Fetch previous period/year data
  useEffect(() => {
    const sp = new URLSearchParams(urlSearchParams.toString());
    const { start, end, apiParams } = buildFilterParams(sp);
    if (!start || !end) return;
    
    const range = getPrevRange(start, end);
    
    const query = new URLSearchParams(apiParams);
    query.set('start', range.start);
    query.set('end', range.end);
    query.set('compare', compareMode);

    const url = `/api/ga4/overview?${query.toString()}`;
    
    setLoadingPrev(true);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload) => {
        setPreviousData(payload?.summary || null);
      })
      .catch((err) => {
        console.error('Failed to fetch previous user type data:', err || 'Unknown error');
        setPreviousData(null);
      })
      .finally(() => setLoadingPrev(false));
  }, [compareMode, urlSearchParams, data]);

  // Calculate previous period data
  const prevTotalUsers = previousData?.totalUsers || 0;
  const prevReturningUsers = previousData?.returningUsers || 0;
  const prevNewUsers = Math.max(0, prevTotalUsers - prevReturningUsers);

  // Calculate deltas
  const newUsersDelta = prevNewUsers > 0 ? ((newUsers - prevNewUsers) / prevNewUsers) * 100 : 0;
  const returningUsersDelta = prevReturningUsers > 0 ? ((returningUsers - prevReturningUsers) / prevReturningUsers) * 100 : 0;

  // Prepare data for donut chart
  const chartData = [
    {
      name: 'Nya användare',
      value: newUsers,
      percentage: totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0,
      color: '#E01E26', // Primary red
      delta: newUsersDelta
    },
    {
      name: 'Återkommande användare',
      value: returningUsers,
      percentage: totalUsers > 0 ? (returningUsers / totalUsers) * 100 : 0,
      color: '#F87171', // Light red
      delta: returningUsersDelta
    }
  ];

  // Custom tooltip for donut chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatNumber(data.value)} användare ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      onClick={onClick}
      className={onClick ? "cursor-pointer transition-all hover:ring-2 hover:ring-red-500 hover:ring-opacity-50 rounded-[5px]" : ""}
    >
      <AnalyticsBlock
        title="Användartyper"
        description="Fördelning av nya vs återkommande användare"
      >
        {/* Donut Chart */}
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => `${props.percentage.toFixed(1)}%\n${props.name}`}
                outerRadius={120}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
            <div className="col-span-4">Användartyp</div>
            <div className="col-span-3 text-right">Antal</div>
            <div className="col-span-3 text-right">Del av totalen</div>
            <div className="col-span-2 text-right">Föreg. period</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {chartData.map((item) => (
              <div key={item.name} className="grid grid-cols-12 px-3 py-2 items-center">
                <div className="col-span-4 flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-900 dark:text-white">{item.name}</span>
                </div>
                <div className="col-span-3 text-right font-medium text-gray-900 dark:text-white">
                  {formatNumber(item.value)}
                </div>
                <div className="col-span-3 text-right text-gray-700 dark:text-gray-300">
                  {item.percentage.toFixed(1)}%
                </div>
                <div className="col-span-2 text-right">
                  {loadingPrev ? (
                    <span className="text-gray-400 text-xs">Laddar...</span>
                  ) : previousData ? (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.delta > 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : item.delta < 0 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-400">–</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-4">Totalt</div>
              <div className="col-span-3 text-right font-medium text-gray-900 dark:text-white">
                {formatNumber(totalUsers)}
              </div>
              <div className="col-span-3 text-right">
                {totalUsers > 0 ? '100.0%' : '0.0%'}
              </div>
              <div className="col-span-2 text-right">
                {loadingPrev ? (
                  <span className="text-gray-400 text-xs">Laddar...</span>
                ) : previousData ? (
                  (() => {
                    const totalDelta = prevTotalUsers > 0 ? ((totalUsers - prevTotalUsers) / prevTotalUsers) * 100 : 0;
                    return (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        totalDelta > 0 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : totalDelta < 0 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {totalDelta > 0 ? '+' : ''}{totalDelta.toFixed(1)}%
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-gray-400">–</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </AnalyticsBlock>
    </div>
  );
}
