# Preset Banks & Randomization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make preset banks functional (save/recall full effect state) and add randomize/undo buttons for creative exploration.

**Architecture:** Centralized preset manager in routingStore that coordinates snapshot/restore across all effect stores. Each store exposes `getSnapshot()` and `applySnapshot()` methods.

**Tech Stack:** React, Zustand, TypeScript

---

## Task 1: Add Snapshot Methods to glitchEngineStore

**Files:**
- Modify: `src/stores/glitchEngineStore.ts`

**Step 1: Define the snapshot type**

Add interface at top of file:

```typescript
export interface GlitchSnapshot {
  rgbSplitEnabled: boolean
  rgbSplit: RGBSplitParams
  blockDisplaceEnabled: boolean
  blockDisplace: BlockDisplaceParams
  scanLinesEnabled: boolean
  scanLines: ScanLinesParams
  noiseEnabled: boolean
  noise: NoiseParams
  pixelateEnabled: boolean
  pixelate: PixelateParams
  edgeDetectionEnabled: boolean
  edgeDetection: EdgeDetectionParams
  wetMix: number
}
```

**Step 2: Add methods to store interface**

```typescript
getSnapshot: () => GlitchSnapshot
applySnapshot: (snapshot: GlitchSnapshot) => void
```

**Step 3: Implement the methods**

```typescript
getSnapshot: () => {
  const state = get()
  return {
    rgbSplitEnabled: state.rgbSplitEnabled,
    rgbSplit: { ...state.rgbSplit },
    blockDisplaceEnabled: state.blockDisplaceEnabled,
    blockDisplace: { ...state.blockDisplace },
    scanLinesEnabled: state.scanLinesEnabled,
    scanLines: { ...state.scanLines },
    noiseEnabled: state.noiseEnabled,
    noise: { ...state.noise },
    pixelateEnabled: state.pixelateEnabled,
    pixelate: { ...state.pixelate },
    edgeDetectionEnabled: state.edgeDetectionEnabled,
    edgeDetection: { ...state.edgeDetection },
    wetMix: state.wetMix,
  }
},

applySnapshot: (snapshot) => set({
  rgbSplitEnabled: snapshot.rgbSplitEnabled,
  rgbSplit: { ...snapshot.rgbSplit },
  blockDisplaceEnabled: snapshot.blockDisplaceEnabled,
  blockDisplace: { ...snapshot.blockDisplace },
  scanLinesEnabled: snapshot.scanLinesEnabled,
  scanLines: { ...snapshot.scanLines },
  noiseEnabled: snapshot.noiseEnabled,
  noise: { ...snapshot.noise },
  pixelateEnabled: snapshot.pixelateEnabled,
  pixelate: { ...snapshot.pixelate },
  edgeDetectionEnabled: snapshot.edgeDetectionEnabled,
  edgeDetection: { ...snapshot.edgeDetection },
  wetMix: snapshot.wetMix,
}),
```

**Step 4: Commit**

```bash
git add src/stores/glitchEngineStore.ts
git commit -m "feat: add snapshot methods to glitchEngineStore"
```

---

## Task 2: Add Snapshot Methods to asciiRenderStore

**Files:**
- Modify: `src/stores/asciiRenderStore.ts`

**Step 1: Define snapshot type and add methods**

```typescript
export interface AsciiSnapshot {
  enabled: boolean
  params: AsciiParams  // Use existing params type
}

// In interface
getSnapshot: () => AsciiSnapshot
applySnapshot: (snapshot: AsciiSnapshot) => void

// Implementation
getSnapshot: () => ({
  enabled: get().enabled,
  params: { ...get().params },
}),

applySnapshot: (snapshot) => set({
  enabled: snapshot.enabled,
  params: { ...snapshot.params },
}),
```

**Step 2: Commit**

```bash
git add src/stores/asciiRenderStore.ts
git commit -m "feat: add snapshot methods to asciiRenderStore"
```

---

## Task 3: Add Snapshot Methods to stippleStore

**Files:**
- Modify: `src/stores/stippleStore.ts`

**Step 1: Define snapshot type and add methods**

```typescript
export interface StippleSnapshot {
  enabled: boolean
  params: StippleParams
}

getSnapshot: () => StippleSnapshot
applySnapshot: (snapshot: StippleSnapshot) => void
```

**Step 2: Commit**

```bash
git add src/stores/stippleStore.ts
git commit -m "feat: add snapshot methods to stippleStore"
```

---

## Task 4: Add Snapshot Methods to landmarksStore

**Files:**
- Modify: `src/stores/landmarksStore.ts`

**Step 1: Define snapshot type and add methods**

```typescript
export interface LandmarksSnapshot {
  enabled: boolean
  currentMode: LandmarkMode
  minDetectionConfidence: number
  minTrackingConfidence: number
  attachToDetections: boolean
}

getSnapshot: () => LandmarksSnapshot
applySnapshot: (snapshot: LandmarksSnapshot) => void
```

**Step 2: Commit**

```bash
git add src/stores/landmarksStore.ts
git commit -m "feat: add snapshot methods to landmarksStore"
```

---

## Task 5: Add Snapshot Methods to pointNetworkStore

**Files:**
- Modify: `src/stores/pointNetworkStore.ts`

**Step 1: Define snapshot type and add methods**

```typescript
export interface PointNetworkSnapshot {
  enabled: boolean
  params: PointNetworkParams
}

getSnapshot: () => PointNetworkSnapshot
applySnapshot: (snapshot: PointNetworkSnapshot) => void
```

**Step 2: Commit**

```bash
git add src/stores/pointNetworkStore.ts
git commit -m "feat: add snapshot methods to pointNetworkStore"
```

---

## Task 6: Add Snapshot Methods to detectionOverlayStore

**Files:**
- Modify: `src/stores/detectionOverlayStore.ts`

**Step 1: Define snapshot type and add methods**

```typescript
export interface DetectionOverlaySnapshot {
  enabled: boolean
  params: DetectionOverlayParams
}

getSnapshot: () => DetectionOverlaySnapshot
applySnapshot: (snapshot: DetectionOverlaySnapshot) => void
```

**Step 2: Commit**

```bash
git add src/stores/detectionOverlayStore.ts
git commit -m "feat: add snapshot methods to detectionOverlayStore"
```

---

## Task 7: Update routingStore with Full State Management

**Files:**
- Modify: `src/stores/routingStore.ts`

**Step 1: Update RoutingPreset interface**

```typescript
import { type GlitchSnapshot } from './glitchEngineStore'
import { type AsciiSnapshot } from './asciiRenderStore'
import { type StippleSnapshot } from './stippleStore'
import { type LandmarksSnapshot } from './landmarksStore'
import { type PointNetworkSnapshot } from './pointNetworkStore'
import { type DetectionOverlaySnapshot } from './detectionOverlayStore'

export interface RoutingPreset {
  name: string
  effectOrder: string[]
  glitch: GlitchSnapshot
  ascii: AsciiSnapshot
  stipple: StippleSnapshot
  landmarks: LandmarksSnapshot
  pointNetwork: PointNetworkSnapshot
  detectionOverlay: DetectionOverlaySnapshot
}
```

**Step 2: Add new state fields**

```typescript
interface RoutingState {
  // ... existing fields
  previousState: RoutingPreset | null  // For undo randomize

  // New actions
  captureFullState: () => Omit<RoutingPreset, 'name'>
  applyFullState: (preset: RoutingPreset) => void
  randomize: () => void
  undoRandomize: () => void
}
```

**Step 3: Implement captureFullState**

```typescript
captureFullState: () => {
  const glitch = useGlitchEngineStore.getState().getSnapshot()
  const ascii = useAsciiRenderStore.getState().getSnapshot()
  const stipple = useStippleStore.getState().getSnapshot()
  const landmarks = useLandmarksStore.getState().getSnapshot()
  const pointNetwork = usePointNetworkStore.getState().getSnapshot()
  const detectionOverlay = useDetectionOverlayStore.getState().getSnapshot()

  return {
    effectOrder: [...get().effectOrder],
    glitch,
    ascii,
    stipple,
    landmarks,
    pointNetwork,
    detectionOverlay,
  }
},
```

**Step 4: Implement applyFullState**

```typescript
applyFullState: (preset) => {
  useGlitchEngineStore.getState().applySnapshot(preset.glitch)
  useAsciiRenderStore.getState().applySnapshot(preset.ascii)
  useStippleStore.getState().applySnapshot(preset.stipple)
  useLandmarksStore.getState().applySnapshot(preset.landmarks)
  usePointNetworkStore.getState().applySnapshot(preset.pointNetwork)
  useDetectionOverlayStore.getState().applySnapshot(preset.detectionOverlay)
  set({ effectOrder: [...preset.effectOrder] })
},
```

**Step 5: Implement randomize**

```typescript
randomize: () => {
  const current = get().captureFullState()
  set({ previousState: { name: '_previous', ...current } })

  // Helper for random in range
  const rand = (min: number, max: number) => min + Math.random() * (max - min)
  const randBool = () => Math.random() > 0.5

  // Shuffle effect order
  const shuffled = [...current.effectOrder].sort(() => Math.random() - 0.5)

  const randomized: RoutingPreset = {
    name: '_random',
    effectOrder: shuffled,
    glitch: {
      rgbSplitEnabled: randBool(),
      rgbSplit: {
        amount: rand(0, 2),
        redOffsetX: rand(-0.05, 0.05),
        redOffsetY: rand(-0.05, 0.05),
        greenOffsetX: 0,
        greenOffsetY: 0,
        blueOffsetX: rand(-0.05, 0.05),
        blueOffsetY: rand(-0.05, 0.05),
      },
      blockDisplaceEnabled: randBool(),
      blockDisplace: {
        blockSize: rand(0.02, 0.15),
        displaceDistance: rand(0, 0.1),
        seed: Math.floor(rand(0, 1000)),
      },
      scanLinesEnabled: randBool(),
      scanLines: {
        lineCount: Math.floor(rand(50, 400)),
        lineOpacity: rand(0.1, 0.8),
        flickerSpeed: rand(0, 3),
      },
      noiseEnabled: randBool(),
      noise: {
        amount: rand(0, 0.5),
        speed: rand(1, 30),
      },
      pixelateEnabled: randBool(),
      pixelate: {
        pixelSize: Math.floor(rand(2, 24)),
      },
      edgeDetectionEnabled: randBool(),
      edgeDetection: {
        threshold: rand(0.1, 0.9),
        mixAmount: rand(0.3, 1),
      },
      wetMix: rand(0.5, 1),
    },
    ascii: {
      enabled: randBool(),
      params: {
        ...current.ascii.params,
        fontSize: Math.floor(rand(6, 16)),
        contrast: rand(0.8, 1.5),
      },
    },
    stipple: {
      enabled: randBool(),
      params: {
        ...current.stipple.params,
        particleSize: rand(1, 6),
        density: rand(0.5, 2),
      },
    },
    landmarks: {
      ...current.landmarks,
      enabled: randBool(),
    },
    pointNetwork: {
      enabled: randBool(),
      params: {
        ...current.pointNetwork.params,
        pointRadius: rand(1, 8),
        maxDistance: rand(0.05, 0.3),
      },
    },
    detectionOverlay: {
      enabled: randBool(),
      params: current.detectionOverlay.params,
    },
  }

  get().applyFullState(randomized)
},
```

**Step 6: Implement undoRandomize**

```typescript
undoRandomize: () => {
  const prev = get().previousState
  if (prev) {
    get().applyFullState(prev)
    set({ previousState: null })
  }
},
```

**Step 7: Update savePreset and loadPreset**

```typescript
savePreset: (presetIndex, name) => {
  const state = get()
  const fullState = state.captureFullState()

  const preset: RoutingPreset = {
    name: name || state.banks[state.activeBank][presetIndex]?.name || `Preset ${presetIndex + 1}`,
    ...fullState,
  }

  set((s) => {
    const newBanks = s.banks.map((bank, bi) =>
      bi === s.activeBank
        ? bank.map((p, pi) => pi === presetIndex ? preset : p)
        : bank
    )
    return {
      banks: newBanks,
      activePreset: presetIndex,
      isModified: false,
    }
  })
},

loadPreset: (presetIndex) => {
  const state = get()
  const preset = state.banks[state.activeBank][presetIndex]

  if (preset) {
    state.applyFullState(preset)
    set({ activePreset: presetIndex, isModified: false })
  }
},
```

**Step 8: Commit**

```bash
git add src/stores/routingStore.ts
git commit -m "feat: add full state management and randomization to routingStore"
```

---

## Task 8: Create CreativeToolsBar Component

**Files:**
- Create: `src/components/performance/CreativeToolsBar.tsx`

**Step 1: Create the component**

```typescript
import { useRoutingStore } from '../../stores/routingStore'

export function CreativeToolsBar() {
  const { randomize, undoRandomize, previousState } = useRoutingStore()

  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{ backgroundColor: '#f0f0f0' }}
    >
      <button
        onClick={randomize}
        className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d0d0d0',
          color: '#1a1a1a',
        }}
      >
        Randomize
      </button>

      <button
        onClick={undoRandomize}
        disabled={!previousState}
        className="px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d0d0d0',
          color: previousState ? '#1a1a1a' : '#999999',
          opacity: previousState ? 1 : 0.5,
        }}
      >
        Undo
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/performance/CreativeToolsBar.tsx
git commit -m "feat: add CreativeToolsBar component"
```

---

## Task 9: Update PerformanceLayout

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`

**Step 1: Import CreativeToolsBar**

```typescript
import { CreativeToolsBar } from './CreativeToolsBar'
```

**Step 2: Add CreativeToolsBar above PerformanceGrid**

Find the left column that contains `<PerformanceGrid />` and wrap it:

```tsx
{/* Left column */}
<div className="flex flex-col" style={{ width: '50vw' }}>
  <CreativeToolsBar />
  <div className="flex-1">
    <PerformanceGrid />
  </div>
</div>
```

**Step 3: Commit**

```bash
git add src/components/performance/PerformanceLayout.tsx
git commit -m "feat: add CreativeToolsBar to PerformanceLayout"
```

---

## Task 10: Test Full Flow

**Manual testing checklist:**

1. Enable a few effects, adjust parameters
2. Save to Preset 1 in Bank A
3. Change effects completely
4. Load Preset 1 - verify all effects and params restore
5. Hit Randomize - verify effects change chaotically
6. Hit Undo - verify returns to pre-randomize state
7. Switch to Bank B, save different preset
8. Switch back to Bank A, load Preset 1 - verify correct restore
9. Copy preset, paste to Preset 2, verify duplicate works

**Step 1: Commit final changes**

```bash
git add -A
git commit -m "feat: complete preset banks and randomization feature"
```

---

## Summary

**Files modified:**
- `src/stores/glitchEngineStore.ts` - snapshot methods
- `src/stores/asciiRenderStore.ts` - snapshot methods
- `src/stores/stippleStore.ts` - snapshot methods
- `src/stores/landmarksStore.ts` - snapshot methods
- `src/stores/pointNetworkStore.ts` - snapshot methods
- `src/stores/detectionOverlayStore.ts` - snapshot methods
- `src/stores/routingStore.ts` - full state management, randomize, undo
- `src/components/performance/PerformanceLayout.tsx` - layout update

**Files created:**
- `src/components/performance/CreativeToolsBar.tsx`

**Features delivered:**
- Presets save/recall complete effect state (4 banks × 4 presets)
- Randomize button with full chaos mode
- Single-step undo for randomization
- Creative tools bar above effect grid
