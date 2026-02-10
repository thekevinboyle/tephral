import { useEffect, useState, useMemo } from 'react'
import { useSequencerStore } from '../../stores/sequencerStore'

// Format number with leading zeros
function padNumber(n: number, digits: number): string {
  return String(Math.abs(Math.floor(n))).padStart(digits, '0')
}

const GRID_WIDTH = 32
const GRID_HEIGHT = 12

// ════════════════════════════════════════════════════════════════════════════
// ANIMATED PATTERNS
// ════════════════════════════════════════════════════════════════════════════

// Grid pulse pattern - radiating circles
function GridPulsePattern({ tick }: { tick: number }) {
  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: GRID_HEIGHT }, (_, y) => (
        <div key={y} className="flex gap-[2px]">
          {Array.from({ length: GRID_WIDTH }, (_, x) => {
            const dist = Math.sqrt(
              Math.pow(x - GRID_WIDTH / 2 + 0.5, 2) + Math.pow(y - GRID_HEIGHT / 2 + 0.5, 2)
            )
            const wave = Math.sin(dist * 0.5 - tick * 0.1)
            return (
              <div
                key={x}
                className="w-[4px] h-[4px]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  opacity: wave > 0.3 ? (0.15 + wave * 0.25) : 0.08,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Matrix rain pattern
function MatrixRainPattern({ tick }: { tick: number }) {
  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: GRID_HEIGHT }, (_, y) => (
        <div key={y} className="flex gap-[2px]">
          {Array.from({ length: GRID_WIDTH }, (_, x) => {
            const seed = (x * 7 + 13) % 17
            const speed = 0.1 + (seed / 17) * 0.15
            const offset = seed * 3
            const drop = ((tick * speed + offset) % (GRID_HEIGHT + 4)) - 2
            const dist = y - drop
            const intensity = dist >= 0 && dist < 4 ? 1 - dist / 4 : 0
            return (
              <div
                key={x}
                className="w-[4px] h-[4px]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  opacity: intensity > 0 ? (0.2 + intensity * 0.8) : 0.08,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Diagonal scan pattern
function DiagonalScanPattern({ tick }: { tick: number }) {
  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: GRID_HEIGHT }, (_, y) => (
        <div key={y} className="flex gap-[2px]">
          {Array.from({ length: GRID_WIDTH }, (_, x) => {
            const diagonal = x + y
            const scanPos = (tick * 0.3) % (GRID_WIDTH + GRID_HEIGHT)
            const dist = Math.abs(diagonal - scanPos)
            const intensity = dist < 3 ? 1 - dist / 3 : 0
            const grid = (x + y) % 4 === 0 ? 0.15 : 0
            return (
              <div
                key={x}
                className="w-[4px] h-[4px]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  opacity: Math.max(intensity * 0.9, grid, 0.08),
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Heartbeat/pulse pattern
function HeartbeatPattern({ tick }: { tick: number }) {
  const pulse = Math.sin(tick * 0.15) > 0.7 ? 1 : 0
  const afterPulse = Math.sin(tick * 0.15 - 0.5) > 0.7 ? 0.5 : 0

  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: GRID_HEIGHT }, (_, y) => (
        <div key={y} className="flex gap-[2px]">
          {Array.from({ length: GRID_WIDTH }, (_, x) => {
            const centerX = GRID_WIDTH / 2
            const centerY = GRID_HEIGHT / 2
            const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
            const maxDist = 5
            const inCircle = dist < maxDist * (0.5 + pulse * 0.5 + afterPulse * 0.3)
            const edge = Math.abs(dist - maxDist * 0.7) < 1
            return (
              <div
                key={x}
                className="w-[4px] h-[4px]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  opacity: inCircle ? (0.4 + pulse * 0.6) : edge ? 0.2 : 0.08,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Spinning radar pattern
function RadarPattern({ tick }: { tick: number }) {
  const centerX = GRID_WIDTH / 2
  const centerY = GRID_HEIGHT / 2

  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: GRID_HEIGHT }, (_, y) => (
        <div key={y} className="flex gap-[2px]">
          {Array.from({ length: GRID_WIDTH }, (_, x) => {
            const dx = x - centerX + 0.5
            const dy = y - centerY + 0.5
            const angle = Math.atan2(dy, dx)
            const dist = Math.sqrt(dx * dx + dy * dy)
            const sweepAngle = (tick * 0.08) % (Math.PI * 2)
            let angleDiff = angle - sweepAngle
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
            const inSweep = angleDiff > -0.8 && angleDiff < 0 && dist < 6
            const onRing = Math.abs(dist - 5) < 0.8
            const intensity = inSweep ? (0.8 + angleDiff) : onRing ? 0.25 : 0
            return (
              <div
                key={x}
                className="w-[4px] h-[4px]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  opacity: intensity > 0 ? intensity : 0.08,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Noise/static pattern
function NoisePattern({ tick }: { tick: number }) {
  // Use tick to seed but don't change every frame
  const seed = Math.floor(tick / 3)

  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: GRID_HEIGHT }, (_, y) => (
        <div key={y} className="flex gap-[2px]">
          {Array.from({ length: GRID_WIDTH }, (_, x) => {
            // Pseudo-random based on position and seed
            const rand = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453
            const noise = rand - Math.floor(rand)
            return (
              <div
                key={x}
                className="w-[4px] h-[4px]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  opacity: noise > 0.6 ? (0.2 + noise * 0.4) : 0.08,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Waveform pattern
function WaveformPattern({ tick }: { tick: number }) {
  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: GRID_HEIGHT }, (_, y) => (
        <div key={y} className="flex gap-[2px]">
          {Array.from({ length: GRID_WIDTH }, (_, x) => {
            const wave1 = Math.sin(x * 0.5 + tick * 0.12) * 3
            const wave2 = Math.sin(x * 0.3 - tick * 0.08) * 2
            const combined = wave1 + wave2
            const centerY = GRID_HEIGHT / 2
            const dist = Math.abs(y - centerY - combined)
            const intensity = dist < 1.5 ? 1 - dist / 1.5 : 0
            return (
              <div
                key={x}
                className="w-[4px] h-[4px]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  opacity: intensity > 0 ? (0.3 + intensity * 0.7) : 0.08,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Bouncing bars pattern
function BouncingBarsPattern({ tick }: { tick: number }) {
  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: GRID_HEIGHT }, (_, y) => (
        <div key={y} className="flex gap-[2px]">
          {Array.from({ length: GRID_WIDTH }, (_, x) => {
            const barPhase = x * 0.4
            const barHeight = (Math.sin(tick * 0.1 + barPhase) + 1) * 0.5 * GRID_HEIGHT
            const fromBottom = GRID_HEIGHT - 1 - y
            const intensity = fromBottom < barHeight ? 0.8 - (fromBottom / GRID_HEIGHT) * 0.4 : 0
            return (
              <div
                key={x}
                className="w-[4px] h-[4px]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  opacity: intensity > 0 ? intensity : 0.08,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Running step indicator pattern (for playing state)
function RunningPattern({ currentStep, length }: { tick: number; currentStep: number; length: number }) {
  const stepWidth = GRID_WIDTH / Math.min(length, 16)

  return (
    <div className="flex flex-col gap-[2px]">
      {Array.from({ length: GRID_HEIGHT }, (_, y) => (
        <div key={y} className="flex gap-[2px]">
          {Array.from({ length: GRID_WIDTH }, (_, x) => {
            const stepX = (currentStep % 16) * stepWidth
            const isCurrentBar = x >= stepX && x < stepX + stepWidth
            const trail = Math.max(0, 1 - Math.abs(x - stepX) / 4)
            const centerLine = Math.abs(y - GRID_HEIGHT / 2) < 1.5 ? 0.3 : 0
            const intensity = Math.max(isCurrentBar ? 1 : 0, trail * 0.5, centerLine)
            return (
              <div
                key={x}
                className="w-[4px] h-[4px]"
                style={{
                  backgroundColor: 'var(--text-primary)',
                  opacity: intensity > 0 ? (0.1 + intensity * 0.9) : 0.08,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// All idle patterns
const IDLE_PATTERNS = [
  GridPulsePattern,
  MatrixRainPattern,
  DiagonalScanPattern,
  HeartbeatPattern,
  RadarPattern,
  NoisePattern,
  WaveformPattern,
  BouncingBarsPattern,
]

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function StepLCDDisplay() {
  const [tick, setTick] = useState(0)
  const [patternIndex, setPatternIndex] = useState(0)
  const { tracks, isPlaying, bpm, stepResolution, globalMode } = useSequencerStore()

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // Rotate patterns every 8 seconds when not playing
  useEffect(() => {
    if (isPlaying) return

    const interval = setInterval(() => {
      setPatternIndex(i => (i + 1) % IDLE_PATTERNS.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [isPlaying])

  // Get current idle pattern component
  const IdlePattern = IDLE_PATTERNS[patternIndex]

  // Calculate stats
  const stats = useMemo(() => {
    const totalSteps = tracks.reduce((sum, t) => sum + t.length, 0)
    const activeSteps = tracks.reduce((sum, t) =>
      sum + t.steps.slice(0, t.length).filter(s => s.active).length, 0
    )
    const density = totalSteps > 0 ? Math.round((activeSteps / totalSteps) * 100) : 0
    const currentStep = tracks[0]?.currentStep || 0
    const maxLength = Math.max(...tracks.map(t => t.length), 16)
    return { totalSteps, activeSteps, density, currentStep, maxLength }
  }, [tracks])

  // Mode labels
  const modeLabel = {
    forward: 'FWD',
    backward: 'BWD',
    pendulum: 'PND',
    random: 'RND',
  }[globalMode] || 'FWD'

  return (
    <div
      className="flex gap-4 px-3 py-2 relative grid-substrate"
      style={{
        '--grid-dot': 'var(--border)',
        borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--font-mono, monospace)',
      } as React.CSSProperties}
    >
      {/* Animated pattern display */}
      <div
        className="flex-shrink-0"
        style={{
          padding: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '2px',
          border: '1px solid var(--border)',
        }}
      >
        {isPlaying ? (
          <RunningPattern tick={tick} currentStep={stats.currentStep} length={stats.maxLength} />
        ) : (
          <IdlePattern tick={tick} />
        )}
      </div>

      {/* Data readouts - BIG TEXT */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Top row - Track info */}
        <div className="flex items-baseline gap-6">
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
            TRK{' '}
            <span className="text-[28px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {padNumber(tracks.length, 2)}
            </span>
          </span>
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
            STP{' '}
            <span className="text-[28px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {padNumber(stats.activeSteps, 3)}
            </span>
          </span>
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
            DNS{' '}
            <span className="text-[28px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {padNumber(stats.density, 2)}
            </span>
            <span className="text-[18px]" style={{ color: 'var(--text-muted)' }}>%</span>
          </span>
        </div>

        {/* Bottom row - Playback info */}
        <div className="flex items-baseline gap-6 mt-1">
          <span
            className="text-[18px] font-bold"
            style={{ color: isPlaying ? '#FF0055' : 'var(--text-ghost)' }}
          >
            {isPlaying ? '▶ PLAY' : '■ STOP'}
          </span>
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
            <span className="text-[24px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {padNumber(bpm, 3)}
            </span>
            {' '}BPM
          </span>
          <span className="text-[20px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {stepResolution}
          </span>
          <span className="text-[20px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {modeLabel}
          </span>
        </div>
      </div>

      {/* Step position indicator */}
      {isPlaying && (
        <div className="flex-shrink-0 flex flex-col items-end justify-center">
          <span
            className="text-[48px] font-bold tabular-nums"
            style={{
              color: 'var(--text-primary)',
              lineHeight: 1,
              textShadow: '0 0 12px rgba(255, 255, 255, 0.4)',
            }}
          >
            {padNumber(stats.currentStep + 1, 2)}
          </span>
          <span className="text-[9px]" style={{ color: 'var(--text-ghost)' }}>
            /{padNumber(stats.maxLength, 2)}
          </span>
        </div>
      )}
    </div>
  )
}
