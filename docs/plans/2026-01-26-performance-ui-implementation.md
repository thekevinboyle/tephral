# Performance UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the current bottom-drawer UI into a Teenage Engineering / Elektron-inspired performance interface with a 4x3 effect grid, live toggle controls, and automation recording.

**Architecture:** Full-screen canvas preview (~25% top), dominant control grid (~75% bottom) with chunky effect buttons. Each button has LED indicator, encoder graphic, and parameter value. Recording system captures effect toggles/parameter changes as automation JSON.

**Tech Stack:** React 18, Zustand, Tailwind CSS v4, CSS animations (for LED glow effects)

**Design Reference:** `docs/plans/2026-01-26-performance-ui-design.md`

---

## Task 1: Update Color Palette

**Files:**
- Modify: `src/index.css`

**Step 1: Add new theme colors**

Update the `@theme` block to include the full Teenage Engineering palette:

```css
@theme {
  /* Base */
  --color-base-dark: #0a0a0a;
  --color-base-darker: #1a1a1a;
  --color-base-light: #f0f0f0;
  --color-muted: #666666;
  --color-border: #2a2a2a;

  /* Glitch row - Cyan, Magenta, Electric Blue, Purple */
  --color-glitch-cyan: #00d4ff;
  --color-glitch-magenta: #ff00aa;
  --color-glitch-blue: #4444ff;
  --color-glitch-purple: #aa44ff;

  /* Render row - Amber, Orange */
  --color-render-amber: #ffaa00;
  --color-render-orange: #ff6600;

  /* Vision row - Lime, Teal */
  --color-vision-lime: #88ff00;
  --color-vision-teal: #00ffaa;

  /* UI */
  --color-record-red: #ff3333;
  --color-accent-yellow: #ffcc00;

  --font-family-mono: 'JetBrains Mono', 'Space Mono', monospace;
}
```

**Step 2: Remove the brutalist no-rounded-corners rule**

The TE/Elektron design uses rounded corners on buttons. Remove:
```css
/* Brutalist: no rounded corners anywhere */
* {
  border-radius: 0 !important;
}
```

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add Teenage Engineering color palette"
```

---

## Task 2: Create Recording Store

**Files:**
- Create: `src/stores/recordingStore.ts`

**Step 1: Create the store**

```typescript
import { create } from 'zustand'

export interface AutomationEvent {
  t: number  // timestamp in seconds
  effect: string
  action?: 'on' | 'off'
  param?: number
}

interface RecordingState {
  isRecording: boolean
  isPreviewing: boolean
  startTime: number | null
  duration: number
  events: AutomationEvent[]
  source: 'webcam' | 'file' | null

  startRecording: () => void
  stopRecording: () => void
  addEvent: (event: Omit<AutomationEvent, 't'>) => void
  clearRecording: () => void
  setSource: (source: 'webcam' | 'file') => void

  startPreview: () => void
  stopPreview: () => void

  exportAutomation: () => string
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  isRecording: false,
  isPreviewing: false,
  startTime: null,
  duration: 0,
  events: [],
  source: null,

  startRecording: () => set({
    isRecording: true,
    startTime: performance.now(),
    events: [],
  }),

  stopRecording: () => {
    const { startTime } = get()
    const duration = startTime ? (performance.now() - startTime) / 1000 : 0
    set({
      isRecording: false,
      duration,
    })
  },

  addEvent: (event) => {
    const { isRecording, startTime } = get()
    if (!isRecording || !startTime) return

    const t = (performance.now() - startTime) / 1000
    set((state) => ({
      events: [...state.events, { ...event, t }],
    }))
  },

  clearRecording: () => set({
    events: [],
    duration: 0,
    startTime: null,
  }),

  setSource: (source) => set({ source }),

  startPreview: () => set({ isPreviewing: true }),
  stopPreview: () => set({ isPreviewing: false }),

  exportAutomation: () => {
    const { duration, source, events } = get()
    return JSON.stringify({ duration, source, events }, null, 2)
  },
}))
```

**Step 2: Commit**

```bash
git add src/stores/recordingStore.ts
git commit -m "feat: add recording store for automation capture"
```

---

## Task 3: Create EffectButton Component

**Files:**
- Create: `src/components/performance/EffectButton.tsx`

**Step 1: Create the component**

```typescript
import { useRef, useCallback } from 'react'
import { useRecordingStore } from '../../stores/recordingStore'

interface EffectButtonProps {
  id: string
  label: string
  color: string
  active: boolean
  value: number
  min?: number
  max?: number
  onToggle: () => void
  onValueChange: (value: number) => void
}

export function EffectButton({
  id,
  label,
  color,
  active,
  value,
  min = 0,
  max = 100,
  onToggle,
  onValueChange,
}: EffectButtonProps) {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)
  const addEvent = useRecordingStore((s) => s.addEvent)
  const isRecording = useRecordingStore((s) => s.isRecording)

  const handleToggle = useCallback(() => {
    onToggle()
    if (isRecording) {
      addEvent({ effect: id, action: active ? 'off' : 'on', param: value })
    }
  }, [onToggle, isRecording, addEvent, id, active, value])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only start drag on the encoder area
    const target = e.target as HTMLElement
    if (!target.closest('.encoder-area')) return

    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartValue.current = value
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [value])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return

    const deltaY = dragStartY.current - e.clientY
    const range = max - min
    const sensitivity = range / 150 // 150px drag = full range
    const newValue = Math.min(max, Math.max(min, dragStartValue.current + deltaY * sensitivity))

    onValueChange(newValue)
  }, [min, max, onValueChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current !== null && isRecording) {
      addEvent({ effect: id, param: value })
    }
    dragStartY.current = null
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }, [isRecording, addEvent, id, value])

  // Encoder rotation based on value
  const rotation = ((value - min) / (max - min)) * 270 - 135

  return (
    <button
      onClick={handleToggle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`
        relative aspect-square p-3 rounded-lg transition-all duration-150
        flex flex-col items-center justify-between
        select-none touch-none
        ${active
          ? 'bg-base-darker shadow-[0_0_20px_-5px_var(--glow-color)]'
          : 'bg-base-darker hover:bg-[#222]'
        }
        border border-border
      `}
      style={{
        '--glow-color': color,
      } as React.CSSProperties}
    >
      {/* LED indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full transition-all duration-150 ${
            active ? 'shadow-[0_0_8px_2px_var(--led-color)]' : ''
          }`}
          style={{
            backgroundColor: active ? color : '#333',
            '--led-color': color,
          } as React.CSSProperties}
        />
        <span className={`text-[10px] uppercase tracking-wider ${active ? 'text-base-light' : 'text-muted'}`}>
          {label}
        </span>
      </div>

      {/* Encoder graphic */}
      <div className="encoder-area flex-1 flex items-center justify-center w-full cursor-ns-resize">
        <div className="relative w-12 h-12">
          {/* Encoder ring */}
          <div
            className="absolute inset-0 rounded-full border-2 transition-colors"
            style={{ borderColor: active ? color : '#444' }}
          />
          {/* Encoder notch */}
          <div
            className="absolute w-1 h-3 bg-current left-1/2 -translate-x-1/2 transition-colors"
            style={{
              color: active ? color : '#666',
              transformOrigin: 'center 24px',
              transform: `translateX(-50%) rotate(${rotation}deg)`,
              top: '4px',
            }}
          />
          {/* Center dot */}
          <div
            className="absolute w-2 h-2 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ backgroundColor: active ? color : '#444' }}
          />
        </div>
      </div>

      {/* Parameter value */}
      <span
        className={`text-sm tabular-nums font-mono ${active ? 'text-base-light' : 'text-muted'}`}
      >
        {Math.round(value)}
      </span>
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/performance/EffectButton.tsx
git commit -m "feat: add EffectButton component with encoder control"
```

---

## Task 4: Create Effect Definitions

**Files:**
- Create: `src/config/effects.ts`

**Step 1: Create effect definitions**

```typescript
export interface EffectDefinition {
  id: string
  label: string
  color: string
  row: 'glitch' | 'render' | 'vision'
  // Store connection
  storeKey: string
  enabledKey: string
  paramKey: string
  paramPath: string
  min: number
  max: number
}

export const EFFECTS: EffectDefinition[] = [
  // Row 1: Glitch effects
  {
    id: 'rgb_split',
    label: 'RGB SPLIT',
    color: 'var(--color-glitch-cyan)',
    row: 'glitch',
    storeKey: 'glitchEngine',
    enabledKey: 'rgbSplitEnabled',
    paramKey: 'rgbSplit',
    paramPath: 'amount',
    min: 0,
    max: 50,
  },
  {
    id: 'block_displace',
    label: 'BLOCK',
    color: 'var(--color-glitch-magenta)',
    row: 'glitch',
    storeKey: 'glitchEngine',
    enabledKey: 'blockDisplaceEnabled',
    paramKey: 'blockDisplace',
    paramPath: 'amount',
    min: 0,
    max: 100,
  },
  {
    id: 'scan_lines',
    label: 'SCAN',
    color: 'var(--color-glitch-blue)',
    row: 'glitch',
    storeKey: 'glitchEngine',
    enabledKey: 'scanLinesEnabled',
    paramKey: 'scanLines',
    paramPath: 'lineCount',
    min: 100,
    max: 1000,
  },
  {
    id: 'noise',
    label: 'NOISE',
    color: 'var(--color-glitch-purple)',
    row: 'glitch',
    storeKey: 'glitchEngine',
    enabledKey: 'noiseEnabled',
    paramKey: 'noise',
    paramPath: 'amount',
    min: 0,
    max: 1,
  },

  // Row 2: Render effects
  {
    id: 'ascii',
    label: 'ASCII',
    color: 'var(--color-render-amber)',
    row: 'render',
    storeKey: 'asciiRender',
    enabledKey: 'enabled',
    paramKey: 'params',
    paramPath: 'fontSize',
    min: 6,
    max: 20,
  },
  {
    id: 'matrix',
    label: 'MATRIX',
    color: 'var(--color-render-amber)',
    row: 'render',
    storeKey: 'asciiRender',
    enabledKey: 'enabled',
    paramKey: 'params',
    paramPath: 'matrixSpeed',
    min: 0.1,
    max: 3,
  },
  {
    id: 'stipple',
    label: 'STIPPLE',
    color: 'var(--color-render-orange)',
    row: 'render',
    storeKey: 'stipple',
    enabledKey: 'enabled',
    paramKey: 'params',
    paramPath: 'particleSize',
    min: 1,
    max: 8,
  },
  {
    id: 'detect_boxes',
    label: 'DETECT',
    color: 'var(--color-render-orange)',
    row: 'render',
    storeKey: 'detectionOverlay',
    enabledKey: 'enabled',
    paramKey: 'params',
    paramPath: 'boxLineWidth',
    min: 1,
    max: 6,
  },

  // Row 3: Vision effects
  {
    id: 'point_network',
    label: 'POINTS',
    color: 'var(--color-vision-lime)',
    row: 'vision',
    storeKey: 'pointNetwork',
    enabledKey: 'enabled',
    paramKey: 'params',
    paramPath: 'pointRadius',
    min: 1,
    max: 10,
  },
  {
    id: 'face_mesh',
    label: 'FACE',
    color: 'var(--color-vision-lime)',
    row: 'vision',
    storeKey: 'landmarks',
    enabledKey: 'enabled',
    paramKey: 'currentMode',
    paramPath: '',
    min: 0,
    max: 1,
  },
  {
    id: 'hands',
    label: 'HANDS',
    color: 'var(--color-vision-teal)',
    row: 'vision',
    storeKey: 'landmarks',
    enabledKey: 'enabled',
    paramKey: 'currentMode',
    paramPath: '',
    min: 0,
    max: 1,
  },
  {
    id: 'pose',
    label: 'POSE',
    color: 'var(--color-vision-teal)',
    row: 'vision',
    storeKey: 'landmarks',
    enabledKey: 'enabled',
    paramKey: 'currentMode',
    paramPath: '',
    min: 0,
    max: 1,
  },
]

export const GRID_ROWS = [
  EFFECTS.filter(e => e.row === 'glitch'),
  EFFECTS.filter(e => e.row === 'render'),
  EFFECTS.filter(e => e.row === 'vision'),
]
```

**Step 2: Commit**

```bash
git add src/config/effects.ts
git commit -m "feat: add effect definitions for performance grid"
```

---

## Task 5: Create PerformanceGrid Component

**Files:**
- Create: `src/components/performance/PerformanceGrid.tsx`

**Step 1: Create the component**

```typescript
import { EffectButton } from './EffectButton'
import { GRID_ROWS } from '../../config/effects'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useDetectionOverlayStore } from '../../stores/detectionOverlayStore'
import { usePointNetworkStore } from '../../stores/pointNetworkStore'
import { useLandmarksStore } from '../../stores/landmarksStore'

export function PerformanceGrid() {
  // Glitch engine store
  const glitch = useGlitchEngineStore()

  // Render stores
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const overlay = useDetectionOverlayStore()

  // Vision stores
  const network = usePointNetworkStore()
  const landmarks = useLandmarksStore()

  // Helper to get effect state
  const getEffectState = (effectId: string) => {
    switch (effectId) {
      case 'rgb_split':
        return {
          active: glitch.rgbSplitEnabled,
          value: glitch.rgbSplit.amount,
          onToggle: () => glitch.setRGBSplitEnabled(!glitch.rgbSplitEnabled),
          onValueChange: (v: number) => glitch.updateRGBSplit({ amount: v }),
        }
      case 'block_displace':
        return {
          active: glitch.blockDisplaceEnabled,
          value: glitch.blockDisplace.amount,
          onToggle: () => glitch.setBlockDisplaceEnabled(!glitch.blockDisplaceEnabled),
          onValueChange: (v: number) => glitch.updateBlockDisplace({ amount: v }),
        }
      case 'scan_lines':
        return {
          active: glitch.scanLinesEnabled,
          value: glitch.scanLines.lineCount,
          onToggle: () => glitch.setScanLinesEnabled(!glitch.scanLinesEnabled),
          onValueChange: (v: number) => glitch.updateScanLines({ lineCount: v }),
        }
      case 'noise':
        return {
          active: false, // TODO: Add noise effect
          value: 0,
          onToggle: () => {},
          onValueChange: () => {},
        }
      case 'ascii':
        return {
          active: ascii.enabled && ascii.params.mode === 'standard',
          value: ascii.params.fontSize,
          onToggle: () => {
            if (ascii.enabled && ascii.params.mode === 'standard') {
              ascii.setEnabled(false)
            } else {
              ascii.setEnabled(true)
              ascii.updateParams({ mode: 'standard' })
            }
          },
          onValueChange: (v: number) => ascii.updateParams({ fontSize: v }),
        }
      case 'matrix':
        return {
          active: ascii.enabled && ascii.params.mode === 'matrix',
          value: ascii.params.matrixSpeed,
          onToggle: () => {
            if (ascii.enabled && ascii.params.mode === 'matrix') {
              ascii.setEnabled(false)
            } else {
              ascii.setEnabled(true)
              ascii.updateParams({ mode: 'matrix' })
            }
          },
          onValueChange: (v: number) => ascii.updateParams({ matrixSpeed: v }),
        }
      case 'stipple':
        return {
          active: stipple.enabled,
          value: stipple.params.particleSize,
          onToggle: () => stipple.setEnabled(!stipple.enabled),
          onValueChange: (v: number) => stipple.updateParams({ particleSize: v }),
        }
      case 'detect_boxes':
        return {
          active: overlay.enabled,
          value: overlay.params.boxLineWidth,
          onToggle: () => overlay.setEnabled(!overlay.enabled),
          onValueChange: (v: number) => overlay.updateParams({ boxLineWidth: v }),
        }
      case 'point_network':
        return {
          active: network.enabled,
          value: network.params.pointRadius,
          onToggle: () => network.setEnabled(!network.enabled),
          onValueChange: (v: number) => network.updateParams({ pointRadius: v }),
        }
      case 'face_mesh':
        return {
          active: landmarks.enabled && landmarks.currentMode === 'face',
          value: landmarks.minDetectionConfidence * 100,
          onToggle: () => {
            if (landmarks.enabled && landmarks.currentMode === 'face') {
              landmarks.setEnabled(false)
            } else {
              landmarks.setEnabled(true)
              landmarks.setCurrentMode('face')
            }
          },
          onValueChange: (v: number) => landmarks.setMinDetectionConfidence(v / 100),
        }
      case 'hands':
        return {
          active: landmarks.enabled && landmarks.currentMode === 'hands',
          value: landmarks.minDetectionConfidence * 100,
          onToggle: () => {
            if (landmarks.enabled && landmarks.currentMode === 'hands') {
              landmarks.setEnabled(false)
            } else {
              landmarks.setEnabled(true)
              landmarks.setCurrentMode('hands')
            }
          },
          onValueChange: (v: number) => landmarks.setMinDetectionConfidence(v / 100),
        }
      case 'pose':
        return {
          active: landmarks.enabled && landmarks.currentMode === 'pose',
          value: landmarks.minDetectionConfidence * 100,
          onToggle: () => {
            if (landmarks.enabled && landmarks.currentMode === 'pose') {
              landmarks.setEnabled(false)
            } else {
              landmarks.setEnabled(true)
              landmarks.setCurrentMode('pose')
            }
          },
          onValueChange: (v: number) => landmarks.setMinDetectionConfidence(v / 100),
        }
      default:
        return {
          active: false,
          value: 0,
          onToggle: () => {},
          onValueChange: () => {},
        }
    }
  }

  return (
    <div className="grid grid-cols-4 gap-2 p-3">
      {GRID_ROWS.flat().map((effect) => {
        const state = getEffectState(effect.id)
        return (
          <EffectButton
            key={effect.id}
            id={effect.id}
            label={effect.label}
            color={effect.color}
            active={state.active}
            value={state.value}
            min={effect.min}
            max={effect.max}
            onToggle={state.onToggle}
            onValueChange={state.onValueChange}
          />
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/performance/PerformanceGrid.tsx
git commit -m "feat: add PerformanceGrid component"
```

---

## Task 6: Create Transport Controls Component

**Files:**
- Create: `src/components/performance/TransportControls.tsx`

**Step 1: Create the component**

```typescript
import { useRecordingStore } from '../../stores/recordingStore'
import { useMediaStore } from '../../stores/mediaStore'

export function TransportControls() {
  const {
    isRecording,
    isPreviewing,
    duration,
    events,
    startRecording,
    stopRecording,
    startPreview,
    stopPreview,
    clearRecording,
    exportAutomation,
  } = useRecordingStore()

  const { videoElement, imageElement, source } = useMediaStore()
  const hasSource = videoElement || imageElement

  // Format time as MM:SS.mm
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const handleExport = () => {
    const data = exportAutomation()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `automation-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-base-dark border-b border-border">
      {/* Source indicator */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase text-muted">SRC</span>
        <span className="text-xs text-base-light">
          {source || 'NONE'}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Record button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!hasSource}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-all
          ${isRecording
            ? 'bg-record-red animate-pulse'
            : hasSource
              ? 'bg-border hover:bg-record-red/50'
              : 'bg-border/50 cursor-not-allowed'
          }
        `}
      >
        <div className={`w-3 h-3 ${isRecording ? 'bg-base-light' : 'bg-record-red'} rounded-full`} />
      </button>

      {/* Timecode */}
      <div className="font-mono text-lg tabular-nums text-base-light min-w-[100px]">
        {formatTime(duration)}
      </div>

      {/* Event count */}
      <div className="text-xs text-muted">
        {events.length} events
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Playback controls */}
      {duration > 0 && (
        <>
          <button
            onClick={isPreviewing ? stopPreview : startPreview}
            className="px-3 py-1 text-xs uppercase border border-border hover:border-base-light text-muted hover:text-base-light transition-colors"
          >
            {isPreviewing ? 'STOP' : 'PLAY'}
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-1 text-xs uppercase border border-accent-yellow text-accent-yellow hover:bg-accent-yellow hover:text-base-dark transition-colors"
          >
            EXPORT
          </button>

          <button
            onClick={clearRecording}
            className="px-3 py-1 text-xs uppercase text-muted hover:text-record-red transition-colors"
          >
            CLEAR
          </button>
        </>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/performance/TransportControls.tsx
git commit -m "feat: add TransportControls component"
```

---

## Task 7: Create PreviewHeader Component

**Files:**
- Create: `src/components/performance/PreviewHeader.tsx`

**Step 1: Create the component**

```typescript
import { useRef } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'

export function PreviewHeader() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { setVideoElement, setImageElement, source, reset } = useMediaStore()
  const { setSource } = useRecordingStore()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.src = url
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.onloadeddata = () => {
        setVideoElement(video)
        setSource('file')
        video.play()
      }
    } else if (file.type.startsWith('image/')) {
      const img = new Image()
      img.src = url
      img.onload = () => {
        setImageElement(img)
        setSource('file')
      }
    }
  }

  const handleWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      })
      const video = document.createElement('video')
      video.srcObject = stream
      video.playsInline = true
      video.onloadeddata = () => {
        setVideoElement(video)
        setSource('webcam')
        video.play()
      }
    } catch (err) {
      console.error('Webcam error:', err)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-base-dark/80 backdrop-blur-sm">
      {/* Source buttons */}
      <button
        onClick={handleWebcam}
        className={`
          px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors
          ${source === 'webcam'
            ? 'border-accent-yellow text-accent-yellow'
            : 'border-border text-muted hover:text-base-light hover:border-muted'
          }
        `}
      >
        CAM
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className={`
          px-3 py-1.5 text-xs uppercase tracking-wider border transition-colors
          ${source === 'file'
            ? 'border-accent-yellow text-accent-yellow'
            : 'border-border text-muted hover:text-base-light hover:border-muted'
          }
        `}
      >
        FILE
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear button */}
      {source && (
        <button
          onClick={reset}
          className="text-xs uppercase text-muted hover:text-record-red transition-colors"
        >
          CLEAR
        </button>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/performance/PreviewHeader.tsx
git commit -m "feat: add PreviewHeader component for source selection"
```

---

## Task 8: Create PerformanceLayout Component

**Files:**
- Create: `src/components/performance/PerformanceLayout.tsx`

**Step 1: Create the layout component**

```typescript
import { Canvas } from '../Canvas'
import { PreviewHeader } from './PreviewHeader'
import { TransportControls } from './TransportControls'
import { PerformanceGrid } from './PerformanceGrid'

export function PerformanceLayout() {
  return (
    <div className="w-screen h-screen bg-base-dark flex flex-col overflow-hidden">
      {/* Preview section (~25%) */}
      <div className="relative" style={{ height: '25vh' }}>
        {/* Source selection overlay */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <PreviewHeader />
        </div>

        {/* Canvas */}
        <div className="w-full h-full">
          <Canvas />
        </div>
      </div>

      {/* Transport controls */}
      <TransportControls />

      {/* Performance grid (~75%) */}
      <div className="flex-1 overflow-y-auto bg-base-dark">
        <PerformanceGrid />
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/performance/PerformanceLayout.tsx
git commit -m "feat: add PerformanceLayout component"
```

---

## Task 9: Create Index Export for Performance Components

**Files:**
- Create: `src/components/performance/index.ts`

**Step 1: Create the index file**

```typescript
export { EffectButton } from './EffectButton'
export { PerformanceGrid } from './PerformanceGrid'
export { TransportControls } from './TransportControls'
export { PreviewHeader } from './PreviewHeader'
export { PerformanceLayout } from './PerformanceLayout'
```

**Step 2: Commit**

```bash
git add src/components/performance/index.ts
git commit -m "feat: add performance components barrel export"
```

---

## Task 10: Update App.tsx to Use Performance Layout

**Files:**
- Modify: `src/App.tsx`

**Step 1: Replace App with PerformanceLayout**

```typescript
import { PerformanceLayout } from './components/performance'

function App() {
  return <PerformanceLayout />
}

export default App
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: switch App to use PerformanceLayout"
```

---

## Task 11: Add CSS Animations for LED Effects

**Files:**
- Modify: `src/index.css`

**Step 1: Add keyframes and utility classes**

Add to the end of `src/index.css`:

```css
@layer utilities {
  @keyframes pulse-glow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes recording-pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(255, 51, 51, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(255, 51, 51, 0);
    }
  }

  .animate-pulse {
    animation: recording-pulse 1.5s ease-in-out infinite;
  }

  .animate-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }
}
```

**Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: add LED glow animations"
```

---

## Task 12: Clean Up Old Components

**Files:**
- Delete: `src/components/ui/BottomDrawer.tsx`
- Delete: `src/components/ui/TabBar.tsx`
- Delete: `src/components/panels/SourcePanel.tsx`
- Delete: `src/components/panels/GlitchPanel.tsx`
- Delete: `src/components/panels/VisionPanel.tsx`
- Delete: `src/components/panels/ExportPanel.tsx`

**Step 1: Remove old files**

```bash
rm src/components/ui/BottomDrawer.tsx
rm src/components/ui/TabBar.tsx
rm src/components/panels/SourcePanel.tsx
rm src/components/panels/GlitchPanel.tsx
rm src/components/panels/VisionPanel.tsx
rm src/components/panels/ExportPanel.tsx
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old drawer-based UI components"
```

---

## Summary

**New files created:**
- `src/stores/recordingStore.ts` - Automation recording state
- `src/config/effects.ts` - Effect grid definitions
- `src/components/performance/EffectButton.tsx` - Chunky toggle button with encoder
- `src/components/performance/PerformanceGrid.tsx` - 4x3 effect grid
- `src/components/performance/TransportControls.tsx` - Record/play/export controls
- `src/components/performance/PreviewHeader.tsx` - Source selection
- `src/components/performance/PerformanceLayout.tsx` - Main layout
- `src/components/performance/index.ts` - Barrel export

**Files modified:**
- `src/index.css` - New color palette and animations
- `src/App.tsx` - Switched to PerformanceLayout

**Files deleted:**
- `src/components/ui/BottomDrawer.tsx`
- `src/components/ui/TabBar.tsx`
- `src/components/panels/*.tsx` (4 files)

**UI changes:**
- Preview takes ~25% of screen (top)
- Transport bar with record button, timecode, event count
- 4x3 grid of chunky effect buttons with LED indicators
- Each button has encoder graphic for parameter control
- Drag vertically on encoder to change parameter
- Tap button to toggle effect on/off
- Recording captures all effect changes as automation JSON
