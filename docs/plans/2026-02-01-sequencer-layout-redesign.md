# Sequencer Layout Redesign

## Goal

Reorganize the bottom panel layout to promote the step sequencer as a visible modulation tool and simplify the interface by hiding the X/Y pad.

## Current Layout

```
┌─────────────┬───────────────────┬──────────────┐
│ Banks       │ Sequencer         │ XY Pad       │
│ + Grid      │ (Step Seq)        │              │
│             │ (Icon bar+Content)│ Mix Controls │
│ flex: 1     │ flex: 1.5         │ flex: 0.7    │
└─────────────┴───────────────────┴──────────────┘
```

## New Layout

```
┌──────────────────┬───────────────────┬──────────────┐
│ Banks + Grid │ CF│ Slicer            │ Step Seq     │
│              │   │ (tabbed container)│ (full)       │
│              │   │                   │              │
│ flex: 1      │40p│ flex: 1.5         │ flex: 0.8    │
└──────────────────┴───────────────────┴──────────────┘
```

## Changes

### Column 1: Effect Grid + Vertical Crossfader

The crossfader moves from Column 3 to a vertical strip on the right edge of the grid area.

**Vertical Crossfader Specs:**
- Width: 40px
- Height: Full column height
- Labels: "Wet" (top), "Dry" (bottom)
- Track: 3px wide, centered, fills bottom-to-top
- Thumb: 40x14px (rotated from current 14x40px)
- Drag up = more wet, drag down = more dry
- Same `wetMix` state (0-1) from glitchEngineStore

### Column 2: Slicer (Tabbed Container)

The middle area becomes slicer-focused with the icon bar remaining for future tools.

**Changes:**
- Remove step sequencer icon from icon bar
- Slicer becomes the primary/default tab
- Keep icon bar structure for future tools
- Content shows SlicerPanel when slicer selected

### Column 3: Step Sequencer

The step sequencer moves to its own dedicated column, fully visible.

**Structure (unchanged):**
- Header: Title, Play/Stop, BPM, Resolution, Audio Reactive toggle
- Tracks: Scrollable area with step grids
- Footer: Mode, Fill, Random, Undo, Freeze, Revert

**Sizing:**
- flex: 0.8
- Full height of bottom section
- Step grid adapts to available width

### Hidden: XY Pad

The XY Pad is removed from the layout (component remains, just not rendered).

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/performance/PerformanceLayout.tsx` | Restructure 3-column layout |
| `src/components/performance/MixControls.tsx` | Convert to vertical orientation |
| `src/components/sequencer/SequencerContainer.tsx` | Remove step seq from icon bar, default to slicer |

## Component Changes

### PerformanceLayout.tsx

Column 1 structure:
```tsx
<div className="flex" style={{ flex: 1 }}>
  <div className="flex-1">
    {/* Banks + Grid */}
  </div>
  <div className="w-10">
    {/* Vertical Crossfader */}
  </div>
</div>
```

Column 2: Keep SequencerContainer (now slicer-only)

Column 3: SequencerPanel directly (no container wrapper)

### MixControls.tsx → VerticalCrossfader

Convert from horizontal to vertical:
- Swap width/height on track and thumb
- Labels: top="Wet", bottom="Dry"
- Calculate Y position instead of X
- Track fills from bottom to current value

### SequencerContainer.tsx

- Remove step sequencer icon (index 0)
- Slicer becomes index 0 (default)
- Update icon click handlers
