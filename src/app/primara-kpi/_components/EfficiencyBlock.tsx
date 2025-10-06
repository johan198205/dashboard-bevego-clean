"use client";
import { useBusinessKpis } from "@/hooks/useBusinessKpis";
import { formatNumber, formatPercent } from "@/lib/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { UserIcon, GlobeIcon, TrendingUpIcon, CheckIcon } from "@/assets/icons";
import InfoTooltip from "@/components/InfoTooltip";
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
  const getGrowthRate = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const conversionRateGrowth = comparisonEfficiency ? getGrowthRate(efficiency.conversionRate, comparisonEfficiency.conversionRate) : 0;
  const cpaLeadsGrowth = comparisonEfficiency ? getGrowthRate(efficiency.cpaLeads, comparisonEfficiency.cpaLeads) : 0;
  const cpaCustomersGrowth = comparisonEfficiency ? getGrowthRate(efficiency.cpaCustomers, comparisonEfficiency.cpaCustomers) : 0;
  const roiGrowth = comparisonEfficiency ? getGrowthRate(efficiency.roi, comparisonEfficiency.roi) : 0;

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
          <InfoTooltip text="Data från Google Analytics 4 med affärslogik-mappning" />
        </div>
      </div>

      {/* KPI Cards Grid */}
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
          <div className="absolute top-2 right-2">
            <InfoTooltip text="Total konverteringsgrad baserat på GA4 sessions" />
          </div>
        </div>

        <div className="relative">
          <ScoreCard
            label="CPA för leads"
            value={`${formatNumber(efficiency.cpaLeads)} SEK`}
            growthRate={cpaLeadsGrowth}
            Icon={UserIcon}
            variant="success"
            source="GA4 API"
            className="min-h-[208px]"
            comparisonLabel={data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
          />
          <div className="absolute top-2 right-2">
            <InfoTooltip text="Kostnad per förvärv för leads" />
          </div>
        </div>

        <div className="relative">
          <ScoreCard
            label="CPA för kunder"
            value={`${formatNumber(efficiency.cpaCustomers)} SEK`}
            growthRate={cpaCustomersGrowth}
            Icon={GlobeIcon}
            variant="warning"
            source="GA4 API"
            className="min-h-[208px]"
            comparisonLabel={data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
          />
          <div className="absolute top-2 right-2">
            <InfoTooltip text="Kostnad per förvärv för kunder" />
          </div>
        </div>

        <div className="relative">
          <ScoreCard
            label="ROI"
            value={`${formatNumber(efficiency.roi)}%`}
            growthRate={roiGrowth}
            Icon={TrendingUpIcon}
            variant="info"
            source="GA4 API"
            className="min-h-[208px]"
            comparisonLabel={data.comparisonMode === 'yoy' ? 'vs. föregående år' : 'vs. föregående period'}
          />
          <div className="absolute top-2 right-2">
            <InfoTooltip text="Return on Investment baserat på försäljning vs kostnad" />
          </div>
        </div>
      </div>

      {/* Channel Breakdown Table */}
      <div id="efficiency-table" className="mt-6" role="region" aria-label="Effektivitet per kanal tabell">
        <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
          <div className="px-6 py-4 border-b border-stroke dark:border-dark-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                Effektivitet per kanal
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-5 dark:text-dark-6">Källa: GA4 API</span>
                <InfoTooltip text="Brytning per kanal med volym, konverteringsgrad, CPA och trend" />
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
                    <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Volym</TableHead>
                    <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Konv. %</TableHead>
                    <TableHead className="text-right text-gray-900 dark:text-white font-semibold">CPA (SEK)</TableHead>
                    <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.channelBreakdown.map((channel, index) => (
                    <TableRow key={channel.channel}>
                      <TableCell className="font-medium">{channel.channel}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(channel.leads)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusPill 
                          variant={channel.conversion >= 3 ? "success" : channel.conversion >= 1 ? "warning" : "error"}
                          size="sm"
                        >
                          {formatPercent(channel.conversion)}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(channel.cpa)} SEK
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <div className="h-2 w-8 bg-gray-200 rounded dark:bg-gray-700">
                            <div 
                              className="h-full bg-blue-500 rounded"
                              style={{ width: `${Math.min(100, Math.max(0, channel.conversion * 20))}%` }}
                            />
                          </div>
                        </div>
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
