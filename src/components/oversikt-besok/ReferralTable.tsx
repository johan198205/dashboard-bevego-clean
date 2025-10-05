'use client';

import { AnalyticsBlock } from '@/components/ui/analytics-block';
import type { Split } from '@/app/api/ga4/overview/route';
import { formatNumber, formatPercent } from '@/utils/format';

type Props = {
  data?: Split[]; // optional until API fully stable
  totalSessions?: number;
};

export default function ReferralTable({ data = [], totalSessions = 0 }: Props) {
  const rows = (data || []).slice(0, 10);

  // Show message if no data
  if (rows.length === 0) {
    return (
      <AnalyticsBlock
        title="Referral pages — Top 10"
        description="Andel och volym per referrer"
      >
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          Ingen data för valt filter.
        </div>
      </AnalyticsBlock>
    );
  }

  return (
    <AnalyticsBlock
      title="Referral pages — Top 10"
      description="Andel och volym per referrer"
    >
      {/* Simple CSS Bar Chart */}
      <div className="space-y-3">
        {rows.map((referrer, index) => {
          const totalPercentage = totalSessions > 0 ? (referrer.sessions / totalSessions) * 100 : 0;
          
          // Clean up referrer URL for display
          let displayUrl = referrer.key;
          if (referrer.key === '(direct)') {
            displayUrl = '(direct)';
          } else if (referrer.key.startsWith('http')) {
            // For URLs, show just the domain for cleaner display
            try {
              const url = new URL(referrer.key);
              displayUrl = url.hostname;
            } catch {
              displayUrl = referrer.key;
            }
          }
          
          return (
            <div key={referrer.key} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={referrer.key}>
                  {displayUrl}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {totalPercentage.toFixed(1)}%
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatNumber(referrer.sessions)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-[#E01E26] h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${totalPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AnalyticsBlock>
  );
}


