'use client';

import { useState } from 'react';
import { AnalyticsBlock } from '@/components/ui/analytics-block';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatPercent, formatTime, formatPagePath, truncateText } from '@/utils/format';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import type { TopPage } from '@/app/api/ga4/overview/route';

type Props = {
  data: TopPage[];
};

type SortField = 'sessions' | 'engagementRatePct' | 'avgEngagementTimeSec';
type SortDirection = 'asc' | 'desc';

export function TopPages({ data }: Props) {
  const [sortField, setSortField] = useState<SortField>('sessions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showTop5, setShowTop5] = useState(false);

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortDirection === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  // Filter to top 5 if requested
  const displayData = showTop5 ? sortedData.slice(0, 5) : sortedData;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <AnalyticsBlock
      title="Topp-sidor"
      description="Mest besökta sidor baserat på sessions"
      headerRight={
        <Button variant="outline" size="sm" onClick={() => setShowTop5(!showTop5)}>
          {showTop5 ? 'Visa alla' : 'Visa top 5'}
        </Button>
      }
    >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Badge variant="outline" className="text-xs">
                    {showTop5 ? 'Top 5' : 'Top 10'}
                  </Badge>
                </TableHead>
                <TableHead className="min-w-[300px]">
                  Sida
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort('sessions')}
                >
                  <div className="flex items-center gap-1">
                    Sessions
                    {getSortIcon('sessions')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort('engagementRatePct')}
                >
                  <div className="flex items-center gap-1">
                    Eng. rate
                    {getSortIcon('engagementRatePct')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort('avgEngagementTimeSec')}
                >
                  <div className="flex items-center gap-1">
                    Gen. engagemangstid
                    {getSortIcon('avgEngagementTimeSec')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.map((page, index) => (
                <TableRow key={`${page.title}-${page.path}`}>
                  <TableCell>
                    <Badge 
                      variant={index < 5 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {truncateText(page.title, 50)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {formatPagePath(page.path, 40)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatNumber(page.sessions)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {formatPercent(page.engagementRatePct)}
                      </span>
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: page.engagementRatePct > 70 
                            ? '#E01E26' 
                            : page.engagementRatePct > 50 
                              ? '#F87171' 
                              : '#FCA5A5'
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatTime(page.avgEngagementTimeSec)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {displayData.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Ingen data tillgänglig
          </div>
        )}

        {/* Summary stats */}
        {displayData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatNumber(displayData.reduce((sum, page) => sum + page.sessions, 0))}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Totalt sessions</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatPercent(
                    displayData.reduce((sum, page) => sum + page.engagementRatePct, 0) / displayData.length
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Genomsnittlig eng. rate</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatTime(
                    displayData.reduce((sum, page) => sum + page.avgEngagementTimeSec, 0) / displayData.length
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Genomsnittlig tid</div>
              </div>
            </div>
          </div>
        )}
    </AnalyticsBlock>
  );
}
