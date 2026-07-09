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
- Include primaryValue/primaryLabel for card display

### 5. Effect Disable Hook (`src/hooks/useEffectDisable.ts`)
- Add case to the switch statement mapping effectId to store setter

### 6. Compact Effect Params (`src/components/performance/CompactEffectParams.tsx`)
- Add a switch case with 2-3 Knob components for the most important parameters
- Uses the same store hooks as the full parameters

### 7. Canvas (`src/components/Canvas.tsx`) + Param Sync (`src/effects/paramSync.ts`)
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

### 8. Effect Pipeline (`src/effects/EffectPipeline.ts`)
- Import new effect classes
- Add effect instance properties
- Initialize effects in constructor
- Add to `getEffectById()` switch
- Add to `updateEffects()` config type and enabledMap
- Add to `dispose()` cleanup
- If temporal effect: add to `render()` captureFrame calls

### 9. Expanded Parameter Panel (`src/components/performance/ExpandedParameterPanel.tsx`)
- Import the new store and effects config
- Add store hook call to `EffectParameters`
- Add effect lookup to include new effects array
- Add switch cases with full parameter controls (SliderRow, SelectRow, etc.)

### 10. Routing Store (`src/stores/routingStore.ts`)
- Import new effects array
- Include in `defaultEffectOrder`

## Architecture

### Effect Card Stack (`src/components/performance/EffectCardStack.tsx`)
The left column shows a vertically scrolling stack of effect cards. Each card has:
- **Compact mode**: LED + label + 2-3 inline knobs + bypass + remove
- **Full mode**: Header + full parameter controls (reuses `EffectParameters` from ExpandedParameterPanel)
- Drag-and-drop reordering updates `routingStore.effectOrder`
- View mode toggle (compact/full) stored in `uiStore.cardViewMode`

### Effects Lane (`src/components/performance/EffectsLane.tsx`)
The right column shows only the Modulation panel (LFO, Random, Step, Envelope, S&H).

Effect params flow through `src/effects/paramSync.ts` (zustand subscribe → uniform writes); Canvas.tsx's structural effect only rebuilds the pass chain on enable/disable/reorder.

## Common Issues

### Page navigation doesn't reach new pages
Check `uiStore.ts` - the `setGridPage`, `nextGridPage`, `prevGridPage` functions have hardcoded max values.

### Effects don't appear in grid
Check `getEffectsForPage()` returns the right array and `pageHasActiveEffects()` includes the new page.

### Effects don't appear in card stack
Check `useActiveEffects.ts` has the enabled check for the new effect, and the effect ID is in `routingStore.defaultEffectOrder`.

### Remove button doesn't work on a card
Check `useEffectDisable.ts` has a case for the effect ID mapping to the correct store setter.
