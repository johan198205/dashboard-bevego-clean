import { NextRequest } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { BetaAnalyticsDataClient } = (eval('require'))('@google-analytics/data');
  const clientOptions: any = {};
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try { clientOptions.credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON as string); } catch {}
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    clientOptions.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  return new BetaAnalyticsDataClient(clientOptions);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!propertyId) {
    return new Response(JSON.stringify({ error: 'Missing GA4_PROPERTY_ID env' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  if (!start || !end) {
    return new Response(JSON.stringify({ error: 'Missing required params: start, end' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  try {
    const client = getClient();

    // Timeseries per dag
    const [seriesResp] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
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
    const timeseries = (seriesResp.rows || []).map((r: any) => ({
      date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
      value: Number(r.metricValues?.[0]?.value || 0),
    }));

    // Total för spannet
    const [totalResp] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      metrics: [{ name: 'totalUsers' }],
      dimensionFilter: {
        filter: {
          fieldName: 'hostName',
          stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' }
        }
      },
    });
    const total = Number(totalResp?.rows?.[0]?.metricValues?.[0]?.value || 0);

    return Response.json({
      metric: 'totalUsers',
      start,
      end,
      total,
      timeseries,
      notes: ['Källa: GA4 API – totalUsers']
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('GA4 totalUsers error:', err || 'Unknown error');
    return new Response(JSON.stringify({ error: String(err) }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
}


