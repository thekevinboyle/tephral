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
- Import the new store (e.g., `useMotionStore`)
- Add store hook call
- Add cases to `getEffectState()` for each new effect
- Add case to `pageHasActiveEffects()` for new page
- Update navigation button max page index

### 4. Parameter Panel (`src/components/performance/ParameterPanel.tsx`)
- Import the new store
- Add store hook call
- Add new effects to `handleClear()` function
- Add effect sections with visualizers and params (the cards in the lane)
- Add cases to `disableEffect()` function (for X button on cards)
- Update dependency arrays for `handleClear` and `disableEffect`

### 5. Canvas (`src/components/Canvas.tsx`)
- Import the new store
- Subscribe to enabled states and params
- Pass to `pipeline.updateEffects()`
- Sync effect params with `pipeline.effect?.updateParams()`
- Add to useEffect dependency array

### 6. Effect Pipeline (`src/effects/EffectPipeline.ts`)
- Import new effect classes
- Add effect instance properties
- Initialize effects in constructor
- Add to `getEffectById()` switch
- Add to `updateEffects()` config type and enabledMap
- Add to `dispose()` cleanup
- If temporal effect: add to `render()` captureFrame calls

### 7. Expanded Parameter Panel (`src/components/performance/ExpandedParameterPanel.tsx`)
- Import the new store and effects config
- Add store hook call to `EffectParameters`
- Add effect lookup to include new effects array
- Add switch cases with parameter controls

### 8. Routing Store (`src/stores/routingStore.ts`)
- Import new effects array
- Include in `defaultEffectOrder`

## Common Issues

### Clear/Bypass buttons stop working (not calling handlers)
The `handleClear()` function in `ParameterPanel.tsx` must include all effect stores. When adding new effects, add their disable calls to the `handleClear` callback.

### Clear/Bypass buttons not clickable (z-index/overlay issue)
If buttons appear but don't respond to clicks (especially if they work when dev tools is open), check for:
1. Elements with `fixed inset-0` or `absolute inset-0` without `pointer-events-none`
2. The ControlButtons container in `ParameterPanel.tsx` has `position: relative` and `zIndex: 20` to ensure it stays clickable above any overlapping elements
3. Modals/dropdowns that might not be properly hidden when closed

### Page navigation doesn't reach new pages
Check `uiStore.ts` - the `setGridPage`, `nextGridPage`, `prevGridPage` functions have hardcoded max values.

### Effects don't appear in grid
Check `getEffectsForPage()` returns the right array and `pageHasActiveEffects()` includes the new page.
