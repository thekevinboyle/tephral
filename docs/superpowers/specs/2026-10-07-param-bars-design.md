# Effect Settings: Knob Strip + Segmented Bars (Design)

**Date:** 2026-10-07
**Status:** Approved in conversation (option C, a mix of C2 and C3, 32 segments, no value line). This written spec is awaiting review.
**Mockup:** `docs/superpowers/specs/assets/2026-10-07-param-bars/final.html` with its render `final.png`. The four options the board considered are in `options.png`.
**Advisory board:** the board recommended fixing the routing regression first, then moving to a single uniform control per setting. The user picked rows plus a knob strip, with heavier bars made of LED segments.

## Goal

Replace the chain panel's settings area for the selected effect. Today it is a grid of eight auto-picked tile types. It becomes:
- a strip of **4 knobs** for the effect's first four settings;
- then **one segmented bar per remaining setting**.

Every numeric setting gets the same behaviour: drag, fine drag, step-lock (p-lock) target, modulation routing (click to route, drag-and-drop, right-click menu), and modulation shown on the control.

## The problem today

1. **Regression: click to route does nothing on effect settings.** The modulation panels say "Click a knob to route". The global assignment mode (`modulationStore.assigningModulator`, plus the poly-Euclid and step-track equivalents) is handled only in `Knob.tsx`. The old card stack's compact knobs were deleted in the layout redesign. The chain settings area renders blocks (`ParamBlock`, `DragNumberBlock`, …), which ignore assignment mode, show no routing, and accept no modulation drops. The only way left to route is the right-click menu.
2. **Look and feel.**
   - Eight control types are picked by keyword guesses, so the same kind of setting looks different from one effect to the next.
   - The tiles are boxy and busy, with thin bars that are hard to grab.
3. **Three parallel per-effect lists.** `CompactEffectParams.tsx` (88 cases, now unrendered) and `ExpandedParameterPanel.tsx` (v1, unrendered) still exist alongside the registry. `CLAUDE.md` tells contributors to update all three.

## Design

### Layout (settings area, under the effect header)

| Part | Content |
|---|---|
| **Main strip** | The first 4 numeric settings (toggle-like 0/1 integer params excluded; they stay `ToggleBlock`s in Extras), in registry order, as `Knob` (size md). Value above the label. Tinted surface `--bg-surface`, labelled `MAIN` with `.hud-label`, 1px rule below. Effects with 4 or fewer numeric settings show only the strip. |
| **Bars** | Every remaining numeric setting, in registry order, one `ParamBar` each. Rows are 28px tall with a 3px gap. |
| **Extras** | Selects, toggles and colours from `getSelectParams` and the hand-written `BlockExtras`, unchanged apart from tokens. They render below the bars. |
| **Audio band** | `TrackAudioReactivePanel`, unchanged, below everything. |

There is no per-effect curation. The strip is always "the first 4 in the registry". To change what appears in an effect's strip, reorder its registry entries.

Section grouping (`classifySection`) and the 8-type classifier (`classifyParam`) are no longer used for numeric settings in this panel.

### `ParamBar`: the new control

One 28px bar, all of it the grab target:

```
[ NAME     ▮▮▮▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯     2.40 ]
  58px     32 segments (flex)                   40px
```

- **Frame:** 1px `--border`, background `--bg-surface`, 2px radius, padding 3px 4px, items in a row with a 5px gap.
- **Name:**
  - 58px wide, 11px uppercase with letter-spacing .1em, colour `--text-secondary`;
  - ellipsized only as a last resort, since registry labels are already 3 to 7 characters.
- **Segments:** 32 equal cells with 2px gaps that fill the space between name and value.
  - Unlit: `oklch(0.245 0.007 270)`.
  - Lit: `oklch(0.56 0.008 270)`.
  - Segment *k* is lit when its centre is at or below the value's position (0 to 100%).
  - **No exact-value line.** The number gives the exact value.
- **Bipolar settings** (min below 0): segments light outwards from the centre towards the value. The centre cell, when unlit, uses `oklch(0.48 0.008 270)` as a zero marker.
- **Integer settings with 32 or fewer distinct values** (for example, 1 to 8): the segment count equals the number of values, so every segment is one value. Larger integer ranges use 32 segments and snap to `step`.
- **Value:** 40px, right-aligned, 12px, tabular numerals, `--text-primary`. Formatting matches the knob's: integers as-is, small decimals as `.85`, and so on.
- **States:**

  | State | Look |
  |---|---|
  | Hover | Frame `--border-emphasis` |
  | Dragging | Frame `--text-secondary` |
  | Focused (keyboard) | 1px `--text-primary` outline at -1px offset |
  | p-lock target | Frame in the effect's colour, plus an 8% tint of that colour |
  | Assignment mode | Dashed 1px frame in the assigning source's colour, on every bar and knob |
  | Modulated | Segments inside the modulated range (value ± depth × range) blend with the first source's colour: 40% unlit, 70% lit. A 6×6 square in the source colour sits on the top-right corner, one per source, up to 3. |

**Contrast.** The name and value must be at least 4.5:1 on `--bg-surface`; both tokens already pass. Lit segments are graphics and need at least 3:1 against the unlit ones.

### Interaction (identical on bars and knobs)

| Input | Effect |
|---|---|
| Drag horizontally (bar) or vertically (knob), past a 3px threshold | Changes the value, relative to the start; never jumps to the pointer. Full range in about 200px. Shift slows it by 10×. Updates are rAF-throttled. |
| Click without dragging | Toggles this setting as the p-lock automation target. Same as today's `onTap` and `Knob`. |
| Double-click | Resets to the midpoint of the range, as today's blocks do. The registry has no defaults. |
| Right-click | `ModulationContextMenu`, unchanged. |
| Click or drag in assignment mode | Routes the assigning source. Dragging vertically sets the depth (-1 to 1), as `Knob` does today. Release commits the route, or updates its depth if the route already exists. |
| Drop of a `modulation-source` or `sequencer-track` drag | Routes it, as `Knob` does today. |
| Keyboard (focused) | Left/Right or Down/Up step by `step`; with Shift, by `step × 10`. Home/End go to min/max. The control has `role="slider"`, `aria-valuemin/max/now`, `aria-valuetext` and `aria-label` set to the setting name. |

### Shared behaviour: `useParamControl`

Pull everything except rendering out of `Knob.tsx` into a hook, `src/hooks/useParamControl.ts`:
- drag;
- p-lock targeting;
- assignment mode with depth drag;
- drop routing;
- routing lookup and source info;
- the context menu state;
- status-bar hover text.

`Knob` and `ParamBar` both use the hook, so the behaviour cannot drift between them. The hook takes `{ paramId, label, value, min, max, step, onChange, axis: 'x' | 'y' }` and returns:
- pointer, drag and keyboard handlers;
- the state flags (`isDragging`, `isAutomationTarget`, `isInAssignmentMode`, `assigningColor`, `routings`, `sourceInfo`, `depthDragDisplay`);
- the context menu position.

`Knob`'s public props do not change, so its other users (TrackAudioReactivePanel, ModulationContent, LFOEditorPanel, TrackParamPanel, …) keep working unchanged.

### Performance

Settings render inside `ChainSettings`, which is memoised and keyed by the selected effect.
- Each `ParamBar` is `React.memo`.
- It reads its live value with a new `useParamValue(param)` hook. Today `BlockParameters` subscribes to all ~16 effect stores whole, so every tick re-renders the whole panel. The hook instead uses `useSyncExternalStore`: subscribe goes to every effect store, and `getSnapshot` is `param.read()`. The snapshot is a number, so React re-renders only the control whose value actually changed. Registry `read()` functions can stay as they are.
- Routing state uses selectors filtered to its `paramId`. The bare `useSequencerStore()` call in today's `Knob` is replaced with selectors.

A param tick must re-render only the bar or knob whose value changed.

### Cleanup

- Delete `CompactEffectParams.tsx` and `ExpandedParameterPanel.tsx` (v1). Neither is rendered.
- Delete any of the numeric block components (`ParamBlock`, `DragNumberBlock`, `ArcBlock`, `VerticalFaderBlock`, `RulerBlock`, `ButtonRowBlock`, `BipolarBlock`) that end up unreferenced, along with `classifyParam`/`classifySection` if they end up unreferenced too.
- Keep `ToggleBlock`, `SelectBlock`, `ColorBlock` and `EffectHeaderBlock`.
- Update `CLAUDE.md`'s "Adding New Effect Pages/Effects" list:
  - remove the CompactEffectParams and ExpandedParameterPanel steps;
  - state that the registry entry (`src/config/effectParams.ts`) drives the settings panel;
  - state that its first four params form the knob strip.

## Behaviour that must not change

- p-lock recording and playback.
- Modulation routings created anywhere else, which must display on the new controls.
- The right-click modulation menu.
- `Knob` everywhere else in the app.
- Audio bands.
- Presets and banks.
- The chain panel's selection, reorder and remove.

## Testing and verification

Puppeteer scripts under `.superpowers/sdd/` (gitignored), plus `npm run build` and eslint with no new problems in changed files.

1. **Regression first.** With an effect selected:
   - start assigning LFO 1 from the modulation panel, click a bar and a strip knob, and assert that a routing exists for each `paramId`;
   - repeat with drag-and-drop of a modulation source.

   This test fails on master today.
2. **Rendering.** For POINT CLOUD (13 settings) the panel shows 4 knobs and 9 bars, each bar with 32 segments. For an effect with an integer setting of 8 values, that bar shows 8 segments. Bipolar ROT.X lights from the centre.
3. **Interaction.**
   - Dragging a bar 100px changes the value by about half its range, and Shift-drag by about a twentieth.
   - Clicking toggles the p-lock target.
   - Double-click resets.
   - Arrow keys step.
   - Every assertion is read back from the store.
4. **Modulation display.** With LFO 1 routed to a bar at depth 0.3, the segments inside the range carry the LFO colour and the corner marker is present.
5. **Re-renders.** During 2 seconds of LFO modulation on one setting, only that control re-renders, measured with a temporary counter.
6. **No regressions.** Re-run the layout checks (`chain`, `shell`), `seg-verify wiring`, and `bands-check ui/gate/mod`.
7. **Screenshots** of POINT CLOUD and SEG_EXP's VOXEL at 1440×900 and 960×1200, set beside `final.png` for human review before merge.

## Out of scope

- A per-effect hand-picked macro strip.
- Changing which settings exist, or their ranges.
- Redesigning `Knob`'s visuals.
- The select, toggle and colour extras beyond tokens.
- The audio-band panel.
