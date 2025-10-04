import { useEffect, useState } from 'react';
import { useFilters } from '@/components/GlobalFilters';
// Use real CrUX data from our API client
import { getCruxSummary } from '@/services/crux-data.service';
import { CwvSummary } from '@/lib/types';

export function useCwvData() {
  const { state } = useFilters();
  const [summary, setSummary] = useState<CwvSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const summaryData = await getCruxSummary(state.range, state.device);
        setSummary(summaryData || null);
      } catch (error) {
        console.error('Error loading CWV data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [state.range.start, state.range.end, state.device]);

  return { summary, loading };
}
