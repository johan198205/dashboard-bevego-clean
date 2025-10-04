import { NextRequest } from "next/server";
import { getKpi } from "@/lib/resolver";
import { aggregateAverage } from "@/lib/mockData/generators";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("metric") as any;
  const start = searchParams.get("start") as string;
  const end = searchParams.get("end") as string;
  const grain = (searchParams.get("grain") as any) || "day";
  const comparisonMode = (searchParams.get("comparisonMode") as any) || "none";
  const parseList = (key: string): string[] | undefined => {
    const v = searchParams.get(key);
    if (!v) return undefined;
    return v.split(",").map(s => s.trim()).filter(Boolean);
  };
  const audience = parseList('audience');
  const device = parseList('device');
  const channel = parseList('channel');

  // Special server-side GA4 handling for MAU to avoid bundling GA4 SDK in client code
  if (metric === 'mau' && process.env.GA4_PROPERTY_ID) {
    try {
      // Helper ranges
      const prevRange = (() => {
        if (comparisonMode === 'yoy') {
          const addYears = (d: string, y: number) => {
            const tmp = new Date(d); tmp.setFullYear(tmp.getFullYear() + y); return tmp.toISOString().slice(0,10);
          };
          return { start: addYears(start, -1), end: addYears(end, -1) };
        }
        if (comparisonMode === 'prev') {
          const s = new Date(start); const e = new Date(end);
          const len = Math.max(0, Math.round((e.getTime()-s.getTime())/(24*3600*1000))+1);
          const prevEnd = new Date(s); prevEnd.setDate(prevEnd.getDate()-1);
          const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate()-(len-1));
          return { start: prevStart.toISOString().slice(0,10), end: prevEnd.toISOString().slice(0,10) };
        }
        return null;
      })();

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = (eval('require'))('@google-analytics/data');
      const clientOptions: any = {};
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try { clientOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string); } catch {}
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        clientOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
      const client = new BetaAnalyticsDataClient(clientOptions);
      const run = async (range: {start:string; end:string}) => {
        // Get total users for the entire period (same as GA4 Dashboard)
        const [totalResp] = await client.runReport({
          property: `properties/${process.env.GA4_PROPERTY_ID}`,
          dateRanges: [{ startDate: range.start, endDate: range.end }],
          metrics: [{ name: 'totalUsers' }],
          dimensionFilter: {
            filter: {
              fieldName: 'hostName',
              stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' }
            }
          },
        });
        const total = Number(totalResp?.rows?.[0]?.metricValues?.[0]?.value || 0);
        
        // Also get daily series for timeseries display
        const [seriesResp] = await client.runReport({
          property: `properties/${process.env.GA4_PROPERTY_ID}`,
          dateRanges: [{ startDate: range.start, endDate: range.end }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'totalUsers' }],
          dimensionFilter: {
            filter: {
              fieldName: 'hostName',
              stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' }
            }
          },
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        });
        const series = (seriesResp.rows || []).map((r: any) => ({
          date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
          value: Number(r.metricValues?.[0]?.value || 0),
        }));
        
        return { total, series };
      };

      // Fetch data for current and comparison periods
      const currentData = await run({ start, end });
      const compareData = prevRange ? await run(prevRange) : undefined;

      // Use total users directly from GA4 (same as GA4 Dashboard)
      const current = currentData.total;
      const prev = compareData?.total || 0;
      
      // Aggregate daily series for timeseries display
      const series = aggregateAverage(currentData.series as any, (grain as any) || 'day');
      const compare = compareData ? aggregateAverage(compareData.series as any, (grain as any) || 'day') : undefined;
      const yoyPct = prev ? ((current - prev) / Math.abs(prev)) * 100 : 0;
      return Response.json({
        meta: { source: 'ga4', metric: 'mau', dims: [] },
        summary: { current, prev, yoyPct },
        timeseries: series,
        compareTimeseries: compare,
        notes: ["Källa: GA4 API (samma som GA4 Dashboard)"],
      });
    } catch (err) {
      console.error('GA4 MAU API error (no fallback):', err || "Unknown error");
      return new Response(JSON.stringify({ error: String(err), notes: ["Källa: GA4 API (fel)"] }), {
        status: 502,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  const res = await getKpi({ metric, range: { start, end, grain, comparisonMode } as any, filters: { audience, device, channel } as any });
  return Response.json(res);
}

export async function POST(req: Request) {
  const body = await req.json();
  const res = await getKpi(body);
  return Response.json(res);
}


