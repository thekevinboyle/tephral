import { memo, useMemo } from 'react'

// ── Shared interface ──────────────────────────────────────────────────
export interface MicroVisualProps {
  value: number
  size?: number
  color?: string
  className?: string
}

// ── CSS keyframes (injected once) ─────────────────────────────────────
const STYLE_ID = 'mv-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
@keyframes mv-rotate { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes mv-rotate-reverse { from { transform: rotate(360deg) } to { transform: rotate(0deg) } }
@keyframes mv-sweep { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes mv-pulse { 0%,100% { opacity: 0.3 } 50% { opacity: 0.8 } }
@keyframes mv-scan-v { 0%,100% { transform: translateY(-30%) } 50% { transform: translateY(30%) } }
@keyframes mv-blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
@keyframes mv-dash { from { stroke-dashoffset: 0 } to { stroke-dashoffset: -40 } }
`
  document.head.appendChild(style)
}

// ── Shared utilities ──────────────────────────────────────────────────
function hash(i: number, seed: number): number {
  const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453
  return x - Math.floor(x)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToXY(cx, cy, r, endDeg)
  const end = polarToXY(cx, cy, r, startDeg)
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

const ROT_STYLE = { transformOrigin: '50% 50%', transformBox: 'fill-box' as const }

// ═══════════════════════════════════════════════════════════════════════
// 1. Crosshair
// ═══════════════════════════════════════════════════════════════════════
export const Crosshair = memo(function Crosshair({
  value,
  size = 96,
  color = '#FFFFFF',
  className,
}: MicroVisualProps) {
  const c = size / 2
  const r = size * 0.38
  const dotR = lerp(1.5, 4, value)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} fill="none">
      {/* Outer arc — clockwise */}
      <g style={{ ...ROT_STYLE, animation: 'mv-rotate 5s linear infinite', willChange: 'transform' }}>
        <path d={arc(c, c, r, 0, 120)} stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
      </g>
      {/* Inner arc — counter-clockwise */}
      <g style={{ ...ROT_STYLE, animation: 'mv-rotate-reverse 8s linear infinite', willChange: 'transform' }}>
        <path d={arc(c, c, r * 0.7, 30, 180)} stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.4} />
      </g>
      {/* Static crosshair lines */}
      <line x1={c} y1={c - r * 0.5} x2={c} y2={c - r * 0.2} stroke={color} strokeWidth={0.8} opacity={0.5} />
      <line x1={c} y1={c + r * 0.2} x2={c} y2={c + r * 0.5} stroke={color} strokeWidth={0.8} opacity={0.5} />
      <line x1={c - r * 0.5} y1={c} x2={c - r * 0.2} y2={c} stroke={color} strokeWidth={0.8} opacity={0.5} />
      <line x1={c + r * 0.2} y1={c} x2={c + r * 0.5} y2={c} stroke={color} strokeWidth={0.8} opacity={0.5} />
      {/* Scanning line */}
      <line
        x1={c - r * 0.35} y1={c} x2={c + r * 0.35} y2={c}
        stroke={color} strokeWidth={0.6} opacity={0.3}
        style={{ ...ROT_STYLE, animation: 'mv-scan-v 3s ease-in-out infinite', willChange: 'transform' }}
      />
      {/* Center dot */}
      <circle cx={c} cy={c} r={dotR} fill={color} opacity={0.9} />
    </svg>
  )
})

// ═══════════════════════════════════════════════════════════════════════
// 2. DataGrid
// ═══════════════════════════════════════════════════════════════════════
export const DataGrid = memo(function DataGrid({
  value,
  size = 96,
  color = '#FFFFFF',
  className,
}: MicroVisualProps) {
  const pad = size * 0.12
  const gap = (size - pad * 2) / 7

  const dots = useMemo(() => {
    const result: { x: number; y: number; active: boolean; delay: number }[] = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const threshold = (row + col) / 14
        result.push({
          x: pad + col * gap,
          y: pad + row * gap,
          active: value >= threshold,
          delay: (row + col) * 0.12,
        })
      }
    }
    return result
  }, [value, pad, gap])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} fill="none">
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.active ? 2.2 : 1}
          fill={color}
          opacity={d.active ? 0.8 : 0.15}
          style={d.active ? { animation: `mv-pulse 2s ease-in-out ${d.delay}s infinite` } : undefined}
        />
      ))}
    </svg>
  )
})

// ═══════════════════════════════════════════════════════════════════════
// 3. OrbitalRings
// ═══════════════════════════════════════════════════════════════════════
export const OrbitalRings = memo(function OrbitalRings({
  value,
  size = 96,
  color = '#FFFFFF',
  className,
}: MicroVisualProps) {
  const c = size / 2
  const spread = lerp(0.2, 0.42, value)
  const rings = [
    { r: size * spread * 0.5, dash: '4 6', dur: '6s', angle: 45 },
    { r: size * spread * 0.75, dash: '8 5', dur: '10s', angle: 160 },
    { r: size * spread, dash: '3 9', dur: '16s', angle: 280 },
  ]
  const markerR = lerp(1, 3, value)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} fill="none">
      {rings.map((ring, i) => {
        const marker = polarToXY(c, c, ring.r, ring.angle)
        return (
          <g key={i} style={{ ...ROT_STYLE, animation: `mv-rotate ${ring.dur} linear infinite`, willChange: 'transform' }}>
            <circle
              cx={c} cy={c} r={ring.r}
              stroke={color} strokeWidth={0.8} strokeDasharray={ring.dash}
              opacity={0.35}
            />
            <circle cx={marker.x} cy={marker.y} r={markerR} fill={color} opacity={0.7} />
          </g>
        )
      })}
      {/* Center dot */}
      <circle cx={c} cy={c} r={2} fill={color} opacity={0.8} />
    </svg>
  )
})

// ═══════════════════════════════════════════════════════════════════════
// 4. ShapeMorpher
// ═══════════════════════════════════════════════════════════════════════
export const ShapeMorpher = memo(function ShapeMorpher({
  value,
  size = 96,
  color = '#FFFFFF',
  className,
}: MicroVisualProps) {
  const c = size / 2
  const r = size * 0.38
  const N = 36

  const outerPoints = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 - Math.PI / 2
      // Triangle: 3 vertices with straight edges interpolated
      const triSection = (i / N) * 3
      const triIdx = Math.floor(triSection)
      const triFrac = triSection - triIdx
      const a1 = ((triIdx) / 3) * Math.PI * 2 - Math.PI / 2
      const a2 = ((triIdx + 1) / 3) * Math.PI * 2 - Math.PI / 2
      const tx = lerp(Math.cos(a1), Math.cos(a2), triFrac)
      const ty = lerp(Math.sin(a1), Math.sin(a2), triFrac)
      const triLen = Math.sqrt(tx * tx + ty * ty)
      const triR = r / triLen

      const circleR = r
      const morphR = lerp(triR, circleR, value)

      const x = c + morphR * Math.cos(angle)
      const y = c + morphR * Math.sin(angle)
      pts.push(`${x},${y}`)
    }
    return pts.join(' ')
  }, [value, c, r])

  const innerPoints = useMemo(() => {
    const scale = 0.6
    const pts: string[] = []
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2 - Math.PI / 2
      const triSection = (i / N) * 3
      const triIdx = Math.floor(triSection)
      const triFrac = triSection - triIdx
      const a1 = ((triIdx) / 3) * Math.PI * 2 - Math.PI / 2
      const a2 = ((triIdx + 1) / 3) * Math.PI * 2 - Math.PI / 2
      const tx = lerp(Math.cos(a1), Math.cos(a2), triFrac)
      const ty = lerp(Math.sin(a1), Math.sin(a2), triFrac)
      const triLen = Math.sqrt(tx * tx + ty * ty)
      const triR = (r * scale) / triLen

      const circleR = r * scale
      const morphR = lerp(triR, circleR, value)

      const x = c + morphR * Math.cos(angle)
      const y = c + morphR * Math.sin(angle)
      pts.push(`${x},${y}`)
    }
    return pts.join(' ')
  }, [value, c, r])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} fill="none">
      <defs>
        <radialGradient id="mv-morph-grad">
          <stop offset="0%" stopColor={color} stopOpacity={0.12} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </radialGradient>
      </defs>
      {/* Outer shape */}
      <polygon points={outerPoints} stroke={color} strokeWidth={1.2} fill="url(#mv-morph-grad)" opacity={0.7} />
      {/* Inner echo — slow rotation */}
      <g style={{ ...ROT_STYLE, animation: 'mv-rotate 20s linear infinite', willChange: 'transform' }}>
        <polygon points={innerPoints} stroke={color} strokeWidth={0.6} fill="none" opacity={0.3} />
      </g>
    </svg>
  )
})

// ═══════════════════════════════════════════════════════════════════════
// 5. RadarSweep
// ═══════════════════════════════════════════════════════════════════════
export const RadarSweep = memo(function RadarSweep({
  value,
  size = 96,
  color = '#FFFFFF',
  className,
}: MicroVisualProps) {
  const c = size / 2
  const maxR = size * 0.42

  const blips = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const h = hash(i, 42)
      const angle = h * 360
      const dist = lerp(0.25, 0.9, hash(i, 99)) * maxR
      const visible = value >= (i + 1) / 7
      const pos = polarToXY(c, c, dist, angle)
      return { ...pos, visible, delay: i * 0.33 }
    })
  }, [value, c, maxR])

  const ticks = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = i * 30
      const inner = polarToXY(c, c, maxR - 3, angle)
      const outer = polarToXY(c, c, maxR, angle)
      return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }
    })
  }, [c, maxR])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} fill="none">
      <defs>
        <linearGradient id="mv-sweep-trail" gradientTransform="rotate(90)">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Range rings */}
      {[0.33, 0.66, 1].map((f, i) => (
        <circle key={i} cx={c} cy={c} r={maxR * f} stroke={color} strokeWidth={0.5} opacity={0.2} />
      ))}
      {/* Ticks */}
      {ticks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={color} strokeWidth={0.6} opacity={0.3} />
      ))}
      {/* Sweep line */}
      <g style={{ ...ROT_STYLE, animation: 'mv-sweep 2s linear infinite', willChange: 'transform' }}>
        <line x1={c} y1={c} x2={c} y2={c - maxR} stroke={color} strokeWidth={1} opacity={0.6} />
        {/* Trail wedge */}
        <path
          d={`M ${c} ${c} L ${c} ${c - maxR} A ${maxR} ${maxR} 0 0 0 ${c - maxR * Math.sin(Math.PI / 6)} ${c - maxR * Math.cos(Math.PI / 6)} Z`}
          fill={color}
          opacity={0.06}
        />
      </g>
      {/* Blips */}
      {blips.map((b, i) =>
        b.visible ? (
          <circle
            key={i}
            cx={b.x} cy={b.y} r={2}
            fill={color} opacity={0.7}
            style={{ animation: `mv-pulse 2s ease-in-out ${b.delay}s infinite` }}
          />
        ) : null,
      )}
      {/* Center dot */}
      <circle cx={c} cy={c} r={1.5} fill={color} opacity={0.6} />
    </svg>
  )
})

// ═══════════════════════════════════════════════════════════════════════
// 6. TechReadout
// ═══════════════════════════════════════════════════════════════════════
export const TechReadout = memo(function TechReadout({
  value,
  size = 96,
  color = '#FFFFFF',
  className,
}: MicroVisualProps) {
  const hexVal = Math.round(value * 255)
  const hexStr = `0x${hexVal.toString(16).toUpperCase().padStart(2, '0')}`
  const decStr = value.toFixed(3)
  const status = value < 0.1 ? 'IDLE' : value < 0.5 ? 'NORM' : value < 0.85 ? 'HIGH' : 'PEAK'
  const pct = Math.round(value * 100)
  const barW = size * 0.6

  const fs = size * 0.11
  const pad = size * 0.1
  const bracketLen = size * 0.12

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} fill="none">
      {/* Corner brackets */}
      <polyline points={`${pad},${pad + bracketLen} ${pad},${pad} ${pad + bracketLen},${pad}`} stroke={color} strokeWidth={1} opacity={0.7} />
      <polyline points={`${size - pad - bracketLen},${pad} ${size - pad},${pad} ${size - pad},${pad + bracketLen}`} stroke={color} strokeWidth={1} opacity={0.7} />
      <polyline points={`${pad},${size - pad - bracketLen} ${pad},${size - pad} ${pad + bracketLen},${size - pad}`} stroke={color} strokeWidth={1} opacity={0.7} />
      <polyline points={`${size - pad - bracketLen},${size - pad} ${size - pad},${size - pad} ${size - pad},${size - pad - bracketLen}`} stroke={color} strokeWidth={1} opacity={0.7} />

      {/* Hex value */}
      <text x={size / 2} y={pad + fs * 2.2} textAnchor="middle" fill={color} fontSize={fs * 1.3} fontFamily="monospace" fontWeight="bold" opacity={0.9}>
        {hexStr}
      </text>
      {/* Decimal */}
      <text x={size / 2} y={pad + fs * 3.8} textAnchor="middle" fill={color} fontSize={fs * 0.9} fontFamily="monospace" opacity={0.5}>
        {decStr}
      </text>
      {/* Status */}
      <text x={size / 2} y={size / 2 + fs * 0.8} textAnchor="middle" fill={color} fontSize={fs} fontFamily="monospace" fontWeight="bold" opacity={0.7}>
        {status}
      </text>
      {/* Percentage bar */}
      <rect x={(size - barW) / 2} y={size / 2 + fs * 1.6} width={barW} height={3} rx={1} fill={color} opacity={0.15} />
      <rect x={(size - barW) / 2} y={size / 2 + fs * 1.6} width={barW * value} height={3} rx={1} fill={color} opacity={0.6} />
      {/* Percentage text */}
      <text x={size / 2} y={size - pad - fs * 0.8} textAnchor="middle" fill={color} fontSize={fs * 0.8} fontFamily="monospace" opacity={0.4}>
        {pct}%
      </text>
      {/* Blinking cursor */}
      <rect
        x={size / 2 + fs * 2}
        y={pad + fs * 1.2}
        width={fs * 0.6}
        height={fs * 1.2}
        fill={color}
        opacity={0.6}
        style={{ animation: 'mv-blink 1s step-end infinite' }}
      />
    </svg>
  )
})

// ═══════════════════════════════════════════════════════════════════════
// 7. IrisScanner
// ═══════════════════════════════════════════════════════════════════════
export const IrisScanner = memo(function IrisScanner({
  value,
  size = 96,
  color = '#FFFFFF',
  className,
}: MicroVisualProps) {
  const c = size / 2
  const maxR = size * 0.42
  const apertureR = lerp(maxR * 0.6, maxR * 0.1, value)

  const rings = useMemo(() => {
    return [0.3, 0.5, 0.7, 0.85, 1.0].map((f, i) => {
      const r = maxR * f
      const gapStart = 30 + i * 50
      const gapEnd = gapStart + 40
      return { r, path1: arc(c, c, r, gapEnd, gapStart + 360), idx: i }
    })
  }, [c, maxR])

  const tickLen = size * 0.06

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} fill="none">
      {/* Broken concentric rings */}
      {rings.map((ring) => (
        <path
          key={ring.idx}
          d={ring.path1}
          stroke={color}
          strokeWidth={0.8}
          opacity={ring.idx === 2 ? 0.5 : 0.3}
          style={ring.idx === 2 ? { animation: 'mv-pulse 3s ease-in-out infinite' } : undefined}
        />
      ))}
      {/* Measurement cross */}
      <line x1={c - maxR} y1={c} x2={c + maxR} y2={c} stroke={color} strokeWidth={0.4} opacity={0.2} />
      <line x1={c} y1={c - maxR} x2={c} y2={c + maxR} stroke={color} strokeWidth={0.4} opacity={0.2} />
      {/* Tick marks on cross */}
      {[-0.8, -0.4, 0.4, 0.8].map((f, i) => (
        <g key={i}>
          <line x1={c + maxR * f} y1={c - tickLen / 2} x2={c + maxR * f} y2={c + tickLen / 2} stroke={color} strokeWidth={0.5} opacity={0.3} />
          <line x1={c - tickLen / 2} y1={c + maxR * f} x2={c + tickLen / 2} y2={c + maxR * f} stroke={color} strokeWidth={0.5} opacity={0.3} />
        </g>
      ))}
      {/* Center aperture */}
      <circle cx={c} cy={c} r={apertureR} stroke={color} strokeWidth={1.2} opacity={0.6} />
      <circle cx={c} cy={c} r={apertureR * 0.4} fill={color} opacity={0.15} />
      {/* F-stop readout */}
      <text
        x={c + maxR * 0.5}
        y={c - maxR * 0.5}
        fill={color}
        fontSize={size * 0.08}
        fontFamily="monospace"
        opacity={0.4}
      >
        f/{(1 + value * 15).toFixed(1)}
      </text>
    </svg>
  )
})

// ═══════════════════════════════════════════════════════════════════════
// 8. SignalAnalysis
// ═══════════════════════════════════════════════════════════════════════
export const SignalAnalysis = memo(function SignalAnalysis({
  value,
  size = 96,
  color = '#FFFFFF',
  className,
}: MicroVisualProps) {
  const pad = size * 0.08
  const midY = size * 0.45
  const w = size - pad * 2
  const bracketLen = size * 0.08

  // Oscilloscope waveform
  const wavePath = useMemo(() => {
    const amp = lerp(2, midY * 0.6, value)
    const freq = lerp(1, 3, value)
    const pts: string[] = []
    const steps = 60
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = pad + t * w
      const y = midY * 0.5 + amp * Math.sin(t * Math.PI * 2 * freq)
      pts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
    }
    return pts.join(' ')
  }, [value, pad, w, midY])

  // Frequency bars
  const bars = useMemo(() => {
    const barCount = 8
    const barW = w / barCount - 2
    const barAreaH = size - midY - pad * 2
    return Array.from({ length: barCount }, (_, i) => {
      const h = hash(i, Math.floor(value * 10)) * barAreaH * lerp(0.2, 1, value)
      return {
        x: pad + i * (w / barCount) + 1,
        y: size - pad - h,
        w: barW,
        h,
      }
    })
  }, [value, pad, w, midY, size])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} fill="none">
      {/* Grid overlay */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={`h${f}`} x1={pad} y1={size * f} x2={size - pad} y2={size * f} stroke={color} strokeWidth={0.3} opacity={0.1} />
      ))}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={`v${f}`} x1={size * f} y1={pad} x2={size * f} y2={size - pad} stroke={color} strokeWidth={0.3} opacity={0.1} />
      ))}

      {/* Corner brackets */}
      <polyline points={`${pad},${pad + bracketLen} ${pad},${pad} ${pad + bracketLen},${pad}`} stroke={color} strokeWidth={0.8} opacity={0.35} />
      <polyline points={`${size - pad - bracketLen},${size - pad} ${size - pad},${size - pad} ${size - pad},${size - pad - bracketLen}`} stroke={color} strokeWidth={0.8} opacity={0.35} />

      {/* Oscilloscope waveform */}
      <path
        d={wavePath}
        stroke={color}
        strokeWidth={1.2}
        opacity={0.7}
        strokeDasharray="8 4"
        style={{ animation: 'mv-dash 1.5s linear infinite' }}
      />

      {/* Divider line */}
      <line x1={pad} y1={midY} x2={size - pad} y2={midY} stroke={color} strokeWidth={0.4} opacity={0.2} />

      {/* Frequency bars */}
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width={bar.w}
          height={bar.h}
          fill={color}
          opacity={0.35}
          rx={1}
        />
      ))}
    </svg>
  )
})
