# Diagonal Euclidean Sequencer

## Goal

Create a euclidean sequencer with a distinctive diagonal cascade visualization - stacked scan lines that create interference patterns as polyrhythms phase in and out of sync. Lives in a tabbed container with the existing slicer.

## Visual Concept

### The Diagonal Cascade

The sequencer displays as a dark grid with four diagonal streams of blocks cutting across from different angles. Each track is a distinct diagonal line at varying angles (roughly -60°, -30°, +30°, +60° from horizontal).

**Hits vs Rests:**
- **Hits** - Solid cream/off-white rectangular blocks
- **Rests** - Fragmented dashed lines (same angle, broken into small segments with gaps)

As tracks play at different step counts and clock dividers, the diagonals phase in and out of sync. When hits align across multiple tracks, their solid blocks overlap creating brighter interference points. When they drift apart, you see individual scan lines.

**Playhead:** Blocks pulse/glow as they trigger, creating ripples of light cascading diagonally across the display.

**Overall effect:** A living interference pattern that breathes with the polyrhythm.

---

## Layout

```
┌─────────────────────────────────────────────────┐
│  SLICER  │  EUCLID                              │  ← Tab bar
├─────────────────────────────────────────────────┤
│                                                 │
│           ╲    ╱                                │
│      ╲  ▮▮ ╲╱ ▮▮  ╱                             │
│        ╲  ╲╱  ╱                                 │  ← Diagonal cascade
│    ╲  ▮▮╲╱▮▮╱  ╱                                │     (70% height)
│      ╲╱    ╲╱                                   │
│    ╱  ╲  ╱  ╲                                   │
│                                                 │
├─────────────────────────────────────────────────┤
│ TRK1  STEPS 08  HITS 03  ROT +0  DIV 1x  ▮▮▮░░░░░│
│ TRK2  STEPS 05  HITS 02  ROT +1  DIV 2x  ▮▮░░░   │  ← Parameter strips
│ TRK3  STEPS 12  HITS 05  ROT +3  DIV /2  ▮▮▮▮▮░░░│     (30% height)
│ TRK4  STEPS 07  HITS 04  ROT +0  DIV 1x  ▮▮▮▮░░░ │
│                                      + ADD      │
└─────────────────────────────────────────────────┘
```

---

## Parameter Strips

Each track row displays in dense monospace data-readout style:

```
TRK1  STEPS 08  HITS 03  ROT +0  DIV 1x  DCY 0.5  →2  ▮▮▮░░░░░
```

- **TRK#** - Track number, tap to mute/unmute
- **STEPS** - 2-16, drag to adjust
- **HITS** - 1 to steps, drag to adjust
- **ROT** - Pattern rotation, drag to adjust
- **DIV** - Clock divider, tap to cycle (/4, /2, 1x, 2x, 4x)
- **DCY** - Decay rate for modulation output
- **→#** - Active route count
- **▮░ pattern** - Mini linear preview of euclidean pattern

---

## Interactions

| Target | Action | Result |
|--------|--------|--------|
| STEPS value | Drag up/down | Adjust 2-16 |
| HITS value | Drag up/down | Adjust 1 to steps |
| ROT value | Drag up/down | Rotate pattern |
| DIV value | Tap to cycle | /4 → /2 → 1x → 2x → 4x |
| DCY value | Drag left/right | Adjust 0-1 |
| Pattern area (top) | Horizontal drag | Adjust hits |
| Pattern area (top) | Vertical drag | Adjust steps |
| Track label (TRK#) | Tap | Mute/unmute |
| Route handle (right) | Drag to target | Create modulation route |

---

## Modulation Output

Each track outputs a 0-1 modulation value:
- **On hit:** Value jumps to 1.0
- **Between hits:** Value decays based on track's decay setting
- **Muted tracks:** Output stays at 0

**Routing:**
- Drag from track's route handle to any effect parameter
- Source ID format: `polyEuclid-{trackId}`
- Integrates with existing `useContinuousModulation` hook

---

## Timing

**Polymetric + Polyrhythmic:**
- Each track can have different step counts (2-16)
- Each track can have different clock dividers (/4, /2, 1x, 2x, 4x)
- All sync to global BPM from transport
- Creates evolving phase relationships

---

## Visual Style

**Color Palette:**
```
Background:      var(--bg-surface)
Grid lines:      var(--border) at 10% opacity
Cream/off-white: #E8E4D9
Dim/rest:        #E8E4D9 at 30% opacity
Hit glow:        #E8E4D9 with subtle bloom
Muted:           15% opacity
```

**Typography:**
- Monospace, uppercase, wide tracking
- Labels: 10-11px
- Values: 12-13px

**Animation:**
- Current step blocks pulse brighter (~100ms)
- Overlapping hits have additive brightness
- Dashed rests can subtly scroll for kinetic feel
- Track brightness breathes with decay value

**Background:**
- Faint grid lines (20×20px squares, very low opacity)
- Technical/terminal aesthetic

---

## Technical Architecture

### Store: `usePolyEuclidStore`

```typescript
interface PolyEuclidTrack {
  id: string
  steps: number        // 2-16
  hits: number         // 1 to steps
  rotation: number     // 0 to steps-1
  clockDivider: number // 0.25, 0.5, 1, 2, 4
  decay: number        // 0-1
  muted: boolean
  currentStep: number
  currentValue: number // 0-1 output
}

interface PolyEuclidState {
  tracks: PolyEuclidTrack[]
  maxTracks: number    // 8

  addTrack: () => void
  removeTrack: (id: string) => void
  updateTrack: (id: string, updates: Partial<PolyEuclidTrack>) => void
  setCurrentStep: (id: string, step: number) => void
  setCurrentValue: (id: string, value: number) => void
}
```

Default: 4 tracks, max 8.

### Engine: `usePolyEuclidEngine`

- Runs on requestAnimationFrame
- Syncs to global BPM from `useSequencerStore`
- Each track advances at: `BPM × clockDivider / steps`
- On hit: `currentValue = 1.0`
- Each frame: `currentValue *= (1 - decay * deltaTime)`

### Components

```
SequencerContainer (tabbed)
├── Tab: SLICER → SlicerPanel (existing)
└── Tab: EUCLID → DiagonalEuclidean
    ├── DiagonalCascade (Canvas-based)
    └── TrackStrips
```

Canvas or WebGL for the diagonal visualization - SVG would struggle with the dashed line animations and interference effects.

---

## Files

| File | Action |
|------|--------|
| `src/stores/polyEuclidStore.ts` | Create |
| `src/stores/sequencerContainerStore.ts` | Add 'euclid' type |
| `src/hooks/usePolyEuclidEngine.ts` | Create |
| `src/components/sequencer/SequencerContainer.tsx` | Add tabs |
| `src/components/sequencer/DiagonalEuclidean.tsx` | Create |
| `src/components/sequencer/DiagonalCascade.tsx` | Create (Canvas) |
| `src/components/sequencer/TrackStrips.tsx` | Create |
| `src/hooks/useContinuousModulation.ts` | Add polyEuclid source |
| `src/components/performance/PerformanceLayout.tsx` | Init engine |
