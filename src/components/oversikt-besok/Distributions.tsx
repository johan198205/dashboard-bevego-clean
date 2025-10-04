'use client';

import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatNumber, formatPercent } from '@/utils/format';
import type { Split } from '@/app/api/ga4/overview/route';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusPill } from '@/components/ui/status-pill';
import { PieChart as PieChartIcon, Smartphone as DeviceIcon } from 'lucide-react';

type Props = {
  title: string;
  data: Split[];
  type: 'channel' | 'device';
  totalSessions?: number;
  onClick?: () => void;
};

import { riksbyggenChartPalette } from '@/lib/theme-tokens';

// Riksbyggen brand color palette - red shades for cohesive visualization
const COLORS = [...riksbyggenChartPalette];

// Channel name mapping
const CHANNEL_NAMES: Record<string, string> = {
  'Organic Search': 'Organisk sökning',
  'Direct': 'Direkt',
  'Referral': 'Referral',
  'Social': 'Social',
  'Email': 'E-post',
  'Paid Search': 'Betald sökning',
  'Display': 'Display',
  'Other': 'Övrigt',
  'Paid Social': 'Paid Social',
  'Cross-network': 'Cross-network',
  'Organic Social': 'Organic Social',
  'Unassigned': 'Unassigned',
};

// Device name mapping
const DEVICE_NAMES: Record<string, string> = {
  'desktop': 'Desktop',
  'mobile': 'Mobil',
  'tablet': 'Surfplatta',
};

export function Distributions({ title, data, type, totalSessions, onClick }: Props) {
  // Use provided totalSessions or calculate from data
  const calculatedTotalSessions = data.reduce((sum, item) => sum + item.sessions, 0);
  const finalTotalSessions = totalSessions || calculatedTotalSessions;

  // Transform and group data for channels (only for channels, not devices)
  let displayData;
  if (type === 'channel') {
    // Sort by sessions descending
    const sortedData = data.sort((a, b) => b.sessions - a.sessions);
    
    // Take top 4 channels and group the rest as "Other"
    const top4 = sortedData.slice(0, 4);
    const others = sortedData.slice(4);
    
    const othersSessions = others.reduce((sum, item) => sum + item.sessions, 0);
    
    displayData = [
      ...top4.map((item, index) => ({
        ...item,
        name: CHANNEL_NAMES[item.key] || item.key,
        color: COLORS[index % COLORS.length],
      })),
      ...(othersSessions > 0 ? [{
        key: 'Other',
        sessions: othersSessions,
        name: 'Övrigt',
        color: COLORS[4],
        engagementRatePct: others.length > 0 ? others.reduce((sum, item) => sum + (item.engagementRatePct || 0), 0) / others.length : 0,
      }] : [])
    ];
  } else {
    // For devices, keep original logic
    displayData = data.map((item, index) => ({
      ...item,
      name: DEVICE_NAMES[item.key] || item.key,
      color: COLORS[index % COLORS.length],
    })).sort((a, b) => b.sessions - a.sessions);
  }

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
          <div className="space-y-1 mt-2">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sessions:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatNumber(data.sessions)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Andel:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatPercent((data.sessions / finalTotalSessions) * 100)}
              </span>
            </div>
          </div>
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
        title={title}
        description={`Fördelning av sessions per ${type === 'channel' ? 'kanal' : 'enhet'}`}
        icon={type === 'channel' ? <PieChartIcon size={24} /> : <DeviceIcon size={24} />}
      >
      {/* Donut Chart */}
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: any) => `${(props.percent * 100).toFixed(1)}%\n${props.name}`}
              outerRadius={120}
              innerRadius={60}
              fill="#8884d8"
              dataKey="sessions"
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-gray-900 dark:text-white font-semibold">{type === 'channel' ? 'Kanal' : 'Enhet'}</TableHead>
              <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Antal</TableHead>
              <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Del av totalen</TableHead>
              <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Föreg. period</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((item) => (
              <TableRow key={item.key}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    {item.name}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat("sv-SE").format(item.sessions)}
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent((item.sessions / finalTotalSessions) * 100)}
                </TableCell>
                <TableCell className="text-right">
                  {item.engagementRatePct !== undefined ? (
                    <StatusPill 
                      variant={item.engagementRatePct >= 0 ? "success" : "error"}
                      size="sm"
                    >
                      {item.engagementRatePct >= 0 ? "+" : ""}{item.engagementRatePct.toFixed(1)}%
                    </StatusPill>
                  ) : (
                    <span className="text-neutral-400">–</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-900 dark:text-white">Totalt:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatNumber(finalTotalSessions)} sessions
            </span>
        </div>
      </div>
    </AnalyticsBlock>
    </div>
  );
}
