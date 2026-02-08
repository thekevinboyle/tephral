import { useEffect, useState, useMemo } from 'react'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useMediaStore } from '../../stores/mediaStore'

// Generate random alphanumeric code
function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Format number with leading zeros
function padNumber(n: number, digits: number): string {
  return String(n).padStart(digits, '0')
}

// Star pattern data - creates a 6-pointed star shape
const STAR_PATTERN = [
  '        ██        ',
  '       ████       ',
  '        ██        ',
  '  ██    ██    ██  ',
  '   ████████████   ',
  '    ██████████    ',
  '  ████████████████',
  '    ██████████    ',
  '   ████████████   ',
  '  ██    ██    ██  ',
  '        ██        ',
  '       ████       ',
  '        ██        ',
]

export function DataTerminal() {
  const { crossfaderPosition } = useRoutingStore()
  const { source, isPlaying } = useMediaStore()
  const glitch = useGlitchEngineStore()

  // Count active effects
  const activeEffectCount = useMemo(() => {
    let count = 0
    if (glitch.rgbSplitEnabled) count++
    if (glitch.blockDisplaceEnabled) count++
    if (glitch.scanLinesEnabled) count++
    if (glitch.noiseEnabled) count++
    if (glitch.pixelateEnabled) count++
    if (glitch.edgeDetectionEnabled) count++
    if (glitch.chromaticAberrationEnabled) count++
    if (glitch.vhsTrackingEnabled) count++
    if (glitch.lensDistortionEnabled) count++
    if (glitch.ditherEnabled) count++
    if (glitch.posterizeEnabled) count++
    if (glitch.staticDisplacementEnabled) count++
    if (glitch.colorGradeEnabled) count++
    if (glitch.feedbackLoopEnabled) count++
    return count
  }, [glitch])

  // Animated/cycling data
  const [tick, setTick] = useState(0)
  const [codes, setCodes] = useState<string[]>([])

  // Generate initial codes
  useEffect(() => {
    setCodes([
      `${generateCode(4)}.${generateCode(3)}.${padNumber(Math.floor(Math.random() * 999), 3)}.${generateCode(3)}.${generateCode(3)}`,
      `${generateCode(4)}.${generateCode(3)}.${padNumber(Math.floor(Math.random() * 999), 3)}.${generateCode(3)}.${generateCode(3)}`,
    ])
  }, [])

  // Tick for animations
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  // Regenerate codes occasionally
  useEffect(() => {
    if (tick % 50 === 0 && tick > 0) {
      setCodes(prev => [
        prev[0],
        `${generateCode(4)}.${generateCode(3)}.${padNumber(Math.floor(Math.random() * 999), 3)}.${generateCode(3)}.${generateCode(3)}`,
      ])
    }
  }, [tick])

  // Sensor data - mix of real and decorative
  const sensorData = useMemo(() => [
    { label: 'Y', type: 'Sensor', value: padNumber(Math.floor(crossfaderPosition * 9999), 4) },
    { label: 'Z', type: 'Sensor', value: padNumber(Math.floor((1 - crossfaderPosition) * 9999), 4) },
    { label: 'A', type: 'Sensor', value: padNumber(activeEffectCount * 547 + (tick % 100), 4) },
    { label: 'B', type: 'Sensor', value: padNumber((tick * 17) % 10000, 4) },
  ], [crossfaderPosition, activeEffectCount, tick])

  // Grid status - reflects effect states
  const gridStatus = useMemo(() => {
    const grid: boolean[][] = []
    const effects = [
      glitch.rgbSplitEnabled, glitch.blockDisplaceEnabled, glitch.scanLinesEnabled,
      glitch.noiseEnabled, glitch.pixelateEnabled, glitch.edgeDetectionEnabled,
      glitch.chromaticAberrationEnabled, glitch.vhsTrackingEnabled, glitch.lensDistortionEnabled,
      glitch.ditherEnabled, glitch.posterizeEnabled, glitch.staticDisplacementEnabled,
      glitch.colorGradeEnabled, glitch.feedbackLoopEnabled, false, false,
    ]
    for (let row = 0; row < 4; row++) {
      grid.push([])
      for (let col = 0; col < 4; col++) {
        grid[row].push(effects[row * 4 + col] || false)
      }
    }
    return grid
  }, [glitch])

  // Large display numbers
  const displayNumbers = useMemo(() => {
    const fxMix = Math.round(crossfaderPosition * 99)
    return {
      top: padNumber(activeEffectCount, 2),
      bottom: padNumber(fxMix, 2),
    }
  }, [crossfaderPosition, activeEffectCount])

  // Status indicators
  const statusItems = useMemo(() => {
    const items = []
    if (source !== 'none') items.push('LINKED')
    if (isPlaying) items.push('ACTIVE')
    items.push(activeEffectCount > 0 ? 'PROCESSING' : 'STANDBY')
    return items
  }, [source, isPlaying, activeEffectCount])

  return (
    <div
      className="h-full flex flex-col overflow-hidden font-mono select-none"
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-secondary)',
      }}
    >
      {/* Header labels */}
      <div
        className="flex-shrink-0 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          AQF MAP
        </div>
        <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          AQF DISTRIBUTION
        </div>
        <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          AQF STATUS:
        </div>
      </div>

      {/* Star pattern */}
      <div
        className="flex-shrink-0 px-2 py-2 flex justify-center"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="text-[6px] leading-[6px]" style={{ color: 'var(--text-muted)', opacity: 0.6 + (tick % 10) * 0.04 }}>
          {STAR_PATTERN.map((row, i) => (
            <div key={i} style={{ letterSpacing: '-1px' }}>
              {row.split('').map((char, j) => (
                <span
                  key={j}
                  style={{
                    opacity: char === '█' ? (0.4 + Math.sin((tick + i + j) * 0.2) * 0.3) : 0,
                  }}
                >
                  {char === '█' ? '●' : ' '}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Grid status blocks */}
      <div
        className="flex-shrink-0 px-3 py-2 flex gap-2 items-center justify-center"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="grid grid-cols-4 gap-[2px]">
          {gridStatus.flat().map((active, i) => (
            <div
              key={i}
              className="w-2 h-2"
              style={{
                backgroundColor: active ? 'var(--text-secondary)' : 'var(--bg-elevated)',
                boxShadow: active ? '0 0 4px var(--text-secondary)' : 'none',
              }}
            />
          ))}
        </div>
        <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
        <div className="grid grid-cols-4 gap-[2px]">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className="w-2 h-2"
              style={{
                backgroundColor: (tick + i) % 8 < 4 ? 'var(--bg-elevated)' : 'var(--text-ghost)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Alphanumeric codes */}
      <div
        className="flex-shrink-0 px-3 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {codes.map((code, i) => (
          <div
            key={i}
            className="text-[11px] tracking-wider text-center mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {code}
          </div>
        ))}
      </div>

      {/* Sensor data section */}
      <div className="flex-1 min-h-0 flex">
        {/* Sensor list */}
        <div className="flex-1 px-3 py-2">
          <div
            className="text-[9px] uppercase tracking-widest mb-2 flex gap-4"
            style={{ color: 'var(--text-ghost)' }}
          >
            <span>SENSOR</span>
            <span>SEC</span>
            <span>PID</span>
          </div>
          {sensorData.map((sensor, i) => (
            <div
              key={i}
              className="text-[10px] tracking-wide flex gap-2 mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{sensor.label}:</span>
              <span>{sensor.type}</span>
              <span className="ml-auto tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                {sensor.value}
              </span>
            </div>
          ))}
        </div>

        {/* Large numbers */}
        <div
          className="flex-shrink-0 flex flex-col items-end justify-center px-3"
          style={{ borderLeft: '1px solid var(--border)' }}
        >
          <div
            className="text-[28px] font-bold leading-none tabular-nums"
            style={{ color: 'var(--text-primary)', letterSpacing: '-2px' }}
          >
            {displayNumbers.top}
          </div>
          <div
            className="text-[28px] font-bold leading-none tabular-nums"
            style={{ color: 'var(--text-muted)', letterSpacing: '-2px' }}
          >
            {displayNumbers.bottom}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div
        className="flex-shrink-0 px-3 py-1.5 text-center"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <span className="text-[8px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          {statusItems.join(' · ')}
        </span>
      </div>
    </div>
  )
}
