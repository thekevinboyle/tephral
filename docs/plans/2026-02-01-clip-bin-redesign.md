# Clip Bin Redesign

**Goal:** Redesign the clip bin with stacked card visuals, moved out of the live preview overlay into the side placeholder or floating corner position.

---

## Layout & Positioning

**Two placement modes based on video aspect ratio:**

**Mode A: Side Placeholder Available** (portrait/square video)
- Clip bin lives in the left side placeholder
- Vertically centered in that space
- Full height available for the stacked cards

**Mode B: No Side Placeholder** (wide video fills container)
- Clip bin floats in the lower-left corner of the canvas
- Small padding from edges (12-16px)
- Semi-transparent background so it doesn't fully obscure video
- Compact size — just the stacked cards

**Transition:** When resizing causes mode switch, clip bin smoothly animates to new position.

**Z-index:** Above video, below any modals/popovers.

---

## Stacked Card Visual Design

**Card dimensions:**
- Single card: 80px wide × 48px tall (16:9 ratio matching video)
- Thumbnail fills the card with slight rounded corners (4px)

**Stack offset:**
- Each card behind offsets 6px down and 4px right
- Maximum 4 cards visible in stack (even if more clips exist)
- If 5+ clips, show 4 cards + small badge with count ("+3")

**Visual depth cues:**
- Top card: full brightness, subtle shadow
- Each card behind: slightly darker (opacity 0.85, 0.7, 0.55)
- Soft drop shadow on entire stack

**Empty state:**
- Dotted border rectangle in side placeholder mode
- Hidden when floating mode and no clips

**Hover state:**
- Stack lifts slightly (translateY -2px)
- Cursor changes to pointer
- Subtle glow or border highlight

---

## Popover List Interaction

**Trigger:** Click anywhere on the stack opens the popover.

**Popover design:**
- Appears anchored to the stack, extends rightward (into canvas area)
- Width: 240px, max height: 300px (scrollable if needed)
- Dark semi-transparent background (`rgba(0,0,0,0.9)`) with border
- Rounded corners (8px), subtle shadow

**Clip list items:**
- Larger thumbnails: 100px × 56px
- Below thumbnail: duration badge (e.g., "0:04.2")
- Timestamp or time-ago label ("2 min ago")
- Hover: highlight background, subtle scale
- Click: opens ClipDetailModal (existing behavior)

**List controls:**
- "Clear All" button at bottom (with confirmation)
- Delete icon on hover for individual clips

**Dismiss:** Click outside popover, press Escape, or click a clip.

**Animation:** Fade + scale in (150ms), same for dismiss.

---

## Component Architecture

**Files to modify/create:**

| File | Action | Description |
|------|--------|-------------|
| `ClipBin.tsx` | Rewrite | Stacked card design with offset positioning, placement mode detection, popover state |
| `ClipBinPopover.tsx` | Create | Extracted popover list component with clip selection, clear all |
| `PerformanceLayout.tsx` | Modify | Move ClipBin to left placeholder, add floating mode fallback |

**ClipStore** — no changes needed.
