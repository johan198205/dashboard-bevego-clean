const SV = 'sv-SE';

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(SV).format(Math.round(value));
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dt = typeof date === 'string' ? new Date(date) : date;
  const fmtr = new Intl.DateTimeFormat(SV, {
    timeZone: process.env.TZ || 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  });
  return fmtr.format(dt);
}


