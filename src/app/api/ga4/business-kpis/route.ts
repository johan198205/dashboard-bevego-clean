import { NextRequest } from 'next/server';
import { getGA4Client } from '@/lib/ga4';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 minutes cache

// Business KPI types
export type BusinessKpiData = {
  leads: {
    quoteRequests: number;
    customerApplications: number;
    ecommerceApplications: number;
    formLeads: number;
  };
  sales: {
    completedPurchases: number;
    totalOrderValue: number;
    averageOrderValue: number;
    returningCustomers: number;
  };
  efficiency: {
    conversionRate: number;
    cpaLeads: number;
    cpaCustomers: number;
    roi: number;
  };
  timeseries: {
    date: string;
    leads: number;
    sales: number;
    conversion: number;
  }[];
  channelBreakdown: {
    channel: string;
    leads: number;
    sales: number;
    conversion: number;
    cpa: number;
  }[];
  sampled: boolean;
};

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

// Helper function to get previous period date range
function getPreviousPeriodRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevEnd = new Date(start.getTime());
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd.getTime());
  prevStart.setDate(prevStart.getDate() - (diffDays - 1));
  
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

    // Build filters object
    const filters: any = {};
    if (channel && channel !== 'Alla') filters.channel = channel;
    if (device && device !== 'Alla') filters.device = device;
    if (role && role !== 'Alla') filters.role = role;
    if (unit && unit !== 'Alla') filters.unit = unit;

    const client = getGA4Client();

    // Get current period data
    const [currentSummary, currentTimeseries, channels] = await Promise.all([
      client.getSummaryKPIs(start, end, filters),
      client.getTimeseries(start, end, filters),
      client.getChannelDistribution(start, end, filters)
    ]);

    // Map GA4 data to business KPIs
    // Note: This is a simplified mapping - in reality you'd need custom events/dimensions for business metrics
    const businessData: BusinessKpiData = {
      leads: {
        // Map GA4 metrics to business concepts
        quoteRequests: Math.round(currentSummary.sessions * 0.15), // 15% of sessions become quote requests
        customerApplications: Math.round(currentSummary.sessions * 0.08), // 8% become customer applications
        ecommerceApplications: Math.round(currentSummary.sessions * 0.12), // 12% become ecommerce applications
        formLeads: Math.round(currentSummary.engagedSessions * 0.25), // 25% of engaged sessions become form leads
      },
      sales: {
        completedPurchases: Math.round(currentSummary.sessions * 0.03), // 3% conversion rate
        totalOrderValue: Math.round(currentSummary.sessions * 0.03 * 2500), // Average order value 2500 SEK
        averageOrderValue: 2500,
        returningCustomers: currentSummary.returningUsers || 0,
      },
      efficiency: {
        conversionRate: currentSummary.sessions > 0 ? (currentSummary.sessions * 0.03 / currentSummary.sessions) * 100 : 0,
        cpaLeads: 150, // Cost per acquisition for leads
        cpaCustomers: 500, // Cost per acquisition for customers
        roi: 320, // Return on investment percentage
      },
      timeseries: currentTimeseries.map((point: any) => ({
        date: point.date,
        leads: Math.round(point.sessions * 0.15),
        sales: Math.round(point.sessions * 0.03),
        conversion: point.sessions > 0 ? (point.sessions * 0.03 / point.sessions) * 100 : 0,
      })),
      channelBreakdown: channels.map((channel: any) => ({
        channel: channel.key,
        leads: Math.round(channel.sessions * 0.15),
        sales: Math.round(channel.sessions * 0.03),
        conversion: channel.sessions > 0 ? (channel.sessions * 0.03 / channel.sessions) * 100 : 0,
        cpa: channel.key === 'Organic Search' ? 120 : channel.key === 'Paid Search' ? 200 : 150,
      })),
      sampled: currentSummary.sampled
    };

    // Get comparison data if requested
    let comparisonData: BusinessKpiData | null = null;
    if (compare === 'yoy' || compare === 'prev') {
      const prevRange = compare === 'yoy'
        ? getPreviousYearRange(start, end)
        : getPreviousPeriodRange(start, end);
      
      try {
        const [prevSummary, prevTimeseries, prevChannels] = await Promise.all([
          client.getSummaryKPIs(prevRange.start, prevRange.end, filters),
          client.getTimeseries(prevRange.start, prevRange.end, filters),
          client.getChannelDistribution(prevRange.start, prevRange.end, filters)
        ]);

        comparisonData = {
          leads: {
            quoteRequests: Math.round(prevSummary.sessions * 0.15),
            customerApplications: Math.round(prevSummary.sessions * 0.08),
            ecommerceApplications: Math.round(prevSummary.sessions * 0.12),
            formLeads: Math.round(prevSummary.engagedSessions * 0.25),
          },
          sales: {
            completedPurchases: Math.round(prevSummary.sessions * 0.03),
            totalOrderValue: Math.round(prevSummary.sessions * 0.03 * 2500),
            averageOrderValue: 2500,
            returningCustomers: prevSummary.returningUsers || 0,
          },
          efficiency: {
            conversionRate: prevSummary.sessions > 0 ? (prevSummary.sessions * 0.03 / prevSummary.sessions) * 100 : 0,
            cpaLeads: 150,
            cpaCustomers: 500,
            roi: 320,
          },
          timeseries: prevTimeseries.map((point: any) => ({
            date: point.date,
            leads: Math.round(point.sessions * 0.15),
            sales: Math.round(point.sessions * 0.03),
            conversion: point.sessions > 0 ? (point.sessions * 0.03 / point.sessions) * 100 : 0,
          })),
          channelBreakdown: prevChannels.map((channel: any) => ({
            channel: channel.key,
            leads: Math.round(channel.sessions * 0.15),
            sales: Math.round(channel.sessions * 0.03),
            conversion: channel.sessions > 0 ? (channel.sessions * 0.03 / channel.sessions) * 100 : 0,
            cpa: channel.key === 'Organic Search' ? 120 : channel.key === 'Paid Search' ? 200 : 150,
          })),
          sampled: prevSummary.sampled
        };
      } catch (error) {
        console.warn('Failed to fetch comparison data:', error);
      }
    }

    return Response.json({
      current: businessData,
      comparison: comparisonData,
      comparisonMode: compare
    });

  } catch (error: any) {
    console.error('Business KPIs API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch business KPIs',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 'content-type': 'application/json' } 
      }
    );
  }
}
