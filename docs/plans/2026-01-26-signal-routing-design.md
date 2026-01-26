# Signal Routing & Preset Bank Design

## Overview

Add drag-and-drop effect reordering and a preset bank system to save/recall effect chains.

## Features

### 1. Drag-and-Drop Effect Reordering

The parameter strip becomes interactive for reordering effects:

- **Drag start:** Click and hold an effect card for 150ms
- **Dragging:** Card follows cursor, other cards shift to show drop position
- **Drop indicator:** Gap opens between cards where the effect will land
- **Drop:** Release to place effect in new position
- **Cancel:** Drag outside or press Escape

Visual feedback:
- Dragged card gets lift effect (larger shadow, scale 1.05)
- Origin shows ghost/placeholder
- Valid drop zones highlight with subtle glow

### 2. Preset Bank System

4 banks × 4 presets = 16 total slots

**What a preset captures:**
- Effect order (the routing)
- Which effects are enabled
- All parameter values from each effect

### 3. Bank UI

Dedicated row (~4vh) between parameter strip and button grid:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  A ● B  C  D   │  [1 INIT] [2 GLITCH] [3 ___] [4 ___]  │ SAVE  COPY  PASTE │
└────────────────────────────────────────────────────────────────────────────┘
```

**Left - Bank Selector:**
- 4 buttons (A/B/C/D)
- Active bank has glow + filled background

**Center - Preset Slots:**
- 4 slots per bank, Syntakt-style buttons
- Shows preset name or "EMPTY"
- Active preset has colored border + glow
- Click to load
- Modified indicator (dot) if state differs from loaded preset

**Right - Actions:**
- SAVE - Save current state to active slot
- COPY - Copy active preset to clipboard
- PASTE - Paste clipboard to active slot

## Layout

```
┌────────────────────────────────────────────────────────────────┐
│                         PREVIEW                                │  55vh
├────────────────────────────────────────────────────────────────┤
│ ● IN ─── [RGB] ─── [NOISE] ─── [PIXEL] ─── OUT ●               │  5vh
├────────────────────────────────────────────────────────────────┤
│ [RGB SPLIT card]  [NOISE card]  [PIXELATE card]  ← draggable   │  15vh
├────────────────────────────────────────────────────────────────┤
│  A ● B  C  D   │  [1] [2] [3] [4]  │ SAVE COPY PASTE           │  ~4vh
├─────────────────────────────────┬──────────────────────────────┤
│        4x4 button grid          │       GRAPHIC PANEL          │  ~21vh
└─────────────────────────────────┴──────────────────────────────┘
```

## Data Model

```typescript
// src/stores/routingStore.ts
interface RoutingPreset {
  name: string
  effectOrder: string[]
  effectStates: Record<string, boolean>
  effectParams: Record<string, any>
}

interface RoutingState {
  // Current effect order
  effectOrder: string[]

  // Preset banks
  banks: RoutingPreset[][]  // 4 banks × 4 presets
  activeBank: number
  activePreset: number | null

  // Clipboard
  clipboard: RoutingPreset | null

  // Actions
  reorderEffect: (fromIndex: number, toIndex: number) => void
  savePreset: (bankIndex: number, presetIndex: number) => void
  loadPreset: (bankIndex: number, presetIndex: number) => void
  copyPreset: () => void
  pastePreset: () => void
}
```

## Pipeline Integration

EffectPipeline respects custom order:

```typescript
updateEffects(config: {
  effectOrder: string[]
  enabledEffects: Record<string, boolean>
}) {
  const effects: Effect[] = []

  for (const effectId of config.effectOrder) {
    if (config.enabledEffects[effectId]) {
      effects.push(this.getEffect(effectId))
    }
  }

  this.rebuildEffectPass(effects)
}
```

## Files to Create/Modify

**Create:**
- `src/stores/routingStore.ts` - Routing and preset state
- `src/components/performance/BankPanel.tsx` - Bank UI component

**Modify:**
- `src/components/performance/ParameterPanel.tsx` - Add drag-and-drop
- `src/components/performance/PerformanceLayout.tsx` - Add bank row, adjust heights
- `src/effects/EffectPipeline.ts` - Respect custom effect order
- `src/components/Canvas.tsx` - Read from routing store
