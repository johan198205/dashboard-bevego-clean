import { CruxService } from './crux.service';

export interface PageCwvData {
  url: string;
  lcp: {
    p75: number;
    status: 'Pass' | 'Needs Improvement' | 'Fail';
  };
  inp: {
    p75: number;
    status: 'Pass' | 'Needs Improvement' | 'Fail';
  };
  cls: {
    p75: number;
    status: 'Pass' | 'Needs Improvement' | 'Fail';
  };
  ttfb: {
    p75: number;
    status: 'Pass' | 'Needs Improvement' | 'Fail';
  };
  lastTested: string;
  source: string;
}

export class CruxPagesService {
  private cruxService: CruxService;

  constructor() {
    this.cruxService = new CruxService();
  }

  /**
   * Get Core Web Vitals data for multiple pages
   */
  async getPagesCwvData(
    urls: string[],
    formFactor?: 'PHONE' | 'DESKTOP' | 'TABLET'
  ): Promise<PageCwvData[]> {
    try {
      const results: PageCwvData[] = [];

      for (const url of urls) {
        try {
          const cwvData = await this.cruxService.getCoreWebVitals(url, formFactor);
          
          results.push({
            url: url,
            lcp: cwvData.lcp,
            inp: cwvData.inp,
            cls: cwvData.cls,
            ttfb: cwvData.ttfb,
            lastTested: new Date().toISOString().split('T')[0],
            source: 'CrUX API'
          });
        } catch (error) {
          // If page doesn't have CrUX data, generate realistic mock data based on page
          const mockData = this.generateMockCwvData(url);
          results.push(mockData);
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching pages CwV data:', error);
      return [];
    }
  }

  /**
   * Get Core Web Vitals data for a single page
   */
  async getPageCwvData(
    url: string,
    formFactor?: 'PHONE' | 'DESKTOP' | 'TABLET'
  ): Promise<PageCwvData | null> {
    try {
      const cwvData = await this.cruxService.getCoreWebVitals(url, formFactor);
      
      return {
        url: url,
        lcp: cwvData.lcp,
        inp: cwvData.inp,
        cls: cwvData.cls,
        ttfb: cwvData.ttfb,
        lastTested: new Date().toISOString().split('T')[0],
        source: 'CrUX API'
      };
    } catch (error) {
      console.error(`Error fetching CwV data for ${url}:`, error);
      return null;
    }
  }

  /**
   * Generate realistic mock CwV data based on page URL
   */
  private generateMockCwvData(url: string): PageCwvData {
    // Create a hash from URL to get consistent but varied data
    const hash = this.hashString(url);
    
    // Base values with variations based on page type
    const isHomePage = url.endsWith('/') || url.endsWith('/');
    const isComplexPage = url.includes('/dokument') || url.includes('/ekonomi') || url.includes('/underhall');
    const isSimplePage = url.includes('/kontakt') || url.includes('/hjalp');
    
    // LCP variations (ms)
    let lcpBase = isHomePage ? 2800 : isComplexPage ? 3500 : isSimplePage ? 2200 : 3000;
    lcpBase += (hash % 1000) - 500; // ±500ms variation
    const lcpP75 = Math.max(1000, Math.min(5000, lcpBase));
    
    // INP variations (ms)
    let inpBase = isComplexPage ? 180 : isSimplePage ? 120 : 150;
    inpBase += (hash % 100) - 50; // ±50ms variation
    const inpP75 = Math.max(50, Math.min(400, inpBase));
    
    // CLS variations
    let clsBase = isComplexPage ? 0.12 : isSimplePage ? 0.05 : 0.08;
    clsBase += ((hash % 20) - 10) / 100; // ±0.1 variation
    const clsP75 = Math.max(0.01, Math.min(0.3, clsBase));
    
    // TTFB variations (ms)
    let ttfbBase = isComplexPage ? 2800 : isSimplePage ? 1800 : 2200;
    ttfbBase += (hash % 800) - 400; // ±400ms variation
    const ttfbP75 = Math.max(500, Math.min(4000, ttfbBase));
    
    // Calculate statuses
    const lcpStatus = this.getCwvStatus(lcpP75, 2500);
    const inpStatus = this.getCwvStatus(inpP75, 200);
    const clsStatus = this.getCwvStatus(clsP75, 0.1);
    const ttfbStatus = this.getCwvStatus(ttfbP75, 800);
    
    return {
      url: url,
      lcp: { p75: Math.round(lcpP75), status: lcpStatus },
      inp: { p75: Math.round(inpP75), status: inpStatus },
      cls: { p75: Math.round(clsP75 * 100) / 100, status: clsStatus },
      ttfb: { p75: Math.round(ttfbP75), status: ttfbStatus },
      lastTested: new Date().toISOString().split('T')[0],
      source: 'Mock Data'
    };
  }

  /**
   * Simple hash function for consistent mock data
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get CWV status based on value and target
   */
  private getCwvStatus(value: number, target: number): 'Pass' | 'Needs Improvement' | 'Fail' {
    if (value <= target) return 'Pass';
    if (value <= target * 1.5) return 'Needs Improvement';
    return 'Fail';
  }
}
