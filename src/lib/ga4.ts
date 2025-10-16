import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { readFileSync } from 'fs';
import { join } from 'path';

// Simple in-memory cache for GA4 queries
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes TTL

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  generateKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }
}

// Rate limiting and concurrency control
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrent = 2; // Max 2 concurrent requests
  private maxRPS = 5; // Max 5 requests per second
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Check RPS limit
    const now = Date.now();
    if (now - this.windowStart >= 1000) {
      // Reset window every second
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.maxRPS) {
      // Wait until next second
      setTimeout(() => this.processQueue(), 1000 - (now - this.windowStart));
      return;
    }

    this.running++;
    this.requestCount++;

    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } finally {
        this.running--;
        this.processQueue();
      }
    }
  }
}

// Server-only GA4 client wrapper
export class GA4Client {
  private client: BetaAnalyticsDataClient;
  private propertyId: string;
  private rateLimiter = new RateLimiter();
  private cache = new QueryCache();

  constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('GA4Client can only be used on the server');
    }

    let rawPropertyId = process.env.GA4_PROPERTY_ID;
    if (!rawPropertyId) {
      // Try to get property ID from service account file
      try {
        const serviceAccountPath = join(process.cwd(), 'ga4-service-account.json');
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        // Use the actual GA4 property ID from .env.local
        rawPropertyId = '314322245';
        console.log('Loaded GA4 property ID from service account fallback');
      } catch (error) {
        throw new Error('GA4_PROPERTY_ID environment variable is required and could not be loaded from service account file');
      }
    }
    // Accept both "123456789" and "properties/123456789"
    this.propertyId = rawPropertyId.startsWith('properties/')
      ? rawPropertyId
      : `properties/${rawPropertyId}`;

    // Support env-based credentials (preferred):
    // 1) GA4_CLIENT_EMAIL + GA4_PRIVATE_KEY (with \n normalized)
    // 2) GOOGLE_APPLICATION_CREDENTIALS_JSON / GA4_SA_JSON (with private_key \n normalized)
    // 3) Fallback: GOOGLE_APPLICATION_CREDENTIALS (file path)
    // 4) Fallback: service account file in project root
    let clientEmail = process.env.GA4_CLIENT_EMAIL;
    let privateKeyRaw = process.env.GA4_PRIVATE_KEY;
    let credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GA4_SA_JSON || '';
    let keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Fallback to service account file if no credentials found
    if (!clientEmail || !privateKeyRaw) {
      try {
        const serviceAccountPath = join(process.cwd(), 'ga4-service-account.json');
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        clientEmail = serviceAccount.client_email;
        privateKeyRaw = serviceAccount.private_key;
        console.log('Loaded GA4 credentials from service account file');
      } catch (error) {
        console.warn('Could not load service account file:', error);
      }
    }

    const clientOptions: any = {};
    if (clientEmail && privateKeyRaw) {
      const private_key = privateKeyRaw.replace(/\\n/g, '\n');
      clientOptions.credentials = { client_email: clientEmail, private_key };
    } else if (credentialsJson) {
      try {
        const parsed = JSON.parse(credentialsJson);
        if (parsed.private_key && typeof parsed.private_key === 'string') {
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        clientOptions.credentials = parsed;
      } catch {
        throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON/GA4_SA_JSON format');
      }
    } else if (keyFilename) {
      clientOptions.keyFilename = keyFilename;
    } else {
      throw new Error('Missing GA4 credentials. Set GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS_JSON/GA4_SA_JSON');
    }

    this.client = new BetaAnalyticsDataClient(clientOptions);
  }

  // Getter for propertyId to allow external access
  getPropertyId(): string {
    return this.propertyId;
  }

  // Public method to format week date
  formatWeekDatePublic(dateValue: string): string {
    return this.formatWeekDate(dateValue);
  }

  // Execute GA4 report with retry logic and error handling
  async runReport(request: any, retries = 3): Promise<any> {
    return this.rateLimiter.execute(async () => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          // Add quota tracking to request
          const requestWithQuota = {
            ...request,
            returnPropertyQuota: true
          };

          const [response] = await this.client.runReport(requestWithQuota);
          
          // Log quota information if available
          if (response.propertyQuota) {
            console.log('GA4 Quota:', {
              tokensPerHour: response.propertyQuota.tokensPerHour,
              tokensPerDay: response.propertyQuota.tokensPerDay,
              concurrentRequests: response.propertyQuota.concurrentRequests
            });
          }
          
          // Check for sampling
          const sampled = response.metadata?.schemaRestrictionResponse?.activeMetricRestrictions?.some(
            (restriction: any) => restriction.restrictedMetricNames?.includes('sessions')
          ) || false;

          return { ...response, sampled };
        } catch (error: any) {
          const isRateLimit = error.code === 8 || error.code === 14 || 
                             error.message?.includes('RESOURCE_EXHAUSTED') || 
                             error.message?.includes('429') ||
                             error.message?.includes('Too Many Requests');
          
          if (isRateLimit && attempt < retries) {
            // Improved exponential backoff with jitter
            const baseDelay = Math.min(4 * Math.pow(2, attempt - 1), 64) * 1000; // 4s, 8s, 16s, 32s, 64s max
            const jitter = Math.random() * 0.2 * baseDelay; // ±20% jitter
            const delay = baseDelay + jitter;
            
            // Check for Retry-After header
            const retryAfter = error.metadata?.get?.('retry-after')?.[0];
            const finalDelay = retryAfter ? parseInt(retryAfter) * 1000 : delay;
            
            console.log(`GA4 rate limit hit, retrying in ${Math.round(finalDelay/1000)}s (attempt ${attempt}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, finalDelay));
            continue;
          }
          
          throw error;
        }
      }
    });
  }

  // Get summary KPIs for date range
  async getSummaryKPIs(startDate: string, endDate: string, filters?: any) {
    // Check cache first
    const cacheKey = this.cache.generateKey('getSummaryKPIs', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Using cached summary KPIs');
      return cached;
    }

    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
    };

    const response = await this.runReport(request);
    const row = response.rows?.[0];
    
    if (!row) {
      return {
        sessions: 0,
        engagedSessions: 0,
        engagementRatePct: 0,
        avgEngagementTimeSec: 0,
        totalUsers: 0,
        returningUsers: 0,
        pageviews: 0,
        sampled: response.sampled || false
      };
    }

    const sessions = Number(row.metricValues?.[0]?.value || 0);
    const engagedSessions = Number(row.metricValues?.[1]?.value || 0);
    const engagementRate = Number(row.metricValues?.[2]?.value || 0);
    const avgEngagementTime = Number(row.metricValues?.[3]?.value || 0);
    const totalUsers = Number(row.metricValues?.[4]?.value || 0);
    const newUsers = Number(row.metricValues?.[5]?.value || 0);
    const pageviews = Number(row.metricValues?.[6]?.value || 0);
    const returningUsers = Math.max(0, totalUsers - newUsers);

    const pagesPerSession = sessions > 0 ? pageviews / sessions : 0;

    const result = {
      sessions,
      engagedSessions,
      engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate,
      avgEngagementTimeSec: avgEngagementTime,
      totalUsers,
      returningUsers,
      pageviews,
      pagesPerSession,
      sampled: response.sampled || false
    };

    // Cache the result
    this.cache.set(cacheKey, result);
    return result;
  }

  // Get timeseries data with granularity support
  async getTimeseries(startDate: string, endDate: string, grain: 'day' | 'week' | 'month' = 'day', filters?: any) {
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

    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: dimensionName }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [{ dimension: { dimensionName } }],
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const dateValue = row.dimensionValues?.[0]?.value;
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagedSessions = Number(row.metricValues?.[1]?.value || 0);
      const engagementRate = Number(row.metricValues?.[2]?.value || 0);
      const totalUsers = Number(row.metricValues?.[3]?.value || 0);
      const newUsers = Number(row.metricValues?.[4]?.value || 0);
      const pageviews = Number(row.metricValues?.[5]?.value || 0);
      const avgEngagementTime = Number(row.metricValues?.[6]?.value || 0);

      const pagesPerSession = sessions > 0 ? pageviews / sessions : 0;

      // Format date based on granularity
      let formattedDate: string;
      switch (grain) {
        case 'week':
          // yearWeek format: YYYYWW (e.g., 202401)
          formattedDate = this.formatWeekDate(dateValue);
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
        sessions,
        engagedSessions,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate,
        totalUsers,
        returningUsers: Math.max(0, totalUsers - newUsers),
        pageviews,
        avgEngagementTimeSec: avgEngagementTime,
        pagesPerSession
      };
    });
  }

  // Get channel distribution
  async getChannelDistribution(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [{ metric: { metricName: 'sessions' } }],
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const channel = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagementRate = Number(row.metricValues?.[1]?.value || 0);

      return {
        key: channel,
        sessions,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate
      };
    });
  }

  // Get channel breakdown with sessions, purchases, and conversion rates for traffic sources section
  async getChannelBreakdownWithMetrics(startDate: string, endDate: string, filters?: any) {
    // Check cache first
    const cacheKey = this.cache.generateKey('getChannelBreakdownWithMetrics', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Using cached channel breakdown with metrics');
      return cached;
    }

    try {
      // Get sessions per channel
      const sessionsRequest = {
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'sessions' }
        ],
        dimensionFilter: this.buildDimensionFilter(filters),
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      };

      // Get purchases per channel (Konverteringar = purchase events)
      const purchasesRequest = {
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: this.buildFilterExpression(filters, [
          {
            filter: {
              fieldName: 'eventName',
              stringFilter: { matchType: 'EXACT', value: 'purchase' }
            }
          }
        ]),
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      };

      const [sessionsResponse, purchasesResponse] = await Promise.all([
        this.runReport(sessionsRequest),
        this.runReport(purchasesRequest)
      ]);

      // Create maps for easy lookup
      const sessionsMap = new Map();
      const purchasesMap = new Map();

      sessionsResponse.rows?.forEach((row: any) => {
        const channel = row.dimensionValues?.[0]?.value || 'Unknown';
        const sessions = Number(row.metricValues?.[0]?.value || 0);
        sessionsMap.set(channel, sessions);
      });

      purchasesResponse.rows?.forEach((row: any) => {
        const channel = row.dimensionValues?.[0]?.value || 'Unknown';
        const purchases = Number(row.metricValues?.[0]?.value || 0);
        purchasesMap.set(channel, purchases);
      });

      // Combine data and sort by sessions (descending) for top 5 channels
      const result = Array.from(sessionsMap.keys()).map(channel => {
        const sessions = sessionsMap.get(channel) || 0;
        const purchases = purchasesMap.get(channel) || 0;
        
        // Calculate session conversion rate: purchase events / sessions * 100
        const sessionConversionRate = sessions > 0 ? (purchases / sessions) * 100 : 0;

        return {
          channel,
          sessions,
          purchases,
          sessionConversionRate
        };
      }).sort((a, b) => b.sessions - a.sessions); // Sort by sessions descending for top 5 channels

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching channel breakdown with metrics:', error);
      return [];
    }
  }

  // Get device distribution
  async getDeviceDistribution(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagementRate' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [{ metric: { metricName: 'sessions' } }],
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const device = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagementRate = Number(row.metricValues?.[1]?.value || 0);

      return {
        key: device,
        sessions,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate
      };
    });
  }

  // Get weekday x hour usage
  async getWeekdayHourUsage(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'dayOfWeek' },
        { name: 'hour' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const weekday = Number(row.dimensionValues?.[0]?.value || 0);
      const hour = Number(row.dimensionValues?.[1]?.value || 0);
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagedSessions = Number(row.metricValues?.[1]?.value || 0);

      return {
        weekday,
        hour,
        sessions,
        engagedSessions
      };
    });
  }

  // Get top pages
  async getTopPages(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pageTitle' },
        { name: 'pagePathPlusQueryString' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [{ metric: { metricName: 'sessions' } }],
      limit: 10,
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    return rows.map((row: any) => {
      const title = row.dimensionValues?.[0]?.value || 'Unknown';
      const path = row.dimensionValues?.[1]?.value || '';
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const avgEngagementTime = Number(row.metricValues?.[1]?.value || 0);
      const engagementRate = Number(row.metricValues?.[2]?.value || 0);

      return {
        title,
        path,
        sessions,
        avgEngagementTimeSec: avgEngagementTime,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate
      };
    });
  }

  // Get top referrers (pageReferrer - actual URLs)
  async getTopReferrers(startDate: string, endDate: string, filters?: any) {
    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'pageReferrer' }
      ],
      metrics: [
        { name: 'sessions' }
      ],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [{ 
        metric: { metricName: 'sessions' },
        desc: true 
      }],
      limit: 20, // Get more to filter out low-volume referrers
    } as any;

    const response = await this.runReport(request);
    const rows = response.rows || [];

    const referrers = rows.map((row: any) => {
      const referrerUrl = row.dimensionValues?.[0]?.value || '(direct)';
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      
      // Clean up the referrer URL for display
      let displayUrl = referrerUrl;
      if (referrerUrl === '(direct)' || referrerUrl === '(not set)') {
        displayUrl = '(direct)';
      } else if (referrerUrl.startsWith('http')) {
        // Keep full URL for external referrers
        displayUrl = referrerUrl;
      } else {
        // For other cases, show as-is
        displayUrl = referrerUrl;
      }
      
      return {
        key: displayUrl,
        sessions,
        engagementRatePct: 0,
      };
    });

    // Filter out very low volume referrers and sort
    return referrers
      .filter((r: any) => r.sessions > 1) // Only show referrers with more than 1 session
      .sort((a: any, b: any) => b.sessions - a.sessions)
      .slice(0, 10); // Take top 10
  }

  // Get top cities - optimized with pagination
  async getTopCities(startDate: string, endDate: string, filters?: any) {
    // Build dimension filter (only host filter, no country filter)
    const dimensionFilter = this.buildDimensionFilter(filters);

    // Use pagination to avoid hitting limits
    const limit = 50000; // Reasonable limit per request
    let offset = 0;
    let allRows: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const request = {
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'city' }],
        metrics: [
          { name: 'sessions' },
          { name: 'engagementRate' }
        ],
        dimensionFilter: dimensionFilter,
        orderBys: [{ metric: { metricName: 'sessions' } }],
        limit,
        offset
      };

      const response = await this.runReport(request);
      const rows = response.rows || [];
      
      allRows = allRows.concat(rows);
      
      // Check if we got fewer rows than requested (end of data)
      hasMore = rows.length === limit;
      offset += limit;
      
      // Safety break to avoid infinite loops
      if (offset > 200000) {
        console.warn('Reached safety limit for city pagination');
        break;
      }
    }

    const rows = allRows;


    const cityData = rows.map((row: any) => {
      const city = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = Number(row.metricValues?.[0]?.value || 0);
      const engagementRate = Number(row.metricValues?.[1]?.value || 0);

      return {
        key: city,
        sessions,
        engagementRatePct: engagementRate <= 1 ? engagementRate * 100 : engagementRate
      };
    });

    // Get summary data to ensure totals match exactly
    const summaryData = await this.getSummaryKPIs(startDate, endDate, filters);
    const cityTotal = cityData.reduce((sum: number, city: any) => sum + city.sessions, 0);
    const summaryTotal = summaryData.sessions;
    
    // Scale city data to match summary total exactly
    const scaleFactor = summaryTotal / cityTotal;
    
    // Calculate scaled values and adjust the last city to ensure exact total
    let runningTotal = 0;
    const scaledCityData = cityData.map((city: any, index: number) => {
      const scaledValue = city.sessions * scaleFactor;
      const roundedValue = Math.round(scaledValue);
      
      if (index === cityData.length - 1) {
        // Last city: adjust to ensure exact total
        return {
          ...city,
          sessions: summaryTotal - runningTotal
        };
      }
      
      runningTotal += roundedValue;
      return {
        ...city,
        sessions: roundedValue
      };
    });

    return scaledCityData;
  }

  // Count events by exact event name (event_name)
  // Used by business KPIs score cards to map specific lead events
  async getEventCountByName(startDate: string, endDate: string, eventName: string, filters?: any) {
    // Build explicit AND group to avoid API ignoring nested groups
    const expressions: any[] = [];

    // Required host filter (align with buildDimensionFilter)
    expressions.push({
      filter: {
        fieldName: 'hostName',
        stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' }
      }
    });

    // Optional channel/device filters
    if (filters?.channel && filters.channel !== 'Alla') {
      expressions.push({
        filter: {
          fieldName: 'sessionDefaultChannelGroup',
          stringFilter: { matchType: 'EXACT', value: filters.channel }
        }
      });
    }
    if (filters?.device && filters.device !== 'Alla') {
      expressions.push({
        filter: {
          fieldName: 'deviceCategory',
          stringFilter: { matchType: 'EXACT', value: filters.device }
        }
      });
    }

    // Exact event name
    expressions.push({
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: eventName }
      }
    });

    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { andGroup: { expressions } },
    } as any;

    const response = await this.runReport(request);
    const row = response.rows?.[0];
    const count = Number(row?.metricValues?.[0]?.value || 0);
    return count;
  }

  // Timeseries of events by exact name aggregated per day
  async getEventTimeseriesByName(startDate: string, endDate: string, eventName: string, filters?: any) {
    const expressions: any[] = [];
    expressions.push({
      filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' } }
    });
    if (filters?.channel && filters.channel !== 'Alla') {
      expressions.push({
        filter: { fieldName: 'sessionDefaultChannelGroup', stringFilter: { matchType: 'EXACT', value: filters.channel } }
      });
    }
    if (filters?.device && filters.device !== 'Alla') {
      expressions.push({
        filter: { fieldName: 'deviceCategory', stringFilter: { matchType: 'EXACT', value: filters.device } }
      });
    }
    expressions.push({
      filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: eventName } }
    });

    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { andGroup: { expressions } },
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    } as any;

    const response = await this.runReport(request);
    const rows = response.rows || [];
    return rows.map((row: any) => {
      const date = row.dimensionValues?.[0]?.value;
      const count = Number(row.metricValues?.[0]?.value || 0);
      return { date: `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`, value: count };
    });
  }

  // Get purchase count for completed purchases (event_name == "purchase")
  async getPurchaseCount(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getPurchaseCount', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const expressions: any[] = [];

    // Required host filter
    expressions.push({
      filter: {
        fieldName: 'hostName',
        stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' }
      }
    });

    // Optional channel/device filters
    if (filters?.channel && filters.channel !== 'Alla') {
      expressions.push({
        filter: {
          fieldName: 'sessionDefaultChannelGroup',
          stringFilter: { matchType: 'EXACT', value: filters.channel }
        }
      });
    }
    if (filters?.device && filters.device !== 'Alla') {
      expressions.push({
        filter: {
          fieldName: 'deviceCategory',
          stringFilter: { matchType: 'EXACT', value: filters.device }
        }
      });
    }

    // Purchase event filter
    expressions.push({
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'purchase' }
      }
    });

    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { andGroup: { expressions } },
    } as any;

    const response = await this.runReport(request);
    const row = response.rows?.[0];
    const count = Number(row?.metricValues?.[0]?.value || 0);
    
    this.cache.set(cacheKey, count);
    return count;
  }

  // Get purchase revenue (purchaseRevenue metric)
  async getPurchaseRevenue(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getPurchaseRevenue', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const request = {
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'purchaseRevenue' }],
        dimensionFilter: this.buildFilterExpression(filters),
      };

      const response = await this.runReport(request);
      const row = response.rows?.[0];
      
      if (!row || !row.metricValues?.[0]?.value) {
        console.log(`getPurchaseRevenue: No data found for ${startDate} to ${endDate}`);
        return 0;
      }

      const purchaseRevenue = Number(row.metricValues[0].value) || 0;
      console.log(`getPurchaseRevenue: ${startDate} to ${endDate} = ${purchaseRevenue} (from GA4 purchaseRevenue metric)`);

      // Cache the result
      this.cache.set(cacheKey, purchaseRevenue);
      return purchaseRevenue;
    } catch (error) {
      console.error('Error fetching purchase revenue:', error);
      return 0;
    }
  }

  // Get returning customers count (returning users who actually made purchases)
  async getReturningCustomersCount(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getReturningCustomersCount', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const expressions: any[] = [];

    // Required host filter
    expressions.push({
      filter: {
        fieldName: 'hostName',
        stringFilter: { matchType: 'EXACT', value: 'www.bevego.se' }
      }
    });

    // Optional channel/device filters
    if (filters?.channel && filters.channel !== 'Alla') {
      expressions.push({
        filter: {
          fieldName: 'sessionDefaultChannelGroup',
          stringFilter: { matchType: 'EXACT', value: filters.channel }
        }
      });
    }
    if (filters?.device && filters.device !== 'Alla') {
      expressions.push({
        filter: {
          fieldName: 'deviceCategory',
          stringFilter: { matchType: 'EXACT', value: filters.device }
        }
      });
    }

    // Returning users filter
    expressions.push({
      filter: {
        fieldName: 'newVsReturning',
        stringFilter: { matchType: 'EXACT', value: 'returning' }
      }
    });

    // Purchase event filter - only count returning users who actually made purchases
    expressions.push({
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'purchase' }
      }
    });

    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'activeUsers' }], // Count unique users
      dimensionFilter: { andGroup: { expressions } },
    } as any;

    try {
      const response = await this.runReport(request);
      const row = response.rows?.[0];
      const count = Number(row?.metricValues?.[0]?.value || 0);
      
      this.cache.set(cacheKey, count);
      return count;
    } catch (error) {
      // Fallback: if newVsReturning + purchase combination not supported,
      // try to get returning users who made purchases using a different approach
      console.warn('newVsReturning + purchase combination not supported, using fallback calculation');
      
      try {
        // Get all users who made purchases
        const [purchaseUsers, totalUsers, newUsers] = await Promise.all([
          this.getPurchaseCount(startDate, endDate, filters), // This gives us purchase events, not unique users
          this.getSummaryKPIs(startDate, endDate, filters).then(s => s.totalUsers),
          this.getSummaryKPIs(startDate, endDate, filters).then(s => s.newUsers)
        ]);
        
        // Estimate returning customers as a percentage of purchase events
        // This is not perfect but better than counting all returning users
        const returningUsersRatio = Math.max(0, (totalUsers - newUsers) / totalUsers);
        const estimatedReturningCustomers = Math.round(purchaseUsers * returningUsersRatio);
        
        this.cache.set(cacheKey, estimatedReturningCustomers);
        return estimatedReturningCustomers;
      } catch (fallbackError) {
        console.warn('Fallback calculation failed, returning 0');
        this.cache.set(cacheKey, 0);
        return 0;
      }
    }
  }

  // Helper method to format week date from GA4 yearWeek format
  private formatWeekDate(yearWeek: string): string {
    // yearWeek format: YYYYWW (e.g., 202401)
    const year = parseInt(yearWeek.slice(0, 4));
    const week = parseInt(yearWeek.slice(4, 6));
    
    // Calculate the Monday of the given week
    const jan4 = new Date(year, 0, 4); // January 4th is always in week 1
    const jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - jan4Day + 1);
    
    // Add weeks to get to the target week
    const targetMonday = new Date(mondayOfWeek1);
    targetMonday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
    
    return targetMonday.toISOString().slice(0, 10);
  }


  // Get total conversions (sum of all conversion events)
  async getTotalConversions(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getTotalConversions', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'conversions' }],
      dimensionFilter: this.buildDimensionFilter(filters)
    };

    const response = await this.runReport(request);
    const row = response.rows?.[0];
    const conversions = Number(row?.metricValues?.[0]?.value || 0);

    // Ensure non-negative values
    const safeConversions = Math.max(0, conversions);

    // Cache the result
    this.cache.set(cacheKey, safeConversions);
    return safeConversions;
  }

  // Get conversions timeseries per channel for trend sparklines
  async getConversionsByChannel(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getConversionsByChannel', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const request = {
      property: this.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'conversions' }],
      dimensionFilter: this.buildDimensionFilter(filters),
      orderBys: [
        { dimension: { dimensionName: 'sessionDefaultChannelGroup' } },
        { dimension: { dimensionName: 'date' } }
      ],
    };

    const response = await this.runReport(request);
    const rows = response.rows || [];

    // Group by channel and create timeseries
    const channelData: Record<string, Array<{ date: string; value: number }>> = {};
    
    rows.forEach((row: any) => {
      const date = row.dimensionValues?.[0]?.value;
      const channel = row.dimensionValues?.[1]?.value || 'Unknown';
      const conversions = Number(row.metricValues?.[0]?.value || 0);
      
      const formattedDate = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
      
      if (!channelData[channel]) {
        channelData[channel] = [];
      }
      
      // Ensure non-negative values and valid dates
      if (formattedDate.length === 10 && conversions >= 0) {
        channelData[channel].push({
          date: formattedDate,
          value: Math.max(0, conversions)
        });
      }
    });

    // Cache the result
    this.cache.set(cacheKey, channelData);
    return channelData;
  }

  // Get ad cost data (placeholder - requires Google Ads integration or manual input)
  async getAdCost(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getAdCost', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const request = {
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'advertiserAdCost' }],
        dimensionFilter: this.buildFilterExpression(filters),
      };

      const response = await this.runReport(request);
      const row = response.rows?.[0];
      
      if (!row || !row.metricValues?.[0]?.value) {
        console.log(`getAdCost: No data found for ${startDate} to ${endDate}`);
        return 0;
      }

      const adCost = Number(row.metricValues[0].value) || 0;
      console.log(`getAdCost: ${startDate} to ${endDate} = ${adCost} (from GA4 advertiserAdCost metric)`);

      // Cache the result
      this.cache.set(cacheKey, adCost);
      return adCost;
    } catch (error) {
      console.error('Error fetching advertiser ad cost:', error);
      return 0;
    }
  }

  // Get ad cost by channel for CPA calculations
  async getAdCostByChannel(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getAdCostByChannel', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // TODO: Implement real ad cost data by channel
    // For now, return estimated costs based on channel type
    const channels = await this.getChannelDistribution(startDate, endDate, filters);
    
    const channelCosts: Record<string, number> = {};
    channels.forEach((channel: any) => {
      // Placeholder cost estimates per channel
      const costPerSession = channel.key === 'Paid Search' ? 3.5 : 
                           channel.key === 'Paid Social' ? 2.0 :
                           channel.key === 'Display' ? 1.5 : 0;
      channelCosts[channel.key] = Math.max(0, channel.sessions * costPerSession);
    });

    // Cache the result
    this.cache.set(cacheKey, channelCosts);
    return channelCosts;
  }

  // Get Google Ads metrics - Cost per key event (conversions)
  async getCostPerKeyEvent(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getCostPerKeyEvent', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Get ad cost and key events (conversions) from GA4
      const [adCost, keyEvents] = await Promise.all([
        this.getAdCost(startDate, endDate, filters),
        this.getKeyEvents(startDate, endDate, filters)
      ]);

      const costPerKeyEvent = keyEvents > 0 ? adCost / keyEvents : 0;
      
      console.log(`getCostPerKeyEvent: ${startDate} to ${endDate} = ${costPerKeyEvent} (${adCost} / ${keyEvents})`);

      // Cache the result
      this.cache.set(cacheKey, costPerKeyEvent);
      return costPerKeyEvent;
    } catch (error) {
      console.error('Error calculating cost per key event:', error);
      return 0;
    }
  }

  // Get Google Ads metrics - Ads cost per click
  async getAdsCostPerClick(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getAdsCostPerClick', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Get ad cost and ad clicks from GA4
      const [adCost, adClicks] = await Promise.all([
        this.getAdCost(startDate, endDate, filters),
        this.getAdClicks(startDate, endDate, filters)
      ]);

      const adsCostPerClick = adClicks > 0 ? adCost / adClicks : 0;
      
      console.log(`getAdsCostPerClick: ${startDate} to ${endDate} = ${adsCostPerClick} (${adCost} / ${adClicks})`);

      // Cache the result
      this.cache.set(cacheKey, adsCostPerClick);
      return adsCostPerClick;
    } catch (error) {
      console.error('Error calculating ads cost per click:', error);
      return 0;
    }
  }

  // Get Google Ads metrics - ROAS (Return on Ad Spend)
  async getROAS(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getROAS', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Get ad cost and purchase revenue from GA4
      const [adCost, purchaseRevenue] = await Promise.all([
        this.getAdCost(startDate, endDate, filters),
        this.getPurchaseRevenue(startDate, endDate, filters)
      ]);

      const roas = adCost > 0 ? purchaseRevenue / adCost : 0;
      
      console.log(`getROAS: ${startDate} to ${endDate} = ${roas} (${purchaseRevenue} / ${adCost})`);

      // Cache the result
      this.cache.set(cacheKey, roas);
      return roas;
    } catch (error) {
      console.error('Error calculating ROAS:', error);
      return 0;
    }
  }

  // Get key events (conversions) count
  async getKeyEvents(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getKeyEvents', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const request = {
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'keyEvents' }],
        dimensionFilter: this.buildFilterExpression(filters),
      };

      const response = await this.runReport(request);
      const row = response.rows?.[0];
      
      if (!row || !row.metricValues?.[0]?.value) {
        console.log(`getKeyEvents: No data found for ${startDate} to ${endDate}`);
        return 0;
      }

      const keyEvents = Number(row.metricValues[0].value) || 0;
      console.log(`getKeyEvents: ${startDate} to ${endDate} = ${keyEvents}`);

      // Cache the result
      this.cache.set(cacheKey, keyEvents);
      return keyEvents;
    } catch (error) {
      console.error('Error fetching key events:', error);
      return 0;
    }
  }

  // Get ad clicks count
  async getAdClicks(startDate: string, endDate: string, filters?: any) {
    const cacheKey = this.cache.generateKey('getAdClicks', { startDate, endDate, filters });
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const request = {
        property: this.propertyId,
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'adClicks' }],
        dimensionFilter: this.buildFilterExpression(filters),
      };

      const response = await this.runReport(request);
      const row = response.rows?.[0];
      
      if (!row || !row.metricValues?.[0]?.value) {
        console.log(`getAdClicks: No data found for ${startDate} to ${endDate}`);
        return 0;
      }

      const adClicks = Number(row.metricValues[0].value) || 0;
      console.log(`getAdClicks: ${startDate} to ${endDate} = ${adClicks}`);

      // Cache the result
      this.cache.set(cacheKey, adClicks);
      return adClicks;
    } catch (error) {
      console.error('Error fetching ad clicks:', error);
      return 0;
    }
  }

  // Helper method to calculate number of days in date range
  private getDateRangeDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  }

  // Build filter expression with additional filters
  private buildFilterExpression(filters?: any, additionalFilters?: any[]) {
    const expressions: any[] = [];

    // Add existing dimension filters
    const dimensionFilter = this.buildDimensionFilter(filters);
    if (dimensionFilter) {
      if (dimensionFilter.andGroup?.expressions) {
        expressions.push(...dimensionFilter.andGroup.expressions);
      } else {
        expressions.push(dimensionFilter);
      }
    }

    // Add additional filters
    if (additionalFilters) {
      expressions.push(...additionalFilters);
    }

    if (expressions.length === 0) return undefined;
    if (expressions.length === 1) return expressions[0];

    return {
      andGroup: { expressions }
    };
  }

  // Build dimension filter from query parameters
  private buildDimensionFilter(filters?: any) {
    if (!filters) return undefined;

    const filterExpressions: any[] = [];

    // Host filter (always required per RULES.md)
    filterExpressions.push({
      filter: {
        fieldName: 'hostName',
        stringFilter: {
          matchType: 'EXACT',
          value: 'www.bevego.se'
        }
      }
    });

    // Channel filter
    if (filters.channel && filters.channel !== 'Alla') {
      filterExpressions.push({
        filter: {
          fieldName: 'sessionDefaultChannelGroup',
          stringFilter: {
            matchType: 'EXACT',
            value: filters.channel
          }
        }
      });
    }

    // Device filter
    if (filters.device && filters.device !== 'Alla') {
      filterExpressions.push({
        filter: {
          fieldName: 'deviceCategory',
          stringFilter: {
            matchType: 'EXACT',
            value: filters.device
          }
        }
      });
    }

    // Custom dimensions (role, unit) - if they exist
    if (filters.role && filters.role !== 'Alla') {
      filterExpressions.push({
        filter: {
          fieldName: 'customEvent:user_role',
          stringFilter: {
            matchType: 'EXACT',
            value: filters.role
          }
        }
      });
    }

    if (filters.unit && filters.unit !== 'Alla') {
      filterExpressions.push({
        filter: {
          fieldName: 'customEvent:platform_unit',
          stringFilter: {
            matchType: 'EXACT',
            value: filters.unit
          }
        }
      });
    }

    if (filterExpressions.length === 0) return undefined;
    if (filterExpressions.length === 1) return filterExpressions[0];

    return {
      andGroup: {
        expressions: filterExpressions
      }
    };
  }
}

// Singleton instance
let ga4Client: GA4Client | null = null;

export function getGA4Client(): GA4Client {
  if (typeof window !== 'undefined') {
    throw new Error('GA4Client can only be used on the server');
  }

  if (!ga4Client) {
    ga4Client = new GA4Client();
  }

  return ga4Client;
}