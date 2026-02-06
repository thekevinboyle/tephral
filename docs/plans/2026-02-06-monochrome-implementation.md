# Monochrome UI Redesign - Implementation Plan

> **For Claude:** Execute this plan task-by-task with verification after each step.

**Goal:** Transform the app's visual identity to monochrome + toxic magenta, with micro-dot grid and data-dense typography.

**Approach:** Update CSS tokens first, then propagate through components. Minimal code changes - mostly CSS variable updates and class additions.

---

## Task 1: Update Theme Tokens

**File:** `src/styles/theme.css`

Replace the entire `:root` block with new tokens:

```css
:root {
  /* Backgrounds - pure black foundation */
  --bg-void: #000000;
  --bg-primary: #0a0a0a;
  --bg-surface: #111111;
  --bg-elevated: #1a1a1a;
  --bg-hover: #222222;

  /* Dot matrix grid */
  --grid-dot: #1f1f1f;
  --grid-size: 16px;
  --dot-size: 1px;

  /* Borders - subtle structure */
  --border: #2a2a2a;
  --border-emphasis: #3a3a3a;

  /* Text - warm bone monochrome */
  --text-primary: #E8E4DE;
  --text-secondary: #B8B4AE;
  --text-muted: #6A6864;
  --text-ghost: #3A3834;

  /* Accent - toxic magenta */
  --accent: #FF0055;
  --accent-dim: #CC0044;
  --accent-glow: rgba(255, 0, 85, 0.3);
  --accent-subtle: rgba(255, 0, 85, 0.08);

  /* Typography */
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
  --text-micro: 9px;
  --text-tiny: 10px;
  --text-small: 11px;
  --text-base: 12px;
  --text-medium: 14px;
  --text-large: 16px;
  --leading-tight: 1.2;
  --leading-normal: 1.4;
  --tracking-tight: -0.01em;
  --tracking-wide: 0.08em;
}
```

**Verify:** App loads with darker backgrounds, cream text, magenta accent visible on active elements.

---

## Task 2: Add Grid Substrate Styles

**File:** `src/styles/theme.css`

Add after the `:root` block:

```css
/* Dot matrix grid background */
.grid-substrate {
  background-color: var(--bg-primary);
  background-image: radial-gradient(
    circle,
    var(--grid-dot) var(--dot-size),
    transparent var(--dot-size)
  );
  background-size: var(--grid-size) var(--grid-size);
  background-position: center center;
}

.grid-dense {
  --grid-size: 8px;
}

.grid-none {
  background-image: none;
}
```

**Verify:** Classes are available for use.

---

## Task 3: Add Data Readout Utilities

**File:** `src/styles/theme.css`

Add utility classes for machine-language data styling:

```css
/* Data readout - machine language aesthetic */
.data-row {
  display: flex;
  gap: 16px;
  font-size: var(--text-micro);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.data-label {
  color: var(--text-ghost);
}

.data-value {
  color: var(--text-secondary);
}

.data-sep::after {
  content: '·';
  margin: 0 8px;
  color: var(--text-ghost);
}

.timecode {
  font-size: var(--text-small);
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}
```

**Verify:** Utility classes available.

---

## Task 4: Apply Grid to Main Layout

**File:** `src/components/performance/PerformanceLayout.tsx`

Add `grid-substrate` class to the main container div:

```tsx
<div
  className="w-screen h-screen flex flex-col overflow-hidden grid-substrate"
  // remove inline backgroundColor style if present
>
```

**Verify:** Dot matrix pattern visible across app background.

---

## Task 5: Update Component Border Radius

**Files:** Search for `rounded-` classes and `border-radius` styles

Global find/replace in components:
- `rounded-lg` → `rounded-sm` (2px)
- `rounded-xl` → `rounded-sm`
- `rounded-md` → `rounded-sm`
- `rounded-full` on containers → `rounded-sm` (keep on small indicators/dots)

Key files to check:
- `src/components/performance/PerformanceLayout.tsx`
- `src/components/performance/TransportBar.tsx`
- `src/components/performance/EffectsLane.tsx`
- `src/components/sequencer/*.tsx`

**Verify:** No large border radius visible, everything has max 2px radius.

---

## Task 6: Replace Green Active States with Magenta

**Files:** Search for `#10b981`, `green`, `emerald` in component files

Replace green indicators/active states with magenta:
- `#10b981` → `var(--accent)` or `#FF0055`
- `bg-green-*` → custom accent class
- `text-green-*` → `text-[#FF0055]` or style prop

Key locations:
- Active source indicators
- Recording state
- Enabled effect indicators
- Crossfader thumb (already updated)

**Verify:** No green visible in UI, magenta appears for active states.

---

## Task 7: Update TransportBar Typography

**File:** `src/components/performance/TransportBar.tsx`

- Timecode display: use `--text-small` (11px), add `letter-spacing: 0.05em`
- BPM display: use micro-type style with `--text-muted` color
- Add ghost separator between time displays (`\` character)

**Verify:** Transport bar has dense, data-readout aesthetic.

---

## Task 8: Update EffectsLane Styling

**File:** `src/components/performance/EffectsLane.tsx`

- Effect names: uppercase, `--text-tiny` size
- Parameter values: `--text-micro` size, `--text-muted` color
- Active indicator: magenta dot instead of green
- Reduce padding/spacing for denser feel

**Verify:** Effects lane looks data-dense with micro-typography.

---

## Task 9: Update Sequencer Grid

**Files:** `src/components/sequencer/*.tsx`

- Add `grid-dense` class to sequencer container for 8px dot grid
- Beat markers: 1px magenta lines
- Step cells: 2px border, magenta fill when active
- Grid numbers: `--text-ghost` color, `--text-micro` size

**Verify:** Sequencer has dense grid substrate, magenta active steps.

---

## Task 10: Update Crossfader

**File:** `src/components/performance/HorizontalCrossfader.tsx`

- Track: `--bg-elevated` background, 2px height
- Thumb: magenta (`--accent`)
- Labels: `--text-ghost` color, `--text-micro` size, uppercase

Already partially done - verify magenta thumb is using new token.

**Verify:** Crossfader matches new aesthetic.

---

## Task 11: Final Polish Pass

Review all visible UI for:
- Any remaining orange (`#ff6b35`) or green (`#10b981`) colors
- Border radius > 2px
- Text that's too large for the dense aesthetic
- Backgrounds that should be darker

**Verify:** Visual consistency across entire app.

---

## Verification Checklist

- [ ] Backgrounds are near-black (#0a0a0a base)
- [ ] Text is warm bone (#E8E4DE)
- [ ] Dot matrix visible on main background
- [ ] All active states are magenta
- [ ] No green or orange visible
- [ ] Max 2px border radius everywhere
- [ ] Data areas use micro-typography (9-10px)
- [ ] Transport bar has timecode aesthetic
- [ ] Effects lane is data-dense
- [ ] Sequencer has dense grid + magenta accents
