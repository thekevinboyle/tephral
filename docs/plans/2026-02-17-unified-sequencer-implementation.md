# Unified Sequencer Panel — Implementation Plan

Design: `docs/plans/2026-02-17-unified-sequencer-panel-design.md`

## Phase 1: Extract Reusable Pieces

### Step 1.1: Extract `SequencerTransport` from `EffectSequencer.tsx`

**File:** `src/components/sequencer/SequencerTransport.tsx` (NEW)

Extract the transport bar section (lines 116-223 of `EffectSequencer.tsx`) into its own component. It contains: play/stop button, BPM drag, resolution cycle, swing drag, step position, page dots.

```typescript
interface SequencerTransportProps {
  isPlaying: boolean
  bpm: number
  resolution: string
  swing: number
  currentStep: number
  stepPage: number
  onPlay: () => void
  onStop: () => void
  onBpmChange: (bpm: number) => void
  onResolutionCycle: () => void
  onSwingChange: (swing: number) => void
  onPageChange: (page: number) => void
}
```

Copy the BPM drag handler, swing drag handler, and resolution cycle logic into the component. The transport renders as a thin horizontal flex row.

### Step 1.2: Extract `ModulationPanel` from `EffectsLane.tsx`

**File:** `src/components/sequencer/ModulationContent.tsx` (NEW)

Extract the `ModulationPanel` function (lines 235-580 of `EffectsLane.tsx`) along with its helper components (`ModSlider`, `ModSelect`, `ModRateSelect`, `ModulatorSection`) and constants (`RATE_OPTIONS`, `divisionToHz`, `hzToClosestOption`) into a standalone file.

Export as `ModulationContent` — the same JSX currently rendered by `ModulationPanel`, but as an independent component that can be used in both `EffectsLane` and the unified panel.

Update `EffectsLane.tsx` to import from the new file instead of defining inline.

---

## Phase 2: Build New Components

### Step 2.1: Create `EffectTabsBar`

**File:** `src/components/sequencer/EffectTabsBar.tsx` (NEW)

Horizontal scrollable row of active effect tabs. Each tab shows:
- Effect color dot (3px tall bottom border in effect color when selected)
- Effect label in uppercase 9px text
- Colored when selected, ghost text when not

```typescript
interface EffectTabsBarProps {
  activeEffectIds: string[]          // from effectOrder filtered to enabled
  selectedEffectId: string | null
  onSelect: (effectId: string) => void
}
```

Uses the `EFFECT_MAP` pattern (build from all effect definition arrays) to look up labels and colors. The bar has `overflow-x: auto` with hidden scrollbar for horizontal scrolling when many effects are active. Height: ~28px.

Styling: `var(--bg-surface)` background, bottom border `var(--border)`. Selected tab: elevated background, colored bottom-border, colored text. Unselected: transparent background, ghost text.

### Step 2.2: Create `ModTabsBar`

**File:** `src/components/sequencer/ModTabsBar.tsx` (NEW)

Horizontal row of modulation source buttons. Five tabs:

```typescript
const MOD_SOURCES = [
  { id: 'lfo', label: 'LFO', color: '#00D4FF' },
  { id: 'random', label: 'Random', color: '#FF6B6B' },
  { id: 'step', label: 'Step', color: '#4ECDC4' },
  { id: 'envelope', label: 'Envelope', color: '#AA55FF' },
  { id: 'sh', label: 'S&H', color: '#AAFF00' },
] as const

type ParamView = 'effect' | 'lfo' | 'random' | 'step' | 'envelope' | 'sh'

interface ModTabsBarProps {
  activeView: ParamView
  onSelectMod: (view: ParamView) => void
}
```

Each button: 9px uppercase label. When active: colored background tint + colored text. When inactive: ghost text, transparent background. Clicking an already-active mod tab deselects it (sets view back to `'effect'`).

Compact row, same height as transport (~28px). Border top and bottom `var(--border)`.

### Step 2.3: Create `UnifiedSequencerPanel`

**File:** `src/components/sequencer/UnifiedSequencerPanel.tsx` (NEW)

The main container composing all zones. Vertical flex column filling the parent.

```typescript
export function UnifiedSequencerPanel() {
  // Local state for param view switching
  const [paramView, setParamView] = useState<ParamView>('effect')

  // Store hooks
  const { selectedEffectId, setSelectedEffect } = useUIStore()
  const effectOrder = useRoutingStore((s) => s.effectOrder)
  const tracks = useEffectSequencerStore((s) => s.tracks)
  // ... other sequencer state

  // Active effects = effectOrder filtered to enabled (same logic as EffectSequencer)
  const activeEffectIds = useMemo(() => {
    return effectOrder.filter((id) => {
      const entry = EFFECT_PARAM_REGISTRY[id]
      return entry ? entry.getEnabled() : false
    })
  }, [effectOrder, tracks])

  // When an effect tab is clicked, switch param view back to 'effect'
  const handleEffectTabSelect = (effectId: string) => {
    setSelectedEffect(effectId)
    setParamView('effect')
  }

  // When a mod tab is clicked, toggle it
  const handleModSelect = (view: ParamView) => {
    setParamView(paramView === view ? 'effect' : view)
  }
}
```

**Layout (top to bottom):**

```
<div className="flex flex-col h-full">
  {/* Zone 1: Effect tabs */}
  <EffectTabsBar flex-shrink-0 />

  {/* Zone 2: Param area — scrollable */}
  <div flex-shrink-0 max-height ~140px overflow-y-auto>
    {paramView === 'effect' && selectedEffectId && (
      <EffectParameters effectId={selectedEffectId} />
    )}
    {paramView !== 'effect' && (
      <ModulationContent activeModulator={paramView} />
    )}
  </div>

  {/* Zone 3: P-lock detail — conditional slide */}
  <div overflow-hidden max-height transition>
    {selectedStep && <PLockDetail ... />}
  </div>

  {/* Zone 4: Mod tabs */}
  <ModTabsBar flex-shrink-0 />

  {/* Zone 5: Transport */}
  <SequencerTransport flex-shrink-0 />

  {/* Zone 6: Track list — flex-1 scrollable */}
  <div flex-1 min-h-0 overflow-y-auto>
    {activeTrackIds.map(...) => <EffectTrackRow ... />}
  </div>
</div>
```

The panel also initializes `useEffectSequencerPlayback()` and sets up keyboard shortcuts (same logic currently in `EffectSequencer`).

---

## Phase 3: Integration

### Step 3.1: Update `SequencerContainer.tsx`

Change the effects tab to render `UnifiedSequencerPanel` instead of `EffectSequencer`:

```typescript
import { UnifiedSequencerPanel } from './UnifiedSequencerPanel'

// In content area:
{activeSequencer === 'effects' && <UnifiedSequencerPanel />}
```

### Step 3.2: Update `PerformanceLayout.tsx`

Empty the left sidebar (Row 2, Col 1):

```typescript
{/* Row 2, Col 1: Empty (formerly EffectCardStack) */}
<div
  className="rounded-sm overflow-hidden panel-gradient-subtle"
  style={{
    gridRow: 2,
    gridColumn: 1,
    border: '1px solid var(--border)',
  }}
/>
```

Remove the `EffectCardStack` import. Keep the grid cell so the layout doesn't collapse.

### Step 3.3: Remove ModulationLane from Row 3 Col 2

The modulation controls now live inside the unified panel (via mod tabs + Zone 2). Remove the 96px `ModulationLane` div from below the `SequencerContainer`:

```typescript
{/* Row 3, Col 2: Sequencer (no more ModulationLane below) */}
<div
  className="flex flex-col rounded-sm overflow-hidden panel-gradient-subtle"
  style={{
    gridRow: 3,
    gridColumn: 2,
    border: '1px solid var(--border)',
  }}
>
  <SequencerContainer />
</div>
```

This gives the sequencer the full cell height.

### Step 3.4: Auto-select first effect

When the unified panel mounts and no effect is selected, auto-select the first active effect so the param area isn't empty:

```typescript
useEffect(() => {
  if (!selectedEffectId && activeEffectIds.length > 0) {
    setSelectedEffect(activeEffectIds[0])
  }
}, [activeEffectIds, selectedEffectId, setSelectedEffect])
```

### Step 3.5: Highlight selected track row

In the `EffectTrackRow` rendering inside `UnifiedSequencerPanel`, pass a `isSelectedTrack` prop when the track's effectId matches `selectedEffectId`. Add a subtle left-border highlight:

```typescript
// In EffectTrackRow, add optional prop:
isSelectedTrack?: boolean

// In the track row container style:
borderLeft: isSelectedTrack ? `3px solid ${color}` : '3px solid transparent'
```

---

## Phase 4: ModulationContent Integration

### Step 4.1: Adapt `ModulationContent` for filtered view

The `ModulationContent` component needs to accept an `activeModulator` prop to show only the selected modulator's controls (not all 5 stacked):

```typescript
interface ModulationContentProps {
  activeModulator: 'lfo' | 'random' | 'step' | 'envelope' | 'sh'
}
```

Inside, render only the matching `ModulatorSection` content (without the collapsible wrapper — just the controls directly), since the mod tabs bar already handles selection.

### Step 4.2: Update `EffectsLane.tsx` to import shared components

Change `EffectsLane` to import `ModSlider`, `ModSelect`, `ModRateSelect`, `ModulatorSection`, and the rate constants from `ModulationContent.tsx` so the code isn't duplicated. `EffectsLane` continues to render all 5 modulators stacked with collapsible sections as before.

---

## File Summary

| File | Action | Phase |
|------|--------|-------|
| `src/components/sequencer/SequencerTransport.tsx` | CREATE — extracted transport bar | 1.1 |
| `src/components/sequencer/ModulationContent.tsx` | CREATE — extracted modulation controls | 1.2 |
| `src/components/sequencer/EffectTabsBar.tsx` | CREATE — horizontal effect tabs | 2.1 |
| `src/components/sequencer/ModTabsBar.tsx` | CREATE — modulation source tabs | 2.2 |
| `src/components/sequencer/UnifiedSequencerPanel.tsx` | CREATE — main unified panel | 2.3 |
| `src/components/sequencer/SequencerContainer.tsx` | MODIFY — render UnifiedSequencerPanel | 3.1 |
| `src/components/performance/PerformanceLayout.tsx` | MODIFY — empty left sidebar, remove ModulationLane | 3.2, 3.3 |
| `src/components/sequencer/EffectTrackRow.tsx` | MODIFY — add isSelectedTrack prop | 3.5 |
| `src/components/performance/EffectsLane.tsx` | MODIFY — import from ModulationContent | 4.2 |

## Execution Order

Phase 1 (extractions) can be done in parallel (1.1 and 1.2 are independent).

Phase 2 components: EffectTabsBar and ModTabsBar are independent. UnifiedSequencerPanel depends on both plus the Phase 1 extractions.

Phase 3 integration steps are sequential (3.1 → 3.2 → 3.3 → 3.4 → 3.5).

Phase 4 can be done after Phase 3 once the basic panel is working.

## Verification

1. `npm run build` passes after each phase
2. Effects tab in sequencer shows the unified panel
3. Effect tabs at top list all active effects, clicking one shows its params in Zone 2
4. Mod tabs switch Zone 2 to show modulation controls
5. Clicking an effect tab switches back from mod view to effect params
6. P-lock detail still slides in when a step is selected
7. Transport controls work (play/stop, BPM, resolution, page nav)
8. Track rows render with step grid, selected track has left-border highlight
9. Keyboard shortcuts still work (Space, Escape, arrows, 1-4)
10. Other sequencer tabs (slicer, euclid, steps) still work
11. Left sidebar (Row 2, Col 1) is empty
12. ModulationLane no longer appears below sequencer
