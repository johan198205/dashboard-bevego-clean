import { NextRequest } from 'next/server';
import { getGA4Client } from '@/lib/ga4';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 minutes cache

// Types for the API response
export type Summary = {
  sessions: number;
  engagedSessions: number;
  engagementRatePct: number;
  avgEngagementTimeSec: number;
  // New KPIs
  totalUsers?: number;
  returningUsers?: number;
  pageviews?: number;
  deltasYoY?: {
    sessions: number;
    engagedSessions: number;
    engagementRatePct: number;
    avgEngagementTimePct: number;
    // Deltas for new KPIs (optional)
    totalUsers?: number;
    returningUsers?: number;
    pageviews?: number;
  };
  sampled: boolean;
};

export type TimePoint = { 
  date: string; 
  sessions: number; 
  engagedSessions: number; 
  engagementRatePct: number 
};

export type Split = { 
  key: string; 
  sessions: number; 
  engagementRatePct: number 
};

export type WeekdayHour = { 
  weekday: number; 
  hour: number; 
  sessions: number; 
  engagedSessions: number 
};

export type TopPage = { 
  title: string; 
  path: string; 
  sessions: number; 
  avgEngagementTimeSec: number; 
  engagementRatePct: number 
};

export type OverviewPayload = {
  summary: Summary;
  timeseries: TimePoint[];
  channels: Split[];
  devices: Split[];
  weekdayHour: WeekdayHour[];
  topPages: TopPage[];
  cities: Split[];
};

// Helper function to calculate YoY deltas
function calculateDeltas(current: any, previous: any) {
  if (!previous) return undefined;

  const sessionsDelta = previous.sessions > 0 ? ((current.sessions - previous.sessions) / previous.sessions) * 100 : 0;
  const engagedSessionsDelta = previous.engagedSessions > 0 ? ((current.engagedSessions - previous.engagedSessions) / previous.engagedSessions) * 100 : 0;
  const engagementRateDelta = previous.engagementRatePct > 0 ? ((current.engagementRatePct - previous.engagementRatePct) / previous.engagementRatePct) * 100 : 0;
  const avgEngagementTimeDelta = previous.avgEngagementTimeSec > 0 ? ((current.avgEngagementTimeSec - previous.avgEngagementTimeSec) / previous.avgEngagementTimeSec) * 100 : 0;
  const totalUsersDelta = previous.totalUsers > 0 ? ((current.totalUsers - previous.totalUsers) / previous.totalUsers) * 100 : 0;
  const returningUsersDelta = previous.returningUsers > 0 ? ((current.returningUsers - previous.returningUsers) / previous.returningUsers) * 100 : 0;
  const pageviewsDelta = previous.pageviews > 0 ? ((current.pageviews - previous.pageviews) / previous.pageviews) * 100 : 0;

  return {
    sessions: sessionsDelta,
    engagedSessions: engagedSessionsDelta,
    engagementRatePct: engagementRateDelta,
    avgEngagementTimePct: avgEngagementTimeDelta,
    totalUsers: totalUsersDelta,
    returningUsers: returningUsersDelta,
    pageviews: pageviewsDelta
  };
}

// Helper function to get previous year date range
function getPreviousYearRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const prevStart = new Date(start);
  prevStart.setFullYear(prevStart.getFullYear() - 1);
  
  const prevEnd = new Date(end);
  prevEnd.setFullYear(prevEnd.getFullYear() - 1);
  
  return {
    start: prevStart.toISOString().slice(0, 10),
    end: prevEnd.toISOString().slice(0, 10)
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const compare = url.searchParams.get('compare') || 'yoy';
    const channel = url.searchParams.get('channel');
    const device = url.searchParams.get('device');
    const role = url.searchParams.get('role');
    const unit = url.searchParams.get('unit');

    // Validate required parameters
    if (!start || !end) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: start, end' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    // Validate date format
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    // Build filters object
    const filters: any = {};
    if (channel && channel !== 'Alla') filters.channel = channel;
    if (device && device !== 'Alla') filters.device = device;
    if (role && role !== 'Alla') filters.role = role;
    if (unit && unit !== 'Alla') filters.unit = unit;

    const client = getGA4Client();

    // Execute all GA4 queries in parallel
    const [
      currentSummary,
      currentTimeseries,
      channels,
      devices,
      weekdayHour,
      topPages,
      cities
    ] = await Promise.all([
      client.getSummaryKPIs(start, end, filters),
      client.getTimeseries(start, end, filters),
      client.getChannelDistribution(start, end, filters),
      client.getDeviceDistribution(start, end, filters),
      client.getWeekdayHourUsage(start, end, filters),
      client.getTopPages(start, end, filters),
      client.getTopCities(start, end, filters)
    ]);

    const summary: Summary = {
      ...currentSummary,
      sampled: currentSummary.sampled
    };

    // Calculate comparison series for yoy or prev period
    if (compare === 'yoy' || compare === 'prev') {
      const prevRange = compare === 'yoy'
        ? getPreviousYearRange(start, end)
        : { start: new Date(startDate.getTime()), end: new Date(endDate.getTime()) } as any;
      if (compare === 'prev') {
        // Previous period: shift back by the same window length
        const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const prevEnd = new Date(startDate.getTime());
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd.getTime());
        prevStart.setDate(prevStart.getDate() - (diffDays - 1));
        (prevRange as any).start = prevStart.toISOString().slice(0, 10);
        (prevRange as any).end = prevEnd.toISOString().slice(0, 10);
      }
      
      try {
        const previousSummary = await client.getSummaryKPIs((prevRange as any).start, (prevRange as any).end, filters);
        summary.deltasYoY = calculateDeltas(currentSummary, previousSummary);
      } catch (error) {
        console.warn('Failed to fetch YoY comparison data:', error);
        // Continue without YoY data
      }
    }

    const payload: OverviewPayload = {
      summary,
      timeseries: currentTimeseries,
      channels,
      devices,
      weekdayHour,
      topPages,
      cities
    };

    return Response.json(payload);

  } catch (error: any) {
    console.error('GA4 Overview API error:', error);
    
    // Handle rate limiting specifically
    const isRateLimit = error.code === 14 || error.message?.includes('429') || error.message?.includes('Too Many Requests');
    
    if (isRateLimit) {
      return new Response(
        JSON.stringify({ 
          error: 'GA4 API rate limit exceeded',
          details: 'Too many requests. Please wait 1-2 minutes before trying again.',
          retryAfter: 120 // seconds
        }),
        { 
          status: 429, 
          headers: { 
            'content-type': 'application/json',
            'Retry-After': '120'
          } 
        }
      );
    }
    
    // Return structured error response for other errors
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch GA4 data',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 'content-type': 'application/json' } 
      }
    );
  }
}
