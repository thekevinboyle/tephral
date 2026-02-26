# Effect Launcher Grid Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an audio-reactive effect sequencer grid that cycles through effect presets in time with music, living as a new tab alongside timeline/slicer in the sequencer container.

**Architecture:** New Zustand store holds a 4x4 grid of cells (each referencing an existing effect + parameter snapshot). A `requestAnimationFrame` hook reads audio band energy and advances cells when threshold is crossed. Grid UI renders in the sequencer container as a new tab. Effects are enabled/disabled on the existing pipeline imperatively via store `.getState()` calls.

**Tech Stack:** React 19, Zustand, Web Audio API (existing `audioReactiveStore` + `audioSourceStore`), existing effect stores

---

### Task 1: Create the Effect Launcher Store

**Files:**
- Create: `src/stores/effectLauncherStore.ts`

**Step 1: Write the store**

```typescript
import { create } from 'zustand'

export interface LauncherCell {
  effectId: string
  params: Record<string, number>
}

export type CycleMode = 'speed' | 'selection' | 'combined'
export type TriggerBand = 'sub' | 'kick' | 'mid' | 'high' | 'all'

interface EffectLauncherState {
  cells: (LauncherCell | null)[]
  activeIndex: number | null
  selectedIndex: number | null
  isPlaying: boolean
  cycleMode: CycleMode
  triggerBand: TriggerBand
  threshold: number
  holdTime: number
  fallbackRate: number

  setCell: (index: number, effectId: string, params: Record<string, number>) => void
  clearCell: (index: number) => void
  selectCell: (index: number | null) => void
  play: () => void
  stop: () => void
  advance: () => void
  jumpTo: (index: number) => void
  setCycleMode: (mode: CycleMode) => void
  setTriggerBand: (band: TriggerBand) => void
  setThreshold: (v: number) => void
  setHoldTime: (v: number) => void
  setFallbackRate: (v: number) => void
}

export const useEffectLauncherStore = create<EffectLauncherState>((set, get) => ({
  cells: Array(16).fill(null),
  activeIndex: null,
  selectedIndex: null,
  isPlaying: false,
  cycleMode: 'speed',
  triggerBand: 'sub',
  threshold: 0.3,
  holdTime: 200,
  fallbackRate: 120,

  setCell: (index, effectId, params) => set((s) => {
    const cells = [...s.cells]
    cells[index] = { effectId, params }
    return { cells }
  }),

  clearCell: (index) => set((s) => {
    const cells = [...s.cells]
    cells[index] = null
    return { cells, selectedIndex: s.selectedIndex === index ? null : s.selectedIndex }
  }),

  selectCell: (index) => set({ selectedIndex: index }),

  play: () => {
    const { cells } = get()
    const firstNonEmpty = cells.findIndex(c => c !== null)
    if (firstNonEmpty === -1) return
    set({ isPlaying: true, activeIndex: firstNonEmpty })
  },

  stop: () => set({ isPlaying: false, activeIndex: null }),

  advance: () => {
    const { cells, activeIndex } = get()
    const nonEmptyIndices = cells
      .map((c, i) => c !== null ? i : -1)
      .filter(i => i !== -1)
    if (nonEmptyIndices.length === 0) return
    if (nonEmptyIndices.length === 1) return // stay on the single cell
    const currentPos = activeIndex !== null ? nonEmptyIndices.indexOf(activeIndex) : -1
    const nextPos = (currentPos + 1) % nonEmptyIndices.length
    set({ activeIndex: nonEmptyIndices[nextPos] })
  },

  jumpTo: (index) => {
    const { cells } = get()
    if (cells[index] !== null) set({ activeIndex: index })
  },

  setCycleMode: (mode) => set({ cycleMode: mode }),
  setTriggerBand: (band) => set({ triggerBand: band }),
  setThreshold: (v) => set({ threshold: Math.max(0, Math.min(1, v)) }),
  setHoldTime: (v) => set({ holdTime: Math.max(50, Math.min(2000, v)) }),
  setFallbackRate: (v) => set({ fallbackRate: Math.max(30, Math.min(300, v)) }),
}))
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `effectLauncherStore.ts`

**Step 3: Commit**

```bash
git add src/stores/effectLauncherStore.ts
git commit -m "feat(launcher): add effect launcher store — grid cells, cycling, audio config"
```

---

### Task 2: Create the Effect Enable/Disable Utility

The cycling hook needs to enable/disable effects imperatively (outside React). Create a utility that mirrors `useEffectDisable` but works with `getState()` and also supports enabling + setting params.

**Files:**
- Create: `src/utils/effectControl.ts`

**Step 1: Write the imperative enable/disable utility**

This mirrors the switch in `src/hooks/useEffectDisable.ts:33-108` but uses `getState()` for imperative access, and supports both enable and disable.

```typescript
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'
import { useLandmarksStore } from '../stores/landmarksStore'
import { useContourStore } from '../stores/contourStore'
import { useAcidStore } from '../stores/acidStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useTextureOverlayStore } from '../stores/textureOverlayStore'
import { useDataOverlayStore } from '../stores/dataOverlayStore'
import { useStrandStore } from '../stores/strandStore'
import { useMotionStore } from '../stores/motionStore'
import { useDestructionStore } from '../stores/destructionStore'

/** Enable or disable an effect by ID, imperatively (outside React) */
export function setEffectEnabled(effectId: string, enabled: boolean) {
  const glitch = useGlitchEngineStore.getState()
  const ascii = useAsciiRenderStore.getState()
  const stipple = useStippleStore.getState()
  const contour = useContourStore.getState()
  const landmarks = useLandmarksStore.getState()
  const acid = useAcidStore.getState()
  const vision = useVisionTrackingStore.getState()
  const textureOverlay = useTextureOverlayStore.getState()
  const dataOverlay = useDataOverlayStore.getState()
  const strand = useStrandStore.getState()
  const motion = useMotionStore.getState()
  const destruction = useDestructionStore.getState()

  switch (effectId) {
    // Glitch
    case 'rgb_split': glitch.setRGBSplitEnabled(enabled); break
    case 'block_displace': glitch.setBlockDisplaceEnabled(enabled); break
    case 'scan_lines': glitch.setScanLinesEnabled(enabled); break
    case 'noise': glitch.setNoiseEnabled(enabled); break
    case 'pixelate': glitch.setPixelateEnabled(enabled); break
    case 'edges': glitch.setEdgeDetectionEnabled(enabled); break
    case 'chromatic': glitch.setChromaticAberrationEnabled(enabled); break
    case 'vhs': glitch.setVHSTrackingEnabled(enabled); break
    case 'lens': glitch.setLensDistortionEnabled(enabled); break
    case 'dither': glitch.setDitherEnabled(enabled); break
    case 'posterize': glitch.setPosterizeEnabled(enabled); break
    case 'static_displace': glitch.setStaticDisplacementEnabled(enabled); break
    case 'color_grade': glitch.setColorGradeEnabled(enabled); break
    case 'feedback': glitch.setFeedbackLoopEnabled(enabled); break
    // Render modes
    case 'ascii': ascii.setEnabled(enabled); break
    case 'stipple': stipple.setEnabled(enabled); break
    case 'contour': contour.setEnabled(enabled); break
    case 'landmarks': landmarks.setEnabled(enabled); break
    // Vision tracking
    case 'track_bright': vision.setBrightEnabled(enabled); break
    case 'track_edge': vision.setEdgeEnabled(enabled); break
    case 'track_color': vision.setColorEnabled(enabled); break
    case 'track_motion': vision.setMotionEnabled(enabled); break
    case 'track_face': vision.setFaceEnabled(enabled); break
    case 'track_hands': vision.setHandsEnabled(enabled); break
    // Acid effects
    case 'acid_dots': acid.setDotsEnabled(enabled); break
    case 'acid_glyph': acid.setGlyphEnabled(enabled); break
    case 'acid_icons': acid.setIconsEnabled(enabled); break
    case 'acid_contour': acid.setContourEnabled(enabled); break
    case 'acid_decomp': acid.setDecompEnabled(enabled); break
    case 'acid_mirror': acid.setMirrorEnabled(enabled); break
    case 'acid_slice': acid.setSliceEnabled(enabled); break
    case 'acid_thgrid': acid.setThGridEnabled(enabled); break
    case 'acid_cloud': acid.setCloudEnabled(enabled); break
    case 'acid_led': acid.setLedEnabled(enabled); break
    case 'acid_slit': acid.setSlitEnabled(enabled); break
    case 'acid_voronoi': acid.setVoronoiEnabled(enabled); break
    case 'acid_halftone': acid.setHalftoneEnabled(enabled); break
    case 'acid_hex': acid.setHexEnabled(enabled); break
    case 'acid_scan': acid.setScanEnabled(enabled); break
    case 'acid_ripple': acid.setRippleEnabled(enabled); break
    // Overlays
    case 'texture_overlay': textureOverlay.setEnabled(enabled); break
    case 'data_overlay': dataOverlay.setEnabled(enabled); break
    // Strand effects
    case 'strand_handprints': strand.setHandprintsEnabled(enabled); break
    case 'strand_tar': strand.setTarSpreadEnabled(enabled); break
    case 'strand_timefall': strand.setTimefallEnabled(enabled); break
    case 'strand_voidout': strand.setVoidOutEnabled(enabled); break
    case 'strand_web': strand.setStrandWebEnabled(enabled); break
    case 'strand_bridge': strand.setBridgeLinkEnabled(enabled); break
    case 'strand_path': strand.setChiralPathEnabled(enabled); break
    case 'strand_umbilical': strand.setUmbilicalEnabled(enabled); break
    case 'strand_odradek': strand.setOdradekEnabled(enabled); break
    case 'strand_chiralium': strand.setChiraliumEnabled(enabled); break
    case 'strand_beach': strand.setBeachStaticEnabled(enabled); break
    case 'strand_dooms': strand.setDoomsEnabled(enabled); break
    case 'strand_cloud': strand.setChiralCloudEnabled(enabled); break
    case 'strand_bbpod': strand.setBBPodEnabled(enabled); break
    case 'strand_seam': strand.setSeamEnabled(enabled); break
    case 'strand_extinction': strand.setExtinctionEnabled(enabled); break
    // Motion effects
    case 'motion_extract': motion.setMotionExtractEnabled(enabled); break
    case 'echo_trail': motion.setEchoTrailEnabled(enabled); break
    case 'time_smear': motion.setTimeSmearEnabled(enabled); break
    case 'freeze_mask': motion.setFreezeMaskEnabled(enabled); break
    // Destruction effects
    case 'datamosh': destruction.setDatamoshEnabled(enabled); break
    case 'pixelSort': destruction.setPixelSortEnabled(enabled); break
    case 'sonify': destruction.setSonifyEnabled(enabled); break
    case 'point_cloud': destruction.setPointCloudEnabled(enabled); break
  }
}

/** Apply a params snapshot to an effect. Keys must match the store's param update method fields. */
export function applyEffectParams(effectId: string, params: Record<string, number>) {
  const glitch = useGlitchEngineStore.getState()
  const ascii = useAsciiRenderStore.getState()
  const stipple = useStippleStore.getState()
  const contour = useContourStore.getState()
  const acid = useAcidStore.getState()
  const vision = useVisionTrackingStore.getState()
  const strand = useStrandStore.getState()
  const motion = useMotionStore.getState()
  const destruction = useDestructionStore.getState()

  switch (effectId) {
    case 'rgb_split': glitch.updateRGBSplit(params); break
    case 'block_displace': glitch.updateBlockDisplace(params); break
    case 'scan_lines': glitch.updateScanLines(params); break
    case 'noise': glitch.updateNoise(params); break
    case 'pixelate': glitch.updatePixelate(params); break
    case 'edges': glitch.updateEdgeDetection(params); break
    case 'chromatic': glitch.updateChromaticAberration(params); break
    case 'vhs': glitch.updateVHSTracking(params); break
    case 'lens': glitch.updateLensDistortion(params); break
    case 'dither': glitch.updateDither(params); break
    case 'posterize': glitch.updatePosterize(params); break
    case 'static_displace': glitch.updateStaticDisplacement(params); break
    case 'color_grade': glitch.updateColorGrade(params); break
    case 'feedback': glitch.updateFeedbackLoop(params); break
    case 'ascii': ascii.updateParams(params); break
    case 'stipple': stipple.updateParams(params); break
    case 'contour': contour.updateParams(params); break
    case 'acid_dots': acid.updateDotsParams(params); break
    case 'acid_glyph': acid.updateGlyphParams(params); break
    case 'acid_icons': acid.updateIconsParams(params); break
    case 'acid_contour': acid.updateContourParams(params); break
    case 'acid_decomp': acid.updateDecompParams(params); break
    case 'acid_mirror': acid.updateMirrorParams(params); break
    case 'acid_slice': acid.updateSliceParams(params); break
    case 'acid_thgrid': acid.updateThGridParams(params); break
    case 'acid_cloud': acid.updateCloudParams(params); break
    case 'acid_led': acid.updateLedParams(params); break
    case 'acid_slit': acid.updateSlitParams(params); break
    case 'acid_voronoi': acid.updateVoronoiParams(params); break
    case 'acid_halftone': acid.updateHalftoneParams(params); break
    case 'acid_hex': acid.updateHexParams(params); break
    case 'acid_scan': acid.updateScanParams(params); break
    case 'acid_ripple': acid.updateRippleParams(params); break
    case 'track_bright': vision.updateBrightParams(params); break
    case 'track_edge': vision.updateEdgeParams(params); break
    case 'track_color': vision.updateColorParams(params); break
    case 'track_motion': vision.updateMotionParams(params); break
    case 'track_face': vision.updateFaceParams(params); break
    case 'track_hands': vision.updateHandsParams(params); break
    case 'strand_handprints': strand.updateHandprintsParams(params); break
    case 'strand_tar': strand.updateTarSpreadParams(params); break
    case 'strand_timefall': strand.updateTimefallParams(params); break
    case 'strand_voidout': strand.updateVoidOutParams(params); break
    case 'strand_web': strand.updateStrandWebParams(params); break
    case 'strand_bridge': strand.updateBridgeLinkParams(params); break
    case 'strand_path': strand.updateChiralPathParams(params); break
    case 'strand_umbilical': strand.updateUmbilicalParams(params); break
    case 'strand_odradek': strand.updateOdradekParams(params); break
    case 'strand_chiralium': strand.updateChiraliumParams(params); break
    case 'strand_beach': strand.updateBeachStaticParams(params); break
    case 'strand_dooms': strand.updateDoomsParams(params); break
    case 'strand_cloud': strand.updateChiralCloudParams(params); break
    case 'strand_bbpod': strand.updateBBPodParams(params); break
    case 'strand_seam': strand.updateSeamParams(params); break
    case 'strand_extinction': strand.updateExtinctionParams(params); break
    case 'motion_extract': motion.updateMotionExtract(params); break
    case 'echo_trail': motion.updateEchoTrail(params); break
    case 'time_smear': motion.updateTimeSmear(params); break
    case 'freeze_mask': motion.updateFreezeMask(params); break
    case 'datamosh': destruction.updateDatamoshParams(params); break
    case 'pixelSort': destruction.updatePixelSortParams(params); break
    case 'sonify': destruction.updateSonifyParams(params); break
    case 'point_cloud': destruction.updatePointCloudParams(params); break
  }
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `effectControl.ts`

**Step 3: Commit**

```bash
git add src/utils/effectControl.ts
git commit -m "feat(launcher): add imperative effect enable/disable/params utility"
```

---

### Task 3: Create the Cycling Engine Hook

**Files:**
- Create: `src/hooks/useEffectLauncher.ts`

**Step 1: Write the cycling engine**

This runs a `requestAnimationFrame` loop when playing. Each frame it checks audio energy against threshold and advances cells.

```typescript
import { useEffect, useRef } from 'react'
import { useEffectLauncherStore } from '../stores/effectLauncherStore'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'
import { useAudioSourceStore } from '../stores/audioSourceStore'
import { setEffectEnabled, applyEffectParams } from '../utils/effectControl'

export function useEffectLauncher() {
  const rafRef = useRef<number>(0)
  const lastAdvanceRef = useRef(0)
  const lastBPMTickRef = useRef(0)
  const prevActiveRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = (now: number) => {
      const store = useEffectLauncherStore.getState()
      if (!store.isPlaying) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const { activeIndex, cells, cycleMode, triggerBand, threshold, holdTime, fallbackRate } = store
      const holdOk = now - lastAdvanceRef.current > holdTime

      // Activate/deactivate effects on cell change
      if (activeIndex !== prevActiveRef.current) {
        // Disable previous
        if (prevActiveRef.current !== null) {
          const prevCell = cells[prevActiveRef.current]
          if (prevCell) setEffectEnabled(prevCell.effectId, false)
        }
        // Enable current
        if (activeIndex !== null) {
          const cell = cells[activeIndex]
          if (cell) {
            applyEffectParams(cell.effectId, cell.params)
            setEffectEnabled(cell.effectId, true)
          }
        }
        prevActiveRef.current = activeIndex
      }

      // Audio-driven cycling
      const audioCtx = useAudioSourceStore.getState().audioContext
      const hasAudio = audioCtx !== null

      if (hasAudio && holdOk) {
        const audio = useAudioReactiveStore.getState()
        let energy: number
        if (triggerBand === 'all') {
          energy = useAudioSourceStore.getState().amplitude
        } else if (triggerBand === 'kick') {
          energy = audio.hit
        } else {
          energy = audio[triggerBand]
        }

        if (energy > threshold) {
          if (cycleMode === 'speed') {
            store.advance()
          } else if (cycleMode === 'selection') {
            // Map energy to cell index
            const nonEmpty = cells.map((c, i) => c !== null ? i : -1).filter(i => i !== -1)
            if (nonEmpty.length > 0) {
              const idx = Math.min(nonEmpty.length - 1, Math.floor(energy * nonEmpty.length))
              store.jumpTo(nonEmpty[idx])
            }
          } else {
            // Combined: advance but bias by energy
            const nonEmpty = cells.map((c, i) => c !== null ? i : -1).filter(i => i !== -1)
            if (nonEmpty.length > 1) {
              const skip = Math.floor(energy * (nonEmpty.length - 1))
              const currentPos = activeIndex !== null ? nonEmpty.indexOf(activeIndex) : 0
              const nextPos = (currentPos + 1 + skip) % nonEmpty.length
              store.jumpTo(nonEmpty[nextPos])
            } else {
              store.advance()
            }
          }
          lastAdvanceRef.current = now
        }
      } else if (!hasAudio && holdOk) {
        // Fallback: BPM-based clock
        const interval = 60000 / fallbackRate
        if (now - lastBPMTickRef.current >= interval) {
          store.advance()
          lastAdvanceRef.current = now
          lastBPMTickRef.current = now
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Cleanup on stop: disable active cell's effect
  const isPlaying = useEffectLauncherStore(s => s.isPlaying)
  const prevPlayingRef = useRef(isPlaying)
  useEffect(() => {
    if (prevPlayingRef.current && !isPlaying) {
      // Just stopped
      const idx = prevActiveRef.current
      if (idx !== null) {
        const cell = useEffectLauncherStore.getState().cells[idx]
        if (cell) setEffectEnabled(cell.effectId, false)
      }
      prevActiveRef.current = null
    }
    prevPlayingRef.current = isPlaying
  }, [isPlaying])
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `useEffectLauncher.ts`

**Step 3: Commit**

```bash
git add src/hooks/useEffectLauncher.ts
git commit -m "feat(launcher): add cycling engine hook — audio-driven effect sequencing"
```

---

### Task 4: Build the Launcher Grid UI

**Files:**
- Create: `src/components/performance/EffectLauncherGrid.tsx`

**Step 1: Write the grid component**

This is the main UI: transport bar + 4x4 grid + cell editor below. Renders as a new sequencer tab.

```typescript
// EffectLauncherGrid.tsx
// 4x4 effect launcher grid with transport bar and cell editor.
// Each cell holds an effect + parameter snapshot. Audio drives cycling.
```

The component should:
- Import `useEffectLauncherStore` for grid state
- Import `useEffectLauncher` hook (call it once to start the engine)
- Import `getEffectInfo` from `src/hooks/useActiveEffects.ts` (the utility at line 198) to look up label/color for populated cells
- Import `PAGE_NAMES`, `getEffectsForPage` from `src/config/effects.ts` to build the effect picker dropdown
- Import `Knob` from `src/components/performance/Knob.tsx` for transport controls (threshold, hold, rate)
- Import `CompactEffectParams` from `src/components/performance/CompactEffectParams.tsx` to render params when editing a cell

**Transport bar** (top, horizontal row):
- Play/Stop button (toggles `store.play()` / `store.stop()`)
- Mode buttons: SPD / SEL / MIX (maps to cycleMode)
- Band buttons: SUB / KICK / MID / HIGH / ALL
- Three knobs: THRESH (threshold 0-1), HOLD (holdTime 50-2000ms), RATE (fallbackRate 30-300 BPM)

**Grid** (4x4 CSS grid):
- Each cell:
  - If populated: show effect label in uppercase, colored left border from effect color, dim background
  - If active (activeIndex === i): bright border (effect color), slightly lit background
  - If selected (selectedIndex === i): dashed outline
  - If empty: dim border, no content
  - onClick: `selectCell(i)`
  - onDoubleClick: `clearCell(i)` (only if populated)

**Cell editor** (below grid, shown when selectedIndex !== null):
- Effect picker `<select>` listing all non-reserved effects from all pages
- When an effect is picked, call `store.setCell(selectedIndex, effectId, {})` with empty params (defaults)
- Show `CompactEffectParams` for the selected cell's effectId so user can tweak params
- "Snapshot" button: reads current params from the effect's store and saves them into the cell
- "Clear" button: `store.clearCell(selectedIndex)`

**Styling**: Use existing CSS vars (`--bg-surface`, `--bg-elevated`, `--border`, `--text-primary`, etc.) and theme patterns from `src/styles/theme.css`. Match the monochrome + accent style of existing panels.

**Step 2: Verify it renders**

Run the dev server and navigate to the launcher tab (after Task 5 wires it up). At this point, just verify the file compiles:

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `EffectLauncherGrid.tsx`

**Step 3: Commit**

```bash
git add src/components/performance/EffectLauncherGrid.tsx
git commit -m "feat(launcher): add launcher grid UI — transport, 4x4 grid, cell editor"
```

---

### Task 5: Wire Into Sequencer Container

**Files:**
- Modify: `src/stores/sequencerContainerStore.ts:4` — add `'launcher'` to `SequencerType`
- Modify: `src/components/sequencer/SequencerContainer.tsx` — add launcher tab button and render `EffectLauncherGrid`
- Modify: `src/config/statusDescriptions.ts` — add status text for the launcher tab

**Step 1: Add 'launcher' to SequencerType**

In `src/stores/sequencerContainerStore.ts:4`, change:
```typescript
export type SequencerType = 'effects' | 'slicer' | 'timeline' | 'euclid' | 'steps'
```
to:
```typescript
export type SequencerType = 'effects' | 'slicer' | 'timeline' | 'launcher' | 'euclid' | 'steps'
```

**Step 2: Add launcher icon and tab to SequencerContainer**

In `src/components/sequencer/SequencerContainer.tsx`:

Add to imports:
```typescript
import { EffectLauncherGrid } from '../performance/EffectLauncherGrid'
```

Add to `SEQUENCER_ICONS`:
```typescript
launcher: '▦',  // Grid - effect launcher
```

Add a new button after the timeline button (after line 88, before the spacer div):
```tsx
<button
  onClick={() => setActiveSequencer('launcher')}
  className="px-2 py-3 flex items-center justify-center transition-colors"
  style={{
    backgroundColor: activeSequencer === 'launcher' ? 'var(--bg-elevated)' : 'transparent',
    borderBottom: '1px solid var(--border)',
  }}
  title="LAUNCH - Effect Launcher"
  onMouseEnter={() => setStatusText(getUIStatusText('seqLauncher'))}
  onMouseLeave={() => setStatusText(null)}
>
  <span
    className="text-[18px]"
    style={{
      color: activeSequencer === 'launcher' ? 'var(--seq-accent)' : 'var(--text-ghost)',
    }}
  >
    {SEQUENCER_ICONS.launcher}
  </span>
</button>
```

Add to content area (after line 97):
```tsx
{activeSequencer === 'launcher' && <EffectLauncherGrid />}
```

**Step 3: Add status description**

In `src/config/statusDescriptions.ts`, find the UI descriptions section and add:
```typescript
seqLauncher: 'LAUNCH — Audio-reactive effect sequencer grid. Cycles through effect presets in time with music.',
```
Add this near the existing `seqEffects`, `seqSlicer`, `seqTimeline` entries.

**Step 4: Verify it compiles and renders**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

Then check the dev server — the sequencer container should show a 4th tab icon (▦). Clicking it should show the launcher grid.

**Step 5: Commit**

```bash
git add src/stores/sequencerContainerStore.ts src/components/sequencer/SequencerContainer.tsx src/config/statusDescriptions.ts
git commit -m "feat(launcher): wire launcher grid into sequencer container as new tab"
```

---

### Task 6: Build the Snapshot Utility for Cell Editor

When the user assigns an effect to a cell, they need a way to capture the current parameter values. This reads current state from the effect's store and returns a params snapshot.

**Files:**
- Modify: `src/utils/effectControl.ts` — add `getEffectParams()` function

**Step 1: Add getEffectParams**

Append to `src/utils/effectControl.ts`:

```typescript
/** Read current params from an effect's store, returning a snapshot Record<string, number> */
export function getEffectParams(effectId: string): Record<string, number> {
  const glitch = useGlitchEngineStore.getState()
  const ascii = useAsciiRenderStore.getState()
  const stipple = useStippleStore.getState()
  const contour = useContourStore.getState()
  const acid = useAcidStore.getState()
  const vision = useVisionTrackingStore.getState()
  const strand = useStrandStore.getState()
  const motion = useMotionStore.getState()
  const destruction = useDestructionStore.getState()

  switch (effectId) {
    case 'rgb_split': return { ...glitch.rgbSplit }
    case 'block_displace': return { ...glitch.blockDisplace }
    case 'scan_lines': return { ...glitch.scanLines }
    case 'noise': return { ...glitch.noise }
    case 'pixelate': return { ...glitch.pixelate }
    case 'edges': return { ...glitch.edgeDetection }
    case 'chromatic': return { ...glitch.chromaticAberration }
    case 'vhs': return { ...glitch.vhsTracking }
    case 'lens': return { ...glitch.lensDistortion }
    case 'dither': return { ...glitch.dither }
    case 'posterize': return { ...glitch.posterize }
    case 'static_displace': return { ...glitch.staticDisplacement }
    case 'color_grade': return { ...glitch.colorGrade }
    case 'feedback': return { ...glitch.feedbackLoop }
    case 'ascii': return { ...ascii.params }
    case 'stipple': return { ...stipple.params }
    case 'contour': return { ...contour.params }
    case 'acid_dots': return { ...acid.dotsParams }
    case 'acid_glyph': return { ...acid.glyphParams }
    case 'acid_icons': return { ...acid.iconsParams }
    case 'acid_contour': return { ...acid.contourParams }
    case 'acid_decomp': return { ...acid.decompParams }
    case 'acid_mirror': return { ...acid.mirrorParams }
    case 'acid_slice': return { ...acid.sliceParams }
    case 'acid_thgrid': return { ...acid.thGridParams }
    case 'acid_cloud': return { ...acid.cloudParams }
    case 'acid_led': return { ...acid.ledParams }
    case 'acid_slit': return { ...acid.slitParams }
    case 'acid_voronoi': return { ...acid.voronoiParams }
    case 'acid_halftone': return { ...acid.halftoneParams }
    case 'acid_hex': return { ...acid.hexParams }
    case 'acid_scan': return { ...acid.scanParams }
    case 'acid_ripple': return { ...acid.rippleParams }
    case 'track_bright': return { ...vision.brightParams }
    case 'track_edge': return { ...vision.edgeParams }
    case 'track_color': return { ...vision.colorParams }
    case 'track_motion': return { ...vision.motionParams }
    case 'track_face': return { ...vision.faceParams }
    case 'track_hands': return { ...vision.handsParams }
    case 'strand_handprints': return { ...strand.handprintsParams }
    case 'strand_tar': return { ...strand.tarSpreadParams }
    case 'strand_timefall': return { ...strand.timefallParams }
    case 'strand_voidout': return { ...strand.voidOutParams }
    case 'strand_web': return { ...strand.strandWebParams }
    case 'strand_bridge': return { ...strand.bridgeLinkParams }
    case 'strand_path': return { ...strand.chiralPathParams }
    case 'strand_umbilical': return { ...strand.umbilicalParams }
    case 'strand_odradek': return { ...strand.odradekParams }
    case 'strand_chiralium': return { ...strand.chiraliumParams }
    case 'strand_beach': return { ...strand.beachStaticParams }
    case 'strand_dooms': return { ...strand.doomsParams }
    case 'strand_cloud': return { ...strand.chiralCloudParams }
    case 'strand_bbpod': return { ...strand.bbPodParams }
    case 'strand_seam': return { ...strand.seamParams }
    case 'strand_extinction': return { ...strand.extinctionParams }
    case 'motion_extract': return { ...motion.motionExtract }
    case 'echo_trail': return { ...motion.echoTrail }
    case 'time_smear': return { ...motion.timeSmear }
    case 'freeze_mask': return { ...motion.freezeMask }
    case 'datamosh': return { ...destruction.datamoshParams }
    case 'pixelSort': return { ...destruction.pixelSortParams }
    case 'sonify': return { ...destruction.sonifyParams }
    case 'point_cloud': return { ...destruction.pointCloudParams }
    default: return {}
  }
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/utils/effectControl.ts
git commit -m "feat(launcher): add getEffectParams snapshot utility for cell editor"
```

---

### Task 7: Manual Integration Test

**Files:** None (testing only)

**Step 1: Open the app in browser**

Navigate to `http://localhost:5173/`

**Step 2: Switch to timeline mode**

Click the mode toggle to enter timeline/sequencer mode.

**Step 3: Click the launcher tab (▦)**

Verify: 4x4 grid appears with empty cells, transport bar at top.

**Step 4: Select a cell and assign an effect**

Click cell 0. Use the effect picker to select "RGB Split". Verify the cell now shows "RGB" with a colored border.

**Step 5: Assign a few more cells**

Add "Pixelate" to cell 1, "Feedback" to cell 2, "VHS" to cell 3.

**Step 6: Hit play without audio**

Click the Play button. Verify effects cycle through at the fallback BPM rate. Each cell lights up in sequence. The video output shows each effect activating and deactivating.

**Step 7: Load an audio file and test audio-driven cycling**

Load an audio file via the audio source panel. Switch trigger band to "SUB" or "KICK". Verify effects advance on beat hits. Adjust threshold knob to fine-tune sensitivity.

**Step 8: Test stop**

Click Stop. Verify the active effect is disabled and the pipeline returns to clean state.

**Step 9: Test cell clearing**

Double-click a populated cell. Verify it clears. If it was the active cell during playback, the engine should skip it.

**Step 10: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(launcher): integration test fixes"
```

---

## Summary

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 1 | Launcher store | `effectLauncherStore.ts` | — |
| 2 | Effect control utility | `effectControl.ts` | — |
| 3 | Cycling engine hook | `useEffectLauncher.ts` | — |
| 4 | Launcher grid UI | `EffectLauncherGrid.tsx` | — |
| 5 | Wire into sequencer container | — | `sequencerContainerStore.ts`, `SequencerContainer.tsx`, `statusDescriptions.ts` |
| 6 | Snapshot utility | — | `effectControl.ts` |
| 7 | Manual integration test | — | — |
