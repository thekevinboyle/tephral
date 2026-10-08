# Strand Tracer - Development Notes

## Adding New Effect Pages/Effects

When adding a new effect page or new effects, you MUST update ALL of the following locations:

### 1. Effects Config (`src/config/effects.ts`)
- Add effect definitions to appropriate array (EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, etc.)
- Update `PAGE_NAMES` array if adding a new page
- Update `getEffectsForPage()` if adding a new effects array

### 2. UI Store (`src/stores/uiStore.ts`)
- Update `setGridPage` max value to include new page index
- Update `nextGridPage` max value
- Example: `Math.min(5, page)` for 6 pages (0-5)

### 3. Active and toggle logic (`EFFECT_ENTRIES` in `src/hooks/useEffectToggle.ts`)
- Add an `EFFECT_ENTRIES[effectId]` entry with `active()` (read the enabled flag) and `toggle(effectId)` (call `moveToEndOfChain` when turning on, then flip the store's setter).
  The pad grid, the browser list and the device chain all read it; `PerformanceGrid.tsx` needs no store imports.
- If the effect uses a NEW store, add it to `ENABLE_STORES` in the same file so `useEnabledEffectIds` / `useChainIds` re-render when it flips.
- An effect with a lane but no pad (like `track_face` or the overlays) goes in `EXTRA_IDS` there, so it still gets a device card.
- Update `PerformanceGrid.tsx` only for a NEW page: `pageHasActiveEffects()` and the navigation button max page index.

### 4. Active Effects Hook (`src/hooks/useActiveEffects.ts`)
- Import the new store
- Add enabled check and `activeEffects.push()` for each new effect
- Include primaryValue/primaryLabel

### 5. Effect Disable Hook (`src/hooks/useEffectDisable.ts`)
- Add case to the switch statement mapping effectId to store setter

### 6. Canvas (`src/components/Canvas.tsx`) + Param Sync (`src/effects/paramSync.ts`)
Enabled flags/order and per-frame params are split across two files:
- **Canvas.tsx's structural effect**: import the new store (e.g.
  `useMotionStore`, `useTrendStore`), subscribe to its *enabled* state only,
  pass to `pipeline.updateEffects()`. This effect should only re-run on
  enable/disable/reorder — not on every param change.
- **paramSync.ts**: add the effect's params to (or add a new) `push*()`
  function that calls `pipeline.<effect>?.updateParams(...)`, call it once
  in the initial push list, and add a reference-equality slice check for
  its store slot to the matching `subscribe()` callback (or add a new
  `store.subscribe()` entry) so the uniform updates on every param change
  without going through React.

### 7. Effect Pipeline (`src/effects/EffectPipeline.ts`)
- Import new effect classes
- Add effect instance properties
- Initialize effects in constructor
- Add to `getEffectById()` switch
- Add to `updateEffects()` config type and enabledMap
- Add to `dispose()` cleanup
- If temporal effect: add to `render()` captureFrame calls

### 8. Routing Store (`src/stores/routingStore.ts`)
- `defaultEffectOrder` is built from `EFFECTS`, `STRAND_EFFECTS`, `MOTION_EFFECTS` and `DESTRUCTION_EFFECTS`.
  Effects added to one of those existing arrays need no edit here.
- Only a NEW effects array (a new page) must be imported and spread into `defaultEffectOrder`.

### 9. Param Registry (`src/config/effectParams.ts`)
- Add an `EFFECT_PARAM_REGISTRY` entry (getParams, optional getSelectParams, setEnabled, getEnabled).
  Param locks are driven from this registry.
- The registry entry drives the device card and the inspector: the first four numeric params become the device-card dials and the inspector "Main" bars, the rest render as "More" bars, and 0/1 integer params render as toggles. Selects come from `getSelectParams`; bespoke colour/texture controls live in `BlockExtras`.

### 10. Continuous Modulation (`src/hooks/useContinuousModulation.ts`)
- Add a `case '<effectId>'` mapping 0–1 modulation values onto each param's real range.

### 11. Names and descriptions (`EFFECT_DESCRIPTIONS` in `src/config/statusDescriptions.ts`)
- Add `<effectId>: 'Full Name: one-line description'`. `src/config/effectNames.ts` reads it for the device card, browser and inspector names, so no short codes appear in the UI.
- An effect with no `src/config/effects.ts` entry also needs a colour in `EXTRA_COLORS` in `effectNames.ts`.

### 12. Param display names (`src/config/paramNames.ts`)
- Give params a readable name (`PARAM_NAME_OVERRIDES`, `<effectId>.<paramId>`) and, where a shared code means something different, a hover text (`PARAM_DESCRIPTION_OVERRIDES`). Dial names are at most 10 characters.

### 13. Live param values (`STORES` in `src/hooks/useParamValue.ts`)
- If the effect uses a NEW store, add it to `STORES`, or its bars and dials won't update.

### Presets/banks
- New stores need a `<store>?: Snapshot` key on `BankSnapshot` (`src/stores/bankStore.ts`) plus
  capture/apply lines in both `bankStore.ts` and `presetLibraryStore.ts`; `applySnapshot(undefined)`
  must reset to defaults so older banks load cleanly.

## Architecture

### Layout Shell (`src/components/performance/PerformanceLayout.tsx` + `layout.css`)
`.seg-shell` is a CSS grid whose children carry `data-area`: `header`, `browser`, `stage`, `inspector`, `bottom`, `footer`. Footer toggles show or hide the browser, inspector and bottom panel (hidden by CSS, never unmounted, so the canvas is never remounted).
- **Sizes**: header 44px, footer 30px. Browser 250px / inspector 300px, and 300px / 340px at ≥2200px. Bottom panel 172px on Devices; on Sequencer it follows the content up to 40vh.
- **Narrow (< 1100px)**: the browser and inspector become drawers over the stage (one at a time).
- `PerformanceLayout` re-renders every engine tick, so `HeaderBar`, `EffectBrowser`, `StageArea`, `Inspector` and `BottomPanel2` are `React.memo`. Keep their props stable and their store selectors narrow.

### Header (`src/components/performance/HeaderBar.tsx`)
VIDEO/AUDIO source menus (portalled, `position: fixed`), the preset picker, and REC (`useRecordingControl`, red `--rec` token).

### Stage (`src/components/performance/StageArea.tsx`)
Aspect-locked output frame that fits the free space, with corner ticks, ruler, ClipBin and four HUD readouts (`StageReadouts`): LIVE/REC + FPS, preset name (or bank), timecode, active band. The frame is a container; under 380px the readouts re-stack.

### Browser (`src/components/performance/EffectBrowser.tsx`)
Left panel: every effect by category with its full name and description (`src/config/effectNames.ts`), a search box, and List/Pads views. Clicking a row adds the effect to the end of the chain (or removes it).

### Inspector (`src/components/performance/Inspector.tsx`)
Right panel, contextual on `uiStore`. Its root carries `data-inspector-mode`:
- `effect` (a device is selected): header (colour, full name, "· 3 of 5 in chain", Bypass), then `EffectSettings` (every numeric param as a `ParamBar`, in "Main" and "More" sections, with `useParamControl` supplying drag, p-lock, reset, context menu and modulation drop), then the Modulation list (`[data-inspector-routes]`: routes whose `targetParam` starts with `${effectId}.`, named via `resolveRoutingSource`, × removes), then the audio band (`TrackAudioReactivePanel`).
- `modulator` (a slot in the Modulators card is selected): that modulator's editor. LFO slots open `ModulationAssignPanel` on that LFO (`selectedLFOIndex`); Random/Step/Envelope/S&H/MIDI use `ModulationContent` (`sampleHold` maps to `sh`); Audio shows `TrackAudioReactivePanel` with a device picker; Warp shows the mini line, Amount and "Open Warp tab".
- `empty`: "Select a device or modulator to edit it."

### Device chain (`src/components/performance/BottomPanel2.tsx`, `DeviceChain.tsx`, `DeviceCard.tsx`, `ModulatorsCard.tsx`, `WarpCard.tsx`)
Bottom panel with Devices, Warp and Sequencer tabs (all stay mounted; the title reads "Chain", "Warp" or "Sequencer"). Devices: the Modulators card (● arms routing, then click or drag any control), then the Time warp card (`WarpCard`: dimmed "+ Time warp" slot when off; power, mini line and Amount when on; clicking it opens the Warp tab without changing the device selection; it is not an effect, so it is outside `EFFECT_ENTRIES`, reorder and drag), then one card per active effect in signal order with 4 dials and a Dry/wet bar (`effectMix`; a modulation target `<effectId>.effectMix`, written through `setEffectMix`). `DeviceChain` owns `ensureTrack`, drag/keyboard reorder, bypass, remove, and selection: it auto-selects a device unless a modulator is selected, and when the selected device is removed it selects the next device (else the previous, else none). Sequencer: `SequencerContainer` > `UnifiedSequencerPanel`.

### Time warp (`src/effects/warp/*`, `public/worklets/warp-processor.js`, `src/stores/warpStore.ts`, `src/components/performance/warp/*`, `WarpCard`)
Files: `src/effects/warp/` holds warpMath, warpClock, audioWarp, WarpFrameBuffer, WarpCompositor, warpShaders and warpRegistry; the worklet is `public/worklets/warp-processor.js`; state is `warpStore`; the editor is the Warp tab (`components/performance/warp/*`); the chain card is `WarpCard`.
- **Time model**: the line y = f(x) is the read position within a loop; the delay is `delay = ((x′ − y′) mod 1)·L` (x′ is the skewed phase); delay is capped at 8 s.
- **Position**: the warp sits on the source BEFORE the effect chain, so chain effects process the warped picture.
- **Audio**: warped through an AudioWorklet; the analysers (and so the audio bands) sit after it.
- **Clock**: video and audio read one shared clock (`warpClock`), so they report the same phase.
- **Bypass guarantee**: off means no frame capture, no GPU pass and no worklet node; output is bit-identical to no warp. Switching off on a live graph fades the warped sound out over about 20 ms, then restores the direct audio connections.
- **Modulation source**: the gold Warp slot (`trackId 'warp'`) routes the line's height at the heard playhead (`warpModValue`). `useContinuousModulation` computes it once per frame, only when a route uses it, whether or not the warp effect is on.
- **Saved as** `warp` in `BankSnapshot` and in presets; `applySnapshot(undefined)` resets to defaults (off), and factory presets such as SEG_EXP leave it off.

Effect params flow through `src/effects/paramSync.ts` (zustand subscribe → uniform writes); Canvas.tsx's structural effect only rebuilds the pass chain on enable/disable/reorder.

## Common Issues

### Page navigation doesn't reach new pages
Check `uiStore.ts` - the `setGridPage`, `nextGridPage`, `prevGridPage` functions have hardcoded max values.

### Effects don't appear in grid
Check `getEffectsForPage()` returns the right array and `pageHasActiveEffects()` includes the new page.

### Effects don't appear in the device chain
Check `isEffectActive` in `useEffectToggle.ts` (what `useChainIds` reads) and `useActiveEffects.ts` both have the enabled check for the new effect, and the effect ID is in `routingStore.defaultEffectOrder`.

### Remove button doesn't work on a device card
Check `useEffectDisable.ts` has a case for the effect ID mapping to the correct store setter.
