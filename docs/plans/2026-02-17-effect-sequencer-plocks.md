# Effect Sequencer with Parameter Locks

## Overview

Elektron-style step sequencer integrated directly with the performance grid. Each active effect gets its own sequencer track with 64 steps (4 pages of 16). Individual steps can hold parameter locks (p-locks) that override effect parameters when the step plays.

## Core Concepts

**Grid button click** toggles the effect on/off AND selects it, showing its sequencer track in the center panel. All active effects are visible as stacked track rows.

**Parameter locks** are per-step parameter overrides. Click an active step to select it, then tweak sliders in the inline detail panel below. Those values are "locked" to that step — when the sequencer hits it, the effect snaps to those values.

**Two modes per track:**
- **Gate mode (G):** Steps control on/off. Active step = effect on with p-locked params. Inactive step = effect off.
- **Param mode (P):** Effect stays on (controlled by grid button). Active steps with locks override params. Inactive steps revert to base values (whatever the knobs are set to).

## Layout

```
┌─────────────────────────────────────────────────────┐
│ BPM [120] Play/Stop  [1/16]   Steps: 16   ● ○ ○ ○  │  Transport
├──────────┬──────────────────────────────────────────┤
│ RGB_SPLT │ [■][■][□][■][□][□][■][□][■][□][□][■]... │  Track
│ G  M  S  │                                          │
├──────────┼──────────────────────────────────────────┤
│ DITHER   │ [□][■][□][□][■][□][□][■][□][□][■][□]... │  Track
│ P  M  S  │                                          │
├──────────┴──────────────────────────────────────────┤
│ RGB_SPLT Step 3: [Amount ══●══] [Offset ═●════]     │  P-lock detail
└─────────────────────────────────────────────────────┘
```

- **Transport bar** (top): BPM, play/stop, resolution selector, step page dots
- **Track rows** (middle, scrollable): One per active effect. Header + 16 step cells
- **P-lock detail** (bottom): Inline parameter sliders for the selected step

## Step Cell States

| State | Visual |
|-------|--------|
| Inactive | Dark fill, subtle border |
| Active (no locks) | Brighter fill, effect color accent on top edge, small bar at bottom |
| Active + p-locked | Same as active, bar height represents lock intensity, multiple colored bars for multiple locked params |
| Playhead | Bright border highlight sweeping across |
| Selected (editing) | Accent border glow, detail panel open below |

## Step Interactions

- **Click empty step:** Activate it
- **Click active step:** Select it for p-lock editing (opens detail panel)
- **Click+drag across cells:** Paint mode, activate multiple steps
- **Shift+click:** Multi-select steps (apply same p-locks to all selected)
- **Escape / click away:** Deselect, close detail panel

## Data Model

### Store: `useEffectSequencerStore`

```typescript
interface EffectStep {
  active: boolean
  locks: Record<string, number>  // paramName -> value
  probability: number            // 0-1, default 1
  condition: 'always' | 'fill'
}

interface EffectTrack {
  effectId: string
  mode: 'gate' | 'param'
  steps: EffectStep[]            // 64 steps
  length: number                 // active count, default 16
  muted: boolean
  soloed: boolean
}

interface EffectSequencerState {
  tracks: Record<string, EffectTrack>
  bpm: number
  resolution: '1/4' | '1/8' | '1/16' | '1/32'
  isPlaying: boolean
  currentStep: number
  stepPage: number               // 0-3
  selectedStep: { effectId: string; stepIndex: number } | null
  swing: number                  // 0-100
}
```

### Key behaviors

- Enabling an effect from the grid auto-creates a track if none exists (all steps inactive)
- Disabling an effect preserves its track (patterns not lost), just stops playback
- Track display order follows `routingStore.effectOrder`
- BPM shared with existing sequencer system

## Playback Engine

Hook: `useEffectSequencerPlayback`

RAF loop synced to BPM + resolution:

```
each step tick:
  for each track:
    skip if muted
    step = track.steps[currentStep % track.length]

    if mode === 'gate':
      if step.active → enable effect + apply locks
      else → disable effect

    if mode === 'param':
      if step.active && has locks → apply lock values
      else → revert to base values (current knob positions)
```

No parameter smoothing — hard cuts between steps for punchy Elektron aesthetic.

Solo: Additive — soloed tracks play, all others muted. Multiple solos allowed.

## Files

### New

| File | Purpose |
|------|---------|
| `src/stores/effectSequencerStore.ts` | Zustand store |
| `src/hooks/useEffectSequencerPlayback.ts` | RAF playback engine |
| `src/components/sequencer/EffectSequencer.tsx` | Main container |
| `src/components/sequencer/EffectTrackRow.tsx` | Single track row |
| `src/components/sequencer/EffectStepCell.tsx` | Step cell component |
| `src/components/sequencer/PLockDetail.tsx` | Parameter lock editing panel |

### Modified

| File | Change |
|------|--------|
| `SequencerContainer.tsx` | Add EFFECT tab as default view |
| `PerformanceGrid.tsx` | On click, call `ensureTrack(effectId)` and select |
