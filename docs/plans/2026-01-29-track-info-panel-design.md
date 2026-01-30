# Sequencer Track Info Panel Design

A UI panel at the bottom of the Presets panel that displays track info when a sequencer track is selected.

## Overview

Add a collapsible Track Info panel that appears when a user clicks on a sequencer track. Shows track details, allows editing track parameters, and displays/manages modulation routings.

## Layout

```
┌─────────────────────────────────┐
│  PRESETS                        │
├─────────────────────────────────┤
│  [🔍] [Search input]            │
├─────────────────────────────────┤
│                                 │
│  [Folder Tree / Search Results] │  Flex-1 scrollable
│                                 │
├─────────────────────────────────┤
│  [Save] [Import] [Export All]   │
├─────────────────────────────────┤  ← NEW SECTION BELOW
│  TRACK: ● Track 1          [×]  │  Header with close
├─────────────────────────────────┤
│  LENGTH                         │
│  [4][8][12][16][24][32][48][64] │  Length preset buttons
├─────────────────────────────────┤
│  MODE                           │
│  [>] [<] [<>] [?]               │  Mode buttons (can unselect)
├─────────────────────────────────┤
│  ROUTES                         │
│  ├─ rgb_split.amount    [●──] 50│  Routing with depth slider
│  ├─ glitch.intensity    [──●] 75│
│  └─ (empty state or hint)       │
└─────────────────────────────────┘
```

## Components

### TrackInfoPanel

Located in `src/components/sequencer/TrackInfoPanel.tsx`

Props:
```typescript
interface TrackInfoPanelProps {
  trackId: string
  onClose: () => void
}
```

Features:
- Header showing track color dot, name, and close button
- Length selector with 8 preset buttons (4, 8, 12, 16, 24, 32, 48, 64)
- Mode selector with 4 buttons (>, <, <>, ?) - can toggle off to use global mode
- Routings list showing all modulation routes from this track
  - Each routing shows: target param name, depth slider (-100% to +100%)
  - Double-click routing to remove it

### State Changes

**uiStore.ts additions:**
```typescript
// Add to interface
selectedTrackId: string | null

// Add to actions
setSelectedTrack: (id: string | null) => void
```

### Track Selection Behavior

In `Track.tsx`:
- Single click on track row → selects track (shows TrackInfoPanel)
- Keep existing behavior: drag handle → routing drag, double-click name → edit

### Integration

In `PresetLibraryPanel.tsx` (or create a parent wrapper):
- Import useUIStore and useSequencerStore
- Conditionally render TrackInfoPanel at bottom when selectedTrackId is set
- Pass selected track data and close handler

## Visual Style

Match existing app style:
- Background: `#f5f5f5` (matches Presets panel)
- Borders: `1px solid #d0d0d0`
- Headers: `text-[13px] font-semibold uppercase tracking-wider` color `#999999`
- Buttons: white bg, gray border, hover gray-100

Length buttons - small pills in a row:
```tsx
<button className="px-2 h-6 text-[12px] rounded-full border"
  style={{
    backgroundColor: isSelected ? track.color : '#ffffff',
    color: isSelected ? '#ffffff' : '#666666',
    borderColor: '#d0d0d0'
  }}>
  16
</button>
```

Mode buttons - icon-style with track color when active:
```tsx
<button className="w-7 h-7 text-[14px] font-mono rounded"
  style={{
    backgroundColor: isSelected ? track.color : '#ffffff',
    color: isSelected ? '#ffffff' : '#999999',
    border: '1px solid #d0d0d0'
  }}>
  {'>'}
</button>
```

Routing rows - show param path, depth as mini slider:
```tsx
<div className="flex items-center gap-2 px-2 py-1.5">
  <span className="text-[12px] text-gray-500 flex-1 truncate">rgb_split.amount</span>
  <div className="w-20 h-1 bg-gray-200 rounded relative">
    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gray-300" /> {/* center mark */}
    <div
      className="absolute top-0 bottom-0 rounded"
      style={{
        left: depth > 0 ? '50%' : `${50 + depth * 50}%`,
        width: `${Math.abs(depth) * 50}%`,
        backgroundColor: track.color
      }}
    />
  </div>
  <span className="text-[11px] w-8 text-right tabular-nums">{Math.round(depth * 100)}%</span>
</div>
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/stores/uiStore.ts` | Add selectedTrackId state and setSelectedTrack action |
| `src/components/sequencer/Track.tsx` | Add onClick to select track |
| `src/components/sequencer/TrackInfoPanel.tsx` | NEW - Track info component |
| `src/components/presets/PresetLibraryPanel.tsx` | Render TrackInfoPanel at bottom when track selected |

## Implementation Order

1. Add selectedTrackId to uiStore
2. Create TrackInfoPanel component (static layout)
3. Add click-to-select in Track.tsx
4. Integrate TrackInfoPanel in PresetLibraryPanel
5. Wire up length/mode buttons
6. Add routing display with depth adjustment
7. Polish interactions and transitions
