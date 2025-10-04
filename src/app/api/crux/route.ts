import { NextRequest } from "next/server";
import { CruxService } from "@/services/crux.service";
import { CruxHistoryService } from "@/services/crux-history.service";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as string;
  const device = searchParams.get("device") as string;
  const origin = searchParams.get("origin") as string || "https://www.bevego.se";
  const startDate = searchParams.get("startDate") as string;
  const endDate = searchParams.get("endDate") as string;

  try {
    const cruxService = new CruxService();
    const historyService = new CruxHistoryService();
    
    // Map device filter to CrUX formFactor
    // If "Alla" is selected or no device specified, don't set formFactor (gets combined data)
    let formFactor: 'PHONE' | 'DESKTOP' | 'TABLET' | undefined = undefined;
    
    if (device?.includes('Desktop')) {
      formFactor = 'DESKTOP';
    } else if (device?.includes('Mobil')) {
      formFactor = 'PHONE';
    } else if (device?.includes('Surfplatta')) {
      formFactor = 'TABLET';
    }
    // If device is "Alla" or empty, formFactor remains undefined for combined data

    switch (type) {
      case 'summary':
        // Always use current data for scorecards - historical data is incomplete
        const summary = await cruxService.getCoreWebVitals(origin, formFactor);
        return Response.json(summary);

      case 'trends':
        // Always get 40 weeks of historical data for trends
        const trends = await historyService.getTrends(origin, formFactor, 40);
        return Response.json(trends);

      case 'table':
        const tableData = await cruxService.getTableData(formFactor);
        return Response.json(tableData);

      default:
        return new Response(JSON.stringify({ error: 'Invalid type parameter' }), {
          status: 400,
          headers: { 'content-type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('CrUX API error:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('No data available')) {
        return new Response(JSON.stringify({ 
          error: 'No field data available',
          message: 'No field data available for this origin in CrUX database'
        }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }
      
      if (error.message.includes('CRUX_API_KEY')) {
        return new Response(JSON.stringify({ 
          error: 'Configuration error',
          message: 'CrUX API key not configured'
        }), {
          status: 500,
          headers: { 'content-type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: 'Failed to fetch CrUX data'
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
