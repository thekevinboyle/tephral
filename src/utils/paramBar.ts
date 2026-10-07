export interface Segment { lit: boolean; zero: boolean; mod: boolean }

const MAX_SEGMENTS = 32

export function snap(v: number, min: number, max: number, step: number): number {
  const s = step > 0 ? Math.round((v - min) / step) * step + min : v
  return Math.min(max, Math.max(min, Number(s.toFixed(6))))
}

/** Integer params with <= 32 distinct values get one segment per value; everything else gets 32. */
export function segmentCount(min: number, max: number, step: number): number {
  if (step >= 1) {
    const values = Math.round((max - min) / step) + 1
    if (values <= MAX_SEGMENTS) return values
  }
  return MAX_SEGMENTS
}

export function buildSegments({ value, min, max, step, modDepth }: { value: number; min: number; max: number; step: number; modDepth: number | null }): Segment[] {
  const n = segmentCount(min, max, step)
  const p = (value - min) / (max - min) // 0..1
  const bipolar = min < 0
  const z = (0 - min) / (max - min) // zero position for bipolar
  const modSpan = modDepth == null ? null : Math.min(1, Math.abs(modDepth))
  const perValue = step >= 1 && Math.round((max - min) / step) + 1 <= MAX_SEGMENTS
  return Array.from({ length: n }, (_, k) => {
    // per-value segments light up to and including the value's own cell
    const c = perValue && n > 1 ? k / (n - 1) : (k + 0.5) / n
    const lit = bipolar ? c >= Math.min(z, p) - 1e-9 && c <= Math.max(z, p) + 1e-9 : c <= p + 1e-9
    const zero = bipolar && !lit && Math.abs(c - z) <= 0.5 / n
    const mod = modSpan != null && c <= modSpan + 1e-9
    return { lit, zero, mod }
  })
}

export function formatParamValue(v: number): string {
  if (Number.isInteger(v)) return String(v)
  const a = Math.abs(v)
  const s = a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2)
  return s.replace(/^(-?)0\./, '$1.')
}
