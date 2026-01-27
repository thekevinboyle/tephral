# Expanded Parameters Panel - Implementation Plan

## Task 1: Create Control Components

**Files:** Create `src/components/performance/controls/`

### SliderRow.tsx
```tsx
interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
}
```

### ToggleRow.tsx
```tsx
interface ToggleRowProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}
```

### SelectRow.tsx
```tsx
interface SelectRowProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}
```

## Task 2: Create ExpandedParameterPanel

**File:** `src/components/performance/ExpandedParameterPanel.tsx`

- Read `selectedEffectId` from `uiStore`
- Render header with effect name + LED
- Render all parameters for selected effect using control components
- Handle empty state (show last selected via local state)

## Task 3: Update PerformanceLayout

**File:** `src/components/performance/PerformanceLayout.tsx`

- Wrap preview area in flex container
- Add ExpandedParameterPanel to right side (280px fixed width)
- Adjust canvas container to take remaining space

## Task 4: Wire Up All Effect Parameters

Add complete parameter definitions for each effect:
- RGB Split (5 params)
- Block Displace (2 params)
- Scan Lines (2 params)
- Noise (2 params)
- Pixelate (1 param)
- Edge Detection (2 params)
- ASCII/Matrix (3 params + mode toggle)
- Stipple (5 params + toggles)
- Blob Detect (6+ params + toggles)
- Landmarks (2 params + mode select)
