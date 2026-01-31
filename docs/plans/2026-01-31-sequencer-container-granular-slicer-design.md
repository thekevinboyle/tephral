# Sequencer Container & Granular Video Slicer Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a multi-sequencer container with switchable sequencer types, starting with a granular video slicer for timeline destruction.

**Architecture:** Wrapper container with icon sidebar for switching between sequencer types. Each sequencer maintains independent state. The granular slicer captures video frames into a buffer, slices them, and plays back grains with extensive parameter control.

**Tech Stack:** React, Zustand, Canvas API, OffscreenCanvas for performance

---

## Container Architecture

The Sequencer Container replaces the current `SequencerPanel` with a wrapper:

```
┌─────────────────────────────────────────────────────┐
│ ┌───┐                                               │
│ │ ▦ │  ← Step Sequencer (current)                   │
│ ├───┤                                               │
│ │ ◫ │  ← Granular Slicer (new)                      │
│ ├───┤                                               │
│ │ · │  ← Placeholder                                │
│ ├───┤                                               │
│ │ · │  ← Placeholder                          ┌─────┴─────────────────────────┐
│ └───┘                                         │                               │
│                                               │   Active Sequencer Content    │
│                                               │                               │
│                                               └───────────────────────────────┘
└─────────────────────────────────────────────────────┘
```

**Icon bar**: 40px wide column, dark background, icons are 32x32 with subtle borders. Active sequencer has highlighted border + glow in its accent color.

**State management**: New `useSequencerContainerStore` tracks `activeSequencer: 'steps' | 'slicer' | 'slot3' | 'slot4'`. Each sequencer maintains its own state independently — switching doesn't reset anything.

---

## Slicer Buffer System

### Live Buffer (Default Mode)

The slicer continuously captures frames into a circular buffer:
- Default buffer size: 4 seconds (configurable 1-10s)
- Captures at reduced resolution for performance (e.g., 480p internal, scaled on output)
- Stored as an array of ImageData or canvas snapshots
- Buffer visualized as the waveform's "content" — showing motion intensity or luminance over time

### Buffer Controls

| Control | Function |
|---------|----------|
| **Capture** | Freezes current buffer, stops recording. Buffer becomes static for slicing. |
| **Release** | Unfreezes, resumes live recording. |
| **Import** | Opens clip bin picker. Selected clip replaces buffer content. |
| **Buffer Size** | 1-10 seconds slider (only affects live mode). |

### Visual Feedback
- Live mode: subtle "recording" indicator, waveform scrolls/updates
- Captured mode: static waveform, "frozen" badge
- Imported mode: shows clip name, static waveform

**Implementation**: New `useSlicerBufferStore` manages the frame buffer, capture state, and provides frames to the grain engine.

---

## Slice & Grain Engine

### Slicing

The buffer is divided into equal slices:
- Slice count: 4, 8, 16, 32 (power of 2 for rhythmic alignment)
- Slice markers shown on waveform as vertical lines
- Each slice is a segment of the buffer (e.g., 4 slices of a 4s buffer = 1s each)

### Grain Playback

Grains are the actual playback units — small chunks read from slices:

| Parameter | Range | Function |
|-----------|-------|----------|
| **Grain Size** | 10-500ms | Duration of each grain |
| **Grain Density** | 1-8 | Overlapping grains playing simultaneously |
| **Spray** | 0-100% | Position randomization within current slice |
| **Position Jitter** | 0-100% | Random offset from slice start |
| **Playback Rate** | 0.25x-4x | Speed/pitch of grain playback |
| **Direction** | Fwd / Rev / Random | Per-grain playback direction |
| **Reverse Prob** | 0-100% | Chance each grain plays backwards |
| **Slice Prob** | 0-100% | Chance each slice triggers (100% = all fire) |
| **Envelope** | 0-100ms | Attack/release ramp to avoid clicks |
| **Freeze** | Toggle | Locks current grain position, ignores slice sequencing |

**Playhead Visualization**: Active grains shown as small animated markers on the waveform, jumping between slices. Color-coded by grain index when density > 1.

---

## Output & Integration Modes

Three switchable output modes controlled by a mode selector in the slicer UI:

### Mode A: Replace
- Slicer output completely replaces the video source
- Feeds directly into the effect chain (RGB split, glitch, etc. still apply)
- Cleanest option — full takeover

### Mode B: Mix
- Wet/dry crossfader (0-100%)
- 0% = normal video only, 100% = slicer only
- Blends at the source level, before effects
- Good for subtle grain texture layered on live feed

### Mode C: Layer
- Slicer composites as separate layer
- Blend mode selector: Normal, Multiply, Screen, Difference, Overlay
- Opacity slider (0-100%)
- Composites after effects (slicer output also runs through effect chain)

### Global Controls Row

```
[ Replace | Mix | Layer ]  [ Wet ━━━●━━ 75% ]  [ Blend: Difference ▾ ]  [ On/Off ]
```

**Master On/Off**: Bypasses slicer entirely, returns to normal video. Allows quick A/B comparison without losing slicer settings.

**Integration Point**: The `Canvas.tsx` component checks slicer state and either swaps source texture, blends textures, or composites layers before/after the effect pipeline.

---

## Slicer UI Layout

Panel fits in same space as current step sequencer:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ BUFFER CONTROLS                              TRANSPORT                   │
│ [Capture] [Release] [Import ▾]  [2.0s ━●━━]  [▶]  BPM [120]  [Sync ◉]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ░░▓▓▓░░▓▓▓▓░░░▓▓░░▓▓▓░░░▓▓▓▓▓░░░▓▓░░▓▓▓▓░░░░▓▓▓░░▓▓▓▓░░░▓▓░░  WAVEFORM │
│  │       │       │       │       │       │       │       │     + SLICES  │
│  ▲   ▲       ▲                   ▲               ▲                GRAINS │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ SLICE      GRAIN               MODULATION              OUTPUT            │
│                                                                          │
│ Slices     Size    Density     Spray    Jitter    [ Replace ▾]          │
│ [16 ▾]    [━●━━]   [━━●━]     [━━●━]   [━●━━]     Wet [━━━●━]           │
│                                                                          │
│ Rate      Direction  Rev%      Env      SliceProb  [Freeze]   [ON/OFF]  │
│ [━●━━]    [Fwd ▾]   [━●━━]    [━●━━]   [━━━●]                            │
└─────────────────────────────────────────────────────────────────────────┘
```

**Top Row**: Buffer controls (left), transport with BPM sync option (right)

**Waveform Area**: Visual buffer representation, ~40% of panel height. Slice markers as vertical lines. Grain playheads as animated triangles.

**Control Grid**: Compact sliders/selects organized in logical groups. Same visual style as existing effect parameters (SliderRow-style components).

**Sync Toggle**: When enabled, grain triggering syncs to BPM from the step sequencer. When disabled, grains trigger continuously based on density.

---

## Modulation System

### Cross-Sequencer Modulation

The slicer's parameters can be modulation targets for the existing step sequencer tracks:

**Modulatable Parameters** (exposed to routing system):
- `slicer.grainSize`
- `slicer.density`
- `slicer.spray`
- `slicer.jitter`
- `slicer.rate`
- `slicer.reverseProb`
- `slicer.sliceProb`
- `slicer.wet` (mix amount)
- `slicer.sliceIndex` (forces specific slice, 0-1 mapped to slice count)

**Routing Flow**:
```
Step Sequencer Track → Routing → Slicer Parameter
                              → Effect Parameter (existing)
```

Same drag-drop routing system as effects. Drag track handle to a slicer parameter, creates modulation connection with depth control.

### Internal Modulation (Slicer's Own)

The slicer also has a simple internal trigger mode:
- **Slice Sequence**: Steps through slices in order (fwd/rev/pendulum/random)
- **Trigger Rate**: Synced to BPM or free-running Hz
- Works independently of step sequencer — can run both simultaneously

This means you can have step sequencer modulating grain size while the slicer internally steps through slices. Layered rhythmic complexity.

---

## State Management

### New Stores

```typescript
// Container state
useSequencerContainerStore
  - activeSequencer: 'steps' | 'slicer' | 'slot3' | 'slot4'
  - setActiveSequencer(id)

// Slicer state
useSlicerStore
  - Buffer: bufferSize, captureState ('live' | 'frozen' | 'imported'), importedClipId
  - Slices: sliceCount, currentSlice
  - Grains: grainSize, density, spray, jitter, rate, direction, reverseProb, envelope
  - Playback: isPlaying, sliceProb, freeze, triggerMode, triggerRate
  - Output: outputMode ('replace' | 'mix' | 'layer'), wet, blendMode, opacity, enabled
  - Actions: capture(), release(), importClip(clipId), setSliceCount(), updateGrainParams(), etc.

// Buffer management (separate for performance)
useSlicerBufferStore
  - frames: ImageData[] (circular buffer)
  - writeHead: number
  - capturedFrames: ImageData[] | null
  - addFrame(frame), getSlice(index), getGrainFrames(slice, position, size)
```

### Existing Store Updates

```typescript
// sequencerStore.ts - add slicer params to routing targets
routings: [
  { trackId, targetParam: 'slicer.grainSize', depth }  // new targets
]

// presetLibraryStore.ts - include slicer state in presets
captureFullState() → includes slicer settings
```

**Persistence**: Slicer settings saved with presets. Buffer content is NOT saved (regenerated live or re-imported).

---

## Implementation Overview

### New Files

```
src/
├── components/sequencer/
│   ├── SequencerContainer.tsx      # Wrapper with icon sidebar
│   ├── SequencerIconBar.tsx        # 4-icon column selector
│   ├── SlicerPanel.tsx             # Main slicer UI
│   ├── SlicerWaveform.tsx          # Buffer visualization + slice markers
│   ├── SlicerControls.tsx          # Parameter grid
│   └── SlicerTransport.tsx         # Buffer controls + playback
├── stores/
│   ├── sequencerContainerStore.ts  # Active sequencer state
│   ├── slicerStore.ts              # All slicer parameters
│   └── slicerBufferStore.ts        # Frame buffer management
├── hooks/
│   └── useSlicerPlayback.ts        # Grain engine + frame output
└── effects/
    └── SlicerCompositor.ts         # Output mode blending logic
```

### Modified Files

| File | Changes |
|------|---------|
| `PerformanceLayout.tsx` | Replace `<SequencerPanel>` with `<SequencerContainer>` |
| `SequencerPanel.tsx` | Wrap existing content, receive `visible` prop |
| `Canvas.tsx` | Check slicer output, apply compositor before/after effects |
| `useSequencerPlayback.ts` | Add slicer parameters to `applyModulation()` |
| `sequencerStore.ts` | No changes (routing already flexible) |
| `presetLibraryStore.ts` | Include slicer state in capture/restore |

### Performance Considerations
- Frame buffer uses OffscreenCanvas where supported
- Grain rendering batched to single draw call
- Waveform visualization throttled to 15fps
- Buffer size capped to prevent memory issues
