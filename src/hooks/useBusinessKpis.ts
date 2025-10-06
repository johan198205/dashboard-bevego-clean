"use client";
import { useState, useEffect } from 'react';
import { useFilters } from '@/components/GlobalFilters';

export type BusinessKpiData = {
  leads: {
    quoteRequests: number;
    customerApplications: number;
    ecommerceApplications: number;
    formLeads: number;
  };
  sales: {
    completedPurchases: number;
    totalOrderValue: number;
    averageOrderValue: number;
    returningCustomers: number;
  };
  efficiency: {
    conversionRate: number;
    cpaLeads: number;
    cpaCustomers: number;
    roi: number;
  };
  timeseries: {
    date: string;
    leads: number;
    sales: number;
    conversion: number;
  }[];
  channelBreakdown: {
    channel: string;
    leads: number;
    sales: number;
    conversion: number;
    cpa: number;
  }[];
  sampled: boolean;
};

export type BusinessKpiResponse = {
  current: BusinessKpiData;
  comparison: BusinessKpiData | null;
  comparisonMode: string;
};

export function useBusinessKpis() {
  const { state } = useFilters();
  const [data, setData] = useState<BusinessKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          start: state.range.start,
          end: state.range.end,
          compare: state.range.comparisonMode || 'yoy',
        });

        // Add filters if they exist
        if (state.channel.length > 0) {
          params.set('channel', state.channel.join(','));
        }
        if (state.device.length > 0) {
          params.set('device', state.device.join(','));
        }
        if (state.audience.length > 0) {
          params.set('role', state.audience.join(','));
        }

        const response = await fetch(`/api/ga4/business-kpis?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch business KPIs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    state.range.start,
    state.range.end,
    state.range.comparisonMode,
    state.channel.join(','),
    state.device.join(','),
    state.audience.join(',')
  ]);

  return { data, loading, error };
}
