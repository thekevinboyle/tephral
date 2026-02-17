# Unified Sequencer Panel — Design

## Overview

Redesign the effect sequencer into a single integrated panel inspired by Bitwig's bottom section. Effect tabs, parameter knobs, modulation source tabs, and the step grid all live in one unified view instead of being scattered across separate panels.

## Layout

The panel replaces the current bottom-center cell (Row 3, Col 2) in `PerformanceLayout`.

```
┌─────────────────────────────────────────────────────┐
│ EFFECT TABS  [RGB Split] [Pixelate] [Feedback] ...  │  Zone 1: horizontal scroll
├─────────────────────────────────────────────────────┤
│ PARAM AREA   Amount ◑  Angle ◑  Blend ◑            │  Zone 2: selected effect OR modulator
├─────────────────────────────────────────────────────┤
│ P-LOCK DETAIL (slides in when step selected)        │  Zone 3: contextual
├─────────────────────────────────────────────────────┤
│ MOD TABS  [LFO] [Random] [Step] [Envelope] [S&H]   │  Zone 4: modulation source selector
├──────┬──────────────────────────────────────────────┤
│  ▶   │ BPM 120 │ 1/16 │ SWG 0 │ 3/16 │ 1 2 3 4   │  Zone 5: compact transport
├──────┼──────────────────────────────────────────────┤
│ RGB  │ ■ ■ □ ■ □ □ ■ □ ■ ■ □ ■ □ □ ■ □           │  Zone 6: scrollable track rows
│ PIX  │ □ □ ■ □ ■ □ □ ■ □ □ ■ □ ■ □ □ ■           │
│ FBK  │ ■ □ □ □ ■ □ □ □ ■ □ □ □ ■ □ □ □           │
└──────┴──────────────────────────────────────────────┘
```

## Zones

### Zone 1 — Effect Tabs

Horizontal scrollable row of all active (enabled) effects. Each tab shows the effect's colored label. Clicking a tab sets `selectedEffectId` in uiStore and switches the param area (Zone 2) to show that effect's parameters. The active tab gets a colored bottom border and elevated background. Tabs are ordered by `effectOrder` from routingStore, filtered to enabled effects only.

### Zone 2 — Param Area

Displays parameter controls for the currently selected context:
- **Effect selected** (default): Shows the full parameter knobs for `selectedEffectId`. Reuses the existing `EffectParameters` component from the expanded card view.
- **Modulator selected**: When a mod tab (Zone 4) is active, swaps to show that modulation source's controls. Reuses the content currently inside `EffectsLane` (LFO, Random, Step, Envelope, S&H panels).

A `paramView` state controls which is shown: `'effect' | 'lfo' | 'random' | 'step' | 'envelope' | 'sh'`.

### Zone 3 — P-Lock Detail

The existing `PLockDetail` component. Slides in below the param area when a step is selected in the grid. Shows per-step parameter lock sliders. Hidden when no step is selected. Uses `max-height` transition for smooth slide in/out.

### Zone 4 — Modulation Tabs

Horizontal row of modulation source buttons: LFO, Random, Step, Envelope, S&H. Clicking one sets `paramView` to that modulator and Zone 2 swaps to show its controls. Clicking an effect tab in Zone 1 resets `paramView` back to `'effect'`. The active mod tab gets a highlight; all are unhighlighted when viewing effect params.

### Zone 5 — Transport Row

Compact inline transport with: play/stop button, BPM (drag to adjust), resolution cycle button, swing, step position indicator, and page dots (1-4). Same controls as the current `EffectSequencer` transport bar, just extracted into its own thin row sitting directly above the track grid.

### Zone 6 — Track List

Scrollable list of `EffectTrackRow` components. Same as current implementation: track header (label, G/P mode, M/S buttons) on the left, 16-column step grid on the right. The selected effect's track row gets a subtle left-border highlight matching the effect color.

## Component Architecture

### New Components

- **`UnifiedSequencerPanel`** — Top-level container. Composes all zones as a vertical flex column. Manages `paramView` state. Replaces `EffectSequencer` as the main sequencer view.
- **`EffectTabsBar`** — Zone 1. Reads `effectOrder` + enabled states, renders horizontal scrollable tabs. Sets `selectedEffectId` on click.
- **`ModTabsBar`** — Zone 4. Renders modulation source buttons. Controls `paramView` state.
- **`SequencerTransport`** — Zone 5. Extracted from current `EffectSequencer` transport section.

### Reused Components

- **`EffectParameters`** (from `ExpandedParameterPanel.tsx`) — Renders full knobs for the selected effect in Zone 2.
- **`PLockDetail`** — Zone 3, unchanged.
- **`EffectTrackRow`** — Zone 6, unchanged.
- **`EffectStepCell`** — Inside track rows, unchanged.
- **Modulation panels** (from `EffectsLane`) — LFO, Random, Step, Envelope, S&H content rendered in Zone 2 when a mod tab is active.

### Existing Components Modified

- **`PerformanceLayout`** — Row 2 Col 1 (EffectCardStack) becomes empty. Row 3 Col 2 renders `UnifiedSequencerPanel` instead of `SequencerContainer`.
- **`SequencerContainer`** — The effects tab now renders `UnifiedSequencerPanel` instead of `EffectSequencer`.

### State

No new stores. Uses:
- `uiStore.selectedEffectId` — which effect tab is active
- `effectSequencerStore` — all sequencer state (tracks, playback, selection)
- `routingStore.effectOrder` — tab ordering
- Local `paramView` state in `UnifiedSequencerPanel` — controls whether Zone 2 shows effect params or a modulation source

## Data Flow

```
Effect tab click → uiStore.setSelectedEffectId() → Zone 2 shows effect params
                                                  → Zone 6 highlights matching track row

Mod tab click → local paramView state → Zone 2 swaps to modulator controls

Step click → effectSequencerStore.selectStep() → Zone 3 slides in PLockDetail

Grid button toggle → ensureTrack() → track appears in Zone 6
                   → effect appears in Zone 1 tabs
```

## Layout Changes

| Location | Before | After |
|----------|--------|-------|
| Row 2, Col 1 | EffectCardStack | Empty |
| Row 3, Col 2 | SequencerContainer (tabbed) | SequencerContainer with UnifiedSequencerPanel on effects tab |

## File Summary

| File | Action |
|------|--------|
| `src/components/sequencer/UnifiedSequencerPanel.tsx` | CREATE — main unified panel |
| `src/components/sequencer/EffectTabsBar.tsx` | CREATE — horizontal effect tabs |
| `src/components/sequencer/ModTabsBar.tsx` | CREATE — modulation source tabs |
| `src/components/sequencer/SequencerTransport.tsx` | CREATE — extracted transport row |
| `src/components/sequencer/SequencerContainer.tsx` | MODIFY — effects tab renders UnifiedSequencerPanel |
| `src/components/performance/PerformanceLayout.tsx` | MODIFY — empty left sidebar |
