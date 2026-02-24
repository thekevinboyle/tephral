# Effect Launcher Grid

## Problem

The timeline clip compositor is designed for pre-arranged sequences. For live VJ performance, you need a way to sequence effects on-the-fly — triggering individual effects with saved parameter states, cycling through them in time with the music. Think APC40 clip launcher, but for video effects.

## Design Decisions

- **New view, not a new mode** — replaces the timeline compositor in SEQ mode via a view toggle. No changes to the existing effects grid or FX mode.
- **One cell active at a time** — sequential effect cycling, not layered. Active cell's effect is enabled on the pipeline, previous cell's effect is disabled.
- **Audio drives cycling speed, not parameters** — audio reactivity controls when to advance to the next cell. Effect parameters within each cell are static snapshots.
- **Uses existing effects** — each cell references an effect from the current system (RGB Split, Pixelate, Feedback, etc.) with saved parameter values. No new effect types.

## Data Model

### Launcher Cell

```typescript
interface LauncherCell {
  effectId: string        // references existing effect (e.g. 'rgbSplit', 'pixelate')
  params: Record<string, number>  // saved parameter values for that effect
}
```

### Grid State

```typescript
interface EffectLauncherState {
  // Grid
  cells: (LauncherCell | null)[]  // 16 slots (4x4), null = empty
  activeIndex: number | null       // currently playing cell
  selectedIndex: number | null     // cell selected for editing

  // Playback
  isPlaying: boolean
  cycleMode: 'speed' | 'selection' | 'combined'

  // Audio trigger config
  triggerBand: 'sub' | 'kick' | 'mid' | 'high' | 'all'
  threshold: number          // 0-1, energy level that triggers advance
  holdTime: number           // ms, minimum time between advances (anti-double-trigger)
  fallbackRate: number       // BPM, used when no audio is loaded
}
```

### Cycling Modes

**Speed (default)** — Audio controls how fast effects cycle. Selected frequency band's energy is compared against threshold each frame. When it crosses the threshold, advance to the next non-empty cell. Without audio, falls back to steady BPM-based rate.

**Selection** — Audio energy maps to a cell index instead of sequential advancement. Low energy = early cells, high energy = later cells. Threshold still applies as a minimum energy floor.

**Combined** — Audio triggers advancement (like speed mode), but energy level biases which cell to jump to rather than strict left→right order.

## UI Layout

### Grid Area (replaces timeline strip)

4x4 grid of cells. Each cell shows:
- Effect label and color from effects config when populated
- Bright highlight border on the currently active cell
- Dim outline for empty cells
- Click to select for editing, double-click to clear

### Transport Bar (above grid)

- **Play/Stop** toggle
- **Mode** selector — Speed / Selection / Combined
- **Band** selector — Sub / Kick / Mid / High / All
- **Threshold** knob — energy level that triggers advance
- **Hold** knob — minimum ms between advances
- **Rate** knob — fallback BPM when no audio loaded

### Cell Editor (inline or side panel when a cell is selected)

- **Effect picker** — dropdown listing all existing effects
- **Parameter controls** — knobs/sliders for the selected effect's params (reuses existing `CompactEffectParams` components)
- **Copy / Paste / Clear** actions

## Playback Behavior

### Sequencing

1. Walk non-empty cells left→right, top→bottom
2. When a cell activates: enable its effect on the pipeline with saved params
3. When the next cell activates: disable previous effect, enable new one
4. Loop back to first non-empty cell after the last one

### Audio-Driven Cycling

Each frame:
1. Read selected band value from `audioReactiveStore` (sub/mid/high/hit)
2. If `triggerBand === 'all'`, use combined amplitude from `audioSourceStore`
3. Compare against `threshold`
4. If energy crosses threshold AND hold time has elapsed since last advance → advance
5. No audio context active → use `fallbackRate` as a steady clock

### Edge Cases

- Zero populated cells → nothing happens, play is a no-op
- One populated cell → that effect stays on, no cycling
- User edits currently active cell → params update live on pipeline
- Stop → disables current cell's effect, returns pipeline to manual state
- Switching from timeline view to launcher view → stops timeline playback first

## Implementation

### New Files

**`src/stores/effectLauncherStore.ts`**

Zustand store with the state described above. Actions:
- `setCell(index, effectId, params)` — populate a cell
- `clearCell(index)` — empty a cell
- `selectCell(index)` — select for editing
- `play()` / `stop()` — start/stop cycling
- `advance()` — move to next non-empty cell
- `jumpTo(index)` — jump to specific cell (for selection mode)
- `setThreshold(value)`, `setHoldTime(value)`, `setFallbackRate(value)`
- `setCycleMode(mode)`, `setTriggerBand(band)`

**`src/hooks/useEffectLauncher.ts`**

The cycling engine. Runs a `requestAnimationFrame` loop when playing:
- Reads band energy from `audioReactiveStore`
- Compares against threshold with hold time enforcement
- Calls `advance()` or `jumpTo()` depending on cycle mode
- On advance: looks up previous cell's `effectId`, disables it via the appropriate store setter (same pattern as `useEffectDisable`). Then looks up new cell's `effectId`, enables it and applies saved params.
- Falls back to timer-based BPM clock when no audio context

**`src/components/performance/EffectLauncherGrid.tsx`**

The grid UI component:
- 4x4 CSS grid of cell buttons
- Each cell reads from `effectLauncherStore.cells[index]`
- Renders effect label + color dot when populated, dim outline when empty
- Active cell gets bright accent border
- Selected cell gets distinct selection border
- Click handler calls `selectCell()`, double-click calls `clearCell()`

**`src/components/performance/LauncherCellEditor.tsx`**

Cell configuration panel:
- Effect picker dropdown (populated from all effects arrays in config)
- When an effect is selected, shows its parameter controls
- Reuses existing knob/slider components from `CompactEffectParams`
- Copy/paste buttons that read/write cell data
- Clear button

### Modified Files

**`src/components/sequencer/SequencerContainer.tsx`**

Add view toggle between timeline and launcher:
- Reads `uiStore.sequencerView`
- Renders `TimelinePanel` when `'timeline'`, `EffectLauncherGrid` when `'launcher'`
- View toggle button in the container header

**`src/stores/uiStore.ts`**

Add `sequencerView: 'timeline' | 'launcher'` state with setter. Defaults to `'timeline'`.

## What Stays the Same

- All existing effect stores, configs, and pipeline — untouched
- PerformanceGrid (FX mode) — completely unaffected
- Timeline clip sequencer — still available via view toggle
- Modulation system (LFOs, etc.) — independent, continues running
- Audio analysis hooks — read-only consumers, no changes needed
- Single mode (`appMode === 'single'`) — unaffected
