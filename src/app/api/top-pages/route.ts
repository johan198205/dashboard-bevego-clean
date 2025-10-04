import { NextRequest } from "next/server";
import { TopPagesService } from "@/services/top-pages.service";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10");
  const device = searchParams.get("device") as string;
  const startDate = searchParams.get("startDate") as string;
  const endDate = searchParams.get("endDate") as string;

  try {
    const topPagesService = new TopPagesService();
    
    // Map device filter to CrUX formFactor
    let formFactor: 'PHONE' | 'DESKTOP' | 'TABLET' | undefined = undefined;
    
    if (device?.includes('Desktop')) {
      formFactor = 'DESKTOP';
    } else if (device?.includes('Mobil')) {
      formFactor = 'PHONE';
    } else if (device?.includes('Surfplatta')) {
      formFactor = 'TABLET';
    }
    // If device is "Alla" or empty, formFactor remains undefined for combined data

    const topPages = await topPagesService.getTopPagesWithCwv(
      limit,
      formFactor,
      startDate,
      endDate
    );

    return Response.json(topPages);
  } catch (error) {
    console.error('Top pages API error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: 'Failed to fetch top pages data'
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
