# Modulation Routing System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add drag-to-modulate routing from LFO/Random/Step/Envelope cards to any parameter slider, with visual connection lines.

**Architecture:** Extends existing routing system (sequencerStore.routings) with new modulation sources. Each modulator runs its own value generator, routed through the same routing infrastructure as euclidean/ricochet sources.

**Tech Stack:** React, Zustand, CSS/SVG for connection lines, HTML5 drag-and-drop

---

## Task 1: Create Modulation Store

**Files:**
- Create: `src/stores/modulationStore.ts`

Create a Zustand store for LFO, Random, Step, and Envelope modulators:

```typescript
import { create } from 'zustand'

export type LFOShape = 'sine' | 'triangle' | 'square' | 'saw' | 'random'

export interface LFOState {
  enabled: boolean
  rate: number       // Hz (0.1 - 20)
  shape: LFOShape
  phase: number      // Internal phase accumulator
  currentValue: number  // 0-1 output
}

export interface RandomState {
  enabled: boolean
  rate: number       // Changes per second (0.1 - 30)
  smoothing: number  // 0-1 (0 = stepped, 1 = smoothed)
  currentValue: number
  targetValue: number
}

export interface StepState {
  enabled: boolean
  steps: number[]    // Array of 8 values (0-1)
  currentStep: number
  rate: number       // Steps per second
  currentValue: number
}

export interface EnvelopeState {
  enabled: boolean
  attack: number     // 0-2s
  decay: number      // 0-2s
  sustain: number    // 0-1
  release: number    // 0-2s
  phase: 'idle' | 'attack' | 'decay' | 'sustain' | 'release'
  currentValue: number
  triggerTime: number | null
}

interface ModulationState {
  lfo: LFOState
  random: RandomState
  step: StepState
  envelope: EnvelopeState

  // Actions
  toggleLFO: () => void
  setLFORate: (rate: number) => void
  setLFOShape: (shape: LFOShape) => void
  updateLFO: (delta: number) => void  // Called from engine

  toggleRandom: () => void
  setRandomRate: (rate: number) => void
  setRandomSmoothing: (smoothing: number) => void
  updateRandom: (delta: number) => void

  toggleStep: () => void
  setStepValue: (index: number, value: number) => void
  setStepRate: (rate: number) => void
  updateStep: (delta: number) => void

  toggleEnvelope: () => void
  setEnvelopeParams: (params: Partial<Pick<EnvelopeState, 'attack' | 'decay' | 'sustain' | 'release'>>) => void
  triggerEnvelope: () => void
  releaseEnvelope: () => void
  updateEnvelope: (delta: number, currentTime: number) => void
}
```

Default values:
- LFO: rate=1Hz, shape=sine
- Random: rate=4, smoothing=0.5
- Step: 8 steps with default pattern [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25], rate=2
- Envelope: attack=0.1, decay=0.2, sustain=0.7, release=0.3

---

## Task 2: Create Modulation Engine Hook

**Files:**
- Create: `src/hooks/useModulationEngine.ts`

Create a hook that runs the modulation value generators at 60fps:

```typescript
import { useEffect, useRef } from 'react'
import { useModulationStore } from '../stores/modulationStore'

export function useModulationEngine() {
  const lastTime = useRef(performance.now())

  useEffect(() => {
    const loop = () => {
      const now = performance.now()
      const delta = (now - lastTime.current) / 1000  // Delta in seconds
      lastTime.current = now

      const store = useModulationStore.getState()

      if (store.lfo.enabled) store.updateLFO(delta)
      if (store.random.enabled) store.updateRandom(delta)
      if (store.step.enabled) store.updateStep(delta)
      if (store.envelope.enabled) store.updateEnvelope(delta, now)

      requestAnimationFrame(loop)
    }

    const id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [])
}
```

LFO shapes:
- sine: `Math.sin(phase * 2 * Math.PI) * 0.5 + 0.5`
- triangle: `1 - Math.abs((phase % 1) * 2 - 1)`
- square: `phase % 1 < 0.5 ? 1 : 0`
- saw: `phase % 1`
- random: sample-and-hold random at each cycle

Random: lerp between current and target, pick new target at rate intervals

Step: advance currentStep at rate, output steps[currentStep]

Envelope: standard ADSR calculation

---

## Task 3: Integrate Modulators into Continuous Modulation

**Files:**
- Modify: `src/hooks/useContinuousModulation.ts`

Add LFO, Random, Step, Envelope to the modulation loop:

```typescript
import { useModulationStore } from '../stores/modulationStore'

// In modulationLoop:
const modState = useModulationStore.getState()

// LFO routings
const lfoRoutings = currentRoutings.filter(r => r.trackId === 'lfo')
if (lfoRoutings.length > 0 && modState.lfo.enabled) {
  for (const routing of lfoRoutings) {
    const modulatedValue = modState.lfo.currentValue * routing.depth
    applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
  }
}

// Random routings
const randomRoutings = currentRoutings.filter(r => r.trackId === 'random')
if (randomRoutings.length > 0 && modState.random.enabled) {
  for (const routing of randomRoutings) {
    const modulatedValue = modState.random.currentValue * routing.depth
    applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
  }
}

// Step routings
const stepRoutings = currentRoutings.filter(r => r.trackId === 'step')
if (stepRoutings.length > 0 && modState.step.enabled) {
  for (const routing of stepRoutings) {
    const modulatedValue = modState.step.currentValue * routing.depth
    applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
  }
}

// Envelope routings
const envRoutings = currentRoutings.filter(r => r.trackId === 'envelope')
if (envRoutings.length > 0 && modState.envelope.enabled) {
  for (const routing of envRoutings) {
    const modulatedValue = modState.envelope.currentValue * routing.depth
    applyModulation(routing.targetParam, Math.max(0, Math.min(1, modulatedValue)))
  }
}
```

---

## Task 4: Add Modulation Sources to SliderRow

**Files:**
- Modify: `src/components/performance/controls/SliderRow.tsx`

Add the new modulation sources to SPECIAL_SOURCES:

```typescript
const SPECIAL_SOURCES: Record<string, { name: string; color: string }> = {
  euclidean: { name: 'Euclidean', color: '#FF0055' },
  ricochet: { name: 'Ricochet', color: '#FF0055' },
  lfo: { name: 'LFO', color: '#00D4FF' },
  random: { name: 'Random', color: '#FF6B6B' },
  step: { name: 'Step', color: '#4ECDC4' },
  envelope: { name: 'Envelope', color: '#22c55e' },
}
```

Also update handleDrop to accept modulation sources:

```typescript
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  const trackId = e.dataTransfer.getData('sequencer-track') ||
                  e.dataTransfer.getData('modulation-source')
  if (trackId && paramId) {
    const existingRouting = routings.find(r => r.trackId === trackId && r.targetParam === paramId)
    if (!existingRouting) {
      addRouting(trackId, paramId, 0.5)
    }
  }
  setIsDropTarget(false)
}
```

Update handleDragOver to check for modulation-source data type:

```typescript
const handleDragOver = (e: React.DragEvent) => {
  if (paramId && (
    sequencerDrag.isDragging ||
    e.dataTransfer.types.includes('sequencer-track') ||
    e.dataTransfer.types.includes('modulation-source')
  )) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'link'
    setIsDropTarget(true)
  }
}
```

---

## Task 5: Make Modulation Cards Draggable

**Files:**
- Modify: `src/components/performance/MiddleSection.tsx`

Update ModulationCard to be draggable:

```typescript
interface ModulationCardProps {
  type: 'lfo' | 'random' | 'step' | 'envelope'
  label: string
  tick: number
  active?: boolean
  onClick?: () => void
}

function ModulationCard({ type, label, tick, active = false, onClick }: ModulationCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('modulation-source', type)
    e.dataTransfer.effectAllowed = 'link'
    // Set drag image to the card itself
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 40, 30)
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="flex flex-col rounded-sm cursor-grab transition-all"
      // ... rest of styling
    >
```

---

## Task 6: Add Plus Icon Drop Targets to Parameters

**Files:**
- Modify: `src/components/performance/controls/SliderRow.tsx`

Add a visible plus icon when no routing exists and drag is active:

```typescript
// Add state for global drag detection
const [isModulationDrag, setIsModulationDrag] = useState(false)

// Listen for drag events globally
useEffect(() => {
  const handleGlobalDragStart = (e: DragEvent) => {
    if (e.dataTransfer?.types.includes('modulation-source') ||
        e.dataTransfer?.types.includes('sequencer-track')) {
      setIsModulationDrag(true)
    }
  }
  const handleGlobalDragEnd = () => {
    setIsModulationDrag(false)
  }

  document.addEventListener('dragstart', handleGlobalDragStart)
  document.addEventListener('dragend', handleGlobalDragEnd)
  return () => {
    document.removeEventListener('dragstart', handleGlobalDragStart)
    document.removeEventListener('dragend', handleGlobalDragEnd)
  }
}, [])

// In render, show plus icon when drag is active and param has no routing:
{paramId && isModulationDrag && !hasRouting && (
  <div
    className="absolute -right-1 -top-1 w-4 h-4 rounded-full flex items-center justify-center"
    style={{
      backgroundColor: 'var(--accent)',
      boxShadow: '0 0 6px var(--accent-glow)',
    }}
  >
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M5 2v6M2 5h6" stroke="white" strokeWidth="1.5" />
    </svg>
  </div>
)}
```

---

## Task 7: Add Connection Lines Overlay

**Files:**
- Create: `src/components/performance/ModulationLines.tsx`
- Modify: `src/components/performance/PerformanceLayout.tsx`

Create an SVG overlay that draws dashed lines between modulation sources and their targets:

```typescript
import { useEffect, useState, useCallback } from 'react'
import { useSequencerStore } from '../../stores/sequencerStore'

const SOURCE_COLORS: Record<string, string> = {
  lfo: '#00D4FF',
  random: '#FF6B6B',
  step: '#4ECDC4',
  envelope: '#22c55e',
}

interface ConnectionLine {
  id: string
  sourceId: string
  targetParam: string
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
}

export function ModulationLines() {
  const [lines, setLines] = useState<ConnectionLine[]>([])
  const { routings } = useSequencerStore()

  // Filter to only modulation routings (not sequencer tracks)
  const modRoutings = routings.filter(r =>
    ['lfo', 'random', 'step', 'envelope'].includes(r.trackId)
  )

  // Update line positions
  const updateLines = useCallback(() => {
    const newLines: ConnectionLine[] = []

    for (const routing of modRoutings) {
      // Find source element (modulation card)
      const sourceEl = document.querySelector(`[data-mod-source="${routing.trackId}"]`)
      // Find target element (slider with paramId)
      const targetEl = document.querySelector(`[data-param-id="${routing.targetParam}"]`)

      if (sourceEl && targetEl) {
        const sourceRect = sourceEl.getBoundingClientRect()
        const targetRect = targetEl.getBoundingClientRect()

        newLines.push({
          id: routing.id,
          sourceId: routing.trackId,
          targetParam: routing.targetParam,
          startX: sourceRect.right,
          startY: sourceRect.top + sourceRect.height / 2,
          endX: targetRect.left,
          endY: targetRect.top + targetRect.height / 2,
          color: SOURCE_COLORS[routing.trackId] || '#888',
        })
      }
    }

    setLines(newLines)
  }, [modRoutings])

  // Update on routing changes and resize
  useEffect(() => {
    updateLines()
    window.addEventListener('resize', updateLines)
    window.addEventListener('scroll', updateLines, true)

    // Also update periodically for layout changes
    const interval = setInterval(updateLines, 500)

    return () => {
      window.removeEventListener('resize', updateLines)
      window.removeEventListener('scroll', updateLines, true)
      clearInterval(interval)
    }
  }, [updateLines])

  if (lines.length === 0) return null

  return (
    <svg
      className="fixed inset-0 pointer-events-none z-50"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {lines.map(line => (
        <path
          key={line.id}
          d={`M ${line.startX} ${line.startY} C ${line.startX + 50} ${line.startY}, ${line.endX - 50} ${line.endY}, ${line.endX} ${line.endY}`}
          fill="none"
          stroke={line.color}
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity={0.7}
          filter="url(#glow)"
        />
      ))}
    </svg>
  )
}
```

Add data attributes to source and target elements:
- ModulationCard: `data-mod-source={type}`
- SliderRow container: `data-param-id={paramId}`

Add ModulationLines to PerformanceLayout:
```typescript
import { ModulationLines } from './ModulationLines'

// At end of layout, before closing div:
<ModulationLines />
```

---

## Task 8: Initialize Modulation Engine in Layout

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`

Add the modulation engine hook:

```typescript
import { useModulationEngine } from '../../hooks/useModulationEngine'

export function PerformanceLayout() {
  // Initialize modulation engine (runs LFO, Random, Step, Envelope generators)
  useModulationEngine()

  // ... rest of component
}
```

---

## Task 9: Wire Up Modulation Card State

**Files:**
- Modify: `src/components/performance/MiddleSection.tsx`

Connect cards to the modulation store:

```typescript
import { useModulationStore } from '../../stores/modulationStore'

export function MiddleSection() {
  const {
    lfo,
    random,
    step,
    envelope,
    toggleLFO,
    toggleRandom,
    toggleStep,
    toggleEnvelope,
  } = useModulationStore()

  return (
    // ...
    <ModulationCard
      type="lfo"
      label="LFO"
      tick={tick}
      active={lfo.enabled}
      onClick={toggleLFO}
    />
    <ModulationCard
      type="random"
      label="Random"
      tick={tick}
      active={random.enabled}
      onClick={toggleRandom}
    />
    <ModulationCard
      type="step"
      label="Step"
      tick={tick}
      active={step.enabled}
      onClick={toggleStep}
    />
    <ModulationCard
      type="envelope"
      label="Env"
      tick={tick}
      active={envelope.enabled}
      onClick={toggleEnvelope}
    />
  )
}
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/stores/modulationStore.ts` | Create - LFO/Random/Step/Envelope state |
| `src/hooks/useModulationEngine.ts` | Create - Value generators at 60fps |
| `src/hooks/useContinuousModulation.ts` | Modify - Add modulator routing |
| `src/components/performance/controls/SliderRow.tsx` | Modify - Add sources, drop handling, plus icons |
| `src/components/performance/MiddleSection.tsx` | Modify - Make cards draggable, wire state |
| `src/components/performance/ModulationLines.tsx` | Create - SVG connection lines |
| `src/components/performance/PerformanceLayout.tsx` | Modify - Add engine hook, lines overlay |

---

## Verification

1. `npm run build` - No TypeScript errors
2. Visual check:
   - Modulation cards show in middle section
   - Cards can be dragged (cursor changes to grab)
   - Plus icons appear on sliders when dragging
   - Dropping creates routing (colored dot appears on slider)
   - Dashed lines connect sources to targets
3. Functional check:
   - Enable LFO, drag to a parameter
   - Parameter value should oscillate
   - Double-click routing indicator to remove
   - Lines should update/disappear
