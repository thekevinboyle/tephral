# Diagonal Euclidean Sequencer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a euclidean sequencer with diagonal cascade visualization - stacked scan lines creating interference patterns, with parameter strips below for precise control.

**Architecture:** Zustand store holds multi-track state with Bjorklund pattern generation. rAF engine advances each track independently based on step count and clock divider. Canvas renders diagonal lines with hits as solid blocks and rests as dashed fragments. Tracks output 0-1 modulation values routed through existing system.

**Tech Stack:** React, Zustand, Canvas 2D API, existing modulation routing system

---

## Task 1: Create polyEuclidStore

**Files:**
- Create: `src/stores/polyEuclidStore.ts`

**Implementation:**

```typescript
import { create } from 'zustand'

// Bjorklund's algorithm for euclidean rhythm distribution
function bjorklund(hits: number, steps: number): boolean[] {
  if (hits >= steps) return Array(steps).fill(true)
  if (hits <= 0) return Array(steps).fill(false)

  let pattern: number[][] = []
  let remainder: number[][] = []

  for (let i = 0; i < steps; i++) {
    if (i < hits) {
      pattern.push([1])
    } else {
      remainder.push([0])
    }
  }

  while (remainder.length > 1) {
    const newPattern: number[][] = []
    const minLen = Math.min(pattern.length, remainder.length)

    for (let i = 0; i < minLen; i++) {
      newPattern.push([...pattern[i], ...remainder[i]])
    }

    const leftoverPattern = pattern.slice(minLen)
    const leftoverRemainder = remainder.slice(minLen)

    pattern = newPattern
    remainder = leftoverPattern.length > 0 ? leftoverPattern : leftoverRemainder
  }

  const result = [...pattern, ...remainder].flat()
  return result.map(v => v === 1)
}

function rotatePattern(pattern: boolean[], offset: number): boolean[] {
  if (offset === 0 || pattern.length === 0) return pattern
  const normalizedOffset = ((offset % pattern.length) + pattern.length) % pattern.length
  return [...pattern.slice(normalizedOffset), ...pattern.slice(0, normalizedOffset)]
}

export interface PolyEuclidTrack {
  id: string
  steps: number        // 2-16
  hits: number         // 1 to steps
  rotation: number     // 0 to steps-1
  clockDivider: number // 0.25, 0.5, 1, 2, 4
  decay: number        // 0-1
  muted: boolean
  currentStep: number
  currentValue: number // 0-1 output for modulation
  angle: number        // diagonal angle in degrees
}

interface PolyEuclidState {
  tracks: PolyEuclidTrack[]
  maxTracks: number

  addTrack: () => void
  removeTrack: (id: string) => void
  updateTrack: (id: string, updates: Partial<PolyEuclidTrack>) => void
  setCurrentStep: (id: string, step: number) => void
  setCurrentValue: (id: string, value: number) => void
  getPattern: (id: string) => boolean[]
}

// Track angles for diagonal cascade effect
const TRACK_ANGLES = [-60, -30, 30, 60, -45, 45, -15, 15]

function createTrack(index: number): PolyEuclidTrack {
  return {
    id: `track-${index}-${Date.now()}`,
    steps: 8,
    hits: 3,
    rotation: 0,
    clockDivider: 1,
    decay: 0.5,
    muted: false,
    currentStep: 0,
    currentValue: 0,
    angle: TRACK_ANGLES[index % TRACK_ANGLES.length],
  }
}

export const usePolyEuclidStore = create<PolyEuclidState>((set, get) => ({
  tracks: [
    createTrack(0),
    createTrack(1),
    createTrack(2),
    createTrack(3),
  ],
  maxTracks: 8,

  addTrack: () => {
    const { tracks, maxTracks } = get()
    if (tracks.length >= maxTracks) return
    set({ tracks: [...tracks, createTrack(tracks.length)] })
  },

  removeTrack: (id) => {
    const { tracks } = get()
    if (tracks.length <= 1) return
    set({ tracks: tracks.filter(t => t.id !== id) })
  },

  updateTrack: (id, updates) => {
    set(state => ({
      tracks: state.tracks.map(t => {
        if (t.id !== id) return t
        const updated = { ...t, ...updates }
        // Clamp values
        updated.steps = Math.max(2, Math.min(16, updated.steps))
        updated.hits = Math.max(1, Math.min(updated.steps, updated.hits))
        updated.rotation = Math.max(0, Math.min(updated.steps - 1, updated.rotation))
        updated.clockDivider = Math.max(0.25, Math.min(4, updated.clockDivider))
        updated.decay = Math.max(0, Math.min(1, updated.decay))
        return updated
      })
    }))
  },

  setCurrentStep: (id, step) => {
    set(state => ({
      tracks: state.tracks.map(t =>
        t.id === id ? { ...t, currentStep: step } : t
      )
    }))
  },

  setCurrentValue: (id, value) => {
    set(state => ({
      tracks: state.tracks.map(t =>
        t.id === id ? { ...t, currentValue: Math.max(0, Math.min(1, value)) } : t
      )
    }))
  },

  getPattern: (id) => {
    const track = get().tracks.find(t => t.id === id)
    if (!track) return []
    const basePattern = bjorklund(track.hits, track.steps)
    return rotatePattern(basePattern, track.rotation)
  },
}))
```

**Commit:** `feat(sequencer): add polyEuclidStore for multi-track euclidean patterns`

---

## Task 2: Create usePolyEuclidEngine hook

**Files:**
- Create: `src/hooks/usePolyEuclidEngine.ts`

**Implementation:**

```typescript
import { useEffect, useRef } from 'react'
import { usePolyEuclidStore } from '../stores/polyEuclidStore'
import { useSequencerStore } from '../stores/sequencerStore'

export function usePolyEuclidEngine() {
  const { isPlaying, bpm } = useSequencerStore()
  const frameRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const trackTimersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const animate = (timestamp: number) => {
      const deltaTime = lastFrameTimeRef.current
        ? (timestamp - lastFrameTimeRef.current) / 1000
        : 0
      lastFrameTimeRef.current = timestamp

      const store = usePolyEuclidStore.getState()

      for (const track of store.tracks) {
        // Calculate step interval: 16th note base, modified by clock divider
        // Higher divider = faster, lower divider = slower
        const baseInterval = (60 / bpm) / 4 * 1000 // ms per 16th note
        const stepInterval = baseInterval / track.clockDivider

        // Get or init timer for this track
        let lastStepTime = trackTimersRef.current.get(track.id) ?? timestamp
        const timeSinceLastStep = timestamp - lastStepTime

        // Advance step if playing and interval elapsed
        if (isPlaying && timeSinceLastStep >= stepInterval) {
          trackTimersRef.current.set(track.id, timestamp)

          const nextStep = (track.currentStep + 1) % track.steps
          store.setCurrentStep(track.id, nextStep)

          // Check if this step is a hit
          if (!track.muted) {
            const pattern = store.getPattern(track.id)
            if (pattern[nextStep]) {
              store.setCurrentValue(track.id, 1)
            }
          }
        }

        // Apply decay to current value (even when not playing, for smooth fadeout)
        if (track.currentValue > 0.001) {
          const decayRate = 1 + track.decay * 20
          const newValue = track.currentValue * Math.exp(-decayRate * deltaTime)
          store.setCurrentValue(track.id, newValue)
        } else if (track.currentValue !== 0) {
          store.setCurrentValue(track.id, 0)
        }
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isPlaying, bpm])

  return null
}
```

**Commit:** `feat(sequencer): add usePolyEuclidEngine for multi-track timing`

---

## Task 3: Update sequencerContainerStore for tabs

**Files:**
- Modify: `src/stores/sequencerContainerStore.ts`

**Change type to include euclid:**

```typescript
import { create } from 'zustand'

export type SequencerType = 'slicer' | 'euclid'

interface SequencerContainerState {
  activeSequencer: SequencerType
  setActiveSequencer: (id: SequencerType) => void
}

export const useSequencerContainerStore = create<SequencerContainerState>((set) => ({
  activeSequencer: 'slicer',
  setActiveSequencer: (id) => set({ activeSequencer: id }),
}))
```

**Commit:** `feat(sequencer): expand SequencerType to include euclid tab`

---

## Task 4: Create DiagonalCascade Canvas component

**Files:**
- Create: `src/components/sequencer/DiagonalCascade.tsx`

**Implementation:**

```typescript
import { useRef, useEffect, useCallback } from 'react'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'

const CREAM = '#E8E4D9'
const GRID_SIZE = 20

interface DiagonalCascadeProps {
  width: number
  height: number
}

export function DiagonalCascade({ width, height }: DiagonalCascadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { tracks, getPattern } = usePolyEuclidStore()

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.fillStyle = 'var(--bg-surface)'
    ctx.fillRect(0, 0, width, height)

    // Draw subtle grid
    ctx.strokeStyle = CREAM
    ctx.globalAlpha = 0.05
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += GRID_SIZE) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Draw each track's diagonal
    const centerX = width / 2
    const centerY = height / 2

    for (const track of tracks) {
      const pattern = getPattern(track.id)
      const angleRad = (track.angle * Math.PI) / 180
      const blockSize = 12
      const gap = 4
      const totalLength = pattern.length * (blockSize + gap)

      // Calculate line start position (centered)
      const startX = centerX - (Math.cos(angleRad) * totalLength) / 2
      const startY = centerY - (Math.sin(angleRad) * totalLength) / 2

      // Track opacity based on mute state and current value
      const baseOpacity = track.muted ? 0.15 : 1
      const glowBoost = track.currentValue * 0.3

      for (let i = 0; i < pattern.length; i++) {
        const isHit = pattern[i]
        const isCurrent = i === track.currentStep

        const x = startX + Math.cos(angleRad) * i * (blockSize + gap)
        const y = startY + Math.sin(angleRad) * i * (blockSize + gap)

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angleRad)

        if (isHit) {
          // Solid block for hits
          ctx.fillStyle = CREAM
          ctx.globalAlpha = baseOpacity * (isCurrent ? 1 : 0.7) + (isCurrent ? glowBoost : 0)
          ctx.fillRect(-blockSize / 2, -blockSize / 4, blockSize, blockSize / 2)

          // Glow on current step
          if (isCurrent && !track.muted) {
            ctx.shadowColor = CREAM
            ctx.shadowBlur = 10 + track.currentValue * 15
            ctx.fillRect(-blockSize / 2, -blockSize / 4, blockSize, blockSize / 2)
            ctx.shadowBlur = 0
          }
        } else {
          // Dashed line for rests
          ctx.strokeStyle = CREAM
          ctx.globalAlpha = baseOpacity * 0.3
          ctx.lineWidth = 2
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(-blockSize / 2, 0)
          ctx.lineTo(blockSize / 2, 0)
          ctx.stroke()
          ctx.setLineDash([])
        }

        ctx.restore()
      }
    }
  }, [tracks, getPattern, width, height])

  // Animation loop
  useEffect(() => {
    let animationId: number

    const loop = () => {
      draw()
      animationId = requestAnimationFrame(loop)
    }

    animationId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationId)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
```

**Commit:** `feat(sequencer): add DiagonalCascade canvas visualization`

---

## Task 5: Create TrackStrips component

**Files:**
- Create: `src/components/sequencer/TrackStrips.tsx`

**Implementation:**

```typescript
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'
import { useSequencerStore } from '../../stores/sequencerStore'

const CLOCK_DIVIDERS = [
  { label: '/4', value: 0.25 },
  { label: '/2', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
]

export function TrackStrips() {
  const { tracks, maxTracks, addTrack, removeTrack, updateTrack, getPattern } = usePolyEuclidStore()
  const { startRouting } = useSequencerStore()

  const cycleClockDivider = (trackId: string, current: number) => {
    const currentIndex = CLOCK_DIVIDERS.findIndex(d => d.value === current)
    const nextIndex = (currentIndex + 1) % CLOCK_DIVIDERS.length
    updateTrack(trackId, { clockDivider: CLOCK_DIVIDERS[nextIndex].value })
  }

  const handleDrag = (
    trackId: string,
    param: 'steps' | 'hits' | 'rotation' | 'decay',
    startY: number,
    startValue: number
  ) => {
    const handleMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY
      let newValue: number

      if (param === 'decay') {
        newValue = startValue + deltaY / 100
      } else {
        newValue = Math.round(startValue + deltaY / 15)
      }

      updateTrack(trackId, { [param]: newValue })
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const handleRouteStart = (trackId: string, e: React.MouseEvent) => {
    e.preventDefault()
    startRouting(`polyEuclid-${trackId}`)
  }

  return (
    <div className="flex flex-col" style={{ fontFamily: 'monospace' }}>
      {tracks.map((track, index) => {
        const pattern = getPattern(track.id)
        const divLabel = CLOCK_DIVIDERS.find(d => d.value === track.clockDivider)?.label || '1x'

        return (
          <div
            key={track.id}
            className="flex items-center gap-2 px-2 py-1"
            style={{
              borderBottom: '1px solid var(--border)',
              opacity: track.muted ? 0.4 : 1,
              backgroundColor: track.muted ? 'transparent' : 'rgba(232, 228, 217, 0.03)',
            }}
          >
            {/* Track number / mute toggle */}
            <button
              className="text-[10px] font-bold uppercase w-8"
              style={{ color: track.muted ? 'var(--danger)' : '#E8E4D9' }}
              onClick={() => updateTrack(track.id, { muted: !track.muted })}
            >
              TRK{index + 1}
            </button>

            {/* Steps */}
            <div
              className="text-[10px] cursor-ns-resize select-none"
              style={{ color: '#E8E4D9' }}
              onMouseDown={(e) => handleDrag(track.id, 'steps', e.clientY, track.steps)}
            >
              STEPS <span className="font-bold">{String(track.steps).padStart(2, '0')}</span>
            </div>

            {/* Hits */}
            <div
              className="text-[10px] cursor-ns-resize select-none"
              style={{ color: '#E8E4D9' }}
              onMouseDown={(e) => handleDrag(track.id, 'hits', e.clientY, track.hits)}
            >
              HITS <span className="font-bold">{String(track.hits).padStart(2, '0')}</span>
            </div>

            {/* Rotation */}
            <div
              className="text-[10px] cursor-ns-resize select-none"
              style={{ color: '#E8E4D9' }}
              onMouseDown={(e) => handleDrag(track.id, 'rotation', e.clientY, track.rotation)}
            >
              ROT <span className="font-bold">{track.rotation >= 0 ? '+' : ''}{track.rotation}</span>
            </div>

            {/* Clock divider */}
            <button
              className="text-[10px] font-bold px-1"
              style={{ color: '#E8E4D9', backgroundColor: 'rgba(232, 228, 217, 0.1)' }}
              onClick={() => cycleClockDivider(track.id, track.clockDivider)}
            >
              DIV {divLabel}
            </button>

            {/* Decay */}
            <div
              className="text-[10px] cursor-ns-resize select-none"
              style={{ color: '#E8E4D9' }}
              onMouseDown={(e) => handleDrag(track.id, 'decay', e.clientY, track.decay)}
            >
              DCY <span className="font-bold">{track.decay.toFixed(1)}</span>
            </div>

            {/* Route handle */}
            <button
              className="text-[10px] px-1 cursor-grab"
              style={{ color: '#E8E4D9', backgroundColor: 'rgba(232, 228, 217, 0.1)' }}
              onMouseDown={(e) => handleRouteStart(track.id, e)}
            >
              ⊕
            </button>

            {/* Mini pattern preview */}
            <div className="flex gap-[1px] ml-auto">
              {pattern.map((hit, i) => (
                <div
                  key={i}
                  className="w-[4px] h-[8px]"
                  style={{
                    backgroundColor: hit ? '#E8E4D9' : 'transparent',
                    border: hit ? 'none' : '1px solid rgba(232, 228, 217, 0.3)',
                    opacity: i === track.currentStep ? 1 : 0.6,
                  }}
                />
              ))}
            </div>

            {/* Remove button (if more than 1 track) */}
            {tracks.length > 1 && (
              <button
                className="text-[10px] ml-1"
                style={{ color: 'var(--danger)' }}
                onClick={() => removeTrack(track.id)}
              >
                ×
              </button>
            )}
          </div>
        )
      })}

      {/* Add track button */}
      {tracks.length < maxTracks && (
        <button
          className="text-[10px] uppercase tracking-wider py-1 text-center"
          style={{ color: '#E8E4D9', opacity: 0.5 }}
          onClick={addTrack}
        >
          + ADD TRACK
        </button>
      )}
    </div>
  )
}
```

**Commit:** `feat(sequencer): add TrackStrips parameter controls`

---

## Task 6: Create DiagonalEuclidean main component

**Files:**
- Create: `src/components/sequencer/DiagonalEuclidean.tsx`

**Implementation:**

```typescript
import { useRef, useState, useEffect } from 'react'
import { DiagonalCascade } from './DiagonalCascade'
import { TrackStrips } from './TrackStrips'

export function DiagonalEuclidean() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 400, height: 200 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  return (
    <div className="flex flex-col h-full w-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Header */}
      <div
        className="px-3 py-1.5 flex items-center"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full mr-2"
          style={{ backgroundColor: '#E8E4D9', boxShadow: '0 0 6px rgba(232, 228, 217, 0.5)' }}
        />
        <span
          className="text-[9px] font-medium uppercase tracking-widest"
          style={{ color: '#E8E4D9' }}
        >
          Euclidean
        </span>
      </div>

      {/* Diagonal cascade visualization (70%) */}
      <div ref={containerRef} className="flex-[7] min-h-0 overflow-hidden">
        <DiagonalCascade width={dimensions.width} height={dimensions.height} />
      </div>

      {/* Track strips (30%) */}
      <div
        className="flex-[3] min-h-0 overflow-y-auto"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <TrackStrips />
      </div>
    </div>
  )
}
```

**Commit:** `feat(sequencer): add DiagonalEuclidean main component`

---

## Task 7: Update SequencerContainer with tabs

**Files:**
- Modify: `src/components/sequencer/SequencerContainer.tsx`

**Find the existing SequencerContainer and update it to include tab navigation:**

```typescript
import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { SlicerPanel } from './SlicerPanel'
import { DiagonalEuclidean } from './DiagonalEuclidean'

export function SequencerContainer() {
  const { activeSequencer, setActiveSequencer } = useSequencerContainerStore()

  return (
    <div className="flex flex-col h-full w-full">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-2"
        style={{
          height: '28px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        <button
          className="text-[9px] font-medium uppercase tracking-widest px-2 py-1"
          style={{
            color: activeSequencer === 'slicer' ? 'var(--accent)' : 'var(--text-ghost)',
            borderBottom: activeSequencer === 'slicer' ? '1px solid var(--accent)' : '1px solid transparent',
          }}
          onClick={() => setActiveSequencer('slicer')}
        >
          Slicer
        </button>
        <button
          className="text-[9px] font-medium uppercase tracking-widest px-2 py-1"
          style={{
            color: activeSequencer === 'euclid' ? '#E8E4D9' : 'var(--text-ghost)',
            borderBottom: activeSequencer === 'euclid' ? '1px solid #E8E4D9' : '1px solid transparent',
          }}
          onClick={() => setActiveSequencer('euclid')}
        >
          Euclid
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeSequencer === 'slicer' && <SlicerPanel />}
        {activeSequencer === 'euclid' && <DiagonalEuclidean />}
      </div>
    </div>
  )
}
```

**Commit:** `feat(sequencer): add tab navigation for slicer/euclid`

---

## Task 8: Initialize engine in PerformanceLayout

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`

**Add import and hook call:**

1. Add import near other engine imports:
```typescript
import { usePolyEuclidEngine } from '../../hooks/usePolyEuclidEngine'
```

2. Add hook call after other engine initializations (around line 46):
```typescript
usePolyEuclidEngine()
```

**Commit:** `feat(sequencer): initialize polyEuclid engine in layout`

---

## Task 9: Add polyEuclid to useContinuousModulation

**Files:**
- Modify: `src/hooks/useContinuousModulation.ts`

**Add import:**
```typescript
import { usePolyEuclidStore } from '../stores/polyEuclidStore'
```

**Add to modulationLoop function (after envelope routings section):**

```typescript
// PolyEuclid routings
const polyEuclidState = usePolyEuclidStore.getState()
for (const track of polyEuclidState.tracks) {
  if (track.muted) continue
  const trackRoutings = currentRoutings.filter(r => r.trackId === `polyEuclid-${track.id}`)
  for (const routing of trackRoutings) {
    const modulatedValue = track.currentValue * routing.depth
    applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
  }
}
```

**Commit:** `feat(sequencer): add polyEuclid tracks to continuous modulation`

---

## Task 10: Final verification

**Steps:**

1. Run `npm run build` - verify no TypeScript errors
2. Run `npm run dev` - verify app loads
3. Test tab switching between SLICER and EUCLID
4. Verify diagonal cascade renders with 4 tracks
5. Test parameter controls (drag to adjust steps/hits/rotation/decay)
6. Test clock divider cycling
7. Test mute toggle
8. Test add/remove tracks
9. Test modulation routing (drag ⊕ to an effect parameter)

**Commit:** `feat(sequencer): complete diagonal euclidean sequencer`
