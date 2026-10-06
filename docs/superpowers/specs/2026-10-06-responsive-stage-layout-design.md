# Responsive Stage Layout: Design

**Date:** 2026-10-06
**Status:** Approved in conversation (direction A "Stage"). Awaiting review of this written spec.
**Mockup:** `docs/superpowers/specs/assets/2026-10-06-stage-layout/`. Open `layout.html?d=A` in a browser and resize it. Static renders are `A-laptop.png` (1440×900), `A-ultrawide.png` (2560×1080) and `A-narrow.png` (960×1200). The picture inside the output frame is a generated placeholder.

## Goal

Rebuild the SEG_F4ULT main layout so that:
- the video output is the largest area on every screen;
- the layout adapts to laptop, ultrawide and narrow windows;
- nothing overlaps or truncates.

The rebuild also pushes the existing monochrome HUD identity further.

## Context

- **Primary use:** studio and content creation. A creator works at a desk building effect chains and recording clips, on a laptop or a wide second monitor in a dim room, tweaking for minutes rather than reacting in seconds.
- **Target screens:** laptop (1280–1728 px), external or ultrawide monitor (1920–3440 px), and tablet or narrow window (down to about 900 px). A separate projector or output view is out of scope.
- **Personality:** push the existing HUD further, keep it monochrome, and use effect colours as the only colour.
- **Anti-references:** generic SaaS dashboards (cards, rounded panels, soft shadows, stat tiles), neon cyberpunk, and toy or mobile-app styling.

## Problems with the current layout (screenshot 2026-10-06 11.19)

- **Output squeezed:** the output sits in the narrowest flexible column (the right 1fr), and a decorative filler graphic soaks up the leftover height under it.
- **Empty tab rail:** a 100 px vertical rail (`SharedEffectTabsBar`) shows "NO ACTIVE EFFECTS".
- **Empty panels dominate:** the card stack and the sequencer take most of the screen while empty.
- **Fixed sizes:** the effect grid is a fixed 224 px tall, and the columns are fixed or ratio widths that ignore the screen.
- **Overlap and truncation:**
  - the A/B/C/D/UNDO/REKT buttons overlap;
  - labels are cut off ("DESTROY" tab, "Clea", "G_F4ULT.SYS");
  - empty-state text is low contrast.

## 1. Structure and responsive behaviour

### Areas

| Area | Built from (existing components) | Change |
|---|---|---|
| **Header** | `HeaderBar` | Adds the preset picker and REC. Labels are never truncated; secondary fields hide on narrow screens instead of clipping. |
| **Effects (left)** | `PerformanceGrid`, `BankPanel`, `MiddleSection` (crossfader), preset library | One column, with details below the table. |
| **Stage (centre)** | `Canvas`, `CanvasTransportBar`, `TransportBar`, `ClipBin` | Largest area, with details below the table. |
| **Chain + Settings (right)** | `EffectCardStack` (chain list), the selected effect's full parameters (`EffectParameters` from `ExpandedParameterPanel`), `TrackAudioReactivePanel` | Chain rows above, settings below. Details below the table. |
| **Dock (bottom)** | `SequencerContainer`, `BottomPanel` (LFO…AUDIO tabs) | One dock whose height follows track count. Details below the table. |
| **Status bar** | `StatusBar` | Unchanged, including the persistent SEG status segment. |
| **Removed** | `SharedEffectTabsBar` | Its job (choosing which effect you're editing) moves to the chain rows. |

**Effects (left).**
- The grid fills its height instead of being a fixed 224 px.
- Page tabs wrap to a 3×2 grid when the column is narrower than 330 px (container query).
- A/B/C/D/UNDO/REKT sit in a 6-slot grid with equal gaps and never overlap.
- The crossfader goes below the grid.
- The presets list fills the remaining height and scrolls.

**Stage (centre).**
- The output frame fits the free space at the source aspect ratio.
- HUD readouts sit on the frame edges.
- The decorative filler under the canvas is removed.
- Recording and the clip bin keep working.

**Chain + Settings (right).**
- Compact rows show the index, effect LED, name and two key values.
- The selected row opens that effect's settings and its audio band (strip, presets, MOD) below the chain.
- The column scrolls when it is taller than the window.

**Dock (bottom).**
- Height follows the track count, capped at 34% of the viewport height, and scrolls past that.
- It collapses to its header row when there are no tracks.

### Breakpoints

| Width | Grid |
|---|---|
| **≥ 2200 px (ultrawide)** | Four columns: Effects `minmax(340px,16vw)` · Stage `1fr` · Chain `minmax(320px,15vw)` · Dock `minmax(560px,26vw)`. The Dock runs full height in its own column. |
| **1100–2199 px (laptop)** | Three columns: Effects `minmax(300px,22vw)` · Stage `1fr` · Chain `minmax(280px,20vw)`. The Dock spans all three columns at the bottom. |
| **< 1100 px (narrow)** | Two columns. Stage spans both (about 46vh) on top, Effects and Chain sit side by side below it, then the Dock, then the status bar. The page scrolls vertically. |

Implementation is CSS grid with `grid-template-areas` and three breakpoint media queries in `PerformanceLayout`. Container queries handle the inner adjustments (tabs, cell padding). There is no JS layout maths.

### Behaviour that must not change

All of the following must keep working exactly as before:
- effect enable, reorder and bypass;
- sequencer and p-locks;
- modulation;
- audio bands, gate and MOD;
- recording, export, presets, banks;
- the crossfader;
- the SEG person mask.

Selecting an effect in the chain must set the same `uiStore.selectedEffectId` that the removed tab rail used to set. The sequencer track panel and the Audio panel continue to follow it.

## 2. Visual language

All tokens stay in `src/styles/theme.css`, which is the active theme. Do not edit `src/index.css`; it is stale.

- **Surfaces:**
  - Panels are separated by 1 px rules instead of rounded, shadowed cards.
  - Panel radius goes from 8 px to 0–2 px, and panel shadows are removed.
  - There are two neutral tones: base, and a raised tone for selected rows and active cells.
  - Neutrals get a faint cool tint (OKLCH chroma about 0.006 at hue 270).
- **Colour:** only from active effects (LEDs, meters, sequencer steps, the selected-effect knobs and band window). REC stays red. Everything else is neutral.
- **Type:** JetBrains Mono throughout, in three tiers:
  - labels: 10 px uppercase, tracked;
  - values: 12 px with tabular numerals;
  - BPM: 18 px bold.
- **Contrast:** muted, helper and empty-state text must reach a WCAG contrast of at least 4.5:1 against its background. The current `--text-ghost` empty-state text does not.
- **Output frame:** corner ticks at all four corners, a ruler along the bottom edge, and four HUD readouts:
  - top-left: LIVE · FPS;
  - top-right: preset name;
  - bottom-left: timecode;
  - bottom-right: active band, shown when a selected track has one.
- **Empty states that teach:**
  - Chain: "Click an effect in the grid to add it to the end of the chain."
  - Dock: "Effects you enable get a lane automatically."
  - Settings: "Select an effect in the chain to edit it."
- **Motion:** state changes only (select, toggle, dock resize), 150–250 ms, reusing the motion utilities already in theme.css. Do not animate layout properties.

## 3. Testing and verification

Use puppeteer scripts under `.superpowers/sdd/` (gitignored), plus `npm run build` and eslint with no new problems in changed files.

1. **Layout at three sizes.** At 1440×900, 2560×1080 and 960×1200, check:
   - the output's on-screen area is the largest of all areas;
   - each area is in its specified place (for example, Dock in column 4 on ultrawide, Stage first on narrow);
   - no label is clipped (`scrollWidth ≤ clientWidth` for labels, tabs and buttons).
2. **No overlaps.** The bounding boxes of the A/B/C/D/UNDO/REKT buttons and the page tabs never intersect, at every size.
3. **Screenshots vs mockup.** Capture the same three sizes in empty and populated states (SEG_EXP preset loaded). Put them side by side with the mockup renders for human review before merge.
4. **No regressions.**
   - Re-run the SEG wiring check and the audio-band `ui`/`gate`/`mod` checks, with selectors updated for moved components.
   - Selecting a chain row sets `selectedEffectId` and opens the effect's settings and sequencer track.
5. **Live resize.** Resizing from 960 → 2560 px wide re-flows the layout with no console errors, keeps the output canvas rendering, and does not interrupt an active recording.
6. **Contrast.** Computed colours of labels, helper text and empty states meet 4.5:1.

## Out of scope

- A separate projector or output-only window.
- Mobile phone layouts below about 900 px.
- New features. This is a layout and visual-language change only.
- Redesigning individual effect parameter controls (knobs, sliders) beyond spacing, colour and type tokens.
