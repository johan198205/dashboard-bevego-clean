import { NextRequest } from 'next/server';
import { getGA4Client } from '@/lib/ga4';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const channel = url.searchParams.get('channel');
    const device = url.searchParams.get('device');
    const role = url.searchParams.get('role');
    const unit = url.searchParams.get('unit');

    if (!start || !end) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: start, end' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    const filters: any = {};
    if (channel && channel !== 'Alla') filters.channel = channel;
    if (device && device !== 'Alla') filters.device = device;
    if (role && role !== 'Alla') filters.role = role;
    if (unit && unit !== 'Alla') filters.unit = unit;

    const client = getGA4Client();
    const items = await client.getTopItems(start, end, filters);

    return Response.json({ items });
  } catch (error: any) {
    console.error('GA4 Top Items API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch top items', details: error?.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}


