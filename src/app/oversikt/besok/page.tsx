import { Metadata } from 'next';
import { Suspense } from 'react';
import { OverviewPageClient } from '@/components/oversikt-besok/OverviewPageClient';
import { OverviewPageSkeleton } from '@/components/oversikt-besok/OverviewPageSkeleton';

export const metadata: Metadata = {
  title: 'GA4 Dashboard – Besök',
    description: 'Översikt över besöksstatistik från Google Analytics 4 för www.bevego.se',
};

type SearchParams = {
  start?: string;
  end?: string;
  compare?: string;
  channel?: string;
  device?: string;
  role?: string;
  unit?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

// Helper function to get default date range (last 7 days)
function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  // Default: senaste 7 dagarna
  start.setDate(start.getDate() - 6);
  
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

// Helper function to build API URL with search params
function buildApiUrl(searchParams: SearchParams) {
  const defaultRange = getDefaultDateRange();
  
  const params = new URLSearchParams({
    start: searchParams.start || defaultRange.start,
    end: searchParams.end || defaultRange.end,
    compare: searchParams.compare || 'yoy',
    ...(searchParams.channel && { channel: searchParams.channel }),
    ...(searchParams.device && { device: searchParams.device }),
    ...(searchParams.role && { role: searchParams.role }),
    ...(searchParams.unit && { unit: searchParams.unit }),
  });

  return `/api/ga4/overview?${params.toString()}`;
}

export default async function OverviewPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const apiUrl = buildApiUrl(resolvedSearchParams);

  // Fetch initial data on the server
  let initialData = null;
  let initialError = null;
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${apiUrl}`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    
    if (response.ok) {
      initialData = await response.json();
    } else {
      const errorData = await response.json();
      initialError = errorData.error || `HTTP ${response.status}`;
    }
  } catch (error) {
    initialError = error instanceof Error ? error.message : 'Unknown error';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            GA4 Dashboard – Besök
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Översikt över besöksstatistik från Google Analytics 4 för www.bevego.se
          </p>
        </div>
      </div>

      <Suspense fallback={<OverviewPageSkeleton />}>
        <OverviewPageClient 
          initialData={initialData}
          initialError={initialError}
        />
      </Suspense>
    </div>
  );
}