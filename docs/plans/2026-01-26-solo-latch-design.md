# Solo & Latch Feature Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add solo and latch functionality to effect grid buttons for isolating a single effect during performance.

**Architecture:** Solo state managed separately from effect enabled states. Solo acts as a render-time filter, not a state mutation. Gesture detection in EffectButton with hold for momentary solo, double-click for latch.

**Tech Stack:** React, Zustand, existing EffectButton component

---

## Interaction Model

| Gesture | Action |
|---------|--------|
| Click | Toggle effect on/off (existing behavior) |
| Hold (~200ms+) | Momentary solo - mutes all other effects while held |
| Double-click | Latch solo - stays soloed after release |

**To exit latched solo:** Click or double-click the soloed effect again.

---

## State Management

### New State (add to `glitchEngineStore` or create `soloStore`)

```typescript
interface SoloState {
  activeEffectId: string | null  // which effect is soloed (null = no solo)
  isLatched: boolean             // true if latched, false if momentary
}

// Actions
setSolo: (effectId: string | null, latched: boolean) => void
clearSolo: () => void
```

### Key Principle

Solo does NOT modify effect enabled states. Effects remain "on" in their stores. Solo is a filter applied at render time. This keeps the design simple, reversible, and safe.

---

## Gesture Detection

### Timing Thresholds

```typescript
const HOLD_THRESHOLD = 200    // ms before hold triggers solo
const DOUBLE_CLICK_GAP = 300  // ms max between clicks for double-click
```

### Detection Logic (in EffectButton)

**State needed:**
- `lastClickTime`: timestamp of last click (for double-click detection)
- `holdTimer`: timeout reference
- `isHolding`: boolean

**onPointerDown:**
1. Record timestamp
2. Start hold timer (200ms)
3. Set `isHolding = false`

**Hold timer fires (after 200ms):**
1. If pointer still down → `isHolding = true`
2. Start momentary solo: `setSolo(effectId, false)`

**onPointerUp:**
1. Clear hold timer
2. If `isHolding` was true:
   - End momentary solo: `clearSolo()`
3. If quick tap (< 200ms, no drag):
   - Check if within 300ms of `lastClickTime`:
     - **Yes (double-click):**
       - If already latched on this effect → `clearSolo()`
       - Else → `setSolo(effectId, true)` (latch)
     - **No (single click):**
       - If latched on this effect → `clearSolo()`
       - Else → normal toggle (existing behavior)
   - Update `lastClickTime`

---

## Visual Feedback

### Soloed Effect Button
- Normal active appearance
- Small "S" badge in top-right corner
- Latched: solid badge background
- Momentary: outlined badge

### Muted Effect Buttons (other active effects)
- 50% opacity
- LED indicator: gray (#999) instead of colored
- Border: dimmed
- Parameter value still visible

### Inactive Effects
- Unchanged - normal "off" state

### Parameter Strip Cards
- Same treatment: soloed card normal, muted cards dimmed at 50% opacity

---

## Pipeline Integration

### Canvas.tsx Changes

Wrap effect enabled flags with solo filter:

```typescript
const { soloState } = useGlitchEngineStore() // or useSoloStore()
const isSoloing = soloState.activeEffectId !== null
const isSoloed = (id: string) => soloState.activeEffectId === id

// When passing to pipeline:
const getEffectiveEnabled = (id: string, actualEnabled: boolean) => {
  if (!isSoloing) return actualEnabled
  return isSoloed(id) && actualEnabled
}

pipeline.updateEffects({
  rgbSplitEnabled: getEffectiveEnabled('rgb_split', glitchEnabled && rgbSplitEnabled),
  blockDisplaceEnabled: getEffectiveEnabled('block_displace', glitchEnabled && blockDisplaceEnabled),
  // ... same pattern for all effects
})
```

### Effect Types to Handle
- `rgb_split`
- `block_displace`
- `scan_lines`
- `noise`
- `pixelate`
- `edges`
- `blob_detect`
- `ascii` / `matrix`
- `stipple`
- `face_mesh` / `hands` / `pose` / `holistic`

---

## Implementation Tasks

### Task 1: Add Solo State to Store
- Add `soloState` object to `glitchEngineStore`
- Add `setSolo` and `clearSolo` actions

### Task 2: Update EffectButton Gesture Detection
- Add hold timer logic
- Add double-click detection
- Wire up solo actions

### Task 3: Add Visual Feedback to EffectButton
- Add "S" badge for soloed effect
- Add dimmed styling for muted effects
- Pass solo state as props

### Task 4: Update PerformanceGrid
- Pass solo state to EffectButton components
- Calculate muted state for each button

### Task 5: Update Canvas Pipeline Integration
- Add solo filtering logic
- Wrap all effect enabled flags

### Task 6: Update ParameterPanel Cards
- Apply same dimmed styling to muted cards

---

## Edge Cases

1. **Solo an effect that's off:** Solo should also turn it on (or ignore the gesture)
2. **Turn off the soloed effect:** Should exit solo mode
3. **Bypass while soloed:** Bypass should still work (shows original)
4. **Random button while soloed:** Should exit solo first, or ignore

---

## Summary

Solo & latch provides a performance-friendly way to isolate a single effect. Hold for momentary preview, double-click to lock it in. Clean separation from effect state makes it safe and reversible.
