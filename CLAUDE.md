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

### 3. Performance Grid (`src/components/performance/PerformanceGrid.tsx`)
- Import the new store (e.g., `useMotionStore`, `useTrendStore`)
- Add store hook call
- Add cases to `getEffectState()` for each new effect
- Add case to `pageHasActiveEffects()` for new page
- Update navigation button max page index

### 4. Active Effects Hook (`src/hooks/useActiveEffects.ts`)
- Import the new store
- Add enabled check and `activeEffects.push()` for each new effect
- Include primaryValue/primaryLabel (shown on the chain row)

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
- The registry entry drives the chain panel's settings: its first four numeric params form the knob strip, the rest render as segmented bars, and 0/1 integer params render as toggles. Selects come from `getSelectParams`; bespoke colour/texture controls live in `BlockExtras`.
- If the effect uses a NEW store, add it to the `STORES` list in `src/hooks/useParamValue.ts`, or its bars and knobs won't update.

### 10. Continuous Modulation (`src/hooks/useContinuousModulation.ts`)
- Add a `case '<effectId>'` mapping 0–1 modulation values onto each param's real range.

### Presets/banks
- New stores need a `<store>?: Snapshot` key on `BankSnapshot` (`src/stores/bankStore.ts`) plus
  capture/apply lines in both `bankStore.ts` and `presetLibraryStore.ts`; `applySnapshot(undefined)`
  must reset to defaults so older banks load cleanly.

## Architecture

### Layout Shell (`src/components/performance/PerformanceLayout.tsx` + `layout.css`)
`.seg-shell` is a CSS grid whose children carry `data-area`: `header`, `effects`, `stage`, `chain`, `dock`, `status`.
- **Laptop (1100-2199px)**: effects | stage | chain across the middle, dock spans the bottom (content-sized, capped at 34vh; 50vh while a modulation tab is open).
- **Ultrawide (>= 2200px)**: the dock becomes a fourth, full-height right-hand column.
- **Narrow (< 1100px)**: the page scrolls; stage first, then effects and chain side by side, then the dock.
- `PerformanceLayout` re-renders every engine tick, so `HeaderBar`, `EffectsColumn`, `StageArea`, `ChainPanel` and `Dock` are `React.memo`. Keep their props stable and their store selectors narrow.

### Header (`src/components/performance/HeaderBar.tsx`)
VIDEO/AUDIO source menus (portalled, `position: fixed`), the preset picker, and REC (`useRecordingControl`, red `--rec` token).

### Effects Column (`src/components/performance/EffectsColumn.tsx`)
Left column: page tabs + effect grid (`PerformanceGrid`), bank slots, crossfader, then the preset library.

### Stage (`src/components/performance/StageArea.tsx`)
Aspect-locked output frame that fits the free space, with corner ticks, ruler, ClipBin and four HUD readouts (`StageReadouts`): LIVE/REC + FPS, preset name (or bank), timecode, active band. The frame is a container; under 380px the readouts re-stack.

### Chain Panel (`src/components/performance/ChainPanel.tsx`)
Right column: the effect chain in signal order. Rows handle selection, drag (and Alt+Arrow) reorder, per-effect bypass (button or shift+click), remove (button, Delete, double-click), clear-all and bypass-all. It owns `ensureTrack` and auto-select for active effects. Below the rows it shows the selected effect's settings (rendered by `EffectSettings`: a knob strip plus segmented `ParamBar`s, with `useParamControl` supplying the shared drag, p-lock, reset, context-menu and modulation-drop behaviour; `BlockExtras` in `EffectExtras.tsx` adds colour/texture extras) and audio band.

### Dock (`src/components/performance/Dock.tsx`)
Sequencer (`SequencerContainer` > `UnifiedSequencerPanel`, whose track list is the only scroller) above the modulation tabs (`BottomPanel`: LFO, Random, Step, Env, S&H, MIDI, Audio).

Effect params flow through `src/effects/paramSync.ts` (zustand subscribe → uniform writes); Canvas.tsx's structural effect only rebuilds the pass chain on enable/disable/reorder.

## Common Issues

### Page navigation doesn't reach new pages
Check `uiStore.ts` - the `setGridPage`, `nextGridPage`, `prevGridPage` functions have hardcoded max values.

### Effects don't appear in grid
Check `getEffectsForPage()` returns the right array and `pageHasActiveEffects()` includes the new page.

### Effects don't appear in the chain
Check `useActiveEffects.ts` has the enabled check for the new effect, and the effect ID is in `routingStore.defaultEffectOrder`.

### Remove button doesn't work on a chain row
Check `useEffectDisable.ts` has a case for the effect ID mapping to the correct store setter.
