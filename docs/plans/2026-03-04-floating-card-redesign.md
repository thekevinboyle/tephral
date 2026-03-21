# Floating Card Panel Redesign

## Summary

Shift from flat, uniform panels to a floating card system where each major zone is a distinct rounded container sitting on a textured void background. Typography scale differentiates panel hierarchy. Internal borders soften to create visual nesting.

---

## Card System

| Token | Old | New |
|---|---|---|
| `--panel-radius` | 2px (`rounded-sm`) | 8px |
| `--gap` | 4px | 8px |
| `--border` (card edge) | `#4a4a4a` | `#2a2a2a` |
| `--border-light` (internal) | `#3a3a3a` | `#2a2a2a` |
| `--border-internal` (new) | n/a | `#1e1e1e` |
| `--shadow-panel` | `none` | `0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)` |
| Grid substrate opacity | `0.02` | `0.03` |

Card base: `background: var(--bg-surface)` (#0A0A0A), `border: 1px solid var(--border)`, `border-radius: var(--panel-radius)`, `box-shadow: var(--shadow-panel)`.

Void background: `#000000` with grid-substrate crosshatch at `rgba(255,255,255,0.03)`.

---

## Typography Scale

| Tier | Size | Weight | Use |
|---|---|---|---|
| Panel title | 13–14px | 700 | Header brand, sequencer transport label, bottom panel tabs |
| Section label | 11px | 700 | Effect names, track labels, param page titles. White when active |
| Data readout | 12–13px | 700 | BPM, knob values, step counters. Tabular-nums |
| Micro label | 9–10px | 400–700 | M/S/A/N buttons, page dots, ghost hints |

---

## Per-Panel Treatment

### Header bar
- Full-width, no border-radius (flat against viewport top)
- Height: 48px (was 40px)
- Brand text: 13px
- Structural — not a floating card

### Left column (effect params + grid + crossfader)
- Single floating card with 8px radius
- Internal sections separated by `1px solid var(--border-internal)` (#1e1e1e)
- No separate borders per sub-panel

### Sequencer
- Floating card
- Transport bar: background `#111111` to differentiate as toolbar
- Track rows: pure black background below transport

### Bottom panel
- Floating card below sequencer
- Tab bar: background `#111111` matching transport treatment

### Canvas column
- Floating card
- Canvas element: inset treatment with `border-radius: 6px`, `1px solid #1a1a1a`

### Status bar
- Full-width, no radius
- Structural — not a floating card

---

## Depth & Interaction

- **Card borders:** `1px solid var(--border)` — loudest borders in UI
- **Internal dividers:** `1px solid var(--border-internal)` (#1e1e1e) — softer, secondary
- **Button hover:** Border brightens to `--border-emphasis` (#666)
- **Button active/enabled:** `box-shadow: 0 0 6px rgba(255,255,255,0.08)`
- **Active panel:** Card border brightens to `#555` when interacting
- **Scrollbars:** 3px width, `--text-ghost` thumb, transparent track
- **Press feedback:** Keep `translateY(0.5px)` on button:active

---

## Files to Change

| File | Changes |
|---|---|
| `src/styles/theme.css` | New tokens, shadow, radius, gap, grid opacity, scrollbar styles |
| `src/components/performance/PerformanceLayout.tsx` | Gap, radius, shadow on each grid cell, remove per-panel borders |
| `src/components/performance/HeaderBar.tsx` | Height 48px, brand text 13px, no radius |
| `src/components/performance/EffectCardStack.tsx` | Internal dividers soften |
| `src/components/performance/PerformanceGrid.tsx` | Inherits card treatment |
| `src/components/performance/BottomPanelTabBar.tsx` | Tab text 13px, bg #111 |
| `src/components/performance/BottomPanelContent.tsx` | Remove inner border/margin (card handles it) |
| `src/components/sequencer/UnifiedSequencerPanel.tsx` | Transport bg #111 |
| `src/components/sequencer/SequencerTransport.tsx` | Typography bump |
| `src/components/performance/StatusBar.tsx` | No radius, structural |
| `src/components/Canvas.tsx` | Inset canvas styling |
