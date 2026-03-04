# Per-Track Polyrhythm & Euclidean Design

## Overview

Elektron-style per-track parameters for polyrhythmic sequences. Each track gets its own length, time scale, Euclidean generator, and per-step retrig. Parameters are revealed via a slide-out panel on the right edge of each track row.

## Data Model

### EffectTrack — new fields

```typescript
interface EffectTrack {
  // ... existing fields ...

  // Time scale: multiplier relative to master clock
  // 0.25 = quarter speed, 0.5 = half, 1 = normal, 2 = double, 4 = quad
  timeScale: number  // default: 1

  // Euclidean generator state (null = manual pattern)
  euclidean: { hits: number; rotation: number } | null  // default: null
}
```

### EffectStep — new field

```typescript
interface EffectStep {
  // ... existing fields ...
  retrig: number  // 0 = off, 2-8 = number of retrigs within step duration. default: 0
}
```

### New store state

```typescript
// Panel visibility per track
trackPanelOpen: Record<string, boolean>

// Actions
setTrackTimeScale(effectId: string, scale: number): void
setTrackEuclidean(effectId: string, config: { hits: number; rotation: number } | null): void
applyEuclidean(effectId: string): void  // writes generated pattern to steps
setStepRetrig(effectId: string, stepIndex: number, count: number): void
toggleTrackPanel(effectId: string): void
```

## Slide-Out Panel UI

### Interaction

- Toggle button on each track row's header area
- Panel slides in from the right edge, overlaying rightmost step cells
- Fixed width ~180px, semi-transparent dark background
- Step cells area has `overflow: hidden`; panel is `position: absolute` on right
- CSS `transform: translateX()` with short transition for slide animation

### Panel Layout

```
┌──────────────────┐
│ LEN  12   TS  2x │  Length knob + TimeScale select
│──────────────────│
│ EUCL  5  ROT  2  │  Hits knob + Rotation knob
│   ● ● ○ ● ○ ● ○ │  Generated pattern preview dots
│      [APPLY]     │  Writes to steps
│──────────────────│
│ RETRIG    ×3     │  Per-step (shown for selected step)
└──────────────────┘
```

- **Length**: drag-number Knob, 1-32
- **Time Scale**: select with values ×¼, ×½, ×¾, ×1, ×1.5, ×2, ×3, ×4
- **Euclidean**: two Knobs (hits + rotation), preview dots, Apply button
- **Retrig**: visible when step selected, options: 0, 2, 3, 4, 6, 8

Uses existing Knob and select block components for consistency.

## Playback Architecture

### Per-Track Timing

Each track maintains its own timing accumulator:

```typescript
// New ref in useEffectSequencerPlayback
const trackAccumulators = useRef<Record<string, number>>({})

// Per frame in playback loop:
for (const effectId of effectOrder) {
  const track = currentTracks[effectId]
  if (track.audioReactive.enabled) continue // kick-driven, no timeScale

  trackAccumulators.current[effectId] =
    (trackAccumulators.current[effectId] ?? 0) + dt

  const scaledMsPerStep = msPerStep / track.timeScale
  if (trackAccumulators.current[effectId] >= scaledMsPerStep) {
    trackAccumulators.current[effectId] -= scaledMsPerStep
    const stepIndex = track.trackStep % track.length
    executeTrackAtStep(effectId, track, stepIndex, fill, hasSolo)
    advanceTrackStep(effectId)  // wraps at track.length
  }
}
```

- `timeScale: 2` → track advances twice as fast
- `timeScale: 0.5` → track advances at half speed
- Combined with per-track `length`, creates polymeters

### Retrig Execution

When a step has `retrig > 0`:

```typescript
// New ref
const retrigCounters = useRef<Record<string, { remaining: number; interval: number; elapsed: number }>>({})

// On step execution, if step.retrig > 0:
retrigCounters.current[effectId] = {
  remaining: step.retrig - 1,
  interval: scaledMsPerStep / step.retrig,
  elapsed: 0,
}

// Per frame, check retrig counters:
if (counter.elapsed >= counter.interval && counter.remaining > 0) {
  re-execute the step
  counter.remaining--
  counter.elapsed -= counter.interval
}
```

### Euclidean Generation

Pure function using Bjorklund's algorithm:

```typescript
function generateEuclidean(length: number, hits: number, rotation: number): boolean[] {
  // Bjorklund's algorithm distributes `hits` evenly across `length`
  // rotation shifts the pattern circularly
  // Returns boolean array of active steps
}
```

- Pressing Apply writes `active: true/false` to the track's steps
- Manually editing steps afterward sets `track.euclidean = null`
- Non-destructive: doesn't touch p-locks or other step data

## Files Changed

| File | Change |
|------|--------|
| `src/stores/effectSequencerStore.ts` | Add `timeScale`, `euclidean` to track, `retrig` to step, new actions, `trackPanelOpen` state |
| `src/hooks/useEffectSequencerPlayback.ts` | Per-track timing accumulators, retrig scheduling, remove global step advance for BPM tracks |
| `src/components/sequencer/EffectTrackRow.tsx` | Add panel toggle button, slide-out panel with overflow hidden wrapper |
| `src/components/sequencer/TrackParamPanel.tsx` | New component: the slide-out panel (Length, TimeScale, Euclidean, Retrig) |
| `src/utils/euclidean.ts` | New utility: Bjorklund's algorithm |
