"use client";
import { useBusinessKpis } from "@/hooks/useBusinessKpis";
import { formatNumber, formatPercent } from "@/utils/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { CheckIcon } from "@/assets/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";

export function EfficiencyBlock() {
  const { data, loading, error } = useBusinessKpis();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="efficiency-heading" className="text-xl font-semibold text-gray-900 dark:text-white">
              Effektivitet
            </h2>
            <p id="efficiency-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Konverteringsgrad och kostnad per förvärv per kanal
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 w-full rounded-lg bg-gray-200 dark:bg-gray-700"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="efficiency-heading" className="text-xl font-semibold text-gray-900 dark:text-white">
              Effektivitet
            </h2>
            <p id="efficiency-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Konverteringsgrad och kostnad per förvärv per kanal
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Kunde inte ladda effektivitets-data: {error}
          </p>
        </div>
      </div>
    );
  }

  const { current, comparison } = data;
  const efficiency = current.efficiency;
  const comparisonEfficiency = comparison?.efficiency;

  // Calculate growth rates
  // Calculate growth rates using same method as rest of system (computeDiff)
  const getGrowthRate = (current: number, previous: number) => {
    const delta = current - previous;
    // Use Math.max to avoid division by zero, consistent with computeDiff in yoy.ts
    const denominator = Math.max(Math.abs(previous), 0.000001);
    return Math.round((delta / denominator) * 10000) / 100; // Two decimal places like toPct
  };

  const conversionRateGrowth = comparisonEfficiency ? getGrowthRate(efficiency.conversionRate, comparisonEfficiency.conversionRate) : 0;

  return (
    <div className="space-y-6">
      {/* Block Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 id="efficiency-heading" className="text-xl font-semibold text-gray-900 dark:text-white">
            Effektivitet
          </h2>
          <p id="efficiency-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Konverteringsgrad och kostnad per förvärv per kanal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Källa: GA4 API
          </span>
        </div>
      </div>

      {/* KPI Cards Grid - Only conversion rate until Google Ads API is implemented */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <ScoreCard
            label="Konverteringsgrad (total)"
            value={formatPercent(efficiency.conversionRate)}
            growthRate={conversionRateGrowth}
            Icon={CheckIcon}
            variant="primary"
            source="GA4 API"
            className="min-h-[208px]"
            comparisonLabel={data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
          />
        </div>

        {/* Empty slots to maintain layout until Google Ads API is implemented */}
        <div></div>
        <div></div>
        <div></div>
      </div>

      {/* Channel Breakdown Table */}
      <div id="efficiency-table" className="mt-6" role="region" aria-label="Konverteringsgrad per kanal tabell">
        <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
          <div className="px-6 py-4 border-b border-stroke dark:border-dark-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                Konverteringsgrad per kanal
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-5 dark:text-dark-6">Källa: GA4 API</span>
              </div>
            </div>
          </div>
          
          {current.channelBreakdown.length === 0 ? (
            <div className="p-6 text-center text-sm text-dark-6 dark:text-dark-4">
              Inga kanaler för valt filter.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-900 dark:text-white font-semibold">Kanal</TableHead>
                    <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Sessioner</TableHead>
                    <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Aktiva användare</TableHead>
                    <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Köp</TableHead>
                    <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Konv. %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.channelBreakdown.map((channel, index) => (
                    <TableRow key={channel.channel}>
                      <TableCell className="font-medium">{channel.channel}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(channel.sessions)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(channel.activeUsers)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(channel.purchases)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusPill 
                          variant={channel.conversion >= 3 ? "success" : channel.conversion >= 1 ? "warning" : "error"}
                          size="sm"
                        >
                          {formatPercent(channel.conversion)}
                        </StatusPill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Note */}
      {data.comparisonMode !== 'none' && (
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Jämförelse: {data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
        </div>
      )}
    </div>
  );
}
