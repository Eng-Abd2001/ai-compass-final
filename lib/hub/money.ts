/** Splits an amount in whole cents by weights; the leftover cents go to the largest remainders, so the sum is exact. */
export function splitCents(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((s, x) => s + x, 0);
  if (!weights.length || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((x) => (totalCents * x) / sum);
  const out = raw.map(Math.floor);
  let left = totalCents - out.reduce((s, x) => s + x, 0);
  raw.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f || a.i - b.i).forEach(({ i }) => { if (left > 0) { out[i]++; left--; } });
  return out;
}
export function splitBill(total: number, tipPct: number, weights: number[]): { grand: number; tip: number; shares: number[] } {
  const base = Math.round(Math.max(0, total) * 100), tip = Math.round((base * Math.max(0, tipPct)) / 100);
  return { grand: (base + tip) / 100, tip: tip / 100, shares: splitCents(base + tip, weights).map((c) => c / 100) };
}
export const RULES: Record<string, [number, number, number]> = { "50/30/20": [50, 30, 20], "60/20/20": [60, 20, 20], "70/20/10": [70, 20, 10], "40/30/30": [40, 30, 30] };
export function allocate(income: number, pcts: number[]): number[] {
  return splitCents(Math.round(Math.max(0, income) * 100), pcts).map((c) => c / 100);
}
