export interface TopPage {
  pagePath: string;
  sessions: number;
  pageViews: number;
  bounceRate: number;
}

export class GA4Service {
  private propertyId: string;

  constructor() {
    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!propertyId) {
      throw new Error('GA4_PROPERTY_ID environment variable is required');
    }
    this.propertyId = propertyId;
  }

  /**
   * Get top pages by sessions from GA4
   */
  async getTopPages(
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<TopPage[]> {
    try {
      // For now, return mock data since we don't have GA4 API key configured
      // In production, this would call the GA4 Reporting API
      return this.getMockTopPages(limit);
    } catch (error) {
      console.error('Error fetching top pages from GA4:', error);
      return [];
    }
  }

  /**
   * Mock data for top pages - replace with real GA4 API call
   */
  private getMockTopPages(limit: number): TopPage[] {
    const mockPages: TopPage[] = [
      {
        pagePath: '/',
        sessions: 15420,
        pageViews: 18950,
        bounceRate: 0.42
      },
      {
        pagePath: '/mina-sidor',
        sessions: 12350,
        pageViews: 15680,
        bounceRate: 0.38
      },
      {
        pagePath: '/mina-sidor/uppgifter',
        sessions: 9870,
        pageViews: 12450,
        bounceRate: 0.35
      },
      {
        pagePath: '/mina-sidor/meddelanden',
        sessions: 8760,
        pageViews: 11200,
        bounceRate: 0.41
      },
      {
        pagePath: '/mina-sidor/dokument',
        sessions: 7650,
        pageViews: 9800,
        bounceRate: 0.39
      },
      {
        pagePath: '/mina-sidor/ekonomi',
        sessions: 6540,
        pageViews: 8200,
        bounceRate: 0.44
      },
      {
        pagePath: '/mina-sidor/boende',
        sessions: 5430,
        pageViews: 6800,
        bounceRate: 0.37
      },
      {
        pagePath: '/mina-sidor/underhall',
        sessions: 4320,
        pageViews: 5400,
        bounceRate: 0.43
      },
      {
        pagePath: '/mina-sidor/avtal',
        sessions: 3210,
        pageViews: 4100,
        bounceRate: 0.40
      },
      {
        pagePath: '/mina-sidor/kontakt',
        sessions: 2100,
        pageViews: 2800,
        bounceRate: 0.45
      },
      {
        pagePath: '/mina-sidor/installningar',
        sessions: 1890,
        pageViews: 2400,
        bounceRate: 0.42
      },
      {
        pagePath: '/mina-sidor/hjalp',
        sessions: 1680,
        pageViews: 2100,
        bounceRate: 0.48
      },
      {
        pagePath: '/mina-sidor/om-oss',
        sessions: 1470,
        pageViews: 1800,
        bounceRate: 0.46
      },
      {
        pagePath: '/mina-sidor/vanliga-fragor',
        sessions: 1260,
        pageViews: 1600,
        bounceRate: 0.44
      },
      {
        pagePath: '/mina-sidor/villkor',
        sessions: 1050,
        pageViews: 1300,
        bounceRate: 0.50
      }
    ];

    return mockPages.slice(0, limit);
  }
}
