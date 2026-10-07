interface ModReadoutProps {
  /** Depth-drag (assigning) readout */
  depth?: { name: string; value: number; color?: string } | null
  /** Modulation-dot drag readout */
  dot?: { name: string; depth: number; color: string } | null
}

const CLS = 'absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[9px] font-bold tabular-nums whitespace-nowrap z-20'

const pct = (d: number) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(0)}%`

/** Floating depth readout shown while assigning a modulator or dragging a modulation dot. */
export function ModReadout({ depth, dot }: ModReadoutProps) {
  if (depth) {
    return (
      <div className={CLS} style={{ backgroundColor: depth.color ?? 'var(--accent)', color: '#000' }}>
        {depth.name ? `${depth.name}: ${pct(depth.value)}` : pct(depth.value)}
      </div>
    )
  }
  if (dot) {
    return (
      <div className={CLS} style={{ backgroundColor: dot.color, color: '#000' }}>
        {dot.name}: {pct(dot.depth)}
      </div>
    )
  }
  return null
}
