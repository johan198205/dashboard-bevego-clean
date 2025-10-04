'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { formatNumber, formatPercent } from '@/utils/format';
import { CitiesBarChart } from './CitiesBarChart';
import type { Split } from '@/app/api/ga4/overview/route';

type Props = {
  data: Split[];
  onClick?: () => void;
};

export function GeoTopCities({ data, onClick }: Props) {
  const urlSearchParams = useSearchParams();
  const [compareMode, setCompareMode] = useState<'prev' | 'yoy'>('prev');
  
  // Sync with global comparison mode from URL params
  useEffect(() => {
    const compare = urlSearchParams.get('compare');
    if (compare === 'yoy' || compare === 'prev') {
      setCompareMode(compare);
    }
  }, [urlSearchParams]);
  const [previousCities, setPreviousCities] = useState<Split[] | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // All cities sorted desc - show all data as it comes from GA4 API
  const allCities = useMemo(() => {
    return [...data]
      .map((c) => ({ ...c, name: c.key === '(not set)' ? 'Okänd plats' : c.key }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [data]);

  // Show first 10 or all cities
  const cities = useMemo(() => {
    return showAll ? allCities : allCities.slice(0, 10);
  }, [allCities, showAll]);

  const totalSessions = useMemo(() => data.reduce((sum, c) => sum + c.sessions, 0), [data]);

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
    console.log('Current range:', { start, end });
    
    if (compareMode === 'yoy') {
      const prevStart = new Date(startDate);
      const prevEnd = new Date(endDate);
      prevStart.setFullYear(prevStart.getFullYear() - 1);
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      const result = {
        start: prevStart.toISOString().slice(0, 10),
        end: prevEnd.toISOString().slice(0, 10)
      };
      console.log('YoY range:', result);
      return result;
    }
    
    // previous period same length
    const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const prevEnd = new Date(startDate.getTime());
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd.getTime());
    prevStart.setDate(prevStart.getDate() - (diffDays - 1));
    const result = {
      start: prevStart.toISOString().slice(0, 10),
      end: prevEnd.toISOString().slice(0, 10)
    };
    console.log('Previous period range:', result, 'diffDays:', diffDays);
    return result;
  }

  // Fetch previous period/year cities
  useEffect(() => {
    const sp = new URLSearchParams(urlSearchParams.toString());
    const { start, end, apiParams } = buildFilterParams(sp);
    if (!start || !end) return;
    
    const range = getPrevRange(start, end);
    console.log('Fetching previous data for range:', range, 'compareMode:', compareMode);
    
    const query = new URLSearchParams(apiParams);
    query.set('start', range.start);
    query.set('end', range.end);
    // Add compare parameter to API call
    query.set('compare', compareMode);

    const url = `/api/ga4/overview?${query.toString()}`;
    console.log('Fetching URL:', url);
    
    setLoadingPrev(true);
    fetch(url)
      .then((r) => {
        console.log('Response status:', r.status);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload) => {
        console.log('Previous cities payload:', payload);
        console.log('Previous cities data:', payload?.cities);
        setPreviousCities(payload?.cities || null);
      })
      .catch((err) => {
        console.error('Failed to fetch previous cities:', err || 'Unknown error');
        setPreviousCities(null);
      })
      .finally(() => setLoadingPrev(false));
  }, [compareMode, urlSearchParams, data]); // Added data dependency to trigger when current data changes

  const prevByCity = useMemo(() => {
    const map = new Map<string, number>();
    (previousCities || []).forEach((c) => {
      map.set(c.key, c.sessions);
      console.log(`Previous city: ${c.key} = ${c.sessions} sessions`);
    });
    console.log('Previous cities map:', map);
    return map;
  }, [previousCities]);

  return (
    <div 
      onClick={onClick}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${onClick ? "cursor-pointer transition-all hover:ring-2 hover:ring-red-500 hover:ring-opacity-50 rounded-[5px]" : ""}`}
    >
      {/* Table Section */}
      <AnalyticsBlock
        title="Städer"
        description="Alla städer med sessions, engagemang och jämförelse"
      >
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300">
          <div className="col-span-4">Stad</div>
          <div className="col-span-2 text-right">Antal</div>
          <div className="col-span-2 text-right">% av total</div>
          <div className="col-span-2 text-right">Eng. rate</div>
          <div className="col-span-2 text-right">
            Föreg. period <span className="text-xs text-blue-600">({compareMode})</span>
          </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {cities.map((city) => {
            const prev = prevByCity.get(city.key) ?? undefined;
            const deltaPct = prev && prev > 0 ? ((city.sessions - prev) / prev) * 100 : undefined;
            const deltaColor = deltaPct === undefined ? 'text-gray-400' : deltaPct >= 0 ? 'text-green-600' : 'text-red-600';
            const badgeColor = deltaPct === undefined ? 'bg-gray-100 text-gray-600' : deltaPct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
            
            // Debug logging
            console.log(`City: ${city.key}, Current: ${city.sessions}, Previous: ${prev}, Delta: ${deltaPct}, Mode: ${compareMode}`);
            
            return (
              <div key={city.key} className="grid grid-cols-12 px-3 py-2 items-center">
                <div className="col-span-4 truncate text-gray-900 dark:text-white">{city.name}</div>
                <div className="col-span-2 text-right font-medium text-gray-900 dark:text-white">
                  {formatNumber(city.sessions)}
                </div>
                <div className="col-span-2 text-right text-gray-700 dark:text-gray-300">
                  {(city.sessions / totalSessions * 100).toFixed(1)}%
                </div>
                <div className="col-span-2 text-right text-gray-700 dark:text-gray-300">{formatPercent(city.engagementRatePct)}</div>
                <div className="col-span-2 text-right">
                  {loadingPrev ? (
                    <span className="text-gray-400">laddar…</span>
                  ) : prev === undefined ? (
                    <span className="text-gray-400" title={`No previous data for ${city.key}`}>–</span>
                  ) : (
                    <span className={`inline-flex items-center justify-end rounded-full px-2 py-0.5 text-xs ${badgeColor}`} title={`Previous: ${formatNumber(prev)}`}>
                      {deltaPct! >= 0 ? '+' : ''}{formatPercent(Math.abs(deltaPct!))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {!showAll && allCities.length > 10 && (
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Visa fler ({allCities.length - 10} till) →
            </button>
          </div>
        )}
        {showAll && allCities.length > 10 && (
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setShowAll(false)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              Visa färre ↑
            </button>
          </div>
        )}
        <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 flex justify-between">
          <span>Totalt</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatNumber(totalSessions)}</span>
        </div>
      </div>
      </AnalyticsBlock>

      {/* Chart Section */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-6">
        <CitiesBarChart 
          data={allCities} 
          title="Top 5 Städer"
          height={400}
        />
      </div>
    </div>
  );
}
