import { CwvSummary, CwvTrendPoint, CwvUrlGroupRow, CwvStatus } from '../types';

function getCwvStatus(value: number, target: number): CwvStatus {
  if (value <= target) return 'Pass';
  if (value <= target * 1.5) return 'Needs Improvement';
  return 'Fail';
}

export async function getCwvSummary(
  startDate: string,
  endDate: string,
  device: string[] = []
): Promise<CwvSummary> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Mock data based on device filter
  const isMobile = device.includes('Mobil') || device.length === 0;
  const isDesktop = device.includes('Desktop');
  
  // Different mock values for mobile vs desktop
  const lcpP75 = isMobile ? 2100 : 1800;
  const inpP75 = isMobile ? 150 : 120;
  const clsP75 = isMobile ? 0.08 : 0.05;
  
  // If both mobile and desktop are selected, use average values
  const finalLcp = (isMobile && isDesktop) ? 1950 : lcpP75;
  const finalInp = (isMobile && isDesktop) ? 135 : inpP75;
  const finalCls = (isMobile && isDesktop) ? 0.065 : clsP75;

  return {
    lcp: {
      p75: finalLcp,
      status: getCwvStatus(finalLcp, 2500),
      target: 2500
    },
    inp: {
      p75: finalInp,
      status: getCwvStatus(finalInp, 200),
      target: 200
    },
    cls: {
      p75: finalCls,
      status: getCwvStatus(finalCls, 0.1),
      target: 0.1
    },
    ttfb: {
      p75: 400, // Mock TTFB value
      status: getCwvStatus(400, 800),
      target: 800
    },
    passedPages: {
      count: isMobile ? 1247 : 1892,
      percentage: isMobile ? 78.2 : 89.4
    },
    totalStatus: {
      percentage: isMobile ? 65.3 : 82.1
    },
    source: 'Mock'
  };
}

export async function getCwvTrends(
  startDate: string,
  endDate: string,
  device: string[] = []
): Promise<CwvTrendPoint[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const isMobile = device.includes('Mobil') || device.length === 0;
  const isDesktop = device.includes('Desktop');
  
  // Generate trend data for the date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  const trends: CwvTrendPoint[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    
    // Add some realistic variation to the data
    const dayVariation = Math.sin(i * 0.1) * 0.1 + Math.random() * 0.2;
    const baseLcp = isMobile ? 2100 : 1800;
    const baseInp = isMobile ? 150 : 120;
    const baseCls = isMobile ? 0.08 : 0.05;
    
    trends.push({
      date: date.toISOString().slice(0, 10),
      lcp: Math.round(baseLcp * (1 + dayVariation)),
      inp: Math.round(baseInp * (1 + dayVariation)),
      cls: Math.round(baseCls * (1 + dayVariation) * 1000) / 1000
    });
  }
  
  return trends;
}

export async function getCwvTable(
  startDate: string,
  endDate: string,
  device: string[] = []
): Promise<CwvUrlGroupRow[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400));

  const isMobile = device.includes('Mobil') || device.length === 0;
  const isDesktop = device.includes('Desktop');
  
  // Mock URL data
  const urls = [
    'https://riksbyggen.se/',
    'https://riksbyggen.se/bostader',
    'https://riksbyggen.se/om-oss',
    'https://riksbyggen.se/kontakt',
    'https://riksbyggen.se/medlemskap',
    'https://riksbyggen.se/nyheter',
    'https://riksbyggen.se/bostader/stockholm',
    'https://riksbyggen.se/bostader/goteborg',
    'https://riksbyggen.se/bostader/malmo',
    'https://riksbyggen.se/bostader/uppsala'
  ];

  return urls.map((url, index) => {
    // Generate varied performance data
    const variation = (index % 3) * 0.2 + Math.random() * 0.3;
    const baseLcp = isMobile ? 2100 : 1800;
    const baseInp = isMobile ? 150 : 120;
    const baseCls = isMobile ? 0.08 : 0.05;
    
    const lcpP75 = Math.round(baseLcp * (1 + variation));
    const inpP75 = Math.round(baseInp * (1 + variation));
    const clsP75 = Math.round(baseCls * (1 + variation) * 1000) / 1000;
    
    const lcpStatus = getCwvStatus(lcpP75, 2500);
    const inpStatus = getCwvStatus(inpP75, 200);
    const clsStatus = getCwvStatus(clsP75, 0.1);
    
    // Overall status is worst of the three
    const overallStatus: CwvStatus = 
      lcpStatus === 'Fail' || inpStatus === 'Fail' || clsStatus === 'Fail' ? 'Fail' :
      lcpStatus === 'Needs Improvement' || inpStatus === 'Needs Improvement' || clsStatus === 'Needs Improvement' ? 'Needs Improvement' :
      'Pass';

    return {
      url,
      lcp: { p75: lcpP75, status: lcpStatus },
      inp: { p75: inpP75, status: inpStatus },
      cls: { p75: clsP75, status: clsStatus },
      overallStatus,
      sessions: Math.floor(Math.random() * 5000) + 1000,
      lastTested: new Date().toISOString().slice(0, 10),
      source: 'Mock'
    };
  });
}
