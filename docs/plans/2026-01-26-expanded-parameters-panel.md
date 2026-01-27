# Expanded Parameters Panel Design

## Overview

Add a persistent parameters panel to the right of the video preview that shows all parameters for the currently selected effect. Complements the existing horizontal cards strip which provides quick 2-knob access.

## Layout

The preview area becomes a two-column layout:
- **Left**: Video canvas (takes remaining width)
- **Right**: Expanded parameters panel (fixed 280px width)

```
┌─────────────────────────────────────────┬──────────────┐
│  [Cam] [File]                           │  RGB SPLIT   │
│                                         │──────────────│
│           VIDEO PREVIEW                 │  Amount  ────│
│                                         │  Red X   ────│
│                                         │  Red Y   ────│
│                                         │  Blue X  ────│
│                                         │  Blue Y  ────│
└─────────────────────────────────────────┴──────────────┘
```

## Panel Structure

**Header**: Effect name with colored LED indicator matching the effect's color.

**Parameters area**: Scrollable list of all parameters using mixed controls:
- Sliders for numeric values (label left, value right, thin track)
- Toggle switches for booleans
- Button groups for mode selection

**Visual style**: Light background, 11px text, subtle border separating from dark preview.

## Interaction

**Selection sources**: Panel updates when clicking:
- Grid button in PerformanceGrid
- Effect card in ParameterPanel strip
- Node in SignalPathBar

All use existing `selectedEffectId` from `uiStore`.

**Sticky selection**: Panel keeps showing last selected effect until a different effect is clicked.

**Disabled effects**: Panel shows parameters even when effect is off, allowing setup before enabling.

## Implementation

**New files:**
- `src/components/performance/ExpandedParameterPanel.tsx` - Main panel component
- `src/components/performance/controls/SliderRow.tsx` - Slider control
- `src/components/performance/controls/ToggleRow.tsx` - Toggle control
- `src/components/performance/controls/SelectRow.tsx` - Button group control

**Modified files:**
- `src/components/performance/PerformanceLayout.tsx` - Add panel to preview area

**Parameter config**: Map each effect ID to full parameter list with type, label, min/max, and store getter/setter.
