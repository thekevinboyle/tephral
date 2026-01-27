# Bank Bar Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the bank panel into a split layout with A/B/C/D effect chain banks on the left (aligned with grid) and Random/Undo buttons on the right (aligned above XY pad).

**Architecture:** Banks store full effect snapshots (enabled, params, order). Click to load, double-click to save. Simplified state management replaces preset slots.

**Tech Stack:** React, Zustand, existing component patterns

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [  A  ] [  B  ] [  C  ] [  D  ]    (spacer)     [ Random ] [  Undo  ] │
│  ←───── 50vw, aligned with grid ─────→           ←── XY pad width ──→  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Left section (50vw):**
- Four bank buttons: A, B, C, D
- Each button width matches one grid column (~25% of 50vw minus gaps)
- Horizontally centered within the 50vw space
- Row height: ~4vh / 40px minimum

**Right section:**
- Random and Undo buttons
- Span full width of XY pad column below
- Split evenly (50/50) with 8px gap between

**Middle:** Empty spacer (above GraphicPanel area)

---

## Bank Button Behavior

**Interactions:**
- **Single click** → Load bank's snapshot (if not empty)
- **Double-click** → Save current effect state to that bank

**Double-click detection:**
- Track `lastClickTime` per button
- If click within 300ms of last click → save
- Otherwise → load (if filled)

---

## Bank Button Visual States

| State | Background | Border | Text Color |
|-------|-----------|--------|------------|
| Empty | transparent | 1px dashed #d0d0d0 | #999999 |
| Filled | #ffffff | 1px solid #d0d0d0 | #1a1a1a |
| Active | #ffffff | 2px solid #6366f1 | #1a1a1a |

**Button content:**
- Large centered letter (A/B/C/D)
- Font: 16px, medium weight
- No "Bank" label

---

## Random/Undo Buttons

**Position:** Right side of bank bar, above XY pad column

**Sizing:**
- Full width of XY pad, split 50/50
- Height matches bank buttons (~40px)
- 8px gap between buttons

**Styling:**
- Background: #f5f5f5
- Border: 1px solid #d0d0d0
- Text: 11px, #666666
- Undo disabled state: #c0c0c0, cursor not-allowed

**Behavior:** Unchanged from current implementation

---

## State Management

**Bank snapshot structure:**

```typescript
interface BankSnapshot {
  // Glitch engine effects
  glitch: {
    rgbSplitEnabled: boolean
    rgbSplit: RGBSplitParams
    blockDisplaceEnabled: boolean
    blockDisplace: BlockDisplaceParams
    scanLinesEnabled: boolean
    scanLines: ScanLinesParams
    noiseEnabled: boolean
    noise: NoiseParams
    pixelateEnabled: boolean
    pixelate: PixelateParams
    edgeDetectionEnabled: boolean
    edgeDetection: EdgeDetectionParams
  }
  // Vision effects
  ascii: { enabled: boolean; params: AsciiParams }
  stipple: { enabled: boolean; params: StippleParams }
  blobDetect: { enabled: boolean; params: BlobDetectParams }
  landmarks: { enabled: boolean; mode: LandmarkMode }
  // Chain order
  effectOrder: string[]
  // Metadata
  savedAt: number
}

interface BankState {
  banks: (BankSnapshot | null)[]  // [A, B, C, D]
  activeBank: number | null       // 0-3 or null if modified

  loadBank: (index: number) => void
  saveBank: (index: number) => void
  clearBank: (index: number) => void
}
```

**Active bank tracking:**
- Set `activeBank` when a bank is loaded
- Set to `null` when any effect changes after loading
- Stays set if saving to the currently active bank

---

## Implementation Tasks

### Task 1: Create Bank State Store

**Files:**
- Create: `src/stores/bankStore.ts`

Create Zustand store with:
- `banks` array (4 slots, initially null)
- `activeBank` tracker
- `loadBank()` - captures snapshots from all effect stores and applies
- `saveBank()` - reads current state from all stores into bank slot
- Helper to detect if current state matches active bank

---

### Task 2: Create BankButton Component

**Files:**
- Create: `src/components/performance/BankButton.tsx`

Props:
- `label`: string (A/B/C/D)
- `index`: number (0-3)
- `isEmpty`: boolean
- `isActive`: boolean
- `onLoad`: () => void
- `onSave`: () => void

Implements:
- Double-click detection (300ms threshold)
- Visual states (empty/filled/active)
- Large centered letter

---

### Task 3: Rewrite BankPanel Component

**Files:**
- Modify: `src/components/performance/BankPanel.tsx`

New structure:
- Left container (50vw): 4 BankButton components with grid-aligned sizing
- Spacer (flex-1)
- Right container: RandomEffectsControls component

Remove:
- Preset slots
- Save/Copy/Paste buttons
- "Bank" label

---

### Task 4: Update PerformanceLayout

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`

Changes:
- Remove RandomEffectsControls from XY pad column
- It's now rendered inside BankPanel

---

### Task 5: Wire Up Effect Change Detection

**Files:**
- Modify: `src/stores/bankStore.ts`
- Modify effect stores as needed

When any effect state changes:
- If `activeBank` is set, compare current state to stored bank
- If different, set `activeBank` to null

This can be done via Zustand subscriptions or middleware.

---

## Removed Features

- Preset slots (1-4 per bank)
- Save/Copy/Paste buttons
- "Bank" label text
- `routingStore` bank/preset logic (can be cleaned up later)
