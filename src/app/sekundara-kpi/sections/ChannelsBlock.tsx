"use client";
import SectionLayout from "@/components/oversikt-besok/SectionLayout";
import { Distributions } from "@/components/oversikt-besok/Distributions";
import InfoTooltip from "@/components/InfoTooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFilters } from "@/components/GlobalFilters";
import { useEffect, useMemo, useState } from "react";
import { formatNumber, formatPercent } from "@/lib/format";

type ChannelRow = { key: string; sessions: number; conversions?: number; deltaPct?: number; spark?: number[] };

export default function ChannelsBlock() {
  const { state } = useFilters();
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [newUsers, setNewUsers] = useState<number | null>(null);
  const [internalSearch, setInternalSearch] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams({
          start: state.range.start,
          end: state.range.end,
          grain: state.range.grain,
          comparisonMode: state.range.comparisonMode,
        }).toString();
        const [overview, newUsersResp, searchResp] = await Promise.all([
          fetch(`/api/ga4/overview?${qs}`),
          fetch(`/api/kpi?metric=new_users&${qs}`),
          fetch(`/api/kpi?metric=internal_search_usage&${qs}`),
        ]);
        let ov: any = null;
        if (overview.ok) ov = await overview.json();
        if (cancelled) return;
        const mockChannels: ChannelRow[] = [
          { key: "Organic Search", sessions: 4200, conversions: 210, deltaPct: 3.2 },
          { key: "Direct", sessions: 2800, conversions: 150, deltaPct: -1.1 },
          { key: "Referral", sessions: 1200, conversions: 70, deltaPct: 2.5 },
          { key: "Email", sessions: 900, conversions: 60, deltaPct: 0.5 },
          { key: "Paid Search", sessions: 700, conversions: 55, deltaPct: 4.1 },
        ];
        const ch = (ov?.channels || [])
          .map((c: any) => ({ key: c.key, sessions: c.sessions, conversions: c.conversions, deltaPct: c.engagementRatePct }))
          .sort((a: any, b: any) => (b.sessions || 0) - (a.sessions || 0))
          .slice(0, 5);
        setChannels(ch.length ? ch : mockChannels);
        const nu = (await newUsersResp.json())?.summary?.current ?? null;
        const is = (await searchResp.json())?.summary?.current ?? null;
        setNewUsers(nu ?? 860);
        setInternalSearch(is ?? 340);
        if (!ov) setError("Visar mockdata – koppla till GA4 overview/API.");
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError("Visar mockdata – " + (e?.message || "Kunde inte ladda data"));
          setChannels([
            { key: "Organic Search", sessions: 4200, conversions: 210, deltaPct: 3.2 },
            { key: "Direct", sessions: 2800, conversions: 150, deltaPct: -1.1 },
            { key: "Referral", sessions: 1200, conversions: 70, deltaPct: 2.5 },
          ]);
          setNewUsers(860);
          setInternalSearch(340);
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [state.range.start, state.range.end, state.range.grain, state.range.comparisonMode, state.channel.join(","), state.device.join(","), state.audience.join(",")]);

  const totalSessions = useMemo(() => channels.reduce((s, c) => s + (c.sessions || 0), 0), [channels]);

  return (
    <SectionLayout
      title="Trafikkällor & Kanaler"
      description="Toppkanaler efter konverteringar, nya användare och intern sök"
      actions={<InfoTooltip text="Donut visar andelar; tabellen går att sortera. Följer filter." />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut via existing Distributions component */}
        <Distributions title="Topp 5 kanaler" data={(channels as any[]).map(c => ({ key: c.key, sessions: c.sessions, engagementRatePct: 0 }))} type="channel" totalSessions={totalSessions} hideTable />

        {/* Sortable table */}
        <div className="card p-4">
          <div className="mb-2 text-sm font-medium text-gray-900 dark:text-white">Topp 5 kanaler</div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-900 dark:text-white font-semibold">Kanal</TableHead>
                  <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Volym</TableHead>
                  <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Konverteringar</TableHead>
                  <TableHead className="text-right text-gray-900 dark:text-white font-semibold">Konverteringsgrad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell>{r.key}</TableCell>
                    <TableCell className="text-right">{formatNumber(r.sessions)}</TableCell>
                    <TableCell className="text-right">{r.conversions == null ? "–" : formatNumber(r.conversions)}</TableCell>
                    <TableCell className="text-right">{r.conversions != null && r.sessions ? formatPercent((r.conversions / r.sessions) * 100) : "–"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {loading && <div className="mt-2 text-xs text-gray-500">Laddar…</div>}
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        </div>
      </div>
      {/* Removed right-side KPI cards per request */}
    </SectionLayout>
  );
}


