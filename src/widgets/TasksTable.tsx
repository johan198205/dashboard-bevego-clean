"use client";
import { useEffect, useState } from "react";
import { getKpi } from "@/lib/resolver";
import { KpiResponse, Params } from "@/lib/types";
import InfoTooltip from "@/components/InfoTooltip";
import { formatPercent } from "@/lib/format";
import { ScoreCard } from "@/components/ui/scorecard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { ArrowUpIcon, ArrowDownIcon } from "@/assets/icons";

export default function TasksTable({ range }: { range: Params["range"] }) {
  const [tasks, setTasks] = useState<KpiResponse | null>(null);
  const [mau, setMau] = useState<KpiResponse | null>(null);
  const [users, setUsers] = useState<KpiResponse | null>(null);
  useEffect(() => {
    getKpi({ metric: "tasks", range }).then(setTasks);
    getKpi({ metric: "mau", range }).then(setMau);
    getKpi({ metric: "users", range }).then(setUsers);
  }, [range.start, range.end, range.compareYoy, range.grain]);

  const denominatorCurrent = users?.summary.current || mau?.summary.current || 0;
  const denominatorPrev = users?.summary.prev || mau?.summary.prev || 0;

  const formatPercentUnsigned = (v: number) => formatPercent(v).replace(/^\+/, "");

  const rows = (tasks?.breakdown || []).map((r) => {
    const rate = denominatorCurrent ? (r.value / denominatorCurrent) * 100 : 0;
    return { key: r.key, value: r.value, rate, yoyPct: r.yoyPct };
  });
  const totalRate = (() => {
    const totalCount = rows.reduce((acc, r) => acc + (r.value || 0), 0);
    if (!denominatorCurrent || totalCount <= 0) return null;
    return (totalCount / denominatorCurrent) * 100;
  })();

  const yoyRatePct = (() => {
    if (!tasks?.summary) return null;
    const prevCount = tasks.summary.prev || 0;
    if (!prevCount || !denominatorPrev || totalRate === null) return null;
    const prevRate = (prevCount / denominatorPrev) * 100;
    if (!Number.isFinite(prevRate) || prevRate === 0) return null;
    return ((totalRate - prevRate) / Math.abs(prevRate)) * 100;
  })();

  // Icon component for Tasks
  const TasksIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <ScoreCard
        label="Tasks"
        value={totalRate !== null ? formatPercentUnsigned(totalRate) : "–"}
        growthRate={yoyRatePct !== null ? yoyRatePct : undefined}
        Icon={TasksIcon}
        source="Mock"
        variant="primary"
      />
      
      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-stroke bg-white p-6 text-center text-sm text-gray-500 dark:border-dark-3 dark:bg-gray-dark">
          Inga rader för valt filter.
        </div>
      ) : (
        <div className="rounded-lg border border-stroke bg-white shadow-sm dark:border-dark-3 dark:bg-gray-dark">
          <div className="px-6 py-4 border-b border-stroke dark:border-dark-3">
            <h3 className="text-lg font-semibold text-dark dark:text-white">Task Details</h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right">Antal</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">{range.comparisonMode === 'prev' ? 'Föreg. period' : 'YoY'}</TableHead>
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
                      {r.rate.toFixed(2)}%
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
        </div>
      )}
    </div>
  );
}


