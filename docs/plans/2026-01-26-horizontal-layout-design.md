# Horizontal Layout Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the UI with horizontal parameter strip, larger preview, signal path visualization, and OP-1 style graphic parameter panel.

**Architecture:** Vertical stack layout with preview dominant (55%), thin signal path bar (5%), horizontal scrollable parameter strip (15%), and bottom section (25%) containing 4x4 button grid alongside graphic parameter panel.

**Tech Stack:** React 18, Zustand, Tailwind CSS v4, Canvas API for visualizers

---

## Layout Structure

### Vertical Proportions

| Section | Height | Description |
|---------|--------|-------------|
| Preview | 55vh | Full-width video/canvas with CAM/FILE overlay |
| Signal Path | 5vh | Effect chain visualization |
| Param Strip | 15vh | Horizontal scrollable effect panels |
| Bottom | 25vh | Button grid (left) + Graphic panel (right) |

### ASCII Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [CAM] [FILE]                                    55vh        │
│                      PREVIEW                                │
│                   [Video/Canvas]                            │
├─────────────────────────────────────────────────────────────┤
│ ● SRC ──→ ● RGB ──→ ● BLOCK ──→ ○ OUT            5vh       │
├─────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      15vh      │
│ │RGB ∿∿  │ │BLK ▦▦  │ ... scrollable ...                   │
│ └────────┘ └────────┘                                      │
├───────────────────────────────────┬─────────────────────────┤
│                                   │ ┌─────────────────┐     │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐            │ │   RGB SPLIT     │     │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐            │ │  ▐█  █  █▌      │     │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐   25vh     │ │    ∿∿∿∿∿       │     │
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐            │ │ ▸ AMT    50    │     │
│       4×4 BUTTONS                │ │   RED    10    │     │
│                                   │ └─────────────────┘     │
│                                   │    GRAPHIC (~140px)     │
└───────────────────────────────────┴─────────────────────────┘
```

---

## Component Specifications

### 1. Signal Path Bar (5vh)

Horizontal bar showing the effect processing chain.

```
┌─────────────────────────────────────────────────────────────┐
│ ● SRC ───→ ● RGB ───→ ● BLOCK ───→ ● SCAN ───→ ○ OUT      │
└─────────────────────────────────────────────────────────────┘
```

**Visual States:**
- **Inactive:** Dim dot, dashed connector line
- **Active:** Glowing dot in effect's accent color, solid line
- **Selected:** Ring/highlight around dot, triggers graphic panel update

**Interaction:**
- Click node → selects effect, updates graphic panel
- Effects appear in chain order (left to right = processing order)

**Implementation:**
- Create `SignalPathBar.tsx` component
- Track `selectedEffectId` in UI store
- Render nodes for: SRC, [active effects...], OUT

---

### 2. Parameter Strip (15vh)

Horizontal scrollable row of active effect panels (existing style with visualizers + knobs).

```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│RGB ∿∿  │ │BLK ▦▦  │ │SCN ══  │ │NOS ⣿⣿  │  ← scroll →
│◯───◯   │ │◯───◯   │ │◯───◯   │ │◯───◯   │
└────────┘ └────────┘ └────────┘ └────────┘
```

**Behavior:**
- Shows only active effects
- Horizontally scrollable if > 4 effects active
- Each panel: mini visualizer + 2 knobs
- Click panel → selects effect for graphic panel

**Implementation:**
- Modify existing `ParameterPanel.tsx` to horizontal layout
- Use `flex` with `overflow-x-auto`
- Each effect panel ~120px wide

---

### 3. Button Grid (4x4 Squares)

16 effect toggle buttons in a square grid, fitting in available width minus graphic panel.

```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ ●   │ │ ●   │ │     │ │     │   Row 1: Glitch (RGB, BLK, SCAN, NOIS)
│ RGB │ │ BLK │ │SCAN │ │NOIS │
│  50 │ │  20 │ │   0 │ │   0 │
└─────┘ └─────┘ └─────┘ └─────┘
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ASCI │ │MTRX │ │STIP │ │PIXL │   Row 2: Render
└─────┘ └─────┘ └─────┘ └─────┘
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│DETC │ │ATCH │ │NETW │ │EDGE │   Row 3: Overlay
└─────┘ └─────┘ └─────┘ └─────┘
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│FACE │ │HAND │ │POSE │ │HOLO │   Row 4: Vision
└─────┘ └─────┘ └─────┘ └─────┘
```

**Button Anatomy:**
- LED indicator (top-left corner, glows when active)
- Label (center)
- Primary param value (bottom)

**Sizing:**
- Grid area: `calc(100vw - 140px)` wide × `25vh` tall
- Each button: square, calculated as `min((grid-width - gaps) / 4, (grid-height - gaps) / 4)`
- Gap: 4px between buttons

**Interaction:**
- Click → toggle effect on/off
- Drag vertical → adjust primary parameter
- Also selects effect for graphic panel

---

### 4. Graphic Parameter Panel (~140px wide)

OP-1 style detailed view of selected effect with custom graphic visualizations.

```
┌───────────────────┐
│     RGB SPLIT     │  ← Effect name in accent color
├───────────────────┤
│                   │
│   ▐█    █    █▌   │  ← Main graphic (animated)
│                   │
│      ∿∿∿∿∿∿      │  ← Secondary visualization
│                   │
├───────────────────┤
│ ▸ AMOUNT     50   │  ← Parameter list
│   RED X      10   │     ▸ = selected param
│   BLUE X    -10   │
│   MIX       100   │
└───────────────────┘
```

**Graphic Visualizations per Effect:**

| Effect | Main Graphic |
|--------|-------------|
| RGB Split | Animated color bars separating |
| Block Displace | Grid with shifting blocks |
| Scan Lines | Horizontal lines sweeping |
| Noise | TV static animation |
| Pixelate | Mosaic grid that scales |
| Edges | Rotating outline shape |
| ASCII/Matrix | Character wave |
| Stipple | Floating dots |
| Network | Points with connecting lines |
| Face/Hands/Pose | Mesh outline with tracking dots |

**Interaction:**
- Click parameter row → selects it (▸ indicator)
- Drag up/down on panel → adjusts selected parameter
- Updates in real-time as values change

**Implementation:**
- Create `GraphicPanel.tsx` component
- Create `graphics/` folder with canvas-based visualizer per effect
- Track `selectedParamIndex` for drag interaction

---

## State Changes

### UI Store Additions

```typescript
interface UIState {
  // ... existing
  selectedEffectId: string | null
  selectedParamIndex: number

  setSelectedEffect: (id: string | null) => void
  setSelectedParamIndex: (index: number) => void
}
```

---

## File Changes Summary

**New Files:**
- `src/components/performance/SignalPathBar.tsx`
- `src/components/performance/GraphicPanel.tsx`
- `src/components/performance/graphics/RGBSplitGraphic.tsx`
- `src/components/performance/graphics/BlockDisplaceGraphic.tsx`
- `src/components/performance/graphics/ScanLinesGraphic.tsx`
- `src/components/performance/graphics/NoiseGraphic.tsx`
- `src/components/performance/graphics/PixelateGraphic.tsx`
- `src/components/performance/graphics/EdgeGraphic.tsx`
- `src/components/performance/graphics/AsciiGraphic.tsx`
- `src/components/performance/graphics/StippleGraphic.tsx`
- `src/components/performance/graphics/NetworkGraphic.tsx`
- `src/components/performance/graphics/FaceMeshGraphic.tsx`
- `src/components/performance/graphics/index.ts`

**Modified Files:**
- `src/components/performance/PerformanceLayout.tsx` - New layout structure
- `src/components/performance/PerformanceGrid.tsx` - Adjusted sizing
- `src/components/performance/ParameterPanel.tsx` - Horizontal layout
- `src/stores/uiStore.ts` - Add selectedEffectId, selectedParamIndex

**Deleted Files:**
- None (existing visualizers can be reused/adapted)

---

## Implementation Order

1. Update `uiStore.ts` with selection state
2. Create `SignalPathBar.tsx`
3. Update `PerformanceLayout.tsx` with new structure
4. Convert `ParameterPanel.tsx` to horizontal
5. Adjust `PerformanceGrid.tsx` sizing
6. Create `GraphicPanel.tsx` shell
7. Create graphic components for each effect
8. Wire up selection flow between components
