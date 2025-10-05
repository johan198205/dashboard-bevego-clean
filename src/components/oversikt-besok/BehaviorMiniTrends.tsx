'use client';

import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import type { TimePoint } from '@/app/api/ga4/overview/route';

type Props = {
  data: TimePoint[];
};

export default function BehaviorMiniTrends({ data }: Props) {
  const chartData = data.map(d => ({
    date: d.date,
    pagesPerSession: (d.pageviews && d.sessions) ? d.pageviews / Math.max(1, d.sessions) : undefined,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
      <AnalyticsBlock title="Pages / session" description="Beräknad från sidvisningar / sessioner">
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="pagesPerSession" stroke="#E01E26" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AnalyticsBlock>
    </div>
  );
}


