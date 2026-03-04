import { useMemo } from 'react'

export interface Trace {
  points: number[]    // array of 0-1 values
  color: string
  opacity?: number    // default 1
  strokeWidth?: number
}

interface WaveformTraceProps {
  traces: Trace[]
  width?: number       // default 200
  height?: number      // default 60
  showGrid?: boolean   // dashed horizontal midline
  className?: string
}

// Generate smooth cubic bezier path through points
function pointsToBezierPath(
  points: number[],
  width: number,
  height: number,
  pad: number,
): string {
  if (points.length < 2) return ''

  const w = width - pad * 2
  const h = height - pad * 2
  const stepX = w / (points.length - 1)

  const coords = points.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + (1 - v) * h,
  }))

  let d = `M ${coords[0].x} ${coords[0].y}`

  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]
    const curr = coords[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
  }

  return d
}

// Close path for fill area (extend to bottom)
function closePath(
  bezierPath: string,
  points: number[],
  width: number,
  height: number,
  pad: number,
): string {
  const w = width - pad * 2
  const lastX = pad + (points.length - 1) * (w / (points.length - 1))
  return `${bezierPath} L ${lastX},${height - pad} L ${pad},${height - pad} Z`
}

export function WaveformTrace({
  traces,
  width = 200,
  height = 60,
  showGrid = false,
  className,
}: WaveformTraceProps) {
  const pad = 4

  const renderedTraces = useMemo(() => {
    return traces.map((trace, i) => {
      if (trace.points.length < 2) return null

      const pathD = pointsToBezierPath(trace.points, width, height, pad)
      const fillD = closePath(pathD, trace.points, width, height, pad)
      const gradientId = `wt-fill-${i}`

      return (
        <g key={i} opacity={trace.opacity ?? 1}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trace.color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={trace.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {/* Fill area */}
          <path d={fillD} fill={`url(#${gradientId})`} />
          {/* Stroke line */}
          <path
            d={pathD}
            fill="none"
            stroke={trace.color}
            strokeWidth={trace.strokeWidth ?? 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )
    })
  }, [traces, width, height, pad])

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Grid midline */}
      {showGrid && (
        <line
          x1={pad}
          y1={height / 2}
          x2={width - pad}
          y2={height / 2}
          stroke="var(--text-ghost)"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      )}
      {renderedTraces}
    </svg>
  )
}
