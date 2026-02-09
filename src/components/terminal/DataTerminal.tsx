import { useEffect, useState, useMemo } from 'react'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useMediaStore } from '../../stores/mediaStore'
import { useUIStore } from '../../stores/uiStore'
import { useAcidStore } from '../../stores/acidStore'
import { useStrandStore } from '../../stores/strandStore'
import { useMotionStore } from '../../stores/motionStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useModulationStore } from '../../stores/modulationStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useThemeStore } from '../../stores/themeStore'

// Generate random alphanumeric code
function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Format number with leading zeros
function padNumber(n: number, digits: number): string {
  return String(Math.abs(Math.floor(n))).padStart(digits, '0')
}

// ════════════════════════════════════════════════════════════════════════════
// ANIMATED PATTERNS
// ════════════════════════════════════════════════════════════════════════════

// Star pattern - default/idle
function StarPattern({ tick }: { tick: number }) {
  const pattern = [
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

  return (
    <div className="text-[6px] leading-[6px]" style={{ color: 'var(--text-muted)' }}>
      {pattern.map((row, i) => (
        <div key={i} style={{ letterSpacing: '-1px' }}>
          {row.split('').map((char, j) => (
            <span
              key={j}
              style={{
                opacity: char === '█' ? (0.3 + Math.sin((tick + i + j) * 0.15) * 0.4) : 0,
              }}
            >
              {char === '█' ? '●' : ' '}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

// Waveform pattern - for motion/audio effects
function WaveformPattern({ tick }: { tick: number }) {
  const width = 24
  const height = 11

  return (
    <div className="text-[6px] leading-[6px]" style={{ color: 'var(--accent)' }}>
      {Array.from({ length: height }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: width }, (_, x) => {
            const wave = Math.sin((x * 0.5) + (tick * 0.2)) * 4
            const centerY = height / 2
            const dist = Math.abs(y - centerY - wave)
            const visible = dist < 1.5
            return (
              <span
                key={x}
                style={{
                  opacity: visible ? (0.8 - dist * 0.3) : 0,
                }}
              >
                ●
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Grid pulse pattern - for glitch effects
function GridPulsePattern({ tick }: { tick: number }) {
  const size = 8

  return (
    <div className="flex flex-col gap-[1px]">
      {Array.from({ length: size }, (_, y) => (
        <div key={y} className="flex gap-[1px]">
          {Array.from({ length: size }, (_, x) => {
            const dist = Math.sqrt(Math.pow(x - size/2 + 0.5, 2) + Math.pow(y - size/2 + 0.5, 2))
            const wave = Math.sin(dist * 0.8 - tick * 0.3)
            const glitch = Math.random() > 0.95 ? 1 : 0
            return (
              <div
                key={x}
                className="w-2 h-2"
                style={{
                  backgroundColor: wave > 0 || glitch ? 'var(--accent)' : 'var(--bg-elevated)',
                  opacity: wave > 0 ? (0.3 + wave * 0.7) : (glitch ? 1 : 0.3),
                  transition: 'opacity 0.1s',
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Spiral pattern - for acid effects
function SpiralPattern({ tick }: { tick: number }) {
  const size = 14
  const center = size / 2

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: 'var(--text-secondary)' }}>
      {Array.from({ length: size }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: size }, (_, x) => {
            const dx = x - center + 0.5
            const dy = y - center + 0.5
            const angle = Math.atan2(dy, dx)
            const dist = Math.sqrt(dx * dx + dy * dy)
            const spiral = Math.sin(angle * 3 + dist * 0.5 - tick * 0.15)
            const visible = spiral > 0.3 && dist < center
            return (
              <span
                key={x}
                style={{
                  opacity: visible ? (0.4 + spiral * 0.6) : 0,
                }}
              >
                ●
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Hexagon pattern - for strand effects
function HexagonPattern({ tick }: { tick: number }) {
  const points = [
    [7, 0], [13, 3], [13, 9], [7, 12], [1, 9], [1, 3]
  ]
  const size = 14

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: '#00d4ff' }}>
      {Array.from({ length: size }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: size }, (_, x) => {
            // Check if point is on hexagon edge
            let onEdge = false
            let minDist = Infinity
            for (let i = 0; i < points.length; i++) {
              const [x1, y1] = points[i]
              const [x2, y2] = points[(i + 1) % points.length]
              // Distance from point to line segment
              const dx = x2 - x1
              const dy = y2 - y1
              const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
              const px = x1 + t * dx
              const py = y1 + t * dy
              const dist = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2))
              minDist = Math.min(minDist, dist)
            }
            onEdge = minDist < 1.2
            const pulse = Math.sin(tick * 0.1 + minDist * 0.5)
            return (
              <span
                key={x}
                style={{
                  opacity: onEdge ? (0.5 + pulse * 0.5) : 0,
                }}
              >
                ●
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Radar sweep pattern - for vision/tracking effects
function RadarPattern({ tick }: { tick: number }) {
  const size = 14
  const center = size / 2

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: '#22c55e' }}>
      {Array.from({ length: size }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: size }, (_, x) => {
            const dx = x - center + 0.5
            const dy = y - center + 0.5
            const angle = Math.atan2(dy, dx)
            const dist = Math.sqrt(dx * dx + dy * dy)
            const sweepAngle = (tick * 0.1) % (Math.PI * 2)
            let angleDiff = angle - sweepAngle
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
            const inSweep = angleDiff > -0.5 && angleDiff < 0 && dist < center
            const onRing = Math.abs(dist - center + 1) < 0.8 || Math.abs(dist - center/2) < 0.6
            return (
              <span
                key={x}
                style={{
                  opacity: inSweep ? (0.8 + angleDiff * 1.5) : (onRing ? 0.3 : 0),
                }}
              >
                ●
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Bars/equalizer pattern - for media playing
function BarsPattern({ tick }: { tick: number }) {
  const barCount = 12
  const maxHeight = 11

  return (
    <div className="flex items-end gap-[2px] h-[44px]">
      {Array.from({ length: barCount }, (_, i) => {
        const height = Math.floor(
          (Math.sin(tick * 0.2 + i * 0.7) * 0.5 + 0.5) *
          (Math.sin(tick * 0.13 + i * 1.2) * 0.3 + 0.7) *
          maxHeight
        ) + 2
        return (
          <div
            key={i}
            className="w-1.5 transition-all duration-75"
            style={{
              height: `${height * 4}px`,
              backgroundColor: 'var(--accent)',
              opacity: 0.5 + (height / maxHeight) * 0.5,
            }}
          />
        )
      })}
    </div>
  )
}

// Circuit pattern - for overlay effects
function CircuitPattern({ tick }: { tick: number }) {
  const paths = [
    [[0,2], [4,2], [4,5], [8,5]],
    [[0,6], [3,6], [3,3], [7,3], [7,7], [10,7]],
    [[0,10], [5,10], [5,8], [9,8], [9,4], [12,4]],
    [[2,0], [2,4], [6,4], [6,9], [11,9]],
  ]
  const width = 14
  const height = 12

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: 'var(--text-muted)' }}>
      {Array.from({ length: height }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: width }, (_, x) => {
            let onPath = false
            let pathProgress = 0
            paths.forEach((path, pi) => {
              for (let i = 0; i < path.length - 1; i++) {
                const [x1, y1] = path[i]
                const [x2, y2] = path[i + 1]
                if (x1 === x2 && x === x1 && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)) {
                  onPath = true
                  pathProgress = (pi * 10 + i) / 40
                }
                if (y1 === y2 && y === y1 && x >= Math.min(x1, x2) && x <= Math.max(x1, x2)) {
                  onPath = true
                  pathProgress = (pi * 10 + i) / 40
                }
              }
            })
            const pulse = Math.sin(tick * 0.15 - pathProgress * 20)
            return (
              <span
                key={x}
                style={{
                  opacity: onPath ? (0.3 + pulse * 0.4) : 0,
                }}
              >
                {onPath ? '█' : ' '}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Diamond pattern - for color effects
function DiamondPattern({ tick }: { tick: number }) {
  const size = 13
  const center = Math.floor(size / 2)

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: '#f59e0b' }}>
      {Array.from({ length: size }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: size }, (_, x) => {
            const dist = Math.abs(x - center) + Math.abs(y - center)
            const maxDist = center
            const ring1 = Math.abs(dist - maxDist) < 0.8
            const ring2 = Math.abs(dist - maxDist/2) < 0.8
            const ring3 = dist < 1.2
            const pulse = Math.sin(tick * 0.12 - dist * 0.3)
            return (
              <span
                key={x}
                style={{
                  opacity: (ring1 || ring2 || ring3) ? (0.4 + pulse * 0.6) : 0,
                }}
              >
                ●
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Matrix rain pattern - falling characters
function MatrixRainPattern({ tick }: { tick: number }) {
  const width = 16
  const height = 11
  const chars = '01アイウエオカキクケコ'

  return (
    <div className="text-[6px] leading-[5px] font-mono" style={{ color: '#22c55e' }}>
      {Array.from({ length: height }, (_, y) => (
        <div key={y} style={{ letterSpacing: '0px' }}>
          {Array.from({ length: width }, (_, x) => {
            const col = (x * 7 + 3) % width
            const drop = ((tick * 0.5 + col * 3) % 15)
            const dist = y - drop
            const visible = dist >= -3 && dist <= 0
            const char = chars[Math.floor((tick + x * 3 + y * 7) % chars.length)]
            return (
              <span
                key={x}
                style={{
                  opacity: visible ? (1 + dist * 0.3) : 0.05,
                }}
              >
                {visible ? char : '·'}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Heartbeat/pulse pattern - medical monitor style
function HeartbeatPattern({ tick }: { tick: number }) {
  const width = 28
  const height = 9

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: '#ef4444' }}>
      {Array.from({ length: height }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: width }, (_, x) => {
            const phase = (x - tick * 0.8) % 14
            const centerY = height / 2
            let targetY = centerY
            if (phase >= 0 && phase < 2) targetY = centerY
            else if (phase >= 2 && phase < 3) targetY = centerY - 3
            else if (phase >= 3 && phase < 4) targetY = centerY + 2
            else if (phase >= 4 && phase < 5) targetY = centerY - 1
            else if (phase >= 5 && phase < 6) targetY = centerY
            const dist = Math.abs(y - targetY)
            return (
              <span key={x} style={{ opacity: dist < 0.8 ? 1 : 0.05 }}>
                {dist < 0.8 ? '█' : '·'}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// DNA helix pattern - double helix rotation
function DNAHelixPattern({ tick }: { tick: number }) {
  const width = 18
  const height = 11

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: '#a855f7' }}>
      {Array.from({ length: height }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: width }, (_, x) => {
            const phase = tick * 0.15 + x * 0.4
            const strand1 = Math.sin(phase) * 3 + height / 2
            const strand2 = Math.sin(phase + Math.PI) * 3 + height / 2
            const onStrand1 = Math.abs(y - strand1) < 0.8
            const onStrand2 = Math.abs(y - strand2) < 0.8
            const onBridge = x % 3 === 0 && y > Math.min(strand1, strand2) && y < Math.max(strand1, strand2)
            return (
              <span
                key={x}
                style={{
                  opacity: (onStrand1 || onStrand2) ? 1 : onBridge ? 0.5 : 0.05,
                  color: onStrand1 ? '#a855f7' : onStrand2 ? '#ec4899' : '#666',
                }}
              >
                {(onStrand1 || onStrand2 || onBridge) ? '●' : '·'}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Concentric rings pattern - expanding circles
function RingsPattern({ tick }: { tick: number }) {
  const size = 13
  const center = size / 2

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: '#06b6d4' }}>
      {Array.from({ length: size }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: size }, (_, x) => {
            const dist = Math.sqrt(Math.pow(x - center + 0.5, 2) + Math.pow(y - center + 0.5, 2))
            const wave = (dist - tick * 0.3) % 3
            const visible = wave > 0 && wave < 1
            return (
              <span key={x} style={{ opacity: visible ? (1 - wave) : 0.05 }}>
                {visible ? '○' : '·'}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Maze pattern - animated path finding
function MazePattern({ tick }: { tick: number }) {
  const maze = [
    '██████████████',
    '█            █',
    '█ ████ ████ ██',
    '█ █      █   █',
    '█ █ ████ ███ █',
    '█   █  █   █ █',
    '███ █ ██ █ █ █',
    '█   █    █   █',
    '██████████████',
  ]

  return (
    <div className="text-[5px] leading-[5px] font-mono" style={{ color: 'var(--text-muted)' }}>
      {maze.map((row, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {row.split('').map((char, x) => {
            const pathPhase = (tick * 0.2 + x * 0.1 + y * 0.1) % 6
            const isPath = char === ' ' && pathPhase < 1
            return (
              <span
                key={x}
                style={{
                  opacity: char === '█' ? 0.4 : isPath ? 1 : 0.15,
                  color: isPath ? 'var(--accent)' : undefined,
                }}
              >
                {char === '█' ? '█' : isPath ? '●' : '·'}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Constellation pattern - connected stars
function ConstellationPattern({ tick }: { tick: number }) {
  const stars = [
    [2, 1], [5, 2], [9, 1], [12, 3],
    [1, 5], [6, 6], [10, 5], [13, 7],
    [3, 9], [7, 8], [11, 10], [4, 11],
  ]
  const connections = [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [8, 9], [9, 10], [5, 9], [1, 5]]
  const width = 15
  const height = 12

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: '#fbbf24' }}>
      {Array.from({ length: height }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: width }, (_, x) => {
            const isStar = stars.some(([sx, sy]) => sx === x && sy === y)
            let onLine = false
            connections.forEach(([a, b]) => {
              const [x1, y1] = stars[a]
              const [x2, y2] = stars[b]
              const dx = x2 - x1, dy = y2 - y1
              const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy + 0.001)))
              const dist = Math.sqrt(Math.pow(x - x1 - t * dx, 2) + Math.pow(y - y1 - t * dy, 2))
              if (dist < 0.7) onLine = true
            })
            const twinkle = Math.sin(tick * 0.3 + x * 2 + y * 3) > 0.5
            return (
              <span
                key={x}
                style={{
                  opacity: isStar ? (twinkle ? 1 : 0.7) : onLine ? 0.3 : 0.05,
                }}
              >
                {isStar ? '★' : onLine ? '·' : ' '}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Tetris pattern - falling blocks
function TetrisPattern({ tick }: { tick: number }) {
  const width = 10
  const height = 12
  const pieces = [
    { x: 2, y: (tick * 0.3) % 14 - 2, shape: [[1, 1], [1, 1]], color: '#fbbf24' },
    { x: 5, y: (tick * 0.25 + 5) % 14 - 2, shape: [[1, 1, 1, 1]], color: '#06b6d4' },
    { x: 7, y: (tick * 0.35 + 8) % 14 - 2, shape: [[1, 1, 0], [0, 1, 1]], color: '#22c55e' },
  ]

  return (
    <div className="flex flex-col gap-[1px]">
      {Array.from({ length: height }, (_, y) => (
        <div key={y} className="flex gap-[1px]">
          {Array.from({ length: width }, (_, x) => {
            let filled = false
            let color = 'var(--bg-elevated)'
            pieces.forEach(p => {
              p.shape.forEach((row, py) => {
                row.forEach((cell, px) => {
                  if (cell && Math.floor(p.x + px) === x && Math.floor(p.y + py) === y) {
                    filled = true
                    color = p.color
                  }
                })
              })
            })
            const stacked = y >= 9 && ((x + y) % 3 !== 0)
            return (
              <div
                key={x}
                className="w-1.5 h-1.5"
                style={{
                  backgroundColor: filled ? color : stacked ? 'var(--text-ghost)' : 'var(--bg-elevated)',
                  opacity: filled ? 1 : stacked ? 0.4 : 0.3,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Pendulum pattern - swinging motion
function PendulumPattern({ tick }: { tick: number }) {
  const width = 16
  const height = 11
  const pivotX = width / 2
  const pivotY = 1
  const length = 8
  const angle = Math.sin(tick * 0.12) * 0.8

  const bobX = pivotX + Math.sin(angle) * length
  const bobY = pivotY + Math.cos(angle) * length

  return (
    <div className="text-[6px] leading-[5px]" style={{ color: '#f97316' }}>
      {Array.from({ length: height }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: width }, (_, x) => {
            const isPivot = Math.abs(x - pivotX) < 1 && y === pivotY
            const isBob = Math.sqrt(Math.pow(x - bobX, 2) + Math.pow(y - bobY, 2)) < 1.5
            // Line from pivot to bob
            const t = Math.max(0, Math.min(1, ((x - pivotX) * (bobX - pivotX) + (y - pivotY) * (bobY - pivotY)) / (Math.pow(bobX - pivotX, 2) + Math.pow(bobY - pivotY, 2) + 0.001)))
            const lineX = pivotX + t * (bobX - pivotX)
            const lineY = pivotY + t * (bobY - pivotY)
            const onLine = Math.sqrt(Math.pow(x - lineX, 2) + Math.pow(y - lineY, 2)) < 0.6
            return (
              <span
                key={x}
                style={{ opacity: isPivot ? 0.8 : isBob ? 1 : onLine ? 0.5 : 0.05 }}
              >
                {isPivot ? '●' : isBob ? '◉' : onLine ? '│' : '·'}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Binary stream pattern - flowing 0s and 1s
function BinaryPattern({ tick }: { tick: number }) {
  const width = 20
  const height = 9

  return (
    <div className="text-[6px] leading-[6px] font-mono" style={{ color: '#10b981' }}>
      {Array.from({ length: height }, (_, y) => (
        <div key={y} style={{ letterSpacing: '0px' }}>
          {Array.from({ length: width }, (_, x) => {
            const flow = (x + tick * 0.5 + y * 2) % 10
            const active = flow < 5
            const bit = ((x * 7 + y * 13 + Math.floor(tick * 0.3)) % 2)
            return (
              <span key={x} style={{ opacity: active ? 0.8 - flow * 0.1 : 0.1 }}>
                {bit ? '1' : '0'}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Prism/refraction pattern - light splitting
function PrismPattern({ tick }: { tick: number }) {
  const width = 16
  const height = 11
  const colors = ['#ef4444', '#f97316', '#fbbf24', '#22c55e', '#06b6d4', '#8b5cf6']

  return (
    <div className="text-[6px] leading-[5px]">
      {Array.from({ length: height }, (_, y) => (
        <div key={y} style={{ letterSpacing: '-1px' }}>
          {Array.from({ length: width }, (_, x) => {
            // Triangle prism in center
            const inPrism = x >= 6 && x <= 9 && y >= 2 && y <= 8 && (x - 6) <= (y - 2) * 0.5 + 1
            // Light rays
            const rayIndex = Math.floor((y - 2) * colors.length / 7)
            const rayX = 10 + (y - 5) * 0.8 + tick * 0.1
            const onRay = x >= 10 && x < rayX + 3 && rayIndex >= 0 && rayIndex < colors.length && Math.abs(y - (2 + rayIndex * 7 / colors.length)) < 0.8
            // Incoming light
            const incoming = x < 6 && Math.abs(y - 5) < 0.8
            return (
              <span
                key={x}
                style={{
                  opacity: inPrism ? 0.6 : (onRay || incoming) ? 0.9 : 0.05,
                  color: onRay ? colors[rayIndex] : incoming ? '#fff' : 'var(--text-muted)',
                }}
              >
                {inPrism ? '▲' : (onRay || incoming) ? '─' : '·'}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Modulation pattern - shows LFO/modulation waveforms
function ModulationPattern({ lfoValue, randomValue, stepValue, envValue }: {
  lfoValue: number
  randomValue: number
  stepValue: number
  envValue: number
}) {
  const width = 24

  return (
    <div className="flex flex-col gap-[2px]">
      {/* Four horizontal waveform bars */}
      {[
        { value: lfoValue, color: '#00D4FF', label: 'L' },
        { value: randomValue, color: '#FF6B6B', label: 'R' },
        { value: stepValue, color: '#4ECDC4', label: 'S' },
        { value: envValue, color: '#22c55e', label: 'E' },
      ].map((mod, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="text-[8px] w-2" style={{ color: mod.color }}>{mod.label}</span>
          <div className="flex gap-[1px]">
            {Array.from({ length: width }, (_, x) => {
              const threshold = mod.value * width
              const active = x < threshold
              const edge = Math.abs(x - threshold) < 1
              return (
                <div
                  key={x}
                  className="w-1 h-1.5"
                  style={{
                    backgroundColor: active ? mod.color : 'var(--bg-elevated)',
                    opacity: active ? (edge ? 1 : 0.6) : 0.3,
                    boxShadow: edge && active ? `0 0 3px ${mod.color}` : 'none',
                  }}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// THEME TOGGLE BAR
// ════════════════════════════════════════════════════════════════════════════

interface ThemeToggleBarProps {
  source: string
  patternLabel: string
  isProcessing: boolean
}

function ThemeToggleBar({ source, patternLabel, isProcessing }: ThemeToggleBarProps) {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div
      className="flex-shrink-0 w-full px-3 py-1.5 flex items-center justify-center gap-2"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <span className="text-[8px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
        {source !== 'none' ? 'LINKED' : 'OFFLINE'} · {patternLabel} · {isProcessing ? 'PROCESSING' : 'IDLE'}
      </span>
      <button
        onClick={toggleTheme}
        className="text-[10px] hover:opacity-100 transition-opacity"
        style={{ color: 'var(--text-ghost)', opacity: 0.7 }}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? '◐' : '◑'}
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

type PatternType = 'idle' | 'glitch' | 'acid' | 'strand' | 'motion' | 'vision' | 'overlay' | 'color' | 'media' | 'modulation'

export function DataTerminal() {
  const { crossfaderPosition } = useRoutingStore()
  const { source, isPlaying } = useMediaStore()
  const { selectedEffectId } = useUIStore()
  const glitch = useGlitchEngineStore()
  const acid = useAcidStore()
  const strand = useStrandStore()
  const motion = useMotionStore()
  const ascii = useAsciiRenderStore()
  const vision = useVisionTrackingStore()
  const modulation = useModulationStore()
  const { routings } = useSequencerStore()

  // Count modulation routings
  const modRoutingCount = useMemo(() => {
    return routings.filter(r => ['lfo', 'random', 'step', 'envelope'].includes(r.trackId)).length
  }, [routings])

  // Check if any modulation source is active
  const hasModulation = modulation.lfo.enabled || modulation.random.enabled || modulation.step.enabled || modulation.envelope.enabled

  // Determine which pattern to show based on selected effect or active effects
  const activePattern = useMemo((): PatternType => {
    // Check selected effect first
    if (selectedEffectId) {
      if (selectedEffectId.startsWith('acid_')) return 'acid'
      if (selectedEffectId.startsWith('strand_')) return 'strand'
      if (selectedEffectId.startsWith('track_')) return 'vision'
      if (selectedEffectId.startsWith('motion_') || selectedEffectId === 'echo_trail' || selectedEffectId === 'time_smear' || selectedEffectId === 'freeze_mask') return 'motion'
      if (selectedEffectId === 'texture_overlay' || selectedEffectId === 'data_overlay') return 'overlay'
      if (selectedEffectId === 'color_grade' || selectedEffectId === 'posterize') return 'color'
      // Default glitch effects
      return 'glitch'
    }

    // Check modulation first (highest priority when active)
    if (hasModulation) return 'modulation'

    // Check what's active
    if (isPlaying && source !== 'none') return 'media'

    // Check effect categories
    const hasMotion = motion.motionExtractEnabled || motion.echoTrailEnabled || motion.timeSmearEnabled || motion.freezeMaskEnabled
    if (hasMotion) return 'motion'

    const hasVision = vision.brightEnabled || vision.edgeEnabled || vision.colorEnabled || vision.motionEnabled || vision.faceEnabled || vision.handsEnabled
    if (hasVision) return 'vision'

    const hasAcid = acid.dotsEnabled || acid.glyphEnabled || acid.iconsEnabled || acid.mirrorEnabled || acid.sliceEnabled || acid.voronoiEnabled
    if (hasAcid) return 'acid'

    const hasStrand = strand.timefallEnabled || strand.voidOutEnabled || strand.chiralPathEnabled || strand.odradekEnabled
    if (hasStrand) return 'strand'

    const hasGlitch = glitch.rgbSplitEnabled || glitch.blockDisplaceEnabled || glitch.noiseEnabled || glitch.pixelateEnabled || glitch.vhsTrackingEnabled
    if (hasGlitch) return 'glitch'

    const hasColor = glitch.colorGradeEnabled || glitch.posterizeEnabled
    if (hasColor) return 'color'

    return 'idle'
  }, [selectedEffectId, isPlaying, source, motion, vision, acid, strand, glitch, hasModulation])

  // Count active effects
  const activeEffectCount = useMemo(() => {
    let count = 0
    // Glitch effects
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
    // Acid effects
    if (acid.dotsEnabled) count++
    if (acid.glyphEnabled) count++
    if (acid.iconsEnabled) count++
    if (acid.contourEnabled) count++
    if (acid.decompEnabled) count++
    if (acid.mirrorEnabled) count++
    if (acid.sliceEnabled) count++
    if (acid.thGridEnabled) count++
    if (acid.cloudEnabled) count++
    if (acid.ledEnabled) count++
    if (acid.slitEnabled) count++
    if (acid.voronoiEnabled) count++
    // Motion effects
    if (motion.motionExtractEnabled) count++
    if (motion.echoTrailEnabled) count++
    if (motion.timeSmearEnabled) count++
    if (motion.freezeMaskEnabled) count++
    // ASCII effect
    if (ascii.enabled) count++
    return count
  }, [glitch, acid, motion, ascii])

  // Animation tick
  const [tick, setTick] = useState(0)
  const [codes, setCodes] = useState<string[]>([])
  const [idlePatternIndex, setIdlePatternIndex] = useState(0)

  // All idle patterns for random cycling
  const idlePatterns = useMemo(() => [
    'star', 'matrix', 'heartbeat', 'dna', 'rings',
    'maze', 'constellation', 'tetris', 'pendulum', 'binary', 'prism'
  ] as const, [])

  // Cycle through idle patterns randomly
  useEffect(() => {
    if (activePattern === 'idle') {
      const interval = setInterval(() => {
        setIdlePatternIndex(prev => {
          let next = Math.floor(Math.random() * idlePatterns.length)
          while (next === prev && idlePatterns.length > 1) {
            next = Math.floor(Math.random() * idlePatterns.length)
          }
          return next
        })
      }, 20000) // Change every 20 seconds
      return () => clearInterval(interval)
    }
  }, [activePattern, idlePatterns.length])

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

  // Sensor data - shows modulation data when active, otherwise default sensors
  const sensorData = useMemo(() => {
    if (hasModulation) {
      // Show modulation-specific data
      const data: { label: string; type: string; value: string; color?: string }[] = []
      if (modulation.lfo.enabled) {
        data.push({
          label: 'L',
          type: `${modulation.lfo.shape.toUpperCase().slice(0, 3)} ${modulation.lfo.rate.toFixed(1)}Hz`,
          value: padNumber(Math.floor(modulation.lfo.currentValue * 9999), 4),
          color: '#00D4FF',
        })
      }
      if (modulation.random.enabled) {
        data.push({
          label: 'R',
          type: `RND ${modulation.random.rate.toFixed(0)}/s`,
          value: padNumber(Math.floor(modulation.random.currentValue * 9999), 4),
          color: '#FF6B6B',
        })
      }
      if (modulation.step.enabled) {
        data.push({
          label: 'S',
          type: `STP ${modulation.step.currentStep + 1}/8`,
          value: padNumber(Math.floor(modulation.step.currentValue * 9999), 4),
          color: '#4ECDC4',
        })
      }
      if (modulation.envelope.enabled) {
        data.push({
          label: 'E',
          type: `ENV ${modulation.envelope.phase.toUpperCase().slice(0, 3)}`,
          value: padNumber(Math.floor(modulation.envelope.currentValue * 9999), 4),
          color: '#22c55e',
        })
      }
      // Fill remaining slots with routing count
      if (data.length < 4) {
        data.push({
          label: '→',
          type: 'Routes',
          value: padNumber(modRoutingCount, 4),
        })
      }
      return data
    }

    // Default sensor data
    return [
      { label: 'Y', type: 'Sensor', value: padNumber(Math.floor(crossfaderPosition * 9999), 4) },
      { label: 'Z', type: 'Sensor', value: padNumber(Math.floor((1 - crossfaderPosition) * 9999), 4) },
      { label: 'A', type: 'Sensor', value: padNumber(activeEffectCount * 547 + (tick % 100), 4) },
      { label: 'B', type: 'Sensor', value: padNumber((tick * 17) % 10000, 4) },
    ]
  }, [crossfaderPosition, activeEffectCount, tick, hasModulation, modulation, modRoutingCount])

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

  // Status label based on pattern
  const patternLabels: Record<PatternType, string> = {
    idle: 'STANDBY',
    glitch: 'GLITCH',
    acid: 'ACID',
    strand: 'STRAND',
    motion: 'MOTION',
    vision: 'VISION',
    overlay: 'OVERLAY',
    color: 'COLOR',
    media: 'ACTIVE',
    modulation: 'MOD',
  }

  // Render idle pattern based on cycling index
  const renderIdlePattern = () => {
    const pattern = idlePatterns[idlePatternIndex]
    switch (pattern) {
      case 'star': return <StarPattern tick={tick} />
      case 'matrix': return <MatrixRainPattern tick={tick} />
      case 'heartbeat': return <HeartbeatPattern tick={tick} />
      case 'dna': return <DNAHelixPattern tick={tick} />
      case 'rings': return <RingsPattern tick={tick} />
      case 'maze': return <MazePattern tick={tick} />
      case 'constellation': return <ConstellationPattern tick={tick} />
      case 'tetris': return <TetrisPattern tick={tick} />
      case 'pendulum': return <PendulumPattern tick={tick} />
      case 'binary': return <BinaryPattern tick={tick} />
      case 'prism': return <PrismPattern tick={tick} />
      default: return <StarPattern tick={tick} />
    }
  }

  // Render the active pattern
  const renderPattern = () => {
    switch (activePattern) {
      case 'glitch': return <GridPulsePattern tick={tick} />
      case 'acid': return <SpiralPattern tick={tick} />
      case 'strand': return <HexagonPattern tick={tick} />
      case 'motion': return <WaveformPattern tick={tick} />
      case 'vision': return <RadarPattern tick={tick} />
      case 'overlay': return <CircuitPattern tick={tick} />
      case 'color': return <DiamondPattern tick={tick} />
      case 'media': return <BarsPattern tick={tick} />
      case 'modulation': return (
        <ModulationPattern
          lfoValue={modulation.lfo.enabled ? modulation.lfo.currentValue : 0}
          randomValue={modulation.random.enabled ? modulation.random.currentValue : 0}
          stepValue={modulation.step.enabled ? modulation.step.currentValue : 0}
          envValue={modulation.envelope.enabled ? modulation.envelope.currentValue : 0}
        />
      )
      default: return renderIdlePattern()
    }
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden font-mono select-none"
      style={{ color: 'var(--text-secondary)' }}
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
        <div className="text-[9px] uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-ghost)' }}>
          <span>AQF STATUS:</span>
          <span style={{ color: 'var(--accent)' }}>{patternLabels[activePattern]}</span>
        </div>
      </div>

      {/* Animated pattern */}
      <div
        className="flex-shrink-0 px-2 py-3 flex justify-center items-center"
        style={{ borderBottom: '1px solid var(--border)', minHeight: '70px' }}
      >
        {renderPattern()}
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
        className="flex-shrink-0 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {codes.map((code, i) => (
          <div
            key={i}
            className="text-[10px] tracking-wider text-center"
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
              <span style={{ color: sensor.color || 'var(--text-secondary)' }}>{sensor.label}:</span>
              <span>{sensor.type}</span>
              <span className="ml-auto tabular-nums" style={{ color: sensor.color || 'var(--text-secondary)' }}>
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

      {/* Status bar / Theme toggle */}
      <ThemeToggleBar
        source={source}
        patternLabel={patternLabels[activePattern]}
        isProcessing={activeEffectCount > 0}
      />
    </div>
  )
}
