# Expandable Sequencer Design

## Goal
Replace the cramped fixed-size sequencer panel with a hover-expandable drawer that shows a compact summary when collapsed and full editing controls when expanded.

## Behavior

**Collapsed state (default):**
- 48px tall single row
- Shows: Play/Stop, BPM (read-only), resolution, mini track summary (colored bars)
- Track bars pulse when steps fire

**Expanded state:**
- 280px tall, overlays upward over canvas
- Full track list with large step grids
- All editing controls accessible

**Transitions:**
- Expand: Mouse enters → 150ms delay → 200ms ease-out animation
- Collapse: Mouse leaves → 300ms delay → 150ms ease-in animation
- Drop shadow separates from canvas below

---

## Collapsed State Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [▶] 120 1/16  ▮▮▮▮▮▮▮▮  (colored track bars)               │
└─────────────────────────────────────────────────────────────┘
```

**Components (left to right):**
1. Play/Stop button (28px)
2. BPM display - read-only number
3. Resolution indicator (e.g., "1/16")
4. Mini track summary - row of 8×16px colored rectangles, one per track
   - Track color at 60% opacity when idle
   - Full brightness + pulse when step fires

**Height:** 48px
**Background:** `var(--bg-surface)`
**Border:** `1px solid var(--border)` on top

---

## Expanded State Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Track list (scrollable)                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ≡ ● Track 1  [░░█░░░░░█░░░░░░░]  16 > S ×              │ │
│ │ ≡ ● Track 2  [░░░░█░░░░░░░█░░░]  16 - S ×              │ │
│ │ ≡ ● Track 3  [█░░░░░░░█░░░░░░░]   8 < S ×              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Add Track]                                               │
│                                                             │
│ [Forward ▼] [Fill] [Random] [↺] [Freeze] [Revert]          │
│                                                             │
│ [▶] [120] [1/16]  ▮▮▮  (header row - same as collapsed)    │
└─────────────────────────────────────────────────────────────┘
```

**Sections (top to bottom):**

1. **Track list** - Flexible height, scrollable
   - Each track: 44px tall
   - Step grid cells: 12×12px with 4-step grouping lines

2. **Add Track button** - Full-width button row

3. **Global controls row** - Single horizontal row containing:
   - Mode dropdown (Forward/Backward/Pendulum/Random)
   - Fill button
   - Random button
   - Undo button
   - Freeze button
   - Revert button

4. **Header row** - Same content as collapsed state but BPM is now editable input

**Height:** 280px
**Position:** `absolute`, anchored to bottom, expands upward
**Shadow:** `0 -4px 20px rgba(0,0,0,0.3)`
**Z-index:** Above canvas, below modals

---

## Track Row Layout (Expanded)

```
┌─────────────────────────────────────────────────────────────┐
│ ≡  ●  Track 1  [░░█░░░░░█░░░░░░░]  16  >  S  ×             │
│ │  │  │        │                   │   │  │  │             │
│ │  │  │        └─ Step grid        │   │  │  └─ Delete     │
│ │  │  └─ Name (dbl-click rename)   │   │  └─ Solo          │
│ │  └─ Color dot                    │   └─ Mode override    │
│ └─ Drag handle (routing)           └─ Length               │
└─────────────────────────────────────────────────────────────┘
```

**Step grid:**
- Cells: 12×12px (larger click targets)
- Current step: brighter color + subtle glow
- Velocity shown via opacity
- Vertical lines every 4 steps

---

## Animation Details

**Expand:**
- Trigger: mouseenter
- Delay: 150ms (prevents accidental trigger)
- Animation: 200ms ease-out
- Track content fades in (opacity 0→1, 50ms delay after height starts)

**Collapse:**
- Trigger: mouseleave
- Delay: 300ms (longer to prevent accidental collapse)
- Animation: 150ms ease-in

**Hover buffer:** 8px invisible margin around expanded area to prevent edge-case collapses

---

## Implementation Notes

**Files to modify:**
- `src/components/sequencer/SequencerPanel.tsx` - Main refactor
- `src/components/sequencer/Track.tsx` - Adjust sizing for expanded mode
- `src/components/sequencer/StepGrid.tsx` - Larger cells
- `src/components/sequencer/CollapsedSequencer.tsx` - New component for mini view

**State needed:**
- `isExpanded: boolean` - Local state in SequencerPanel
- Hover timers managed via useRef

**CSS approach:**
- Use CSS transitions for height
- Absolute positioning with `bottom: 0`
- Overflow hidden during transition
