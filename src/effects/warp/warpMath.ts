// Time-warp maths. x = loop phase (0..1), y = f(x) = read position in the loop (y=0 drawn at top).
// delay = ((x' - y') mod 1) * loopSeconds, clamped to maxSeconds (default 8).

export interface WarpPoint { x: number; y: number; bend?: number } // bend: -1..1 curve of the segment ENDING at this point

export const LUT_SIZE = 1024
export const MAX_DELAY_SECONDS = 8

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Sort by x (stable), clamp to 0..1, and make sure points exist at x=0 and x=1. */
export function normalizePoints(pts: WarpPoint[]): WarpPoint[] {
  const out = pts
    .map((p, i) => ({ p, i }))
    .map(({ p, i }) => ({ pt: { ...p, x: clamp01(Number.isFinite(p.x) ? p.x : 0), y: clamp01(Number.isFinite(p.y) ? p.y : 0) }, i }))
    .sort((a, b) => a.pt.x - b.pt.x || a.i - b.i)
    .map((e) => e.pt)
  if (out.length === 0) return [{ x: 0, y: 0 }, { x: 1, y: 1 }]
  if (out[0].x > 0) out.unshift({ x: 0, y: out[0].y })
  if (out[out.length - 1].x < 1) out.push({ x: 1, y: out[out.length - 1].y })
  return out
}

function curve(t: number, bend: number): number {
  if (!bend) return t
  return bend > 0 ? Math.pow(t, 1 + 3 * bend) : 1 - Math.pow(1 - t, 1 - 3 * bend)
}

/** y at x for a normalised line. At duplicate x the LATER point's y wins. */
export function sampleLine(pts: WarpPoint[], x: number): number {
  const n = pts.length
  if (n === 0) return x
  if (x >= pts[n - 1].x) return pts[n - 1].y
  if (x < pts[0].x) return pts[0].y
  // last index with pts[i].x <= x (binary search)
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (pts[mid].x <= x) lo = mid
    else hi = mid - 1
  }
  const a = pts[lo]
  const b = pts[lo + 1]
  const t = (x - a.x) / (b.x - a.x)
  return a.y + (b.y - a.y) * curve(t, b.bend ?? 0)
}

export function buildLut(pts: WarpPoint[]): Float32Array {
  const lut = new Float32Array(LUT_SIZE)
  for (let i = 0; i < LUT_SIZE; i++) lut[i] = sampleLine(pts, i / (LUT_SIZE - 1))
  return lut
}

/** x' = x^(2^(-1.5*skew)); endpoints fixed. */
export function skewPhase(x: number, skew: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  if (!skew) return x
  return Math.pow(x, Math.pow(2, -1.5 * skew))
}

function lutAt(lut: Float32Array, x: number): number {
  const f = clamp01(x) * (lut.length - 1)
  const i = Math.floor(f)
  if (i >= lut.length - 1) return lut[lut.length - 1]
  return lut[i] + (lut[i + 1] - lut[i]) * (f - i)
}

/** y' = x + amount * (lut(x) - x) */
export function warpedY(lut: Float32Array, x: number, amount: number): number {
  return x + amount * (lutAt(lut, x) - x)
}

const EPS = 1e-5

/** ((xs - y) mod 1) in [0,1). Values within EPS of a whole loop snap to 0 so the identity stays truly live. */
export function delayFraction(xs: number, y: number): number {
  let f = (xs - y) % 1
  if (f < 0) f += 1
  if (f < EPS || f > 1 - EPS) return 0
  return f
}

export function delaySeconds(opts: { phase: number; lut: Float32Array; amount: number; skew: number; loopSeconds: number; maxSeconds?: number }): number {
  const xs = skewPhase(opts.phase, opts.skew)
  const y = warpedY(opts.lut, xs, opts.amount)
  const d = delayFraction(xs, y) * opts.loopSeconds
  return Math.min(d, opts.maxSeconds ?? MAX_DELAY_SECONDS)
}

export function loopSeconds(lengthBeats: number, bpm: number): number {
  return (lengthBeats * 60) / bpm
}

// ---------------------------------------------------------------- presets

/** Straight run from (x0,y0) to (x1,y1) split into n equal pieces (collinear handles). Excludes the start point. */
function run(x0: number, y0: number, x1: number, y1: number, n: number): WarpPoint[] {
  const out: WarpPoint[] = []
  for (let i = 1; i <= n; i++) out.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n })
  return out
}

function stutterBuild(): WarpPoint[] {
  // Repeat the opening slice; each repeat is shorter than the last.
  const edges = [0.25, 0.5, 0.625, 0.75, 0.8125, 0.875, 0.9375, 1]
  const pts: WarpPoint[] = [{ x: 0, y: 0 }]
  let prev = 0
  edges.forEach((e, i) => {
    pts.push({ x: e, y: e - prev })
    if (i < edges.length - 1) pts.push({ x: e, y: 0 })
    prev = e
  })
  return pts
}

function freezeHits(): WarpPoint[] {
  // On each beat hold for 1/16 of the loop, then jump back onto the diagonal.
  const pts: WarpPoint[] = []
  for (const q of [0, 0.25, 0.5, 0.75]) {
    pts.push({ x: q, y: q }, { x: q + 0.0625, y: q }, { x: q + 0.0625, y: q + 0.0625 })
  }
  pts.push({ x: 1, y: 1 })
  return pts
}

export const PRESETS: Record<string, WarpPoint[]> = {
  Straight: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  'Stutter build': stutterBuild(),
  // Half speed with a jump back to live at the half.
  'Half time': [{ x: 0, y: 0 }, ...run(0, 0, 0.5, 0.25, 4), { x: 0.5, y: 0.5 }, ...run(0.5, 0.5, 1, 0.75, 4)],
  'Freeze hits': freezeHits(),
  Reverse: [{ x: 0, y: 1 }, ...run(0, 1, 1, 0, 8)],
  // Diagonal, then a curve that decays to a flat. bend -1/3 gives start slope 1, end slope 0.
  'Tape stop': [{ x: 0, y: 0 }, ...run(0, 0, 0.4, 0.4, 8), { x: 1, y: 0.7, bend: -1 / 3 }],
  Scratch: [
    { x: 0, y: 0 }, { x: 0.125, y: 0.1 }, { x: 0.2, y: 0.02 }, { x: 0.3, y: 0.25 }, { x: 0.375, y: 0.15 },
    { x: 0.5, y: 0.45 }, { x: 0.58, y: 0.3 }, { x: 0.7, y: 0.62 }, { x: 0.78, y: 0.5 }, { x: 0.9, y: 0.85 }, { x: 1, y: 1 },
  ],
  // Quarters play in the order 1, 3, 2, 4.
  Rearranger: [
    { x: 0, y: 0 }, { x: 0.25, y: 0.25 }, { x: 0.25, y: 0.5 }, { x: 0.5, y: 0.75 },
    { x: 0.5, y: 0.25 }, { x: 0.75, y: 0.5 }, { x: 0.75, y: 0.75 }, { x: 1, y: 1 },
  ],
}

/**
 * Random line on the snap grid: 3 to 6 segments, each a hold, slope or (exactly one) curve,
 * with optional vertical jumps between them. Deterministic when `rand` is seeded.
 */
export function randomLine(snap: number, rand: () => number = Math.random): WarpPoint[] {
  const n = Math.max(2, Math.round(1 / snap))
  const gy = () => Math.floor(rand() * (n + 1)) / n
  const gx = (i: number) => i / n
  const segs = Math.min(n, 3 + Math.floor(rand() * 4))
  // choose segs-1 distinct interior cut indices
  const cuts = new Set<number>()
  while (cuts.size < segs - 1) cuts.add(1 + Math.floor(rand() * (n - 1)))
  const edges = [0, ...[...cuts].sort((a, b) => a - b), n]
  const curveSeg = Math.floor(rand() * segs)
  const pts: WarpPoint[] = []
  let y = gy()
  pts.push({ x: 0, y })
  for (let s = 0; s < segs; s++) {
    const xa = gx(edges[s])
    const xb = gx(edges[s + 1])
    if (s > 0 && rand() < 0.5) {
      const ny = gy()
      if (ny !== y) { pts.push({ x: xa, y: ny }); y = ny }
    }
    let ey = y
    const isCurve = s === curveSeg
    if (isCurve || rand() < 0.6) {
      ey = gy()
      if (ey === y) ey = y >= 0.5 ? y - 1 / n : y + 1 / n
    }
    const pt: WarpPoint = { x: xb, y: ey }
    if (isCurve) {
      const mag = 0.3 + rand() * 0.7
      pt.bend = rand() < 0.5 ? mag : -mag
    }
    pts.push(pt)
    y = ey
  }
  return pts
}
