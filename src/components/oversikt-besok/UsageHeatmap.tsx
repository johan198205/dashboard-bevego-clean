'use client';

import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber, formatWeekday, formatHour } from '@/utils/format';
import type { WeekdayHour } from '@/app/api/ga4/overview/route';

type Props = {
  data: WeekdayHour[];
  onClick?: () => void;
};

export function UsageHeatmap({ data, onClick }: Props) {
  // Create a 7x24 grid (weekdays x hours)
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ sessions: 0, engagedSessions: 0 })));
  
  // Fill the grid with data
  data.forEach(item => {
    if (item.weekday >= 0 && item.weekday < 7 && item.hour >= 0 && item.hour < 24) {
      grid[item.weekday][item.hour] = {
        sessions: item.sessions,
        engagedSessions: item.engagedSessions
      };
    }
  });

  // Calculate min, median, and max for color scaling
  const allSessions = data.map(d => d.sessions).filter(s => s > 0);
  const minSessions = Math.min(...allSessions);
  const maxSessions = Math.max(...allSessions);
  const medianSessions = allSessions.sort((a, b) => a - b)[Math.floor(allSessions.length / 2)];

  // Get color intensity based on sessions using Riksbyggen red colors
  const getColorIntensity = (sessions: number) => {
    if (sessions === 0) return 'bg-gray-50 dark:bg-gray-800';
    
    const intensity = (sessions - minSessions) / (maxSessions - minSessions);
    
    if (intensity < 0.2) return 'bg-red-50 dark:bg-red-900/20';
    if (intensity < 0.4) return 'bg-red-100 dark:bg-red-900/40';
    if (intensity < 0.6) return 'bg-red-200 dark:bg-red-800/60';
    if (intensity < 0.8) return 'bg-red-300 dark:bg-red-700/80';
    return 'bg-red-500 dark:bg-red-500';
  };

  const weekdays = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

  return (
    <div 
      onClick={onClick}
      className={onClick ? "cursor-pointer transition-all hover:ring-2 hover:ring-red-500 hover:ring-opacity-50 rounded-[5px]" : ""}
    >
      <AnalyticsBlock
        title="Användningsmönster"
        description="Sessions per veckodag och timme"
        className="w-full"
      >
        <div className="space-y-6">
          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <div className="inline-block w-full">
              {/* Hour headers */}
              <div className="flex">
                <div className="w-20 h-12"></div> {/* Empty cell for weekday labels */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <div 
                    key={hour} 
                    className="flex-1 h-12 flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 font-medium min-w-[3rem]"
                  >
                    {hour}
                  </div>
                ))}
              </div>

              {/* Weekday rows */}
              {grid.map((weekdayData, weekday) => (
                <div key={weekday} className="flex">
                  {/* Weekday label */}
                  <div className="w-20 h-12 flex items-center justify-center text-sm text-gray-700 dark:text-gray-300 font-semibold">
                    {weekdays[weekday]}
                  </div>
                  
                  {/* Hour cells */}
                  {weekdayData.map((cellData, hour) => (
                    <TooltipProvider key={hour}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={`flex-1 h-12 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-2 hover:border-red-500 dark:hover:border-red-400 transition-all duration-200 min-w-[3rem] ${getColorIntensity(cellData.sessions)}`}
                            aria-label={`${formatWeekday(weekday)} ${formatHour(hour)} - ${formatNumber(cellData.sessions)} sessions`}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg">
                          <div className="space-y-2 p-1">
                            <p className="font-semibold text-base text-gray-900 dark:text-white">
                              {formatWeekday(weekday)} {formatHour(hour)}
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium text-red-600 dark:text-red-400">Sessions:</span> {formatNumber(cellData.sessions)}
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium text-red-600 dark:text-red-400">Engagerade:</span> {formatNumber(cellData.engagedSessions)}
                              </p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Trafikintensitet
            </h4>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Lägsta:</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"></div>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(minSessions)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Median:</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-200 dark:bg-red-800/60 border border-gray-200 dark:border-gray-700 rounded"></div>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(medianSessions)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Högsta:</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-red-500 dark:bg-red-500 border border-gray-200 dark:border-gray-700 rounded"></div>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(maxSessions)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </AnalyticsBlock>
    </div>
  );
}
