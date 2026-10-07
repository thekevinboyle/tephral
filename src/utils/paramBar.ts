export interface Segment { lit: boolean; zero: boolean; mod: boolean }

const MAX_SEGMENTS = 32

export function snap(v: number, min: number, max: number, step: number): number {
  const s = step > 0 ? Math.round((v - min) / step) * step + min : v
  return Math.min(max, Math.max(min, Number(s.toFixed(6))))
}

function valueCount(min: number, max: number, step: number): number {
  return Math.floor((max - min) / step + 1e-9) + 1
}

/** Integer params with <= 32 distinct values get one segment per value; everything else gets 32. */
export function segmentCount(min: number, max: number, step: number): number {
  if (step >= 1) {
    const values = valueCount(min, max, step)
    if (values <= MAX_SEGMENTS) return Math.max(1, values)
  }
  return MAX_SEGMENTS
}

export function buildSegments({ value, min, max, step, modDepth }: { value: number; min: number; max: number; step: number; modDepth: number | null }): Segment[] {
  const n = segmentCount(min, max, step)
  if (!(max > min) || !Number.isFinite(value)) {
    return Array.from({ length: n }, () => ({ lit: false, zero: false, mod: false }))
  }
  const perValue = step >= 1 && valueCount(min, max, step) <= MAX_SEGMENTS
  const bipolar = min < 0
  const z = (0 - min) / (max - min) // zero position for bipolar
  const idx = perValue ? Math.round((value - min) / step) : 0
  const p = perValue && n > 1 ? idx / (n - 1) : (value - min) / (max - min) // 0..1
  const modSpan = modDepth == null ? null : Math.min(1, Math.abs(modDepth))
  return Array.from({ length: n }, (_, k) => {
    // per-value segments light up to and including the value's own cell
    const c = perValue && n > 1 ? k / (n - 1) : (k + 0.5) / n
    const lit = bipolar ? c >= Math.min(z, p) - 1e-9 && c <= Math.max(z, p) + 1e-9 : c <= p + 1e-9
    const zero = bipolar && !lit && Math.abs(c - z) <= 0.5 / n
    const mod = modSpan != null && modSpan > 0 && c <= modSpan + 1e-9
    return { lit, zero, mod }
  })
}

export function formatParamValue(v: number): string {
  if (!Number.isFinite(v)) return '\u2013'
  const a = Math.abs(v)
  if (a >= 10000) {
    const k = v / 1000
    return (a >= 100000 ? String(Math.round(k)) : String(Number(k.toFixed(1)))) + 'k'
  }
  if (Number.isInteger(v)) return String(v)
  const s = a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : v.toFixed(2)
  if (Number(s) === 0) return '0'
  return s.replace(/^(-?)0\./, '$1.')
}
