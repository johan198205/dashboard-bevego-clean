import { CwvTrendPoint, CwvSummary } from '@/lib/types';

export class CruxHistoryService {
  private apiKey: string;
  private baseUrl = 'https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord';

  constructor() {
    const apiKey = process.env.CRUX_API_KEY;
    if (!apiKey) {
      throw new Error('CRUX_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Get historical trends data from CrUX History API
   */
  async getTrends(
    origin: string = 'https://www.bevego.se',
    formFactor?: 'PHONE' | 'DESKTOP' | 'TABLET',
    weeks: number = 40,
    startDate?: string,
    endDate?: string
  ): Promise<CwvTrendPoint[]> {
    try {
      const historyData = await this.fetchHistoryData(origin, formFactor, weeks);
      
      if (!historyData?.record?.collectionPeriods || !historyData?.record?.metrics) {
        return [];
      }

      const periods = historyData.record.collectionPeriods;
      const metrics = historyData.record.metrics;
      
      // Get the length of the first available timeseries to determine data points
      const dataLength = metrics.largest_contentful_paint?.percentilesTimeseries?.p75s?.length || 0;
      
      if (dataLength === 0) {
        return [];
      }

      const allTrends = Array.from({ length: dataLength }, (_, index) => {
        const period = periods[index];
        return {
          date: `${period.firstDate.year}-${String(period.firstDate.month).padStart(2, '0')}-${String(period.firstDate.day).padStart(2, '0')}`,
          lcp: metrics.largest_contentful_paint?.percentilesTimeseries?.p75s?.[index] ? 
            Math.round(metrics.largest_contentful_paint.percentilesTimeseries.p75s[index]) : 0,
          inp: metrics.interaction_to_next_paint?.percentilesTimeseries?.p75s?.[index] ? 
            Math.round(metrics.interaction_to_next_paint.percentilesTimeseries.p75s[index]) : 0,
          cls: metrics.cumulative_layout_shift?.percentilesTimeseries?.p75s?.[index] ? 
            metrics.cumulative_layout_shift.percentilesTimeseries.p75s[index] : 0
        };
      });

      // Filter by date range if provided
      if (startDate && endDate) {
        return allTrends.filter(trend => {
          const trendDate = new Date(trend.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return trendDate >= start && trendDate <= end;
        });
      }

      return allTrends;
    } catch (error) {
      console.error('Error fetching CrUX history data:', error);
      return [];
    }
  }

  /**
   * Fetch historical data from CrUX History API
   */
  private async fetchHistoryData(
    origin: string, 
    formFactor?: 'PHONE' | 'DESKTOP' | 'TABLET',
    weeks: number = 12
  ): Promise<any> {
    const url = `${this.baseUrl}?key=${this.apiKey}`;
    
    const requestBody: any = {
      origin,
      collectionPeriodCount: Math.min(weeks, 40), // Max 40 weeks
      metrics: [
        'largest_contentful_paint',
        'interaction_to_next_paint',
        'cumulative_layout_shift'
      ]
    };
    
    if (formFactor) {
      requestBody.formFactor = formFactor;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('No historical data available');
      }
      throw new Error(`CrUX History API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get summary data for a specific period from historical data
   */
  async getSummaryForPeriod(
    origin: string = 'https://www.bevego.se',
    formFactor?: 'PHONE' | 'DESKTOP' | 'TABLET',
    startDate?: string,
    endDate?: string
  ): Promise<CwvSummary | null> {
    try {
      // Use the same approach as getTrends but return summary data
      const trends = await this.getTrends(origin, formFactor, 40, startDate, endDate);
      
      if (trends.length === 0) {
        return null;
      }

      // Get the first (most relevant) trend point
      const trendPoint = trends[0];
      
      // Convert trend point to summary format
      return this.convertTrendToSummary(trendPoint, startDate || 'latest');
    } catch (error) {
      console.error('Error fetching CrUX history summary:', error);
      return null;
    }
  }

  /**
   * Convert a trend point to summary format
   */
  private convertTrendToSummary(trendPoint: CwvTrendPoint, date: string): CwvSummary {
    // Calculate status based on thresholds
    const lcpStatus = trendPoint.lcp <= 2500 ? 'Pass' : trendPoint.lcp <= 4000 ? 'Needs Improvement' : 'Fail';
    const inpStatus = trendPoint.inp <= 200 ? 'Pass' : trendPoint.inp <= 500 ? 'Needs Improvement' : 'Fail';
    const clsStatus = trendPoint.cls <= 0.1 ? 'Pass' : trendPoint.cls <= 0.25 ? 'Needs Improvement' : 'Fail';
    
    // Calculate total status percentage
    let passCount = 0;
    if (lcpStatus === 'Pass') passCount++;
    if (inpStatus === 'Pass') passCount++;
    if (clsStatus === 'Pass') passCount++;
    const totalStatusPercentage = Math.round((passCount / 3) * 100 * 10) / 10;

    return {
      lcp: {
        p75: trendPoint.lcp,
        status: lcpStatus,
        target: 2500
      },
      inp: {
        p75: trendPoint.inp,
        status: inpStatus,
        target: 200
      },
      cls: {
        p75: trendPoint.cls,
        status: clsStatus,
        target: 0.1
      },
      ttfb: {
        p75: 0, // TTFB not available in history API
        status: 'Pass',
        target: 800
      },
      passedPages: {
        percentage: 0, // Not available in history API
        count: 0
      },
      totalStatus: {
        percentage: totalStatusPercentage
      },
      period: `Historisk data för ${date}`,
      source: 'CrUX API'
    };
  }


}
