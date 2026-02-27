# Abstract Parameter Panel Redesign

## Overview

Replace the traditional ExpandedParameterPanel (horizontal sliders, tiny toggles, cramped controls) with a playful, abstract grid of large interactive blocks. First proof-of-concept for a broader UI redesign toward an art-installation aesthetic.

## Design Philosophy

Move away from DAW/VJ software aesthetics toward something experimental and artistic. Parameters become large, tactile blocks rather than precise sliders. Typography is dramatic. Animations are spring-physics-based with organic feel.

## Components

### 1. EffectHeaderBlock (~120px tall, full width)

- Effect name at **48px bold**, dominant visual element
- Effect color as subtle gradient wash across entire header
- Category text below name at **10px ghost** (e.g. "GLITCH / DESTRUCTION")
- **Interaction**: Tap to bypass (name dims + strikethrough), close icon on hover
- **Animation**: Name crossfades with vertical slide on effect change; color gradient morphs; subtle audio-reactive pulse (1.0x-1.02x scale)

### 2. ParamBlock (~120px tall, in 3-column grid)

- Parameter name: **9px uppercase tracking-wide** ghost text, top of block
- Current value: **28px bold tabular-nums**, centered
- Fill indicator: background fills bottom-to-top proportional to normalized value, effect color at ~15% opacity
- **Interaction**: Drag vertically anywhere on block to adjust. Up = increase, down = decrease. Double-tap to reset default. Right-click for modulation context menu.
- **Animation**: Value text spring-scales on change (1.0 → 1.08 → 1.0, ~200ms). Fill transitions with spring. Hover lifts block with shadow increase. Audio-reactive breathing pulse on fill.

### 3. ToggleBlock (~60px tall, half-height)

- Off: dark block, ghost text
- On: effect color fill at 20% opacity, white text, subtle border glow
- **Interaction**: Tap to toggle
- **Animation**: Fill floods from bottom with spring overshoot on toggle

### 4. SelectBlock (full width, spans 3 columns)

- Current option as **24px bold text**, centered
- Dot indicators below for total options / current position
- **Interaction**: Tap to cycle forward through options
- **Animation**: Text crossfades with horizontal slide (old slides left, new slides from right)

### 5. ColorBlock (standard block size)

- Entire block background IS the selected color
- Parameter name in contrasting color
- **Interaction**: Tap to open floating color picker
- **Animation**: Spring transition between colors

### 6. Section dividers

- **14px bold uppercase** with generous vertical spacing
- Breathing room between parameter groups

## Grid Layout

```
┌──────────┬──────────┬──────────┐
│  PARAM   │  PARAM   │  PARAM   │
│   0.75   │   12     │   0.50   │
│  ▓▓▓▓▓▓  │  ▓▓▓▓▓▓  │  ▓▓▓▓    │
├──────────┼──────────┼──────────┤
│  TOGGLE  │  TOGGLE  │  TOGGLE  │
│   ON     │   OFF    │   ON     │
├──────────┴──────────┴──────────┤
│         SELECT: SCREEN         │
│           · ● · ·              │
├──────────┬──────────┬──────────┤
│  PARAM   │  PARAM   │  COLOR   │
│   0.33   │   2.0    │  ██████  │
└──────────┴──────────┴──────────┘
```

## Animation Library

**react-spring + @use-gesture/react**

- Spring physics with mass/tension/friction for organic feel
- `useSprings` for animating grids of blocks without re-renders
- `@use-gesture/react` for drag/tap/hover gesture unification
- Better performance for many simultaneous animations

## Implementation

### New files (no modifications to existing panel):
- `src/components/performance/ExpandedParameterPanel_v2.tsx` — main panel
- `src/components/performance/blocks/ParamBlock.tsx` — drag-to-adjust block
- `src/components/performance/blocks/ToggleBlock.tsx` — on/off block
- `src/components/performance/blocks/SelectBlock.tsx` — tap-to-cycle block
- `src/components/performance/blocks/ColorBlock.tsx` — color picker block
- `src/components/performance/blocks/EffectHeaderBlock.tsx` — large header

### Reused from existing system (no changes):
- All Zustand stores
- `EFFECT_PARAM_REGISTRY` and `LockableParam` interface
- `classifyParam` utility
- `ModulationContextMenu`
- Effect definitions from `config/effects.ts`

### Swap-in point:
- `PerformanceLayout.tsx` or `BottomPanel.tsx` — replace `ExpandedParameterPanel` import with `_v2`
