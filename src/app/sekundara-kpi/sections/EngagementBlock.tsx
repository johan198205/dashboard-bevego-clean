"use client";
import SectionLayout from "@/components/oversikt-besok/SectionLayout";
import InfoTooltip from "@/components/InfoTooltip";
import { ScoreCard } from "@/components/ui/scorecard";
import { Switch } from "@/components/FormElements/switch";
import dynamic from "next/dynamic";
import { useFilters } from "@/components/GlobalFilters";
import { useEffect, useMemo, useState } from "react";
import { formatNumber, formatPercent } from "@/lib/format";
import { GlobeIcon, EmailIcon } from "@/assets/icons";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Tp = { x: number; y: number };

export default function EngagementBlock() {
  const { state } = useFilters();
  const [engagementRate, setEngagementRate] = useState<{ value: number; delta?: number } | null>(null);
  const [newsletter, setNewsletter] = useState<{ value: number; delta?: number } | null>(null);
  const [newUsers, setNewUsers] = useState<{ value: number; delta?: number } | null>(null);
  const [loggedInUsers, setLoggedInUsers] = useState<{ value: number; delta?: number } | null>(null);
  const [internalSearch, setInternalSearch] = useState<{ value: number; delta?: number } | null>(null);
  const [sessionTime, setSessionTime] = useState<{ value: number; delta?: number } | null>(null);

  const [trend, setTrend] = useState<Tp[]>([]);
  const [trendNewsletter, setTrendNewsletter] = useState<Tp[]>([]);
  const [trendNewUsers, setTrendNewUsers] = useState<Tp[]>([]);
  const [trendLoggedIn, setTrendLoggedIn] = useState<Tp[]>([]);
  const [trendInternalSearch, setTrendInternalSearch] = useState<Tp[]>([]);
  const [trendSessionTime, setTrendSessionTime] = useState<Tp[]>([]);

  const [active, setActive] = useState({
    engagement: true,
    newsletter: true,
    newUsers: false,
    loggedIn: false,
    internalSearch: false,
    sessionTime: false,
  });
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
        const [eng, news] = await Promise.all([
          fetch(`/api/kpi?metric=engagement_rate&${qs}`),
          fetch(`/api/kpi?metric=newsletter_signups&${qs}`),
        ]);
        let er: any = null, ns: any = null;
        if (eng.ok) er = await eng.json();
        if (news.ok) ns = await news.json();
        if (cancelled) return;
        // Mock fallbacks
        const mockEngRate = 56.4; // percent
        const mockEngTrend = Array.from({ length: 12 }).map((_, i) => ({ x: Date.now() - (11 - i) * 86400000, y: Math.round(45 + Math.random() * 20) }));
        const mockNews = 320;
        const mockNewsTrend = Array.from({ length: 12 }).map((_, i) => ({ x: Date.now() - (11 - i) * 86400000, y: Math.round(15 + Math.random() * 20) }));
        const mockNewUsers = 980;
        const mockLoggedIn = 430;
        const mockInternal = 210;
        const mockSession = 180; // seconds
        const mockGeneric = Array.from({ length: 12 }).map((_, i) => ({ x: Date.now() - (11 - i) * 86400000, y: Math.round(30 + Math.random() * 25) }));

        setEngagementRate({ value: er?.summary?.current ?? mockEngRate, delta: er?.summary?.yoyPct ?? er?.summary?.prevPct ?? 3.1 });
        setNewsletter({ value: ns?.summary?.current ?? mockNews, delta: ns?.summary?.yoyPct ?? ns?.summary?.prevPct ?? 4.2 });
        setTrend((er?.timeseries || mockEngTrend));
        setTrendNewsletter((ns?.timeseries || mockNewsTrend));
        // Additional mock-driven KPIs (replace with real endpoints when available)
        setNewUsers({ value: mockNewUsers, delta: 2.4 });
        setLoggedInUsers({ value: mockLoggedIn, delta: 1.2 });
        setInternalSearch({ value: mockInternal, delta: 0.8 });
        setSessionTime({ value: mockSession, delta: 0.5 });
        setTrendNewUsers(mockGeneric);
        setTrendLoggedIn(mockGeneric);
        setTrendInternalSearch(mockGeneric);
        setTrendSessionTime(mockGeneric);
        if (!er || !ns) setError("Visar mockdata – koppla till riktiga engagemangs-källor.");
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError("Visar mockdata – " + (e?.message || "Kunde inte ladda data"));
          setEngagementRate({ value: 56.4, delta: 3.1 });
          setNewsletter({ value: 320, delta: 4.2 });
          setTrend(Array.from({ length: 12 }).map((_, i) => ({ x: Date.now() - (11 - i) * 86400000, y: Math.round(45 + Math.random() * 20) })));
          setTrendNewsletter(Array.from({ length: 12 }).map((_, i) => ({ x: Date.now() - (11 - i) * 86400000, y: Math.round(15 + Math.random() * 20) })));
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [state.range.start, state.range.end, state.range.grain, state.range.comparisonMode, state.channel.join(","), state.device.join(","), state.audience.join(",")]);

  const chartOptions = useMemo(() => ({
    chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit" },
    stroke: { curve: "smooth", width: 3 },
    xaxis: { type: "datetime" },
    yaxis: { labels: { formatter: (v: number) => `${v}%` } },
    dataLabels: { enabled: false },
    colors: ["#E01E26", "#6B7280"],
    tooltip: { x: { format: "dd MMM yyyy" } },
  }), []);

  return (
    <SectionLayout
      title="Engagemang"
      description="Interaktionsgrad och nyhetsbrevsprenumerationer"
      actions={<InfoTooltip text="KPI-kort + trendlinjer. Brytning per kanal/enhet när STATE stödjer." />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="relative">
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch checked={active.engagement} onChange={(v)=>setActive(s=>({...s, engagement:v}))} ariaLabel="Visa Engagement" backgroundSize="sm" />
          </div>
          <ScoreCard label="Engagement rate" value={engagementRate ? formatPercent(engagementRate.value) : "–"} growthRate={engagementRate?.delta} Icon={GlobeIcon} source="GA4 API" className="min-h-[132px] pr-10 pb-8" />
        </div>
        <div className="relative">
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch checked={active.newsletter} onChange={(v)=>setActive(s=>({...s, newsletter:v}))} ariaLabel="Visa Newsletter" backgroundSize="sm" />
          </div>
          <ScoreCard label="Newsletter signups" value={newsletter ? formatNumber(newsletter.value) : "–"} growthRate={newsletter?.delta} Icon={EmailIcon} source="GA4 API" className="min-h-[132px] pr-10 pb-8" />
        </div>
        <div className="relative">
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch checked={active.newUsers} onChange={(v)=>setActive(s=>({...s, newUsers:v}))} ariaLabel="Visa Nya användare" backgroundSize="sm" />
          </div>
          <ScoreCard label="Nya användare" value={newUsers ? formatNumber(newUsers.value) : "–"} growthRate={newUsers?.delta} Icon={GlobeIcon} source="GA4 API" className="min-h-[132px] pr-10 pb-8" />
        </div>
        <div className="relative">
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch checked={active.loggedIn} onChange={(v)=>setActive(s=>({...s, loggedIn:v}))} ariaLabel="Visa Inloggade" backgroundSize="sm" />
          </div>
          <ScoreCard label="Inloggade användare" value={loggedInUsers ? formatNumber(loggedInUsers.value) : "–"} growthRate={loggedInUsers?.delta} Icon={GlobeIcon} source="GA4 API" className="min-h-[132px] pr-10 pb-8" />
        </div>
        <div className="relative">
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch checked={active.internalSearch} onChange={(v)=>setActive(s=>({...s, internalSearch:v}))} ariaLabel="Visa Intern sök" backgroundSize="sm" />
          </div>
          <ScoreCard label="Intern sök" value={internalSearch ? formatNumber(internalSearch.value) : "–"} growthRate={internalSearch?.delta} Icon={GlobeIcon} source="GA4 API" className="min-h-[132px] pr-10 pb-8" />
        </div>
        <div className="relative">
          <div className="absolute right-4 bottom-4 z-10 pointer-events-auto">
            <Switch checked={active.sessionTime} onChange={(v)=>setActive(s=>({...s, sessionTime:v}))} ariaLabel="Visa Sessionstid" backgroundSize="sm" />
          </div>
          <ScoreCard label="Sessionstid" value={sessionTime ? `${formatNumber(sessionTime.value)}s` : "–"} growthRate={sessionTime?.delta} Icon={GlobeIcon} source="GA4 API" className="min-h-[132px] pr-10 pb-8" />
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">Välj vilka KPI:er som ska visas via toggles på korten.</div>
        {trend.length > 0 ? (
          <ApexChart
            options={chartOptions as any}
            series={[
              ...(active.engagement ? [{ name: "Engagement", data: trend }] : []),
              ...(active.newsletter ? [{ name: "Newsletter", data: trendNewsletter }] : []),
              ...(active.newUsers ? [{ name: "Nya användare", data: trendNewUsers }] : []),
              ...(active.loggedIn ? [{ name: "Inloggade", data: trendLoggedIn }] : []),
              ...(active.internalSearch ? [{ name: "Intern sök", data: trendInternalSearch }] : []),
              ...(active.sessionTime ? [{ name: "Sessionstid", data: trendSessionTime }] : []),
            ] as any}
            type="line"
            height={300}
          />
        ) : (
          <div className="h-28 w-full bg-gray-100 dark:bg-gray-800" aria-label="Ingen data" />
        )}
      </div>

      <div className="text-xs text-gray-500">TODO: Nedbrytning per kanal/enhet när STATE stödjer.</div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </SectionLayout>
  );
}


