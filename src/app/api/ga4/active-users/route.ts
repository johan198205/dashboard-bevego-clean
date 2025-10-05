import { NextRequest } from "next/server";
import { getGA4Client } from "@/lib/ga4";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!propertyId) {
    return new Response(JSON.stringify({ error: 'GA4 inte konfigurerat (saknar GA4_PROPERTY_ID)' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
  if (!process.env.GA4_CLIENT_EMAIL && !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GA4_SA_JSON) {
    return new Response(JSON.stringify({ error: 'GA4 autentisering saknas (saknar credentials env)' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
  if (!start || !end) {
    return new Response(JSON.stringify({ error: 'Missing required params: start, end' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  try {
    const client = getGA4Client();

    // Timeseries (per day)
    const seriesResp = await (client as any).runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }],
      dimensionFilter: {
        filter: {
          fieldName: 'hostName',
          stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' }
        }
      },
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });
    const timeseries = ((seriesResp as any).rows || []).map((r: any) => ({
      date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
      value: Number(r.metricValues?.[0]?.value || 0),
    }));

    // Total for the whole range (no dimensions)
    const totalResp = await (client as any).runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      metrics: [{ name: 'activeUsers' }],
      dimensionFilter: {
        filter: {
          fieldName: 'hostName',
          stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' }
        }
      },
    });
    const total = Number((totalResp as any)?.rows?.[0]?.metricValues?.[0]?.value || 0);

    return Response.json({
      metric: 'activeUsers',
      start,
      end,
      total,
      timeseries,
      notes: ['Källa: GA4 API – activeUsers'],
    });
  } catch (err: any) {
    console.error('GA4 activeUsers error:', err?.message || err || 'Unknown error');
    const msg = String(err?.message || err || 'Unknown error');
    const isDisabled = msg.includes('disabled') || msg.includes('keyDisabled') || msg.includes('accountDisabled');
    const isInvalid = msg.includes('invalid_grant') || msg.includes('invalid_client') || msg.includes('unauthorized_client');
    if (isDisabled) {
      return new Response(JSON.stringify({ error: 'GA4-nyckel disabled' }), { status: 403, headers: { 'content-type': 'application/json' } });
    }
    if (isInvalid) {
      return new Response(JSON.stringify({ error: 'GA4-nyckel ogiltig' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Upstream GA4-fel' }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
}


