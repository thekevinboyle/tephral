# Device-Chain UI (Bitwig-inspired): Design

**Date:** 2026-10-07
**Status:** Direction A chosen in conversation. This written spec is awaiting review.
**Mockup:** `docs/superpowers/specs/assets/2026-10-07-device-chain-ui/mockup.html`, opened with `?d=A`. The static render is `A-1440.png`. B and C were the rejected directions; they are kept in the same folder for reference.
**Research:** `assets/2026-10-07-device-chain-ui/research.md` (Bitwig Studio 6 UI conventions, with sources and copy-risk notes).

## Goal

The user says the current SEG_F4ULT "is messy and hard to use". They named three problems:
1. They can't tell what things do: unlabelled icons and cryptic names such as THRML and RFSH.
2. Everything is on screen at once.
3. Everything looks flat, with no hierarchy.

This change reorganises and restyles the app on Bitwig Studio's principles:
- neutral grey chrome, with colour reserved for meaning;
- a browser on the left, the output in the centre, and a contextual inspector on the right;
- the effect chain as left-to-right device cards along the bottom;
- panels that are shown and hidden from the footer;
- a single transport.

SEG_F4ULT keeps its own name and identity. We copy no Bitwig logo, name, icons, palette values or product terms. There are no feature additions and no removals; existing features move and change appearance only.

## 1. Layout

| Area | Contents | Built from |
|---|---|---|
| **Header (44px)** | Brand. Video and Audio source pickers, each with a small label. A centred transport: sequencer play/stop, BPM and timecode. Preset picker. Rec. | `HeaderBar`. The transport takes play/stop and BPM from `SequencerTransport`. |
| **Browser (left)** | "Effects" panel with a search box and two modes: **List** (the default) and **Pads**.<br>**List** shows categories you can fold (Acid, Vision, Glitch, Strand, Motion, Destroy, each with a count). Each effect row shows a colour dot, the full name and a one-line description, plus "in chain" for active effects. Clicking a row toggles the effect.<br>**Pads** is the existing `PerformanceGrid` (toggle, drag for mix, hold to solo), restyled. Pad labels use full names when they fit.<br>The bottom of the panel holds Banks (A–D, Random, Undo, Rekt) and the crossfader. | `PerformanceGrid`, `BankPanel`, `MiddleSection`, and a new `EffectBrowserList` |
| **Stage (centre)** | The output frame and HUD readouts, unchanged. Below it, one thin media strip: video play/pause, the VID/AUD timeline and Clear. The separate bar above the output (`CanvasTransportBar`) is removed and its play/pause and source label move into the strip. | `StageArea`, `TransportBar` |
| **Inspector (right)** | Context-dependent:<br>• **Effect selected:** header with colour, full name, "n of m in chain" and Bypass. Every numeric setting as a segmented bar (no knob strip here, because the device card already has the dials). Then selects, toggles and extras, the Modulation routes for that effect (source → parameter, amount), and the audio band.<br>• **Modulator selected:** that modulator's editor (LFO, Random, Step, Envelope, S&H, MIDI or Audio).<br>• **Nothing selected:** "Select a device or modulator to edit it." | `EffectSettings` (new `showStrip={false}` option), `ModulationAssignPanel`, `ModulationContent`, `TrackAudioReactivePanel` |
| **Bottom panel** | A header with "Chain · signal flows left to right", two tab buttons (**Devices**, **Sequencer**), and Bypass all and Clear.<br>• **Devices:** a horizontally scrolling chain. First a **Modulators** card listing LFO 1–4, Random, Step, Envelope, S&H, MIDI and Audio. Each slot has an animated mini-graphic, a name and a routing button (●). Clicking the slot selects the modulator into the Inspector. Clicking ● starts the existing assignment mode, so the next control you click or drag is routed. Then one **device card** per active effect in chain order, with "+" gaps between and a final "+" card that focuses the browser search.<br>• **Sequencer:** the existing `SequencerContainer`, including its own toolbar for swing, resolution and so on. Play and BPM are now in the header. | new `DeviceChain`, `DeviceCard`, `ModulatorsCard`; `SequencerContainer` |
| **Footer (30px)** | Status text on the left (the existing hover descriptions). Panel toggles on the right: **Browser**, **Inspector**, **Bottom**. Then fps. | `StatusBar` |

**Device card:** about 230px wide and 150px tall. It has:
- **Side strip (26px):** a 3px stripe in the effect's colour, an on/off button (filled when on, outlined when bypassed) and the name set vertically.
- **Dials:** a row of 4, one for each of the first four numeric registry params. These reuse the strip-knob behaviour and `useParamControl`.
- **Mix:** a horizontal Mix bar for the dry/wet value, using the same `effectMix` as the pad's mix.

Card interactions:
- Clicking the card selects the effect and opens it in the Inspector. The selected card gets a near-white outline.
- Dragging a card reorders it, with the same rules as the old chain rows.
- Hovering shows × to remove the effect.
- The keyboard behaviour of the old chain rows still applies: Enter selects, Delete removes, Alt+Arrow moves.

**Panel sizes and toggles:**
- The browser is 250px wide and the inspector is 300px. At 2200px and wider they are 300px and 340px.
- The bottom panel is 172px tall in Devices mode. In Sequencer mode its height follows the track count, capped at 40vh.
- When a panel is toggled off, the stage takes the space.
- Toggle state lives in `uiStore` (`showBrowser`, `showInspector`, `showBottom`, and `bottomTab: 'devices' | 'sequencer'`). It is not persisted.

**Narrow windows (under 1100px):**
- The browser and inspector become drawers that overlay the stage from the left and right, opened from the footer toggles.
- They are closed by default and close with Escape or a click outside.
- The stage and bottom panel run full width.

**Selecting a modulator:** this sets a new `uiStore.selectedModulator` and clears `selectedEffectId`. Selecting an effect clears `selectedModulator`.

## 2. Visual language

All values live in `src/styles/theme.css`, the active theme. `src/index.css` is stale; do not edit it.

**Neutrals.** The existing `--bg-*`, `--border*` and `--text-*` tokens are redefined to these neutral greys, with no hue tint:

| Token | Value |
|---|---|
| Gutter between panels | `#0e0f10` (new `--gutter`) |
| Window / stage | `#18191b` |
| Panel | `#222326` |
| Raised (headers, cards) | `#2c2d31` |
| Control | `#37383d` |
| Hover | `#45464c` |
| Line | `#3a3b40` |

- Panels are separated by 2px gutters, not borders.
- Panel and card radius is 6px. Controls use 4px.
- There are no shadows.

**Text.**

| Role | Value |
|---|---|
| Primary | `#ececee` |
| Secondary | `#b4b6bc` |
| Muted | `#8d9097` (at least 4.5:1 on Panel and Raised) |

**Colour carries meaning only:**
- each effect's own colour: card stripe, dials, pads, browser dot;
- modulation: `--mod: #4fb3ff`, one hue for routes, arcs, assignment highlight and modulated segments;
- record: `--rec: #ff5a4e`;
- running or on: `--live: #b8f35a` for transport play, active footer toggles and the Live readout;
- selection: a near-white outline `#f2f2f4`.

Bitwig's orange is not used.

**Change to Ruling R5 of the param-bars plan.** Modulated segments now take `--mod` instead of the effect colour. The new palette gives modulation its own visible hue, and the reason for R5 was that the LFO grey (#707070) was invisible.

**Type.**
- UI text is **IBM Plex Sans** at weights 400, 500 and 600, loaded from Google Fonts.
- Values, timecode and BPM are **IBM Plex Mono**.
- Normal sentence or title case everywhere. The tracked-caps `.hud-label` style becomes 11px, weight 500, normal case, no tracking.
- Sizes:

  | Role | Size |
  |---|---|
  | Panel titles | 12px semibold |
  | Body and rows | 12.5–13px |
  | Labels and metadata | 10.5–11px |
  | Transport readouts | 15px mono |

**Labels, which address "can't tell what things do":**
- Every icon-only button gets a visible text label or an `aria-label` plus a status-bar description. This covers the crossfader row icons, the sequencer toolbar icons and the dock rail.
- Effect names shown to the user are full names, taken from the name part of `EFFECT_DESCRIPTIONS`; for example "Thermal", not "THERML".
- Device-card and pad labels may shrink-to-fit, as the pads already do, but they never use the cryptic short code.

**Dials.** These are restyled in `Knob`'s `showArc` branch:
- 40px;
- a 3px track in Control;
- the value arc in the effect colour;
- a white position dot;
- the modulation range as a 5px `--mod` arc;
- the value below in 11px mono and the label below that in 10.5px muted.

**Motion.** 120–200ms on hover, selection and panel toggle opacity. Layout properties are not animated.

## 3. Behaviour that must not change

All of these keep working:
- effect enable, reorder, bypass and remove;
- per-effect mix;
- solo and hold on pads;
- banks, undo and Rekt;
- the crossfader;
- presets;
- recording and export;
- the sequencer, p-locks and automation;
- every modulator and its routing (assignment mode, drag-drop, right-click menu);
- audio bands;
- the SEG person mask;
- the effect settings controls built in the param-bars plan.

`selectedEffectId` keeps driving the sequencer track focus.

## 4. Testing and verification

Use puppeteer harnesses under `.superpowers/sdd/` (gitignored), plus `npm run build` and eslint with no new problems in the changed files.

1. **Layout.** At 1440×900, 2560×1080 and 1180×800:
   - each area is in its place;
   - the stage is the largest area;
   - no label is clipped;
   - toggling each panel off gives its space to the stage.
2. **Narrow.** At 960×1200 the browser and inspector are drawers. They open from the footer and close on Escape.
3. **Browser.**
   - List mode shows all 92 effects under 6 categories, with full names and descriptions.
   - Search filters the list.
   - Clicking a row toggles the effect and it appears as a device card.
   - Pads mode still toggles, mixes and solos.
4. **Device chain.**
   - Cards appear in chain order with 4 dials and Mix.
   - Clicking a card selects it and the Inspector shows its bars.
   - Drag reorders.
   - The on/off button bypasses.
   - × removes.
5. **Modulators.**
   - Clicking a slot opens its editor in the Inspector.
   - Clicking ● and then a device dial creates a routing at depth 0.5.
   - The route shows in that effect's Inspector "Modulation" list.
6. **Transport.** Header play/stop and BPM drive `useEffectSequencerStore` exactly as the old sequencer transport did. The media strip still plays and pauses video and scrubs.
7. **Regressions.** Re-run the existing `layout-check` modes (selectors updated), `seg-verify wiring`, `bands-check ui/gate/mod`, `export-check`, and the param-bars `route`, `barmath` and `settings` checks.
8. **Contrast.** Muted text is at least 4.5:1 on Panel and Raised.
9. **Screenshots** at the three sizes, empty and with SEG_EXP loaded, shown side by side with `A-1440.png` for human review before merge.

## Out of scope

- New features.
- Light mode or themes.
- A modulator system beyond the existing sources.
- Nested chains.
- Persisting panel toggle state.
- Changing effect or parameter definitions, except adding full names where the description lacks one.
