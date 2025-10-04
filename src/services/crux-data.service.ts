import { CwvSummary, CwvTrendPoint, CwvUrlGroupRow } from '@/lib/types';

// Resolve base URL for server-side fetches
function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.VERCEL_URL;
  if (fromEnv) {
    // Ensure protocol
    return fromEnv.startsWith('http') ? fromEnv : `https://${fromEnv}`;
  }
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

/**
 * Get CrUX summary data from API
 */
export async function getCruxSummary(
  range: { start: string; end: string },
  device: string[] = [],
  origin: string = 'https://www.bevego.se'
): Promise<CwvSummary> {
  try {
    const params = new URLSearchParams({
      type: 'summary',
      origin: origin,
    });

    // Add device filter if specified
    if (device.length > 0) {
      params.append('device', device.join(','));
    }

    // No date filtering for summary - always show current data

    const response = await fetch(`${getBaseUrl()}/api/crux?${params}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No field data available');
      }
      throw new Error(`Failed to fetch CrUX summary: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch CrUX summary:', error);
    throw error;
  }
}

/**
 * Get CrUX trends data from API
 */
export async function getCruxTrends(
  range: { start: string; end: string },
  device: string[] = [],
  origin: string = 'https://www.bevego.se'
): Promise<CwvTrendPoint[]> {
  try {
    const params = new URLSearchParams({
      type: 'trends',
      origin: origin,
    });

    // Add device filter if specified
    if (device.length > 0) {
      params.append('device', device.join(','));
    }

    // No date filtering for trends - always show 40 weeks

    const response = await fetch(`${getBaseUrl()}/api/crux?${params}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return []; // Return empty array for no data
      }
      throw new Error(`Failed to fetch CrUX trends: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch CrUX trends:', error);
    return []; // Return empty array on error
  }
}

/**
 * Get CrUX table data from API
 */
export async function getCruxTable(
  range: { start: string; end: string },
  device: string[] = [],
  origin: string = 'https://www.bevego.se'
): Promise<CwvUrlGroupRow[]> {
  try {
    const params = new URLSearchParams({
      type: 'table',
      origin: origin,
    });

    // Add device filter if specified
    if (device.length > 0) {
      params.append('device', device.join(','));
    }

    const response = await fetch(`${getBaseUrl()}/api/crux?${params}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return []; // Return empty array for no data
      }
      throw new Error(`Failed to fetch CrUX table: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch CrUX table:', error);
    return []; // Return empty array on error
  }
}
