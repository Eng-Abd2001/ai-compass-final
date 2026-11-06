export type Crit = { name: string; weight: number; benefit: boolean };
export type Opt = { name: string; scores: number[] };
export type Verdict = { totals: number[]; best: number; margin: number; tie: boolean; contrib: number[][] };

/** Weighted-sum model: scores are 1-10; a "lower is better" criterion (cost, time) is flipped to 11 - score. Totals are 0-100. */
export function decide(opts: Opt[], crits: Crit[]): Verdict {
  const wsum = crits.reduce((s, c) => s + c.weight, 0) || 1;
  const contrib = opts.map((o) => crits.map((c, i) => {
    const s = Math.min(10, Math.max(1, o.scores[i] ?? 5));
    return ((c.benefit ? s : 11 - s) * c.weight * 10) / wsum;
  }));
  const totals = contrib.map((r) => +r.reduce((s, x) => s + x, 0).toFixed(1));
  const sorted = [...totals].sort((a, b) => b - a);
  const best = totals.indexOf(sorted[0]);
  return { totals, best, margin: +(sorted[0] - (sorted[1] ?? 0)).toFixed(1), tie: sorted.length > 1 && sorted[0] === sorted[1], contrib };
}
