# Effect Sequencer - Implementation Plan

Design: `docs/plans/2026-02-17-effect-sequencer-plocks.md`

## Phase 1: Store + Data Layer

### Step 1.1: Create `src/stores/effectSequencerStore.ts`

New Zustand store. Follow the pattern from `sequencerStore.ts` (using `create<T>((set, get) => ({...}))`).

**Types:**

```typescript
export type EffectStepResolution = '1/4' | '1/8' | '1/16' | '1/32'

export interface EffectStep {
  active: boolean
  locks: Record<string, number>  // paramId -> raw value (e.g., "amount" -> 2.5)
  probability: number            // 0-1, default 1
  condition: 'always' | 'fill'
}

export interface EffectTrack {
  effectId: string
  mode: 'gate' | 'param'
  steps: EffectStep[]            // always 64 entries
  length: number                 // active step count, default 16
  muted: boolean
  soloed: boolean
}

export interface EffectSequencerState {
  tracks: Record<string, EffectTrack>    // keyed by effectId
  bpm: number                            // default 120
  resolution: EffectStepResolution       // default '1/16'
  isPlaying: boolean
  currentStep: number                    // global playhead 0-63
  stepPage: number                       // visible page 0-3
  selectedStep: { effectId: string; stepIndex: number } | null
  selectedSteps: { effectId: string; stepIndex: number }[]  // for multi-select
  swing: number                          // 0-100, default 0
  fillModeActive: boolean                // for condition: 'fill' steps

  // Actions
  play: () => void
  stop: () => void
  setBpm: (bpm: number) => void
  setResolution: (res: EffectStepResolution) => void
  setSwing: (swing: number) => void
  setStepPage: (page: number) => void
  setFillModeActive: (active: boolean) => void

  // Track management
  ensureTrack: (effectId: string) => void     // create if missing
  removeTrack: (effectId: string) => void
  setTrackMode: (effectId: string, mode: 'gate' | 'param') => void
  setTrackMuted: (effectId: string, muted: boolean) => void
  setTrackSoloed: (effectId: string, soloed: boolean) => void
  setTrackLength: (effectId: string, length: number) => void

  // Step editing
  toggleStep: (effectId: string, stepIndex: number) => void
  setStepActive: (effectId: string, stepIndex: number, active: boolean) => void
  selectStep: (effectId: string, stepIndex: number) => void
  addToSelection: (effectId: string, stepIndex: number) => void  // shift+click
  clearSelection: () => void
  setStepLock: (effectId: string, stepIndex: number, paramId: string, value: number) => void
  clearStepLock: (effectId: string, stepIndex: number, paramId: string) => void
  clearAllStepLocks: (effectId: string, stepIndex: number) => void
  setStepProbability: (effectId: string, stepIndex: number, prob: number) => void

  // Playback (called by engine)
  advanceStep: () => void
}
```

**Default step factory:**

```typescript
const createDefaultStep = (): EffectStep => ({
  active: false,
  locks: {},
  probability: 1,
  condition: 'always',
})
```

**`ensureTrack` implementation:**

```typescript
ensureTrack: (effectId) => {
  const state = get()
  if (state.tracks[effectId]) return  // already exists
  set({
    tracks: {
      ...state.tracks,
      [effectId]: {
        effectId,
        mode: 'gate',
        steps: Array.from({ length: 64 }, createDefaultStep),
        length: 16,
        muted: false,
        soloed: false,
      },
    },
  })
}
```

**`toggleStep` - immutable update pattern** (follows `sequencerStore.ts:264`):

```typescript
toggleStep: (effectId, stepIndex) => {
  set((state) => {
    const track = state.tracks[effectId]
    if (!track) return state
    const newSteps = [...track.steps]
    newSteps[stepIndex] = { ...newSteps[stepIndex], active: !newSteps[stepIndex].active }
    return {
      tracks: {
        ...state.tracks,
        [effectId]: { ...track, steps: newSteps },
      },
    }
  })
}
```

**`setStepLock`:**

```typescript
setStepLock: (effectId, stepIndex, paramId, value) => {
  set((state) => {
    const track = state.tracks[effectId]
    if (!track) return state
    const newSteps = [...track.steps]
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      locks: { ...newSteps[stepIndex].locks, [paramId]: value },
    }
    return {
      tracks: { ...state.tracks, [effectId]: { ...track, steps: newSteps } },
    }
  })
}
```

**`advanceStep`:**

```typescript
advanceStep: () => {
  set((state) => ({
    currentStep: (state.currentStep + 1) % 64,
  }))
}
```

**Verification:** Import store in a test component, call `ensureTrack('rgb_split')`, verify track appears in state.

---

### Step 1.2: Create effect parameter registry `src/config/effectParams.ts`

A lookup table mapping each effectId to its lockable parameters. This replaces the giant switch statement approach — the p-lock UI and playback engine both use this registry.

```typescript
export interface LockableParam {
  id: string           // param key used in locks (e.g., "amount")
  label: string        // display label (e.g., "AMT")
  min: number
  max: number
  step: number
  defaultValue: number
  // Function to apply value to store
  apply: (value: number) => void
  // Function to read current value from store
  read: () => number
}

export type ParamRegistryEntry = {
  getParams: () => LockableParam[]
  setEnabled: (enabled: boolean) => void
  getEnabled: () => boolean
}

export const getEffectParamRegistry = (): Record<string, ParamRegistryEntry> => {
  // Must be called inside React or use getState() pattern
  // Each entry returns a lazy getter for current store instances
  return {
    rgb_split: {
      getParams: () => {
        const g = useGlitchEngineStore.getState()
        return [
          { id: 'amount', label: 'AMT', min: 0, max: 5, step: 0.01,
            defaultValue: g.rgbSplit.amount,
            apply: (v) => useGlitchEngineStore.getState().updateRGBSplit({ amount: v }),
            read: () => useGlitchEngineStore.getState().rgbSplit.amount },
          { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
            defaultValue: g.rgbSplit.mix,
            apply: (v) => useGlitchEngineStore.getState().updateRGBSplit({ mix: v }),
            read: () => useGlitchEngineStore.getState().rgbSplit.mix },
        ]
      },
      setEnabled: (v) => useGlitchEngineStore.getState().setRGBSplitEnabled(v),
      getEnabled: () => useGlitchEngineStore.getState().rgbSplitEnabled,
    },
    // ... all other effects follow the same pattern
  }
}
```

This is the **single source of truth** for parameter definitions. The p-lock detail panel reads `getParams()` to render sliders. The playback engine calls `apply()` to set values and `read()` to capture base values.

Build this out for all effects listed in `CompactEffectParams.tsx` — use the exact same `paramId`, `min`, `max`, `step` values from those Knob components. Start with the ~14 glitch effects, ~12 acid effects, then strand/vision/motion/destruction.

**Verification:** Log `Object.keys(getEffectParamRegistry())` and confirm all effect IDs are present.

---

## Phase 2: Playback Engine

### Step 2.1: Create `src/hooks/useEffectSequencerPlayback.ts`

Follow the RAF loop pattern from `useSequencerPlayback.ts:313-374`.

**Imports:**

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useRoutingStore } from '../stores/routingStore'
import { getEffectParamRegistry } from '../config/effectParams'
```

**Timing** (reuse the exact `RESOLUTION_MS` pattern from `useSequencerPlayback.ts:12-17`):

```typescript
const RESOLUTION_MS: Record<string, number> = {
  '1/4': 1, '1/8': 0.5, '1/16': 0.25, '1/32': 0.125,
}

const getMsPerStep = useCallback(() => {
  const beatsPerStep = RESOLUTION_MS[resolution] || 0.25
  return (60000 / bpm) * beatsPerStep
}, [bpm, resolution])
```

**Base value snapshot** — captured when playback starts:

```typescript
const baseValues = useRef<Record<string, Record<string, number>>>({})
// { effectId: { paramId: value, ... }, ... }

// On play: capture base values for all tracks
const captureBaseValues = useCallback(() => {
  const registry = getEffectParamRegistry()
  const tracks = useEffectSequencerStore.getState().tracks
  const snapshot: Record<string, Record<string, number>> = {}
  for (const effectId of Object.keys(tracks)) {
    const entry = registry[effectId]
    if (!entry) continue
    snapshot[effectId] = {}
    for (const param of entry.getParams()) {
      snapshot[effectId][param.id] = param.read()
    }
  }
  baseValues.current = snapshot
}, [])
```

**Step execution logic:**

```typescript
const executeStep = useCallback(() => {
  const { tracks, currentStep, fillModeActive } = useEffectSequencerStore.getState()
  const registry = getEffectParamRegistry()
  const effectOrder = useRoutingStore.getState().effectOrder

  // Check for any soloed tracks
  const trackList = Object.values(tracks)
  const hasSolo = trackList.some(t => t.soloed)

  for (const effectId of effectOrder) {
    const track = tracks[effectId]
    if (!track) continue
    if (track.muted) continue
    if (hasSolo && !track.soloed) continue

    const entry = registry[effectId]
    if (!entry) continue

    const step = track.steps[currentStep % track.length]

    // Check condition
    if (step.condition === 'fill' && !fillModeActive) {
      // Treat as inactive
      if (track.mode === 'gate') entry.setEnabled(false)
      continue
    }

    // Check probability
    const shouldFire = step.active && Math.random() < step.probability

    if (track.mode === 'gate') {
      if (shouldFire) {
        entry.setEnabled(true)
        // Apply locks
        for (const param of entry.getParams()) {
          if (param.id in step.locks) {
            param.apply(step.locks[param.id])
          }
        }
      } else {
        entry.setEnabled(false)
      }
    } else if (track.mode === 'param') {
      if (shouldFire && Object.keys(step.locks).length > 0) {
        // Apply locks
        for (const param of entry.getParams()) {
          if (param.id in step.locks) {
            param.apply(step.locks[param.id])
          }
        }
      } else {
        // Revert to base values
        const base = baseValues.current[effectId]
        if (base) {
          for (const param of entry.getParams()) {
            if (param.id in base) {
              param.apply(base[param.id])
            }
          }
        }
      }
    }
  }

  // Advance playhead
  useEffectSequencerStore.getState().advanceStep()
}, [])
```

**RAF loop** (follows `useSequencerPlayback.ts:313-334`):

```typescript
const lastStepTime = useRef(0)
const animationFrameId = useRef<number | null>(null)

const playbackLoop = useCallback((timestamp: number) => {
  if (!isPlaying) return
  const msPerStep = getMsPerStep()
  if (timestamp - lastStepTime.current >= msPerStep) {
    lastStepTime.current = timestamp
    executeStep()
  }
  animationFrameId.current = requestAnimationFrame(playbackLoop)
}, [isPlaying, getMsPerStep, executeStep])

useEffect(() => {
  if (isPlaying) {
    captureBaseValues()
    lastStepTime.current = performance.now()
    animationFrameId.current = requestAnimationFrame(playbackLoop)
  } else {
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
    // Restore base values on stop
    restoreBaseValues()
  }
  return () => {
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current)
    }
  }
}, [isPlaying, playbackLoop, captureBaseValues])
```

**Verification:** Create a test track with 4 active steps, each with a different `amount` lock on `rgb_split`. Play. Verify the RGB split amount snaps between values every step. Stop. Verify the amount returns to its pre-play value.

---

## Phase 3: UI Components

### Step 3.1: Create `src/components/sequencer/EffectStepCell.tsx`

A single step cell. Approximately 40-60px tall, flexible width (fills available space in a 16-column grid).

**Props:**

```typescript
interface EffectStepCellProps {
  effectId: string
  stepIndex: number
  step: EffectStep
  isCurrentStep: boolean     // playhead is here
  isSelected: boolean        // selected for p-lock editing
  color: string              // effect's accent color
  onMouseDown: (stepIndex: number, e: React.MouseEvent) => void
  onMouseEnter: (stepIndex: number) => void
}
```

**Visual states** (matching design doc):
- **Inactive:** `backgroundColor: 'var(--bg-elevated)'`, subtle `1px solid var(--border)` border
- **Active (no locks):** Brighter fill `var(--bg-hover)`, small colored bar at bottom (4px tall, `color` prop)
- **Active + locks:** Same, but bar height proportional to number of locks (4px per lock, max ~16px). Each lock gets its own thin colored line.
- **Playhead:** `border: 1px solid var(--accent)`, slight `box-shadow: 0 0 4px var(--accent-glow)`
- **Selected:** `border: 1px solid ${color}`, `box-shadow: 0 0 6px ${color}40`

Follow the drag-to-draw pattern from `StepGrid.tsx:28-48` — `onMouseDown` sets drag state in parent, `onMouseEnter` applies drag value.

---

### Step 3.2: Create `src/components/sequencer/EffectTrackRow.tsx`

A single horizontal track row.

**Props:**

```typescript
interface EffectTrackRowProps {
  effectId: string
  track: EffectTrack
  stepPage: number            // 0-3
  currentStep: number
  selectedStep: { effectId: string; stepIndex: number } | null
  color: string               // from effect definition
  label: string               // from effect definition
}
```

**Layout:**

```
┌─────────────────┬────────────────────────────────────────────┐
│  LABEL          │  [step][step][step]...[step]  (16 cells)   │
│  G/P   M   S   │                                             │
└─────────────────┴────────────────────────────────────────────┘
```

- **Header section** (left, fixed width ~120px):
  - Effect label: `text-[10px] uppercase tracking-wide`, color from effect definition
  - Mode toggle button: "G" or "P", click cycles between gate/param. Style like existing tab buttons.
  - Mute button: "M", toggles `track.muted`. When muted: `color: var(--text-ghost)`, dimmed row.
  - Solo button: "S", toggles `track.soloed`. When soloed: `color: var(--accent)`.
- **Steps section** (right, flex-1): CSS grid with 16 columns, renders `EffectStepCell` for steps `[page*16 .. page*16+15]`.

**Drag-to-draw state** managed here (lifted from cells):

```typescript
const [isDragging, setIsDragging] = useState(false)
const [dragValue, setDragValue] = useState<boolean | null>(null)

const handleCellMouseDown = (stepIndex: number, e: React.MouseEvent) => {
  if (e.shiftKey) {
    addToSelection(effectId, stepIndex)
    return
  }
  const step = track.steps[stepIndex]
  if (step.active) {
    selectStep(effectId, stepIndex)  // open p-lock detail
  } else {
    setIsDragging(true)
    setDragValue(true)
    setStepActive(effectId, stepIndex, true)
  }
}
```

Global `mouseup` listener to end drag (follows `StepGrid.tsx` pattern).

**Verification:** Render a track row with 16 cells. Click empty cells to activate. Click active cell to select. Verify M/S/mode toggles update store.

---

### Step 3.3: Create `src/components/sequencer/PLockDetail.tsx`

Bottom panel showing parameter sliders for the selected step.

**Props:**

```typescript
interface PLockDetailProps {
  effectId: string
  stepIndex: number
  step: EffectStep
  color: string
}
```

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│ ▸ RGB_SPLT Step 3     [Clear All]                            │
│ [AMT ═══●═══] [MIX ══●════] [OFS ════●══]                   │
└──────────────────────────────────────────────────────────────┘
```

- Header: effect label + "Step N" + "Clear All" button
- Parameter row: One slider per lockable param (from `getEffectParamRegistry()`)
- Each slider shows: label, horizontal slider track, current lock value (or base value if no lock)
- **Locked params** have accent-colored slider fill
- **Unlocked params** have dimmed slider fill — adjusting them creates a lock
- Small "x" button per param to clear that individual lock

Use compact horizontal sliders (not the existing Knob component — sliders fit better in this horizontal detail strip). Height: ~60-70px total.

**Interaction:**
- Read params from registry: `registry[effectId].getParams()`
- Read current lock value: `step.locks[param.id]` if exists, else `param.read()` (base value)
- On slider change: `setStepLock(effectId, stepIndex, param.id, value)`
- On "x" click: `clearStepLock(effectId, stepIndex, param.id)`
- On "Clear All": `clearAllStepLocks(effectId, stepIndex)`
- If `selectedSteps.length > 1` (multi-select): apply lock to ALL selected steps

**Verification:** Select a step, verify sliders appear with correct min/max/values. Drag a slider, verify lock appears in store. Click "x", verify lock is removed.

---

### Step 3.4: Create `src/components/sequencer/EffectSequencer.tsx`

Main container assembling transport + tracks + p-lock detail.

**Layout:**

```typescript
<div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
  {/* Transport bar */}
  <div className="flex-shrink-0 control-row" style={{ borderBottom: '1px solid var(--border)' }}>
    {/* Play/Stop, BPM, Resolution, Swing, Page dots */}
  </div>

  {/* Track list (scrollable) */}
  <div className="flex-1 min-h-0 overflow-y-auto">
    {activeTrackIds.map(effectId => (
      <EffectTrackRow key={effectId} ... />
    ))}
    {activeTrackIds.length === 0 && (
      <div className="...">Enable effects on the grid to add tracks</div>
    )}
  </div>

  {/* P-lock detail (conditional) */}
  {selectedStep && (
    <div className="flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
      <PLockDetail ... />
    </div>
  )}
</div>
```

**Track ordering:** Get `effectOrder` from `routingStore`, filter to only effects that have tracks in `effectSequencerStore.tracks`, then filter to only currently-enabled effects (from their respective stores via the param registry's `getEnabled()`).

**Transport controls** (follow `StepSequencerPanel.tsx:96-122`):
- Play/stop button: `onClick={isPlaying ? stop : play}`, uses `PlayIcon`/`StopIcon` from `DotMatrixIcons`
- BPM: Drag-to-adjust pattern from `StepSequencerPanel.tsx:48-62`. Display: `BPM 120`
- Resolution: Click to cycle through `['1/4', '1/8', '1/16', '1/32']`
- Swing: Small knob or drag value `SWG 0`
- Page dots: 4 dots, click to switch `stepPage`. Active page filled, page with playhead partially filled. (Pattern from `StepGrid.tsx:111-140`)

**Hook initialization:** Call `useEffectSequencerPlayback()` here.

**Verification:** Enable 3 effects on the grid. Verify 3 track rows appear in the sequencer. Click play, verify playhead moves. Select a step, verify PLockDetail appears at bottom.

---

## Phase 4: Integration

### Step 4.1: Update `src/stores/sequencerContainerStore.ts`

Add `'effects'` to the sequencer type union and make it the default:

```typescript
export type SequencerType = 'effects' | 'slicer' | 'euclid' | 'steps'

// Change default:
activeSequencer: 'effects',
```

---

### Step 4.2: Update `src/components/sequencer/SequencerContainer.tsx`

1. Import `EffectSequencer`:
   ```typescript
   import { EffectSequencer } from './EffectSequencer'
   ```

2. Add icon to `SEQUENCER_ICONS`:
   ```typescript
   const SEQUENCER_ICONS = {
     effects: '⬡',   // Hexagon - effect grid
     slicer: '⊗',
     euclid: '◉',
     steps: '⊞',
   }
   ```

3. Add tab button (first in the list, before slicer):
   ```typescript
   <button
     onClick={() => setActiveSequencer('effects')}
     className="px-2 py-3 flex items-center justify-center transition-colors"
     style={{
       backgroundColor: activeSequencer === 'effects' ? 'var(--bg-elevated)' : 'transparent',
       borderBottom: '1px solid var(--border)',
     }}
     title="P-LOCK - Effect Sequencer"
   >
     <span className="text-[18px]" style={{
       color: activeSequencer === 'effects' ? 'var(--accent)' : 'var(--text-ghost)',
     }}>
       {SEQUENCER_ICONS.effects}
     </span>
   </button>
   ```

4. Add content render:
   ```typescript
   {activeSequencer === 'effects' && <EffectSequencer />}
   ```

---

### Step 4.3: Update `src/components/performance/PerformanceGrid.tsx`

In the `getEffectState` function, for every effect's `onToggle` handler, add `ensureTrack` call:

```typescript
case 'rgb_split':
  return {
    active: glitch.rgbSplitEnabled,
    value: glitch.rgbSplit.amount,
    onToggle: () => {
      if (!glitch.rgbSplitEnabled) moveToEndOfChain(effectId)
      glitch.setRGBSplitEnabled(!glitch.rgbSplitEnabled)
      effectSeq.ensureTrack(effectId)  // NEW: ensure sequencer track exists
    },
    onValueChange: (v: number) => glitch.updateRGBSplit({ amount: v }),
  }
```

**Approach:** Rather than modifying every case (there are ~60 effects), wrap the pattern. Add at the top of `PerformanceGrid`:

```typescript
const effectSeq = useEffectSequencerStore()
```

Then create a wrapper in the component:

```typescript
const wrapToggle = (effectId: string, originalToggle: () => void) => () => {
  originalToggle()
  effectSeq.ensureTrack(effectId)
}
```

And in the render, wrap each button's `onToggle`:

```typescript
const state = getEffectState(effect.id)
// In the EffectButton props:
onToggle={wrapToggle(effect.id, state.onToggle)}
```

This avoids touching the 60+ switch cases.

**Verification:** Click a grid button. Verify the effect toggles AND a track appears in the effect sequencer. Click it again (disable). Verify the track persists (pattern preserved).

---

### Step 4.4: Mutual exclusion with existing sequencer

When the effect sequencer starts playing, pause the old step sequencer and vice versa.

In `useEffectSequencerPlayback`, add to the play effect:

```typescript
useEffect(() => {
  if (isPlaying) {
    // Stop existing sequencer if running
    const oldSeq = useSequencerStore.getState()
    if (oldSeq.isPlaying) oldSeq.stop()
  }
}, [isPlaying])
```

Add the reverse in `useSequencerPlayback.ts`:

```typescript
useEffect(() => {
  if (isPlaying) {
    const effectSeq = useEffectSequencerStore.getState()
    if (effectSeq.isPlaying) effectSeq.stop()
  }
}, [isPlaying])
```

---

## Phase 5: Polish

### Step 5.1: Keyboard shortcuts

Add to `EffectSequencer.tsx` or a dedicated hook:
- **Space:** Play/stop effect sequencer (only when sequencer panel is focused/active)
- **Escape:** Clear step selection
- **Left/Right arrows:** Move step selection
- **1-4:** Switch step page

### Step 5.2: Visual polish
- Step cells should pulse briefly when the playhead hits them (CSS transition on border-color)
- Track rows with all steps inactive should appear dimmed
- Scroll the track list to keep the most recently toggled effect visible
- P-lock detail slides in/out with a quick CSS transition (`max-height` transition)

### Step 5.3: Persist patterns
- Add `persist` middleware to `effectSequencerStore` (same pattern as other stores if they use it)
- Or add to the existing preset/snapshot system via `routingStore.captureFullState()`

---

## File Summary

| File | Action | Phase |
|------|--------|-------|
| `src/stores/effectSequencerStore.ts` | CREATE | 1.1 |
| `src/config/effectParams.ts` | CREATE | 1.2 |
| `src/hooks/useEffectSequencerPlayback.ts` | CREATE | 2.1 |
| `src/components/sequencer/EffectStepCell.tsx` | CREATE | 3.1 |
| `src/components/sequencer/EffectTrackRow.tsx` | CREATE | 3.2 |
| `src/components/sequencer/PLockDetail.tsx` | CREATE | 3.3 |
| `src/components/sequencer/EffectSequencer.tsx` | CREATE | 3.4 |
| `src/stores/sequencerContainerStore.ts` | MODIFY — add 'effects' type, change default | 4.1 |
| `src/components/sequencer/SequencerContainer.tsx` | MODIFY — add tab + content | 4.2 |
| `src/components/performance/PerformanceGrid.tsx` | MODIFY — wrap onToggle with ensureTrack | 4.3 |
| `src/hooks/useSequencerPlayback.ts` | MODIFY — mutual exclusion | 4.4 |

## Execution Order

Phases 1-2 can be built and tested without any UI. Phase 3 builds the UI. Phase 4 integrates. Phase 5 polishes.

Within Phase 3, build in order: StepCell → TrackRow → PLockDetail → EffectSequencer (each depends on the previous).

Phases 1.1 and 1.2 are independent and can be built in parallel.
