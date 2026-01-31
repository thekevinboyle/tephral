# Sequencer Container & Granular Video Slicer - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement multi-sequencer container with granular video slicer for timeline destruction.

**Architecture:** Container with icon sidebar switches between sequencer types. Slicer captures frames into buffer, slices them, plays back grains with modulation.

**Tech Stack:** React, Zustand, Canvas API, Three.js textures

---

## Phase 1: Container Infrastructure

### Task 1.1: Create `sequencerContainerStore.ts`

**File:** `src/stores/sequencerContainerStore.ts`

```typescript
import { create } from 'zustand'

export type SequencerType = 'steps' | 'slicer' | 'slot3' | 'slot4'

interface SequencerContainerState {
  activeSequencer: SequencerType
  setActiveSequencer: (id: SequencerType) => void
}

export const useSequencerContainerStore = create<SequencerContainerState>((set) => ({
  activeSequencer: 'steps',
  setActiveSequencer: (id) => set({ activeSequencer: id }),
}))
```

---

### Task 1.2: Create `SequencerIconBar.tsx`

**File:** `src/components/sequencer/SequencerIconBar.tsx`

40px wide vertical icon bar with 4 buttons. Active button has colored border + glow. Uses sequencerContainerStore.

---

### Task 1.3: Create `SequencerContainer.tsx`

**File:** `src/components/sequencer/SequencerContainer.tsx`

Wrapper with icon bar on left, conditionally renders active sequencer panel on right.

---

### Task 1.4: Update `PerformanceLayout.tsx`

**File:** `src/components/performance/PerformanceLayout.tsx`

Replace `<SequencerPanel />` with `<SequencerContainer />`.

---

## Phase 2: Slicer Stores

### Task 2.1: Create `slicerStore.ts`

**File:** `src/stores/slicerStore.ts`

Full Zustand store with:
- Buffer: bufferSize (1-10s), captureState, importedClipId
- Slices: sliceCount (4/8/16/32), currentSlice, sliceSequenceMode
- Grains: grainSize, density, spray, jitter, rate, direction, reverseProb, envelope
- Playback: isPlaying, sliceProb, freeze, syncToBpm, triggerRate
- Output: outputMode, wet, blendMode, opacity, enabled
- Actions for all parameters
- getSnapshot/loadSnapshot for presets

---

### Task 2.2: Create `slicerBufferStore.ts`

**File:** `src/stores/slicerBufferStore.ts`

Circular frame buffer store:
- frames[], writeHead, maxFrames
- capturedFrames (frozen state)
- addFrame, capture, release, importFrames, clear
- getActiveFrames, getSliceFrames, getGrainFrame

---

## Phase 3: Slicer UI Components

### Task 3.1: Create `SlicerPanel.tsx`

**File:** `src/components/sequencer/SlicerPanel.tsx`

Main layout with header, waveform area (35% height), controls grid. Initializes useSlicerPlayback hook.

---

### Task 3.2: Create `SlicerTransport.tsx`

**File:** `src/components/sequencer/SlicerTransport.tsx`

Capture/Release button, buffer size slider, play/stop, BPM sync toggle, master on/off.

---

### Task 3.3: Create `SlicerWaveform.tsx`

**File:** `src/components/sequencer/SlicerWaveform.tsx`

Canvas-based waveform showing luminance of buffer frames. Slice markers as vertical lines. Current slice highlighted. Frozen badge when captured.

---

### Task 3.4: Create `SlicerControls.tsx`

**File:** `src/components/sequencer/SlicerControls.tsx`

Parameter grid using SliderRow pattern:
- Slice count buttons (4/8/16/32)
- Grain params: Size, Density, Spray, Jitter, Rate, Rev%
- Output mode buttons, Wet slider, Blend mode select
- Freeze button

All sliders include paramId for modulation routing.

---

## Phase 4: Slicer Playback Engine

### Task 4.1: Create `useSlicerPlayback.ts`

**File:** `src/hooks/useSlicerPlayback.ts`

Main playback hook:
- Frame capture loop (30fps from video element to buffer)
- Slice advancement based on sequence mode
- Grain spawning with probability, jitter, spray
- Active grain tracking with position/direction/duration
- Output frame selection from grains
- BPM sync or free-running trigger rate

---

### Task 4.2: Create `useSlicerOutput.ts`

**File:** `src/hooks/useSlicerOutput.ts`

Simple hook exposing slicer output state for Canvas integration.

---

## Phase 5: Output Integration

### Task 5.1: Create `SlicerCompositor.ts`

**File:** `src/effects/SlicerCompositor.ts`

Handles output modes:
- Replace: slicer texture replaces source
- Mix: blend slicer with source by wet amount
- Layer: composite with blend mode and opacity

Creates/updates Three.js DataTexture from ImageData.

---

### Task 5.2: Update `Canvas.tsx` for Slicer Integration

**File:** `src/components/Canvas.tsx`

- Import slicerStore and SlicerCompositor
- Create compositor ref
- Update compositor params when slicer settings change
- In texture logic: check if slicer should replace/blend input
- Pass slicer output to compositor before effect pipeline

---

## Phase 6: Modulation Integration

### Task 6.1: Update `useSequencerPlayback.ts` - Add Slicer Targets

**File:** `src/hooks/useSequencerPlayback.ts`

Add slicer case to applyModulation switch:
- slicer.grainSize, density, spray, jitter, rate
- slicer.reverseProb, sliceProb, wet, sliceIndex

---

## Phase 7: Preset Integration

### Task 7.1: Update `presetLibraryStore.ts`

**File:** `src/stores/presetLibraryStore.ts`

- Add SlicerSnapshot to preset types
- Include slicer.getSnapshot() in captureFullState
- Apply slicer.loadSnapshot() in restore

---

### Task 7.2: Update `bankStore.ts`

**File:** `src/stores/bankStore.ts`

Same pattern - include slicer state in bank snapshots.

---

## File Summary

### New Files
- `src/stores/sequencerContainerStore.ts`
- `src/components/sequencer/SequencerIconBar.tsx`
- `src/components/sequencer/SequencerContainer.tsx`
- `src/stores/slicerStore.ts`
- `src/stores/slicerBufferStore.ts`
- `src/components/sequencer/SlicerPanel.tsx`
- `src/components/sequencer/SlicerTransport.tsx`
- `src/components/sequencer/SlicerWaveform.tsx`
- `src/components/sequencer/SlicerControls.tsx`
- `src/hooks/useSlicerPlayback.ts`
- `src/hooks/useSlicerOutput.ts`
- `src/effects/SlicerCompositor.ts`

### Modified Files
- `src/components/performance/PerformanceLayout.tsx`
- `src/components/Canvas.tsx`
- `src/hooks/useSequencerPlayback.ts`
- `src/stores/presetLibraryStore.ts`
- `src/stores/bankStore.ts`
