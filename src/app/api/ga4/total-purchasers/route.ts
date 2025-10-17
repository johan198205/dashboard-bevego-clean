import { NextRequest } from 'next/server';
import { GA4Client } from '@/lib/ga4';

const client = new GA4Client();

// Returns unique purchasers from GA4 (totalPurchasers metric)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start') || '2024-01-01';
    const end = searchParams.get('end') || '2024-01-07';

    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!propertyId) {
      return Response.json({ error: 'GA4_PROPERTY_ID not configured' }, { status: 500 });
    }

    // Total unique purchasers for the full range
    const totalResp = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      metrics: [{ name: 'totalPurchasers' }],
    });
    const totalPurchasers = Number(totalResp?.rows?.[0]?.metricValues?.[0]?.value || 0);

    // Daily series (note: daily values are not additive for uniques across the whole range)
    const seriesResp = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'totalPurchasers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });
    const timeseries = seriesResp?.rows?.map((row: any) => ({
      date: `${row.dimensionValues?.[0]?.value?.slice(0, 4)}-${row.dimensionValues?.[0]?.value?.slice(4, 6)}-${row.dimensionValues?.[0]?.value?.slice(6, 8)}`,
      value: Number(row.metricValues?.[0]?.value || 0),
    })) ?? [];

    return Response.json({
      metric: 'total_purchasers',
      start,
      end,
      total: totalPurchasers,
      timeseries,
      notes: ['Källa: GA4 API – totalPurchasers metric'],
    });
  } catch (error: any) {
    console.error('Error fetching total purchasers:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
