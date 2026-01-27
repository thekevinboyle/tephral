# Effect Card Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign effect lane cards with Hideo Kojima and Elektron UI influence - dark, technical, data-forward aesthetic.

**Architecture:** Dark cards with chamfered top-right corner, inset OLED-style visualizer screen, prominent numeric readouts in accent colors.

**Tech Stack:** React, Tailwind CSS, CSS clip-path for chamfer

---

## Design Specifications

### Structure & Shape

- **Background:** Dark (`#1a1a1a`)
- **Top-right corner:** Chamfered at 45°, 12px cut
- **Other corners:** 4px border radius
- **Border:** 1px solid `#333`, no outer shadow
- **Selected state:** Border brightens to effect accent color at 40% opacity
- **Dimensions:** 120px min-width, 10px padding

**Layout:**
```
┌─────────────────┐
│ ● LABEL      ─  │  ← Header: LED, monospace label, line-close-button
│                 │
│  ┌───────────┐  │
│  │ visualizer│  │  ← Inset OLED screen
│  └───────────┘  │
│                 │
│   42            │  ← Primary value (large, accent color)
│   angle: 15°    │  ← Secondary param (small, gray)
└────────────────/   ← Chamfered corner
```

### Typography & Color

**Header row:**
- LED: 6px circle, accent color, glow `0 0 6px`
- Label: 8px monospace, `#666`, uppercase, letter-spacing 0.1em
- Close: horizontal line 10px × 1.5px, `#444`

**Primary value:**
- Font: 24px monospace bold
- Color: effect's accent color
- Left-aligned, raw number only

**Secondary parameter:**
- Font: 9px monospace
- Color: `#555`
- Format: `param: value`

**States:**
- Bypassed: colors → `#444`, LED dims, 60% opacity
- Soloed: accent glow around card
- Muted: desaturated, 50% opacity
- Dragging: scale 1.03, lift shadow

### Inset Screen

- Background: `#000`
- Border: 1px solid `#333`
- Inner shadow: `inset 0 1px 3px rgba(0,0,0,0.5)`
- Border radius: 2px
- Margin: 8px from card edges
- 1px padding inside for bezel effect

### Chamfered Corner

CSS clip-path:
```css
clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
```

### Close Button

- Position: top-right, before chamfer
- Visual: horizontal line, 10px × 1.5px
- Default: `#444`, 30% opacity
- Hover: 14px wide, `#f44`, 100% opacity
- Hit target: 20×20px
- Transition: 150ms ease

---

## Task 1: Update Card Container Styles

**Files:**
- Modify: `src/components/performance/ParameterPanel.tsx`

**Changes:**
1. Replace white background with `#1a1a1a`
2. Add clip-path for chamfered corner
3. Update border from shadow to solid `#333`
4. Adjust padding to 10px, min-width to 120px

---

## Task 2: Restyle Header Row

**Files:**
- Modify: `src/components/performance/ParameterPanel.tsx`

**Changes:**
1. Change label to monospace font, 8px, `#666`, uppercase
2. Reduce LED size to 6px
3. Tighten spacing between LED and label
4. Replace × close button with horizontal line style

---

## Task 3: Add Numeric Readouts

**Files:**
- Modify: `src/components/performance/ParameterPanel.tsx`
- May need to access effect parameters from stores

**Changes:**
1. Add primary value display (24px monospace bold, accent color)
2. Add secondary parameter display (9px monospace, `#555`)
3. Position below visualizer
4. Pull actual values from effect stores

---

## Task 4: Restyle Visualizer as Inset Screen

**Files:**
- Modify: `src/components/performance/ParameterPanel.tsx`

**Changes:**
1. Add `#000` background with 1px `#333` border
2. Add inner shadow for depth
3. Reduce border radius to 2px
4. Add 1px internal padding for bezel effect

---

## Task 5: Update State Styles

**Files:**
- Modify: `src/components/performance/ParameterPanel.tsx`

**Changes:**
1. Bypassed: shift colors to `#444`, dim LED, 60% opacity
2. Selected: accent-colored border at 40% opacity
3. Ensure soloed glow still works with new dark background
4. Verify dragging state looks correct

---

## Task 6: Polish Close Button Interaction

**Files:**
- Modify: `src/components/performance/ParameterPanel.tsx`

**Changes:**
1. Start close button at 30% opacity
2. Show at 100% on card hover
3. Expand width and shift to red-tint on button hover
4. Ensure 20×20px hit target for easy clicking
