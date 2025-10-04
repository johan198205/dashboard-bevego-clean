"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import { useFilters } from "@/components/GlobalFilters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import InfoTooltip from "@/components/InfoTooltip";

export default function ChannelTable({ metric, range }: { metric: Params["metric"]; range: Params["range"] }) {
  const [data, setData] = useState<KpiResponse | null>(null);
  const { state } = useFilters();
  
  // Get comparison column header based on current comparison mode
  const getComparisonHeader = () => {
    switch (state.range.comparisonMode) {
      case 'yoy': return 'YoY';
      case 'prev': return 'Föreg. period';
      case 'none': return 'Jämförelse';
      default: return 'Jämförelse';
    }
  };
  useEffect(() => {
    getKpi({ metric, range: { ...range, comparisonMode: state.range.comparisonMode }, filters: { audience: state.audience, device: state.device, channel: state.channel } }).then(setData);
  }, [metric, range.start, range.end, range.grain, state.range.comparisonMode, state.audience.join(","), state.device.join(","), state.channel.join(",")]);
  const rows = data?.breakdown || [];

  return (
    <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
      <div className="px-6 py-4 border-b border-stroke dark:border-dark-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark dark:text-white">
            Kanalgrupper
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-dark-5 dark:text-dark-6">Källa: Mock</span>
            <InfoTooltip text="Brytning per kanalgrupp. Mockdata." />
          </div>
        </div>
      </div>
      
      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-dark-6 dark:text-dark-4">
          Inga rader för valt filter.
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kanal</TableHead>
                <TableHead className="text-right">Antal</TableHead>
                <TableHead className="text-right">
                  {getComparisonHeader()}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{r.key}</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("sv-SE").format(r.value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.yoyPct !== undefined ? (
                      <StatusPill 
                        variant={r.yoyPct >= 0 ? "success" : "error"}
                        size="sm"
                      >
                        {r.yoyPct >= 0 ? "+" : ""}{r.yoyPct.toFixed(1)}%
                      </StatusPill>
                    ) : (
                      <span className="text-neutral-400">–</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}


