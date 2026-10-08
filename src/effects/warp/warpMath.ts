// Time-warp maths (v2, HyperWarp's meaning). x = loop phase (0..1), y = f(x) = how far back to read, as a
// fraction of the loop: y = 0 (drawn at the top) is live, y = 1 (bottom) is one loop ago.
// x' = skewPhase(x), y' = amount * f(x'), delay = y' * loopSeconds, clamped to maxSeconds (default 8). No modulo.
// Playback speed is 1 - dy'/dx: flat = normal (delayed), along y = x = stopped, steeper = reverse, rising = faster.

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

/** y' = amount * f(x): how far back, as a fraction of the loop (0 = live). */
export function warpedY(lut: Float32Array, x: number, amount: number): number {
  return amount * lutAt(lut, x)
}

export function delaySeconds(opts: { phase: number; lut: Float32Array; amount: number; skew: number; loopSeconds: number; maxSeconds?: number }): number {
  const y = warpedY(opts.lut, skewPhase(opts.phase, opts.skew), opts.amount)
  return Math.min(y * opts.loopSeconds, opts.maxSeconds ?? MAX_DELAY_SECONDS)
}

/** The line as a modulation value (0 = top, 1 = bottom): y' at the skewed phase. */
export function warpModValue(lut: Float32Array, phase: number, amount: number, skew: number): number {
  return clamp01(warpedY(lut, skewPhase(phase, skew), amount))
}

export function loopSeconds(lengthBeats: number, bpm: number): number {
  const v = (lengthBeats * 60) / bpm
  return Number.isFinite(v) && v > 0 ? v : 2 // 4 beats at 120 BPM if input is unusable
}

// ---------------------------------------------------------------- presets

/** Straight run from (x0,y0) to (x1,y1) split into n equal pieces (collinear handles). Excludes the start point. */
function run(x0: number, y0: number, x1: number, y1: number, n: number): WarpPoint[] {
  const out: WarpPoint[] = []
  for (let i = 1; i <= n; i++) out.push({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n })
  return out
}

function stutterBuild(): WarpPoint[] {
  // Each slice is held at the delay of its own start, so every slice replays the loop from the top;
  // the delay steps down at each edge, and each repeat is shorter than the last.
  const edges = [0.25, 0.5, 0.625, 0.75, 0.8125, 0.875, 0.9375, 1]
  const pts: WarpPoint[] = [{ x: 0, y: 0 }]
  let prev = 0
  edges.forEach((e, i) => {
    pts.push({ x: e, y: prev })
    if (i < edges.length - 1) pts.push({ x: e, y: e })
    prev = e
  })
  return pts
}

function freezeHits(): WarpPoint[] {
  // On each beat run along the guide (stopped) for 1/16 of the loop, then jump back to live.
  const pts: WarpPoint[] = []
  for (const q of [0, 0.25, 0.5, 0.75]) pts.push({ x: q, y: 0 }, { x: q + 0.0625, y: 0.0625 }, { x: q + 0.0625, y: 0 })
  pts.push({ x: 1, y: 0 })
  return pts
}

/**
 * Built-in lines. Each one (except Straight) gives the same delay over the loop as its v1 version did:
 * y = (x - y_v1) mod 1, with a vertical step wherever that wraps.
 */
export const PRESETS: Record<string, WarpPoint[]> = {
  Straight: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  'Stutter build': stutterBuild(),
  // Half speed (a gentle downward slope), then back to live at the half.
  'Half time': [{ x: 0, y: 0 }, ...run(0, 0, 0.5, 0.25, 4), { x: 0.5, y: 0 }, ...run(0.5, 0, 1, 0.25, 4)],
  'Freeze hits': freezeHits(),
  // Twice as steep as the guide (speed -1), jumping back to live at the half.
  Reverse: [{ x: 0, y: 0 }, ...run(0, 0, 0.5, 1, 4), { x: 0.5, y: 0 }, ...run(0.5, 0, 1, 1, 4)],
  // Live, then a curve that bends into the guide's slope: slows to a stop. y = .3 t^2 over [.4, 1].
  'Tape stop': [{ x: 0, y: 0 }, ...run(0, 0, 0.4, 0, 8), { x: 1, y: 0.3, bend: 1 / 3 }],
  Scratch: [
    { x: 0, y: 0 }, { x: 0.125, y: 0.025 }, { x: 0.2, y: 0.18 }, { x: 0.3, y: 0.05 }, { x: 0.375, y: 0.225 },
    { x: 0.5, y: 0.05 }, { x: 0.58, y: 0.28 }, { x: 0.7, y: 0.08 }, { x: 0.78, y: 0.28 }, { x: 0.9, y: 0.05 }, { x: 1, y: 0 },
  ],
  // Quarters play in the order 1, 3, 2, 4.
  Rearranger: [
    { x: 0, y: 0 }, { x: 0.25, y: 0 }, { x: 0.25, y: 0.75 }, { x: 0.5, y: 0.75 },
    { x: 0.5, y: 0.25 }, { x: 0.75, y: 0.25 }, { x: 0.75, y: 0 }, { x: 1, y: 0 },
  ],
}

// ---------------------------------------------------------------- random lines

/** Quantize setting -> grid columns. 0 (Off) and bad values use 1/16. */
function gridCols(snap: number): number {
  const g = Number.isFinite(snap) && snap > 0 ? snap : 1 / 16
  return Math.max(2, Math.round(1 / g))
}

/** segs - 1 distinct interior cut columns in 1..n-1, plus 0 and n, sorted. */
function cutEdges(n: number, segs: number, rand: () => number): number[] {
  const cuts = new Set<number>()
  while (cuts.size < segs - 1) cuts.add(1 + Math.floor(rand() * (n - 1)))
  return [0, ...[...cuts].sort((a, b) => a - b), n]
}

/**
 * Staircase-heavy random line on the quantize grid: 3 to 7 holds joined by vertical steps (each hold at a
 * different height). Deterministic when `rand` is seeded. snap 0 (Off) uses 1/16.
 */
export function randomSteps(snap: number, rand: () => number = Math.random): WarpPoint[] {
  const n = gridCols(snap)
  const m = Math.min(16, n) // height levels
  const segs = Math.min(n, 3 + Math.floor(rand() * 5))
  const edges = cutEdges(n, segs, rand)
  // favour the upper half (shorter delays) a little, so the result stays musical
  const level = () => Math.floor(Math.pow(rand(), 1.3) * (m + 1)) / m
  const pts: WarpPoint[] = []
  let y = level()
  pts.push({ x: 0, y })
  for (let s = 0; s < segs; s++) {
    const xa = edges[s] / n
    const xb = edges[s + 1] / n
    if (s > 0) {
      let ny = level()
      if (ny === y) ny = y >= 0.5 ? y - 1 / m : y + 1 / m
      pts.push({ x: xa, y: ny })
      y = ny
    }
    pts.push({ x: xb, y })
  }
  return pts
}

/** Old name for randomSteps. */
export const randomLine = randomSteps

/**
 * Slope- and curve-heavy random line on the quantize grid: 2 to 5 sloped segments, one or two of them bent.
 * Deterministic when `rand` is seeded. snap 0 (Off) uses 1/16.
 */
export function randomCurves(snap: number, rand: () => number = Math.random): WarpPoint[] {
  const n = gridCols(snap)
  const m = 16
  const segs = Math.min(n, 2 + Math.floor(rand() * 4))
  const edges = cutEdges(n, segs, rand)
  const level = () => Math.floor(rand() * (m + 1)) / m
  const bendCount = segs >= 3 && rand() < 0.5 ? 2 : 1
  const bent = new Set<number>()
  while (bent.size < bendCount) bent.add(Math.floor(rand() * segs))
  const pts: WarpPoint[] = []
  let y = level()
  pts.push({ x: 0, y })
  for (let s = 0; s < segs; s++) {
    let ey = level()
    if (ey === y) ey = y >= 0.5 ? y - 4 / m : y + 4 / m
    const pt: WarpPoint = { x: edges[s + 1] / n, y: ey }
    if (bent.has(s)) {
      const mag = 0.3 + rand() * 0.7
      pt.bend = rand() < 0.5 ? mag : -mag
    }
    pts.push(pt)
    y = ey
  }
  return pts
}
