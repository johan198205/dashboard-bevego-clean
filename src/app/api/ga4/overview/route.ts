import { NextRequest } from 'next/server';

// Type definitions for GA4 Overview API
export interface TimePoint {
  date: string;
  sessions: number;
  users: number;
  totalUsers: number;
  returningUsers: number;
  engagedSessions: number;
  engagementRatePct: number;
  avgEngagementTimeSec: number;
  pageviews: number;
  pagesPerSession: number;
  avgSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
}

export interface Summary {
  sessions: number;
  users: number;
  totalUsers: number;
  returningUsers: number;
  engagedSessions: number;
  engagementRatePct: number;
  avgEngagementTimeSec: number;
  pageviews: number;
  pagesPerSession: number;
  pageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
  sampled?: boolean;
  deltasYoY?: {
    sessions: number;
    totalUsers: number;
    returningUsers: number;
    engagedSessions: number;
    engagementRatePct: number;
    avgEngagementTimePct: number;
    pageviews: number;
    pagesPerSession: number;
  } | null;
}

export interface Split {
  key: string;
  sessions: number;
  users: number;
  avgSessionDuration: number;
  bounceRate: number;
  engagementRatePct: number;
  comparisonPct?: number;
}

export interface WeekdayHour {
  weekday: string;
  hour: number;
  sessions: number;
  engaged: number;
}

export interface TopPage {
  key: string;
  sessions: number;
  avgSessionDuration: number;
  engagementRatePct: number;
  avgEngagementTimeSec?: number;
  title?: string;
  path?: string;
}

export interface OverviewPayload {
  summary: Summary;
  timeseries: TimePoint[];
  channels: Split[];
  devices: Split[];
  cities: Split[];
  weekdayHour: WeekdayHour[];
  topPages: TopPage[];
  referrers: Split[];
  notes: string[];
}

// Mock data generator functions
function generateTimeseries(start: string, end: string, grain: 'day' | 'week' | 'month' = 'day') {
  const timeseries = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (grain === 'day') {
    // Daily granularity - original logic
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
  } else if (grain === 'week') {
    // Weekly granularity - aggregate by weeks
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
      const weekStart = new Date(d);
      const weekEnd = new Date(Math.min(d.getTime() + 6 * 24 * 60 * 60 * 1000, endDate.getTime()));
      const dateStr = weekStart.toISOString().slice(0, 10);
      const baseSessions = (120 + Math.random() * 80) * 7; // 7 days worth of sessions
      
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
  } else if (grain === 'month') {
    // Monthly granularity - aggregate by months
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const dateStr = monthStart.toISOString().slice(0, 10);
      const baseSessions = (120 + Math.random() * 80) * 30; // ~30 days worth of sessions
      
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

function generateCitiesData(compare: string) {
  const getComparisonData = () => {
    if (compare === 'yoy') {
      return {
        'Stockholm': 18.2,
        'Göteborg': 12.5,
        'Malmö': 8.7,
        'Uppsala': 15.3,
        'Linköping': -2.1,
        'Örebro': 22.4,
        'Västerås': 11.8,
        'Helsingborg': 7.9,
        'Jönköping': 14.6,
        'Norrköping': -5.3
      };
    } else if (compare === 'prev') {
      return {
        'Stockholm': 3.4,
        'Göteborg': -1.2,
        'Malmö': 7.8,
        'Uppsala': 2.1,
        'Linköping': -4.6,
        'Örebro': 9.3,
        'Västerås': 5.7,
        'Helsingborg': -2.8,
        'Jönköping': 6.2,
        'Norrköping': 1.9
      };
    }
    return {};
  };

  const comparisonData = getComparisonData();

  return [
    { key: 'Stockholm', sessions: 234, users: 198, avgSessionDuration: 245, bounceRate: 42.3, engagementRatePct: comparisonData['Stockholm'] },
    { key: 'Göteborg', sessions: 189, users: 156, avgSessionDuration: 198, bounceRate: 38.7, engagementRatePct: comparisonData['Göteborg'] },
    { key: 'Malmö', sessions: 134, users: 112, avgSessionDuration: 167, bounceRate: 48.2, engagementRatePct: comparisonData['Malmö'] },
    { key: 'Uppsala', sessions: 98, users: 89, avgSessionDuration: 189, bounceRate: 52.1, engagementRatePct: comparisonData['Uppsala'] },
    { key: 'Linköping', sessions: 67, users: 58, avgSessionDuration: 234, bounceRate: 35.4, engagementRatePct: comparisonData['Linköping'] },
    { key: 'Örebro', sessions: 45, users: 38, avgSessionDuration: 156, bounceRate: 44.8, engagementRatePct: comparisonData['Örebro'] },
    { key: 'Västerås', sessions: 34, users: 29, avgSessionDuration: 178, bounceRate: 41.2, engagementRatePct: comparisonData['Västerås'] },
    { key: 'Helsingborg', sessions: 28, users: 24, avgSessionDuration: 192, bounceRate: 46.7, engagementRatePct: comparisonData['Helsingborg'] },
    { key: 'Jönköping', sessions: 23, users: 19, avgSessionDuration: 165, bounceRate: 43.1, engagementRatePct: comparisonData['Jönköping'] },
    { key: 'Norrköping', sessions: 19, users: 16, avgSessionDuration: 187, bounceRate: 39.8, engagementRatePct: comparisonData['Norrköping'] }
  ];
}

function generateWeekdayHourData() {
  const weekdays = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const data = [];
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Generate realistic traffic patterns
      let baseSessions = 0;
      
      // Weekday vs weekend patterns
      if (day >= 1 && day <= 5) { // Weekdays
        if (hour >= 9 && hour <= 17) {
          baseSessions = 45 + Math.random() * 25; // 45-70 during work hours
        } else if (hour >= 18 && hour <= 22) {
          baseSessions = 25 + Math.random() * 15; // 25-40 evening
        } else {
          baseSessions = 5 + Math.random() * 10; // 5-15 off hours
        }
      } else { // Weekends
        if (hour >= 10 && hour <= 20) {
          baseSessions = 20 + Math.random() * 20; // 20-40 during day
        } else {
          baseSessions = 3 + Math.random() * 7; // 3-10 off hours
        }
      }
      
      data.push({
        weekday: weekdays[day],
        hour: hour,
        sessions: Math.round(baseSessions),
        engaged: Math.round(baseSessions * 0.75)
      });
    }
  }
  
  return data;
}

function generateTopPagesData(compare: string) {
  const getComparisonData = () => {
    if (compare === 'yoy') {
      return {
        '/': 22.4,
        '/produkter': 15.7,
        '/om-oss': 8.9,
        '/kontakt': -3.2,
        '/blogg': 18.6,
        '/support': 12.1,
        '/priser': 7.3,
        '/demo': -1.8,
        '/integrationer': 14.2,
        '/resurser': 9.5
      };
    } else if (compare === 'prev') {
      return {
        '/': 4.2,
        '/produkter': -1.7,
        '/om-oss': 6.8,
        '/kontakt': 2.1,
        '/blogg': -2.3,
        '/support': 5.9,
        '/priser': 3.4,
        '/demo': -0.8,
        '/integrationer': 7.2,
        '/resurser': 1.6
      };
    }
    return {};
  };

  const comparisonData = getComparisonData();

  return [
    { key: '/', sessions: 234, users: 198, avgSessionDuration: 245, bounceRate: 42.3, engagementRatePct: comparisonData['/'] },
    { key: '/produkter', sessions: 189, users: 156, avgSessionDuration: 198, bounceRate: 38.7, engagementRatePct: comparisonData['/produkter'] },
    { key: '/om-oss', sessions: 134, users: 112, avgSessionDuration: 167, bounceRate: 48.2, engagementRatePct: comparisonData['/om-oss'] },
    { key: '/kontakt', sessions: 98, users: 89, avgSessionDuration: 189, bounceRate: 52.1, engagementRatePct: comparisonData['/kontakt'] },
    { key: '/blogg', sessions: 67, users: 58, avgSessionDuration: 234, bounceRate: 35.4, engagementRatePct: comparisonData['/blogg'] },
    { key: '/support', sessions: 45, users: 38, avgSessionDuration: 156, bounceRate: 44.8, engagementRatePct: comparisonData['/support'] },
    { key: '/priser', sessions: 34, users: 29, avgSessionDuration: 178, bounceRate: 41.2, engagementRatePct: comparisonData['/priser'] },
    { key: '/demo', sessions: 28, users: 24, avgSessionDuration: 192, bounceRate: 46.7, engagementRatePct: comparisonData['/demo'] },
    { key: '/integrationer', sessions: 23, users: 19, avgSessionDuration: 165, bounceRate: 43.1, engagementRatePct: comparisonData['/integrationer'] },
    { key: '/resurser', sessions: 19, users: 16, avgSessionDuration: 187, bounceRate: 39.8, engagementRatePct: comparisonData['/resurser'] }
  ];
}

export async function GET(req: NextRequest) {
  // Calculate comparison function - define at top level
  const calculateComparison = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100; // Round to 2 decimals
  };

  // Extract parameters outside try-catch so they're available in catch block
  const url = new URL(req.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const compare = url.searchParams.get('compare') || 'yoy';
  const grain = (url.searchParams.get('grain') as 'day' | 'week' | 'month') || 'day';

  try {

    // Validate required parameters
    if (!start || !end) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: start, end' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    // Try to get real GA4 data first
    try {
      const { getGA4Client } = await import('@/lib/ga4');
      const client = getGA4Client();
      
      console.log('GA4 Overview API: Fetching real GA4 data for', start, 'to', end);
      
      // Get summary KPIs from GA4
      const summaryData = await client.getSummaryKPIs(start, end);
      
      // Get timeseries data from GA4 with granularity support
      const timeseriesData = await client.getTimeseries(start, end, grain);
      
            // Get channel data
            const channels = await client.getChannelDistribution(start, end);

            // Get device data
            const devices = await client.getDeviceDistribution(start, end);

            // Get city data
            const cities = await client.getTopCities(start, end);

            // Calculate comparison data for channels, devices, and cities
            let channelComparison = channels.map((channel: any) => ({ ...channel, comparisonPct: 0 }));
            let deviceComparison = devices.map((device: any) => ({ ...device, comparisonPct: 0 }));
            let cityComparison = cities.map((city: any) => ({ ...city, comparisonPct: 0 }));
            
            // Only calculate comparisons if comparison mode is specified
            if (compare === 'yoy' || compare === 'prev') {
              try {
                if (compare === 'yoy') {
                  // Get same period last year
                  const lastYearStart = new Date(start);
                  const lastYearEnd = new Date(end);
                  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
                  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
                  
                  const lastYearChannels = await client.getChannelDistribution(
                    lastYearStart.toISOString().slice(0, 10), 
                    lastYearEnd.toISOString().slice(0, 10)
                  );
                  
                  channelComparison = channels.map((channel: any) => {
                    const lastYearChannel = lastYearChannels.find((c: any) => c.key === channel.key);
                    return {
                      ...channel,
                      comparisonPct: lastYearChannel ? calculateComparison(channel.sessions, lastYearChannel.sessions) : 0
                    };
                  });
                  
                  // Get device comparison data for same period last year
                  const lastYearDevices = await client.getDeviceDistribution(
                    lastYearStart.toISOString().slice(0, 10), 
                    lastYearEnd.toISOString().slice(0, 10)
                  );
                  
                  deviceComparison = devices.map((device: any) => {
                    const lastYearDevice = lastYearDevices.find((d: any) => d.key === device.key);
                    return {
                      ...device,
                      comparisonPct: lastYearDevice ? calculateComparison(device.sessions, lastYearDevice.sessions) : 0
                    };
                  });
                  
                  // Get city comparison data for same period last year
                  const lastYearCities = await client.getTopCities(
                    lastYearStart.toISOString().slice(0, 10), 
                    lastYearEnd.toISOString().slice(0, 10)
                  );
                  
                  cityComparison = cities.map((city: any) => {
                    const lastYearCity = lastYearCities.find((c: any) => c.key === city.key);
                    return {
                      ...city,
                      comparisonPct: lastYearCity ? calculateComparison(city.sessions, lastYearCity.sessions) : 0
                    };
                  });
                } else if (compare === 'prev') {
                  // Get previous period
                  const periodLength = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
                  const prevEnd = new Date(start);
                  prevEnd.setDate(prevEnd.getDate() - 1);
                  const prevStart = new Date(prevEnd);
                  prevStart.setDate(prevStart.getDate() - periodLength + 1);
                  
                  const prevChannels = await client.getChannelDistribution(
                    prevStart.toISOString().slice(0, 10), 
                    prevEnd.toISOString().slice(0, 10)
                  );
                  
                  channelComparison = channels.map((channel: any) => {
                    const prevChannel = prevChannels.find((c: any) => c.key === channel.key);
                    return {
                      ...channel,
                      comparisonPct: prevChannel ? calculateComparison(channel.sessions, prevChannel.sessions) : 0
                    };
                  });
                  
                  // Get device comparison data for previous period
                  const prevDevices = await client.getDeviceDistribution(
                    prevStart.toISOString().slice(0, 10), 
                    prevEnd.toISOString().slice(0, 10)
                  );
                  
                  deviceComparison = devices.map((device: any) => {
                    const prevDevice = prevDevices.find((d: any) => d.key === device.key);
                    return {
                      ...device,
                      comparisonPct: prevDevice ? calculateComparison(device.sessions, prevDevice.sessions) : 0
                    };
                  });
                  
                  // Get city comparison data for previous period
                  const prevCities = await client.getTopCities(
                    prevStart.toISOString().slice(0, 10), 
                    prevEnd.toISOString().slice(0, 10)
                  );
                  
                  cityComparison = cities.map((city: any) => {
                    const prevCity = prevCities.find((c: any) => c.key === city.key);
                    return {
                      ...city,
                      comparisonPct: prevCity ? calculateComparison(city.sessions, prevCity.sessions) : 0
                    };
                  });
                }
              } catch (comparisonError) {
                console.error('Failed to calculate channel comparisons:', comparisonError);
                // Keep default comparison values (0%)
              }
            }
      
            // Get top pages data
            const topPages = await client.getTopPages(start, end);

            // Get top referrers data
            const referrers = await client.getTopReferrers(start, end);

            // Get comparison data for the same period last year or previous period
            let comparisonData = null;
            if (compare === 'yoy') {
              // Get same period last year
              const lastYearStart = new Date(start);
              const lastYearEnd = new Date(end);
              lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
              lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
              
              const lastYearSummary = await client.getSummaryKPIs(
                lastYearStart.toISOString().slice(0, 10),
                lastYearEnd.toISOString().slice(0, 10)
              );
              
              comparisonData = {
                sessions: calculateComparison(summaryData.sessions, lastYearSummary.sessions),
                totalUsers: calculateComparison(summaryData.totalUsers, lastYearSummary.totalUsers),
                returningUsers: calculateComparison(summaryData.returningUsers, lastYearSummary.returningUsers),
                engagedSessions: calculateComparison(summaryData.engagedSessions, lastYearSummary.engagedSessions),
                engagementRatePct: calculateComparison(summaryData.engagementRatePct, lastYearSummary.engagementRatePct),
                avgEngagementTimePct: calculateComparison(summaryData.avgEngagementTimeSec, lastYearSummary.avgEngagementTimeSec),
                pageviews: calculateComparison(summaryData.pageviews, lastYearSummary.pageviews),
                pagesPerSession: calculateComparison(summaryData.pagesPerSession, lastYearSummary.pagesPerSession)
              };
            } else if (compare === 'prev') {
              // Get previous period (same length as current period)
              const periodLength = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
              const prevEnd = new Date(start);
              prevEnd.setDate(prevEnd.getDate() - 1);
              const prevStart = new Date(prevEnd);
              prevStart.setDate(prevStart.getDate() - periodLength + 1);
              
              const prevSummary = await client.getSummaryKPIs(
                prevStart.toISOString().slice(0, 10),
                prevEnd.toISOString().slice(0, 10)
              );
              
              comparisonData = {
                sessions: calculateComparison(summaryData.sessions, prevSummary.sessions),
                totalUsers: calculateComparison(summaryData.totalUsers, prevSummary.totalUsers),
                returningUsers: calculateComparison(summaryData.returningUsers, prevSummary.returningUsers),
                engagedSessions: calculateComparison(summaryData.engagedSessions, prevSummary.engagedSessions),
                engagementRatePct: calculateComparison(summaryData.engagementRatePct, prevSummary.engagementRatePct),
                avgEngagementTimePct: calculateComparison(summaryData.avgEngagementTimeSec, prevSummary.avgEngagementTimeSec),
                pageviews: calculateComparison(summaryData.pageviews, prevSummary.pageviews),
                pagesPerSession: calculateComparison(summaryData.pagesPerSession, prevSummary.pagesPerSession)
              };
            }

            const realData = {
              summary: {
                sessions: summaryData.sessions,
                users: summaryData.totalUsers,
                totalUsers: summaryData.totalUsers,
                returningUsers: summaryData.returningUsers,
                engagedSessions: summaryData.engagedSessions,
                engagementRatePct: summaryData.engagementRatePct,
                avgEngagementTimeSec: summaryData.avgEngagementTimeSec,
                pageviews: summaryData.pageviews,
                pagesPerSession: summaryData.pagesPerSession,
                pageViews: summaryData.pageviews,
                avgSessionDuration: summaryData.avgEngagementTimeSec,
                bounceRate: 100 - summaryData.engagementRatePct, // Approximate bounce rate
                engagementRate: summaryData.engagementRatePct / 100,
                // Add real comparison deltas based on comparison mode
                deltasYoY: comparisonData
              },
              timeseries: timeseriesData,
              channels: channelComparison,
              devices: deviceComparison,
              cities: cityComparison,
              weekdayHour: generateWeekdayHourData(), // Keep mock data for now
              topPages: topPages,
              referrers: referrers, // Use real referrer data
              notes: ['Källa: GA4 API']
      };

      return Response.json(realData);
    } catch (ga4Error) {
      console.error('GA4 Overview API: Failed to fetch real data, falling back to mock data:', ga4Error);
    }

    console.log('GA4 Overview API: Returning mock data for', start, 'to', end, 'with grain:', grain);

    // Generate mock data with granularity support
    const timeseries = generateTimeseries(start, end, grain);
    const channels = generateChannelData(compare);
    const devices = generateDeviceData(compare);
    const cities = generateCitiesData(compare);
    const weekdayHour = generateWeekdayHourData();
    const topPages = generateTopPagesData(compare);
    
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
      cities,
      weekdayHour,
      topPages,
      referrers: topPages.map(page => ({
        key: page.key || 'Unknown',
        sessions: page.sessions || 0,
        avgEngagementTimeSec: page.avgSessionDuration || 0,
        engagementRatePct: page.engagementRatePct || 0
      })), // Map to referrer format
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
      timeseries: generateTimeseries('2025-10-07', '2025-10-13', grain),
      channels: generateChannelData(compare),
      devices: generateDeviceData(compare),
      cities: generateCitiesData(compare),
      weekdayHour: generateWeekdayHourData(),
      topPages: generateTopPagesData(compare),
      referrers: generateTopPagesData(compare).map(page => ({
        key: page.key || 'Unknown',
        sessions: page.sessions || 0,
        avgEngagementTimeSec: page.avgSessionDuration || 0,
        engagementRatePct: page.engagementRatePct || 0
      })),
      notes: ['Källa: Fallback mockdata - GA4 API fel']
    };

    return Response.json(fallbackData);
  }
}