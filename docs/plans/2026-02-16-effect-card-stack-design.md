# Effect Card Stack Redesign

## Problem

The current effects UI is split across three zones:
1. **Top-left ExpandedParameterPanel** — full parameter editor for one selected effect
2. **Right-side ParameterPanel (FX lane)** — horizontal cards for active effects with drag reordering
3. **Bottom-left PerformanceGrid** — 4x4 toggle buttons per page

Parameters and chain ordering live in separate places. You toggle effects in the grid, see them appear in the FX lane on the right, then select one to edit params in the top-left. Too many zones, too much indirection.

## Solution

Replace the ExpandedParameterPanel and ParameterPanel with a single **EffectCardStack** in the top-left area. Vertically stacked, draggable effect cards with inline knob controls. Two modes: compact (key params only) and full (all params).

The bottom-left PerformanceGrid stays unchanged.

## Card Design

### Compact Mode (~56px tall per card)

```
┌──────────────────────────────────────────────┐
│ [●] RGB SPLIT   (●)25 (●)0.4  ▌viz▌ [⊘] [×] │
│                  AMT   SPD                    │
└──────────────────────────────────────────────┘
```

- Color-coded LED dot (effect color from config)
- Effect label in uppercase monospace
- 2-3 rotary knobs for primary parameters (20-24px diameter)
- Value displayed above knob, param label below
- Mini visualizer (24-32px) — same viz components already built per effect
- Bypass toggle and X (disable/remove) button

### Full Mode (~120-140px tall per card)

```
┌──────────────────────────────────────────────┐
│ [●] RGB SPLIT                       [⊘] [×] │
│                                              │
│  ┌────────┐   (●) 25    (●) 0.4   (●) 180   │
│  │ viz    │   AMT       SPEED      ANGLE     │
│  │ 48x48  │                                  │
│  │        │   (●) 0.3   [LCD|DITH|HARD]      │
│  └────────┘   BLEND      mode                │
│                                              │
└──────────────────────────────────────────────┘
```

- All parameters visible — knobs for numeric, segmented buttons for selections
- Visualizer scales up to 48px
- Same card ordering, drag-and-drop, toggle, X behavior

### Knob Interaction

- Click and drag vertically to adjust (up = increase, down = decrease)
- Knob arc shows current value visually (partial ring, color-coded to effect)
- Standard DAW-style behavior

### Mode Toggle

A `[COMPACT] / [FULL]` segmented button in the panel header. Switches all cards at once. Sticky preference (remembers across sessions via uiStore).

## Drag-and-Drop

- Grab anywhere on card (except knobs, buttons, viz) to drag
- Threshold: 150ms hold or 10px vertical movement
- Dragged card gets lift effect (scale 1.02, shadow, reduced opacity)
- Other cards animate to show drop gap
- Drop updates `routingStore.effectOrder` — defines signal chain order

## Card States

| State | Visual | Behavior |
|-------|--------|----------|
| Enabled | Full color, LED lit | Effect active in pipeline |
| Bypassed | 60% opacity, LED dim | Skipped in pipeline, keeps chain position |
| Removed | Card disappears | Effect disabled in store, removed from chain |

## Grid Integration

- Grid button activates effect → card appears at bottom of stack
- Card X button disables effect → grid button deactivates
- States sync through existing zustand stores

## Config Changes

Add `primaryParams` field to effect definitions in `effects.ts`:

```typescript
{
  id: 'rgb_split',
  label: 'RGB',
  color: '#0891b2',
  row: 'color',
  page: 2,
  min: 0,
  max: 50,
  primaryParams: ['amount', 'speed']  // shown in compact mode
}
```

## Components

### New
- `EffectCardStack.tsx` — container with mode toggle, scroll, empty state
- `EffectCard.tsx` — individual card, compact/full modes, drag logic, toggle/remove
- `Knob.tsx` — reusable rotary knob component

### Removed
- `ParameterPanel.tsx` — right-side FX lane
- `ExpandedParameterPanel.tsx` — top-left parameter editor

### Modified
- `PerformanceLayout.tsx` — swap ExpandedParameterPanel for EffectCardStack, reclaim right column
- `effects.ts` — add `primaryParams` to each effect definition

### Unchanged
- `PerformanceGrid.tsx` — bottom-left grid
- All effect stores (`glitchEngineStore`, `acidStore`, `visionTrackingStore`, `strandStore`, `motionStore`, `destructionStore`)
- `routingStore.ts` — same `effectOrder` and `reorderEffect`
- `EffectPipeline.ts` — processing chain unchanged
- `Canvas.tsx` — reads from same stores
