import { NextRequest } from 'next/server';
import { getGA4Client } from '@/lib/ga4';
import { readFileSync } from 'fs';
import { join } from 'path';

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

    // Set environment variables from service account file if not already set
    if (!process.env.GA4_CLIENT_EMAIL || !process.env.GA4_PRIVATE_KEY) {
      try {
        const serviceAccountPath = join(process.cwd(), 'ga4-service-account.json');
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        
        process.env.GA4_CLIENT_EMAIL = serviceAccount.client_email;
        process.env.GA4_PRIVATE_KEY = serviceAccount.private_key;
        // Use the actual GA4 property ID from .env.local
        process.env.GA4_PROPERTY_ID = '314322245';
      } catch (error) {
        console.error('Failed to load service account:', error);
      }
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
      client.getTimeseries(start, end, 'day', filters),
      client.getChannelDistribution(start, end, filters)
    ]);

    // Map GA4 data to business KPIs
    // Event mapping per product requirement (exact match on event_name):
    // - customerApplications  -> event_name == "ansok_klick"
    // - ecommerceApplications -> event_name == "ehandel_ansok"
    // - formLeads             -> event_name == "form_submit"
    // - quoteRequests         -> no GA4 event available → always 0 (card shows "No data")
    
    // Sales KPI mapping with real GA4 data:
    // - completedPurchases    -> event_name == "purchase" (eventCount metric)
    // - totalOrderValue       -> event_name == "purchase" (purchaseRevenue metric)
    // - averageOrderValue     -> purchaseRevenue / purchaseCount (with division by zero guard)
    // - returningCustomers    -> newVsReturning="returning" + event_name="purchase" + activeUsers metric (returning users who actually made purchases)

    const [customerApplicationsCount, ecommerceApplicationsCount, formLeadsCount,
      customerApplicationsSeries, ecommerceApplicationsSeries, formLeadsSeries,
      purchaseCount, purchaseRevenue, returningCustomersCount] = await Promise.all([
      client.getEventCountByName(start, end, 'ansok_klick', filters),
      client.getEventCountByName(start, end, 'ehandel_ansok', filters),
      client.getEventCountByName(start, end, 'form_submit', filters),
      client.getEventTimeseriesByName(start, end, 'ansok_klick', filters),
      client.getEventTimeseriesByName(start, end, 'ehandel_ansok', filters),
      client.getEventTimeseriesByName(start, end, 'form_submit', filters),
      client.getPurchaseCount(start, end, filters),
      client.getPurchaseRevenue(start, end, filters),
      client.getReturningCustomersCount(start, end, filters),
    ]);

    const businessData: BusinessKpiData = {
      leads: {
        quoteRequests: 0,
        customerApplications: customerApplicationsCount,
        ecommerceApplications: ecommerceApplicationsCount,
        formLeads: formLeadsCount,
      },
      sales: {
        completedPurchases: purchaseCount,
        totalOrderValue: purchaseRevenue,
        averageOrderValue: purchaseCount > 0 ? Math.round(purchaseRevenue / purchaseCount) : 0,
        returningCustomers: returningCustomersCount,
      },
      efficiency: {
        conversionRate: currentSummary.sessions > 0 ? (currentSummary.sessions * 0.03 / currentSummary.sessions) * 100 : 0,
        cpaLeads: 150, // Cost per acquisition for leads
        cpaCustomers: 500, // Cost per acquisition for customers
        roi: 320, // Return on investment percentage
      },
      // Keep existing timeseries/sales derivation logic per NON-GOALS
      timeseries: currentTimeseries.map((point: any) => ({
        date: point.date,
        // Keep generic derived series for sales/conversion per NON-GOALS, but not used by leads chart anymore
        leads: Math.round(point.sessions * 0.15),
        sales: Math.round(point.sessions * 0.03),
        conversion: point.sessions > 0 ? (point.sessions * 0.03 / point.sessions) * 100 : 0,
        // Attach real GA4 lead event timeseries per event
        ansok_klick: customerApplicationsSeries.find((d: any) => d.date === point.date)?.value || 0,
        ehandel_ansok: ecommerceApplicationsSeries.find((d: any) => d.date === point.date)?.value || 0,
        form_submit: formLeadsSeries.find((d: any) => d.date === point.date)?.value || 0,
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
          client.getTimeseries(prevRange.start, prevRange.end, 'day', filters),
          client.getChannelDistribution(prevRange.start, prevRange.end, filters)
        ]);

        const [prevCustomerApps, prevEcomApps, prevFormLeads,
          prevCustomerAppsSeries, prevEcomAppsSeries, prevFormLeadsSeries,
          prevPurchaseCount, prevPurchaseRevenue, prevReturningCustomersCount] = await Promise.all([
          client.getEventCountByName(prevRange.start, prevRange.end, 'ansok_klick', filters),
          client.getEventCountByName(prevRange.start, prevRange.end, 'ehandel_ansok', filters),
          client.getEventCountByName(prevRange.start, prevRange.end, 'form_submit', filters),
          client.getEventTimeseriesByName(prevRange.start, prevRange.end, 'ansok_klick', filters),
          client.getEventTimeseriesByName(prevRange.start, prevRange.end, 'ehandel_ansok', filters),
          client.getEventTimeseriesByName(prevRange.start, prevRange.end, 'form_submit', filters),
          client.getPurchaseCount(prevRange.start, prevRange.end, filters),
          client.getPurchaseRevenue(prevRange.start, prevRange.end, filters),
          client.getReturningCustomersCount(prevRange.start, prevRange.end, filters),
        ]);

        // Align comparison timeseries with current period for proper YoY comparison
        let alignedComparisonTimeseries = prevTimeseries;
        if (compare === 'yoy') {
          const { alignYoySeries } = require('@/lib/yoy');
          
          // Create aligned comparison timeseries with current period dates but previous year values
          alignedComparisonTimeseries = currentTimeseries.map((currentPoint: any) => {
            // Find matching previous year point by month
            const currentDate = new Date(currentPoint.date);
            const currentMonth = currentDate.getMonth(); // 0-11
            const currentDay = currentDate.getDate();
            
            // For monthly data, match by month only
            // For daily data, match by month and day
            const matchingPrevPoint = prevTimeseries.find((prevPoint: any) => {
              const prevDate = new Date(prevPoint.date);
              if (currentPoint.date.endsWith('-01')) {
                // Monthly data: match by month only
                return prevDate.getMonth() === currentMonth;
              } else {
                // Daily data: match by month and day
                return prevDate.getMonth() === currentMonth && prevDate.getDate() === currentDay;
              }
            });
            
            if (matchingPrevPoint) {
              return {
                date: currentPoint.date, // Use current period's date
                leads: Math.round(matchingPrevPoint.sessions * 0.15),
                sales: Math.round(matchingPrevPoint.sessions * 0.03),
                conversion: matchingPrevPoint.sessions > 0 ? (matchingPrevPoint.sessions * 0.03 / matchingPrevPoint.sessions) * 100 : 0,
                ansok_klick: prevCustomerAppsSeries.find((d: any) => d.date === matchingPrevPoint.date)?.value || 0,
                ehandel_ansok: prevEcomAppsSeries.find((d: any) => d.date === matchingPrevPoint.date)?.value || 0,
                form_submit: prevFormLeadsSeries.find((d: any) => d.date === matchingPrevPoint.date)?.value || 0,
              };
            }
            return null;
          }).filter(Boolean);
        }

        comparisonData = {
          leads: {
            quoteRequests: 0,
            customerApplications: prevCustomerApps,
            ecommerceApplications: prevEcomApps,
            formLeads: prevFormLeads,
          },
          sales: {
            completedPurchases: prevPurchaseCount,
            totalOrderValue: prevPurchaseRevenue,
            averageOrderValue: prevPurchaseCount > 0 ? Math.round(prevPurchaseRevenue / prevPurchaseCount) : 0,
            returningCustomers: prevReturningCustomersCount,
          },
          efficiency: {
            conversionRate: prevSummary.sessions > 0 ? (prevSummary.sessions * 0.03 / prevSummary.sessions) * 100 : 0,
            cpaLeads: 150,
            cpaCustomers: 500,
            roi: 320,
          },
          timeseries: alignedComparisonTimeseries,
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
        details: error.message,
        stack: error.stack,
        type: error.constructor.name,
        env: {
          hasClientEmail: !!process.env.GA4_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.GA4_PRIVATE_KEY,
          hasPropertyId: !!process.env.GA4_PROPERTY_ID,
          propertyId: process.env.GA4_PROPERTY_ID
        }
      }),
      { 
        status: 500, 
        headers: { 'content-type': 'application/json' } 
      }
    );
  }
}
