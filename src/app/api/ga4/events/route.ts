import { NextRequest } from 'next/server';
import { getGA4Client } from '@/lib/ga4';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 minutes cache

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const event = url.searchParams.get('event');
    const metric = url.searchParams.get('metric');
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const grain = url.searchParams.get('grain') || 'day';
    const dimension = url.searchParams.get('dimension');
    const filter = url.searchParams.get('filter');

    // Validate required parameters
    if (!event || !metric || !start || !end) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: event, metric, start, end' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const client = getGA4Client();

    // Determine dimension based on granularity
    let dimensionName: string;
    switch (grain) {
      case 'week':
        dimensionName = 'yearWeek';
        break;
      case 'month':
        dimensionName = 'yearMonth';
        break;
      default:
        dimensionName = 'date';
    }

    // Build dimensions array
    const dimensions = [{ name: dimensionName }];
    if (dimension) {
      dimensions.push({ name: dimension });
    }

    // Build metrics array
    const metrics = [];
    if (metric === 'eventCount') {
      metrics.push({ name: 'eventCount' });
    } else if (metric === 'purchaseRevenue') {
      metrics.push({ name: 'purchaseRevenue' });
    } else if (metric === 'activeUsers') {
      metrics.push({ name: 'activeUsers' });
    } else {
      metrics.push({ name: metric });
    }

    // Use the same filter logic as business-kpis API for consistency
    const expressions: any[] = [];

    // Required host filter (align with business-kpis API)
    expressions.push({
      filter: {
        fieldName: 'hostName',
        stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' }
      }
    });

    // Event name filter
    expressions.push({
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: event }
      }
    });

    // Add dimension filter if specified
    if (dimension && filter) {
      expressions.push({
        filter: {
          fieldName: dimension,
          stringFilter: { matchType: 'EXACT', value: filter }
        }
      });
    }

    const request = {
      property: client.getPropertyId(),
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions,
      metrics,
      dimensionFilter: { andGroup: { expressions } },
      orderBys: [{ dimension: { dimensionName } }],
    };

    const response = await client.runReport(request);
    const rows = response.rows || [];

    const timeseries = rows.map((row: any) => {
      const dateValue = row.dimensionValues?.[0]?.value;
      const value = Number(row.metricValues?.[0]?.value || 0);

      // Format date based on granularity
      let formattedDate: string;
      switch (grain) {
        case 'week':
          // yearWeek format: YYYYWW (e.g., 202401)
          formattedDate = client.formatWeekDatePublic(dateValue);
          break;
        case 'month':
          // yearMonth format: YYYYMM (e.g., 202401)
          formattedDate = `${dateValue.slice(0,4)}-${dateValue.slice(4,6)}-01`;
          break;
        default:
          // date format: YYYYMMDD
          formattedDate = `${dateValue.slice(0,4)}-${dateValue.slice(4,6)}-${dateValue.slice(6,8)}`;
      }

      return {
        date: formattedDate,
        value
      };
    });

    return Response.json({
      timeseries,
      meta: {
        event,
        metric,
        grain,
        dimension,
        filter,
        totalRows: timeseries.length
      }
    });

  } catch (error: any) {
    console.error('GA4 Events API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch GA4 events data',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { 'content-type': 'application/json' } 
      }
    );
  }
}
