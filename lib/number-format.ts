/**
 * Shared number formatter — every component that displays a coin/nugget count
 * must use this. A 5-year-old can't read `1247893`; abbreviate from the start.
 */
export function formatNumber(n: number): string {
  const value = Math.floor(n);
  const abs = Math.abs(value);
  if (abs < 1000) return value.toString();
  if (abs < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  if (abs < 1_000_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
}
