// Period type for quarterly data
export type Period = `${number}Q${1|2|3|4}`;

/**
 * Get previous quarter period
 */
export function prevQuarter(period: Period): Period | null {
  const [year, quarter] = period.split('Q').map(Number);
  
  if (quarter === 1) {
    return `${year - 1}Q4`;
  } else {
    return `${year}Q${quarter - 1}` as Period;
  }
}

/**
 * Get same quarter from previous year (YoY)
 */
export function yoyQuarter(period: Period): Period {
  const [year, quarter] = period.split('Q').map(Number);
  return `${year - 1}Q${quarter}` as Period;
}

/**
 * Calculate rolling 4-quarter average for a series
 * Requires at least 2 quarters of data for rolling average
 */
export function rolling4(series: {period: string, value: number | null}[]): {period: string, value: number | null, r4: number | null}[] {
  const result: {period: string, value: number | null, r4: number | null}[] = [];
  
  for (const point of series) {
    const periods = [point.period];
    
    // Get the 3 previous quarters
    let currentPeriod = point.period as Period;
    for (let i = 0; i < 3; i++) {
      const prev = prevQuarter(currentPeriod);
      if (!prev) break;
      periods.unshift(prev);
      currentPeriod = prev;
    }
    
    // Get values for these periods
    const values = periods
      .map(period => series.find(s => s.period === period)?.value)
      .filter((value): value is number => value !== null && value !== undefined && isFinite(value));
    
    // Require at least 2 quarters of valid data for rolling average
    const r4 = values.length >= 2 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    result.push({ 
      period: point.period, 
      value: point.value,
      r4: r4 !== null && isFinite(r4) ? r4 : null 
    });
  }
  
  return result;
}

/**
 * Parse and normalize period string to YYYYQn format
 */
export function normalizePeriod(s: string): Period | null {
  if (!s || typeof s !== 'string') return null;
  
  // Handle special cases for breakdown files
  if (s.includes('Bas: Samtliga') || s.includes('Bas:') || s.includes('Samtliga')) {
    // For breakdown files, we need to extract period from the file context
    // This will be handled by the parser - return a default period for now
    return null; // Let the parser handle this
  }
  
  // First, try to extract Q4 2024 pattern from complex strings
  const complexMatch = s.match(/Q([1-4])\s*(\d{4})/i);
  if (complexMatch) {
    const quarter = complexMatch[1];
    const year = complexMatch[2];
    return `${year}Q${quarter}` as Period;
  }
  
  // Try to extract 2024 Q4 pattern
  const reverseMatch = s.match(/(\d{4})\s*Q([1-4])/i);
  if (reverseMatch) {
    const year = reverseMatch[1];
    const quarter = reverseMatch[2];
    return `${year}Q${quarter}` as Period;
  }
  
  // Remove any non-alphanumeric characters except Q and K
  const cleaned = s.replace(/[^0-9QK]/g, '');
  
  // Try various patterns - ADDED SUPPORT FOR 4Q2024 FORMAT
  const patterns = [
    /^(\d{4})Q([1-4])$/,                    // 2024Q1
    /^(\d{4})K([1-4])$/,                    // 2024K1 (Swedish)
    /^Q([1-4])(\d{4})$/,                    // Q12024
    /^K([1-4])(\d{4})$/,                    // K12024 (Swedish)
    /^([1-4])Q(\d{4})$/,                    // 4Q2024 (FIXED: This was missing!)
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let year: string, quarter: string;
      
      if (pattern.source.includes('K')) {
        // Swedish format
        if (match[1] && match[2]) {
          year = match[1];
          quarter = match[2];
        } else if (match[2] && match[1]) {
          year = match[2];
          quarter = match[1];
        } else {
          continue;
        }
      } else {
        // English format
        if (match[1] && match[2]) {
          // Check if first group is year (4 digits) or quarter (1 digit)
          if (match[1].length === 4) {
            year = match[1];
            quarter = match[2];
          } else {
            year = match[2];
            quarter = match[1];
          }
        } else {
          continue;
        }
      }
      
      return `${year}Q${quarter}` as Period;
    }
  }
  
  return null;
}

/**
 * Sort periods chronologically
 */
export function sortPeriods(periods: Period[]): Period[] {
  return periods.sort((a, b) => {
    const [yearA, quarterA] = a.split('Q').map(Number);
    const [yearB, quarterB] = b.split('Q').map(Number);
    
    if (yearA !== yearB) return yearA - yearB;
    return quarterA - quarterB;
  });
}

/**
 * Get all periods between start and end (inclusive)
 */
export function getPeriodRange(start: Period, end: Period): Period[] {
  const periods: Period[] = [];
  let current: Period | null = start;
  
  while (current && current <= end) {
    periods.push(current);
    current = prevQuarter(current);
    if (!current) break;
  }
  
  return sortPeriods(periods);
}

/**
 * Check if a period is valid
 */
export function isValidPeriod(period: string): period is Period {
  return normalizePeriod(period) !== null;
}

/**
 * Get quarter number from period
 */
export function getQuarter(period: Period): number {
  return parseInt(period.split('Q')[1]);
}

/**
 * Get year from period
 */
export function getYear(period: Period): number {
  return parseInt(period.split('Q')[0]);
}

/**
 * Format period for display
 */
export function formatPeriod(period: Period): string {
  const [year, quarter] = period.split('Q');
  return `${year} Q${quarter}`;
}
