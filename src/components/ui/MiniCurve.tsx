import { useMemo } from 'react'

export type CurveMode = 'envelope' | 'sine' | 'noise' | 'contour' | 'bar'

interface MiniCurveProps {
  value: number        // 0-1 normalized
  mode: CurveMode
  color?: string       // defaults to 'var(--accent)'
  width?: number       // default 40
  height?: number      // default 24
  className?: string
}

// Deterministic pseudo-random for noise mode
function hash(i: number, seed: number): number {
  return ((Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1 + 1) % 1
}

export function MiniCurve({
  value,
  mode,
  color = 'var(--accent)',
  width = 40,
  height = 24,
  className,
}: MiniCurveProps) {
  const gradientId = useMemo(() => `mc-${mode}-${Math.random().toString(36).slice(2, 6)}`, [mode])
  const pad = 2

  const content = useMemo(() => {
    const w = width - pad * 2
    const h = height - pad * 2
    const cx = pad
    const cy = pad

    switch (mode) {
      case 'envelope': {
        // Attack/decay curve — value controls attack speed (low=slow, high=fast)
        const attackX = cx + w * (1 - value) * 0.4
        const peakY = cy + 2
        const sustainY = cy + h * 0.4
        const sustainX = cx + w * 0.6
        const endY = cy + h

        const d = [
          `M ${cx} ${cy + h}`,
          `Q ${cx} ${peakY} ${attackX} ${peakY}`,
          `Q ${sustainX * 0.8} ${peakY} ${sustainX} ${sustainY}`,
          `Q ${cx + w * 0.8} ${sustainY + (endY - sustainY) * 0.3} ${cx + w} ${endY}`,
        ].join(' ')

        const fillD = d + ` L ${cx + w} ${cy + h} L ${cx} ${cy + h} Z`

        return (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <path d={fillD} fill={`url(#${gradientId})`} />
            <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          </>
        )
      }

      case 'sine': {
        // Sine wave — value controls amplitude
        const amp = value * h * 0.4
        const freq = 2.5
        const midY = cy + h / 2
        const points: string[] = []

        for (let x = 0; x <= w; x += 1) {
          const y = midY - Math.sin((x / w) * Math.PI * freq) * amp
          points.push(`${cx + x},${y}`)
        }

        const fillPoints = [
          ...points,
          `${cx + w},${cy + h}`,
          `${cx},${cy + h}`,
        ].join(' ')

        return (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <polygon points={fillPoints} fill={`url(#${gradientId})`} />
            <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          </>
        )
      }

      case 'noise': {
        // Scattered dots — value controls density + scatter height
        const count = Math.floor(3 + value * 12)
        const dots: Array<{ x: number; y: number; r: number }> = []
        for (let i = 0; i < count; i++) {
          dots.push({
            x: cx + hash(i, 1) * w,
            y: cy + h * (1 - hash(i, 2) * value),
            r: 0.8 + hash(i, 3) * 1,
          })
        }

        return (
          <>
            {dots.map((dot, i) => (
              <circle key={i} cx={dot.x} cy={dot.y} r={dot.r} fill={color} opacity={0.5 + hash(i, 4) * 0.5} />
            ))}
          </>
        )
      }

      case 'contour': {
        // Dual-slope mountain — value controls peak height
        const peakH = h * value * 0.85
        const midX = cx + w / 2
        const baseY = cy + h

        const d = [
          `M ${cx} ${baseY}`,
          `Q ${cx + w * 0.15} ${baseY - peakH * 0.6} ${midX - w * 0.05} ${baseY - peakH}`,
          `Q ${midX + w * 0.05} ${baseY - peakH} ${midX + w * 0.1} ${baseY - peakH * 0.7}`,
          `Q ${midX + w * 0.2} ${baseY - peakH * 0.5} ${midX + w * 0.15} ${baseY - peakH * 0.8}`,
          `Q ${cx + w * 0.85} ${baseY - peakH * 0.4} ${cx + w} ${baseY}`,
        ].join(' ')

        const fillD = d + ' Z'

        return (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <path d={fillD} fill={`url(#${gradientId})`} />
            <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          </>
        )
      }

      case 'bar': {
        // Vertical fill bar
        const barH = h * value
        return (
          <>
            <rect
              x={cx + w * 0.2}
              y={cy + h - barH}
              width={w * 0.6}
              height={barH}
              rx={2}
              fill={color}
              opacity={0.7}
            />
            <rect
              x={cx + w * 0.2}
              y={cy + h - barH}
              width={w * 0.6}
              height={Math.min(barH, 3)}
              rx={1}
              fill={color}
              opacity={1}
            />
          </>
        )
      }
    }
  }, [value, mode, color, width, height, pad, gradientId])

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {content}
    </svg>
  )
}
