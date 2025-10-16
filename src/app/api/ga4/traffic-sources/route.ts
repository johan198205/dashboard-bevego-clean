import { NextRequest } from 'next/server';

export interface TrafficSourceChannel {
  channel: string;
  sessions: number;
  purchases: number; // Konverteringar = purchase events
  sessionConversionRate: number; // Konverteringsgrad = session conversion rate
}

export interface TrafficSourcesResponse {
  channels: TrafficSourceChannel[];
  error?: string;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const device = url.searchParams.get('device');
  const channel = url.searchParams.get('channel');

  try {
    // Validate required parameters
    if (!start || !end) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: start, end' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    // Try to get real GA4 data
    try {
      const { getGA4Client } = await import('@/lib/ga4');
      const client = getGA4Client();
      
      console.log('GA4 Traffic Sources API: Fetching real GA4 data for', start, 'to', end);
      
      // Build filters from query parameters
      const filters: any = {};
      if (device && device !== 'all') {
        filters.device = device;
      }
      if (channel && channel !== 'all') {
        filters.channel = channel;
      }

      // Get channel breakdown with metrics (sessions, purchases, conversion rates)
      const channels = await client.getChannelBreakdownWithMetrics(start, end, filters);
      
      // Take top 5 channels sorted by sessions
      const top5Channels = channels.slice(0, 5).map((channel: any) => ({
        channel: channel.channel,
        sessions: channel.sessions,
        purchases: channel.purchases,
        sessionConversionRate: Math.round(channel.sessionConversionRate * 100) / 100 // Round to 2 decimals
      }));

      const response: TrafficSourcesResponse = {
        channels: top5Channels
      };

      return Response.json(response);
    } catch (ga4Error) {
      console.error('GA4 Traffic Sources API: Failed to fetch real data, falling back to mock data:', ga4Error);
      
      // Fallback mock data with realistic conversion rates
      const mockChannels: TrafficSourceChannel[] = [
        { channel: "Organic Search", sessions: 13921, purchases: 139, sessionConversionRate: 1.00 },
        { channel: "Direct", sessions: 7083, purchases: 152, sessionConversionRate: 2.15 },
        { channel: "Paid Search", sessions: 4162, purchases: 69, sessionConversionRate: 1.66 },
        { channel: "Referral", sessions: 1281, purchases: 2, sessionConversionRate: 0.16 },
        { channel: "Paid Social", sessions: 1004, purchases: 0, sessionConversionRate: 0.00 }
      ];

      const response: TrafficSourcesResponse = {
        channels: mockChannels,
        error: 'Using mock data - GA4 API unavailable'
      };

      return Response.json(response);
    }
  } catch (error) {
    console.error('Traffic Sources API Error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
