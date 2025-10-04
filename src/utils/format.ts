// Swedish locale formatting utilities for GA4 overview

const SV = 'sv-SE';

/**
 * Format number with thin space thousands separator
 * Example: 2492992 → "2 492 992"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(SV).format(Math.round(value));
}

/**
 * Format percentage with 1 decimal place
 * Example: 73.456 → "73,5%"
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat(SV, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
}

/**
 * Format percentage delta with sign
 * Example: 3.64 → "+3,6%", -2.1 → "-2,1%"
 */
export function formatPercentDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Format time duration from seconds to mm:ss
 * Example: 180 → "3:00", 65 → "1:05"
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Format date for display
 * Example: "2024-01-15" → "15 jan 2024"
 */
export function formatDate(date: string | Date): string {
  const dt = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(SV, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(dt);
}

/**
 * Format date for tooltip
 * Example: "2024-01-15" → "måndag 15 januari 2024"
 */
export function formatDateTooltip(date: string | Date): string {
  const dt = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(SV, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dt);
}

/**
 * Format weekday name
 * Example: 1 → "måndag", 0 → "söndag"
 */
export function formatWeekday(weekday: number): string {
  const weekdays = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  return weekdays[weekday] || 'okänd';
}

/**
 * Format hour for display
 * Example: 9 → "09:00", 14 → "14:00"
 */
export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Truncate text with ellipsis
 * Example: "Very long page title that should be shortened" → "Very long page title..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format page path for display (remove query params, truncate)
 * Example: "/very/long/path/with/query?param=value" → "/very/long/path..."
 */
export function formatPagePath(path: string, maxLength: number = 30): string {
  // Remove query parameters
  const cleanPath = path.split('?')[0];
  
  if (cleanPath.length <= maxLength) return cleanPath;
  return truncateText(cleanPath, maxLength);
}

/**
 * Get color for delta values (green for positive, red for negative)
 */
export function getDeltaColor(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
}

/**
 * Get background color for delta badges
 */
export function getDeltaBgColor(value: number): string {
  if (value > 0) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (value < 0) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}
