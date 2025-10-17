"use client";
import SectionLayout from "@/components/oversikt-besok/SectionLayout";
import { Distributions } from "@/components/oversikt-besok/Distributions";
import InfoTooltip from "@/components/InfoTooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { useFilters } from "@/components/GlobalFilters";
import { useEffect, useMemo, useState } from "react";
import { formatNumber, formatPercent } from "@/lib/format";

type ChannelRow = { 
  key: string; 
  sessions: number; 
  conversions?: number; // Konverteringar = purchase events
  conversionRate?: number; // Konverteringsgrad = session conversion rate
  deltaPct?: number; 
  spark?: number[] 
};

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
        
        // Build query parameters for traffic sources API
        const qs = new URLSearchParams({
          start: state.range.start,
          end: state.range.end,
        });
        
        // Add filters if they exist
        if (state.channel.length > 0) {
          qs.set('channel', state.channel.join(','));
        }
        if (state.device.length > 0) {
          qs.set('device', state.device.join(','));
        }
        
        // Fetch traffic sources data and other KPIs
        const [trafficSourcesResp, newUsersResp, searchResp] = await Promise.all([
          fetch(`/api/ga4/traffic-sources?${qs}`),
          fetch(`/api/kpi?metric=new_users&${qs}`),
          fetch(`/api/kpi?metric=internal_search_usage&${qs}`),
        ]);
        
        if (cancelled) return;
        
        let trafficSourcesData: any = null;
        if (trafficSourcesResp.ok) {
          trafficSourcesData = await trafficSourcesResp.json();
        }
        
        // Transform traffic sources data to ChannelRow format
        const transformedChannels: ChannelRow[] = trafficSourcesData?.channels?.map((c: any) => ({
          key: c.channel,
          sessions: c.sessions,
          conversions: c.purchases, // Konverteringar = purchase events
          conversionRate: c.sessionConversionRate, // Konverteringsgrad = session conversion rate
          deltaPct: 0 // No comparison data for now
        })) || [];
        
        setChannels(transformedChannels);
        
        // Get other KPIs
        const nu = (await newUsersResp.json())?.summary?.current ?? null;
        const is = (await searchResp.json())?.summary?.current ?? null;
        setNewUsers(nu ?? 860);
        setInternalSearch(is ?? 340);
        
        if (trafficSourcesData?.error) {
          setError(trafficSourcesData.error);
        }
        
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError("Visar mockdata – " + (e?.message || "Kunde inte ladda data"));
          // Fallback mock data with realistic conversion rates
          setChannels([
            { key: "Organic Search", sessions: 13921, conversions: 139, conversionRate: 1.00 },
            { key: "Direct", sessions: 7083, conversions: 152, conversionRate: 2.15 },
            { key: "Paid Search", sessions: 4162, conversions: 69, conversionRate: 1.66 },
            { key: "Referral", sessions: 1281, conversions: 2, conversionRate: 0.16 },
            { key: "Paid Social", sessions: 1004, conversions: 0, conversionRate: 0.00 },
          ]);
          setNewUsers(860);
          setInternalSearch(340);
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [state.range.start, state.range.end, state.range.grain, state.range.comparisonMode, state.channel.join(","), state.device.join(",")]);

  const totalSessions = useMemo(() => channels.reduce((s, c) => s + (c.sessions || 0), 0), [channels]);

  return (
    <SectionLayout
      title="Trafikkällor & Kanaler"
      description="Toppkanaler efter konverteringar, nya användare och intern sök"
      actions={<InfoTooltip text="Donut visar andelar; tabellen går att sortera. Följer filter." />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut via existing Distributions component */}
        <Distributions 
          title="Topp 5 kanaler" 
          data={channels.map(c => ({ 
            key: c.key, 
            sessions: c.sessions, 
            users: 0, 
            avgSessionDuration: 0, 
            bounceRate: 0, 
            engagementRatePct: 0,
            comparisonPct: c.deltaPct
          }))} 
          type="channel" 
          totalSessions={totalSessions} 
          hideTable 
        />

        {/* Sortable table */}
        <div className="card p-4">
          <div className="mb-2 text-base font-bold text-gray-900 dark:text-white">Topp 5 kanaler</div>
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
                    <TableCell className="text-right">
                      {(() => {
                        const raw = r.conversionRate;
                        const value = Number.isFinite(raw as number) && raw != null ? (raw as number) : 0;
                        const variant = value >= 3 ? "success" : value >= 1 ? "warning" : "error";
                        return (
                          <div className="flex justify-end">
                            <StatusPill variant={variant} size="sm" aria-label={formatPercent(value, { showSign: false })} className="min-w-[64px] justify-center">
                              {formatPercent(value, { showSign: false })}
                            </StatusPill>
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {loading && <div className="mt-2 text-xs text-gray-500">Laddar…</div>}
          {/* Error note removed per request */}
        </div>
      </div>
      {/* Removed right-side KPI cards per request */}
    </SectionLayout>
  );
}


