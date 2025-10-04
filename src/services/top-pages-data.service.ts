import { TopPageWithCwv } from './top-pages.service';

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
 * Get top pages with Core Web Vitals data from API
 */
export async function getTopPagesWithCwv(
  limit: number = 10,
  device: string[] = [],
  startDate?: string,
  endDate?: string
): Promise<TopPageWithCwv[]> {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    // Add device filter if specified
    if (device.length > 0) {
      params.append('device', device.join(','));
    }

    // Add date range parameters if specified
    if (startDate && endDate) {
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    }

    const response = await fetch(`${getBaseUrl()}/api/top-pages?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch top pages: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch top pages:', error);
    return [];
  }
}
