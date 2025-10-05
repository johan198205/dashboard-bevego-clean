import { NextRequest } from "next/server";
import { getGA4Client } from "@/lib/ga4";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Always revalidate for health check

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1';

  // Preflight configuration checks
  if (!process.env.GA4_PROPERTY_ID) {
    return new Response(
      JSON.stringify({ ok: false, error: 'GA4 inte konfigurerat (saknar GA4_PROPERTY_ID)' }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }

  if (!process.env.GA4_CLIENT_EMAIL && !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GA4_SA_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new Response(
      JSON.stringify({ ok: false, error: 'GA4 autentisering saknas (saknar credentials env)' }),
      { status: 503, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    const client = getGA4Client();
    const response = await client.runReport({
      property: `properties/${process.env.GA4_PROPERTY_ID}`,
      dateRanges: [{ startDate: '2024-01-01', endDate: '2024-01-01' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 1,
    });
    return Response.json({ ok: true, rows: response.rows?.length || 0 });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('GA4 Health Check error:', error?.message || error);
    const msg = String(error?.message || '');
    const code = (error && (error.code || error.status || error.response?.status)) || undefined;
    const isDisabled = msg.includes('disabled') || msg.includes('keyDisabled') || msg.includes('accountDisabled');
    const isInvalid = msg.includes('invalid_grant') || msg.includes('invalid_client') || msg.includes('unauthorized_client');

    if (isDisabled) {
      return new Response(
        JSON.stringify({ ok: false, error: 'GA4-nyckel disabled', ...(debug ? { raw: msg, code } : {}) }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
    if (isInvalid) {
      return new Response(
        JSON.stringify({ ok: false, error: 'GA4-nyckel ogiltig', ...(debug ? { raw: msg, code } : {}) }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ ok: false, error: 'Upstream GA4-fel', ...(debug ? { raw: msg, code } : {}) }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
}