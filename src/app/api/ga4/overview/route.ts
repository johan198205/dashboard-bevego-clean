import { NextRequest } from 'next/server';

// Mock data generator functions
function generateTimeseries(start: string, end: string) {
  const timeseries = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const baseSessions = 120 + Math.random() * 80; // 120-200 sessions per day
    
    timeseries.push({
      date: dateStr,
      sessions: Math.round(baseSessions),
      users: Math.round(baseSessions * 0.85),
      totalUsers: Math.round(baseSessions * 0.85),
      returningUsers: Math.round(baseSessions * 0.35),
      engagedSessions: Math.round(baseSessions * 0.72),
      engagementRatePct: 65 + Math.random() * 15, // 65-80%
      avgEngagementTimeSec: Math.round(180 + Math.random() * 120), // 3-5 minutes
      pageviews: Math.round(baseSessions * 2.3),
      pagesPerSession: 2.1 + Math.random() * 0.8, // 2.1-2.9 pages per session
      avgSessionDuration: Math.round(180 + Math.random() * 120), // 3-5 minutes
      bounceRate: 45 + Math.random() * 20, // 45-65%
      engagementRate: 65 + Math.random() * 15 // 65-80%
    });
  }
  
  return timeseries;
}

function generateChannelData(compare: string) {
  // Generate comparison percentages based on compare mode
  const getComparisonData = () => {
    if (compare === 'yoy') {
      return {
        'Organic Search': 15.2,
        'Direct': 8.7,
        'Paid Search': -2.1,
        'Social': 22.4,
        'Email': 12.8,
        'Referral': -5.3
      };
    } else if (compare === 'prev') {
      return {
        'Organic Search': 3.4,
        'Direct': -1.2,
        'Paid Search': 7.8,
        'Social': -4.6,
        'Email': 2.1,
        'Referral': 9.3
      };
    }
    return {};
  };

  const comparisonData = getComparisonData();

  return [
    { key: 'Organic Search', sessions: 245, users: 208, avgSessionDuration: 245, bounceRate: 42.3, engagementRatePct: comparisonData['Organic Search'] },
    { key: 'Direct', sessions: 189, users: 156, avgSessionDuration: 198, bounceRate: 38.7, engagementRatePct: comparisonData['Direct'] },
    { key: 'Paid Search', sessions: 134, users: 112, avgSessionDuration: 167, bounceRate: 48.2, engagementRatePct: comparisonData['Paid Search'] },
    { key: 'Social', sessions: 98, users: 89, avgSessionDuration: 189, bounceRate: 52.1, engagementRatePct: comparisonData['Social'] },
    { key: 'Email', sessions: 67, users: 58, avgSessionDuration: 234, bounceRate: 35.4, engagementRatePct: comparisonData['Email'] },
    { key: 'Referral', sessions: 45, users: 38, avgSessionDuration: 156, bounceRate: 44.8, engagementRatePct: comparisonData['Referral'] }
  ];
}

function generateDeviceData(compare: string) {
  // Generate comparison percentages based on compare mode
  const getComparisonData = () => {
    if (compare === 'yoy') {
      return {
        'desktop': 11.3,
        'mobile': 18.7,
        'tablet': -3.2
      };
    } else if (compare === 'prev') {
      return {
        'desktop': 2.8,
        'mobile': -1.9,
        'tablet': 6.4
      };
    }
    return {};
  };

  const comparisonData = getComparisonData();

  return [
    { key: 'desktop', sessions: 412, users: 345, avgSessionDuration: 234, bounceRate: 41.2, engagementRatePct: comparisonData['desktop'] },
    { key: 'mobile', sessions: 298, users: 267, avgSessionDuration: 167, bounceRate: 52.3, engagementRatePct: comparisonData['mobile'] },
    { key: 'tablet', sessions: 68, users: 51, avgSessionDuration: 189, bounceRate: 38.9, engagementRatePct: comparisonData['tablet'] }
  ];
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const compare = url.searchParams.get('compare') || 'yoy';

    // Validate required parameters
    if (!start || !end) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: start, end' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    console.log('GA4 Overview API: Returning mock data for', start, 'to', end);

    // Generate mock data
    const timeseries = generateTimeseries(start, end);
    const channels = generateChannelData(compare);
    const devices = generateDeviceData(compare);
    
    // Calculate summary totals
    const totalSessions = timeseries.reduce((sum, day) => sum + day.sessions, 0);
    const totalUsers = timeseries.reduce((sum, day) => sum + day.totalUsers, 0);
    const returningUsers = timeseries.reduce((sum, day) => sum + day.returningUsers, 0);
    const engagedSessions = timeseries.reduce((sum, day) => sum + day.engagedSessions, 0);
    const totalPageViews = timeseries.reduce((sum, day) => sum + day.pageviews, 0);
    const avgSessionDuration = Math.round(timeseries.reduce((sum, day) => sum + day.avgSessionDuration, 0) / timeseries.length);
    const avgBounceRate = Math.round((timeseries.reduce((sum, day) => sum + day.bounceRate, 0) / timeseries.length) * 10) / 10;
    const avgEngagementRate = Math.round((timeseries.reduce((sum, day) => sum + day.engagementRate, 0) / timeseries.length) * 10) / 10;
    const avgEngagementRatePct = Math.round((timeseries.reduce((sum, day) => sum + day.engagementRatePct, 0) / timeseries.length) * 10) / 10;
    const avgEngagementTimeSec = Math.round(timeseries.reduce((sum, day) => sum + day.avgEngagementTimeSec, 0) / timeseries.length);
    const avgPagesPerSession = Math.round((timeseries.reduce((sum, day) => sum + day.pagesPerSession, 0) / timeseries.length) * 10) / 10;

    const mockData = {
      summary: {
        sessions: totalSessions,
        users: totalUsers,
        totalUsers: totalUsers,
        returningUsers: returningUsers,
        engagedSessions: engagedSessions,
        engagementRatePct: avgEngagementRatePct,
        avgEngagementTimeSec: avgEngagementTimeSec,
        pageviews: totalPageViews,
        pagesPerSession: avgPagesPerSession,
        pageViews: totalPageViews,
        avgSessionDuration,
        bounceRate: avgBounceRate,
        engagementRate: avgEngagementRate,
        // Add comparison deltas based on comparison mode
        deltasYoY: compare === 'yoy' ? {
          sessions: 12.5, // +12.5% vs same period last year
          totalUsers: 8.3,
          returningUsers: 15.2,
          engagedSessions: 18.7,
          engagementRatePct: 4.2,
          avgEngagementTimePct: 7.8,
          pageviews: 14.6,
          pagesPerSession: 2.1
        } : compare === 'prev' ? {
          sessions: -3.2, // -3.2% vs previous period
          totalUsers: -1.8,
          returningUsers: 2.4,
          engagedSessions: 5.1,
          engagementRatePct: 1.9,
          avgEngagementTimePct: 3.7,
          pageviews: 8.9,
          pagesPerSession: 1.3
        } : null
      },
      timeseries,
      channels,
      devices,
      weekdayHour: [], // Empty for now
      topPages: [], // Empty for now
      notes: ['Källa: Mockdata för GA4 Dashboard']
    };

    return Response.json(mockData);

  } catch (error) {
    console.error('GA4 Overview API Error:', error);
    
    // Fallback mock data
    const fallbackData = {
      summary: {
        sessions: 778,
        users: 663,
        totalUsers: 663,
        returningUsers: 272,
        engagedSessions: 560,
        engagementRatePct: 72.3,
        avgEngagementTimeSec: 196,
        pageviews: 1789,
        pagesPerSession: 2.3,
        pageViews: 1789,
        avgSessionDuration: 196,
        bounceRate: 44.1,
        engagementRate: 72.3,
        // Add comparison deltas for fallback
        deltasYoY: compare === 'yoy' ? {
          sessions: 15.2,
          totalUsers: 11.8,
          returningUsers: 22.4,
          engagedSessions: 19.6,
          engagementRatePct: 6.7,
          avgEngagementTimePct: 9.3,
          pageviews: 17.2,
          pagesPerSession: 3.8
        } : compare === 'prev' ? {
          sessions: -2.1,
          totalUsers: -0.8,
          returningUsers: 4.2,
          engagedSessions: 6.7,
          engagementRatePct: 2.4,
          avgEngagementTimePct: 4.9,
          pageviews: 11.3,
          pagesPerSession: 1.8
        } : null
      },
      timeseries: generateTimeseries('2025-10-07', '2025-10-13'),
      channels: generateChannelData('yoy'),
      devices: generateDeviceData('yoy'),
      weekdayHour: [],
      topPages: [],
      notes: ['Källa: Fallback mockdata - GA4 API fel']
    };

    return Response.json(fallbackData);
  }
}