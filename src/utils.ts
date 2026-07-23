const PERCENT_MULTIPLIER = 100;

export function formatPercent(value: number) {
  return `${Math.round(value * PERCENT_MULTIPLIER)}%`;
}

export function formatSignedPercent(value: number) {
  const percent = Math.round(value * PERCENT_MULTIPLIER);
  if (percent === 0) return "0%";
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}
