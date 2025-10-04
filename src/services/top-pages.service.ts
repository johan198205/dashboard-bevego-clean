import { GA4Service, TopPage } from './ga4.service';
import { CruxPagesService, PageCwvData } from './crux-pages.service';

export interface TopPageWithCwv extends TopPage {
  cwvData: PageCwvData;
}

export class TopPagesService {
  private ga4Service: GA4Service;
  private cruxPagesService: CruxPagesService;

  constructor() {
    this.ga4Service = new GA4Service();
    this.cruxPagesService = new CruxPagesService();
  }

  /**
   * Get top pages with Core Web Vitals data
   */
  async getTopPagesWithCwv(
    limit: number = 10,
    formFactor?: 'PHONE' | 'DESKTOP' | 'TABLET',
    startDate?: string,
    endDate?: string
  ): Promise<TopPageWithCwv[]> {
    try {
      // Get top pages from GA4
      const topPages = await this.ga4Service.getTopPages(limit, startDate, endDate);
      
      // Convert page paths to full URLs
      const urls = topPages.map(page => `https://www.bevego.se${page.pagePath}`);
      
      // Get Core Web Vitals data for these pages
      const cwvData = await this.cruxPagesService.getPagesCwvData(urls, formFactor);
      
      // Combine the data
      const result: TopPageWithCwv[] = topPages.map((page, index) => ({
        ...page,
        cwvData: cwvData[index] || {
          url: urls[index],
          lcp: { p75: 0, status: 'Fail' },
          inp: { p75: 0, status: 'Fail' },
          cls: { p75: 0, status: 'Fail' },
          ttfb: { p75: 0, status: 'Fail' },
          lastTested: 'N/A',
          source: 'No data'
        }
      }));

      return result;
    } catch (error) {
      console.error('Error fetching top pages with CwV data:', error);
      return [];
    }
  }
}
