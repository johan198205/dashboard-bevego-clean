'use client';

import { formatNumber } from '@/utils/format';

type Props = {
  data: Array<{
    key: string;
    sessions: number;
    engagementRatePct: number;
  }>;
  title?: string;
  height?: number;
};

export function CitiesBarChart({ data, title = "Top 10 Städer", height = 300 }: Props) {
  // Get top 10 cities by sessions
  const top10Cities = data
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  // Show message if no data
  if (top10Cities.length === 0) {
    return (
      <div className="w-full">
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Antal sessions per stad</p>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          Ingen data tillgänglig
        </div>
      </div>
    );
  }

  // Calculate total for percentage calculation
  const totalSessions = data.reduce((sum, city) => sum + city.sessions, 0);

  return (
    <div className="w-full">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Antal sessions per stad</p>
      </div>
      
      {/* Simple CSS Bar Chart */}
      <div className="space-y-3">
        {top10Cities.map((city, index) => {
          const totalPercentage = (city.sessions / totalSessions) * 100;
          
          return (
            <div key={city.key} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                  {city.key === '(not set)' ? 'Okänd plats' : city.key}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {totalPercentage.toFixed(1)}%
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatNumber(city.sessions)}
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
    </div>
  );
}
