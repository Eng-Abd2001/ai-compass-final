export type DiffRow = { kind: "same" | "mod" | "add" | "del"; l?: string; r?: string; li?: number; ri?: number };
export type DiffResult = { rows: DiffRow[]; added: number; removed: number; same: number; changed: number };

/** Line-by-line comparison (longest common subsequence). Returns null when the inputs are too large. */
export function lineDiff(a: string, b: string, o: { ignoreCase?: boolean; ignoreSpace?: boolean } = {}): DiffResult | null {
  const A = a.replace(/\r\n?/g, "\n").split("\n"), B = b.replace(/\r\n?/g, "\n").split("\n");
  const key = (s: string) => { let k = s; if (o.ignoreSpace) k = k.replace(/\s+/g, " ").trim(); if (o.ignoreCase) k = k.toLowerCase(); return k; };
  const ka = A.map(key), kb = B.map(key), n = A.length, m = B.length;
  if (n * m > 9_000_000) return null;
  const w = m + 1, t = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i * w + j] = ka[i] === kb[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
  const ops: { k: "s" | "d" | "a"; i: number; j: number }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (ka[i] === kb[j]) { ops.push({ k: "s", i, j }); i++; j++; }
    else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) ops.push({ k: "d", i: i++, j });
    else ops.push({ k: "a", i, j: j++ });
  }
  while (i < n) ops.push({ k: "d", i: i++, j });
  while (j < m) ops.push({ k: "a", i, j: j++ });
  const rows: DiffRow[] = [];
  let added = 0, removed = 0, same = 0, changed = 0;
  for (let p = 0; p < ops.length;) {
    if (ops[p].k === "s") { rows.push({ kind: "same", l: A[ops[p].i], r: B[ops[p].j], li: ops[p].i + 1, ri: ops[p].j + 1 }); same++; p++; continue; }
    const dels: number[] = [], adds: number[] = [];
    while (p < ops.length && ops[p].k !== "s") { if (ops[p].k === "d") dels.push(ops[p].i); else adds.push(ops[p].j); p++; }
    const pairs = Math.min(dels.length, adds.length);
    for (let q = 0; q < pairs; q++) { rows.push({ kind: "mod", l: A[dels[q]], r: B[adds[q]], li: dels[q] + 1, ri: adds[q] + 1 }); changed++; }
    for (let q = pairs; q < dels.length; q++) { rows.push({ kind: "del", l: A[dels[q]], li: dels[q] + 1 }); removed++; }
    for (let q = pairs; q < adds.length; q++) { rows.push({ kind: "add", r: B[adds[q]], ri: adds[q] + 1 }); added++; }
  }
  return { rows, added, removed, same, changed };
}
