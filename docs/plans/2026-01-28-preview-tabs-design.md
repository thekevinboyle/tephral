# Preview Tab System Design

> **For Claude:** Implement this design directly - it's straightforward enough to not need the full executing-plans flow.

**Goal:** Add a tab system at the top of the preview to switch between live source and recorded playback views.

**Architecture:** Floating pill tabs inside canvas container, state managed in recordingStore.

---

## Visual Design

Two pill-style tabs floating at top-left of canvas area:
- Position: 12px from top and left edges, absolute positioning
- Background: Semi-transparent dark (`rgba(0,0,0,0.6)`) with backdrop blur
- Border radius: Fully rounded pills

**Tab states:**
- Active: White text, subtle highlight background (`rgba(255,255,255,0.15)`)
- Inactive: Gray text (`#888`), transparent background, hover lightens
- Disabled: Dimmed (`#555`), 50% opacity, cursor not-allowed

**Labels:** "Source" | "Recorded"

---

## Behavior

**Source tab (default):**
- Shows live canvas with real-time effect manipulation
- Effects respond immediately to grid buttons and parameter changes

**Recorded tab:**
- Disabled when `duration === 0` (no recording exists)
- When selected: resets effects, seeks to 0, starts playback
- Parameter changes during playback are ignored (read-only preview)
- When playback ends, stays on last frame

**Tab switching:**
- Source → Recorded: Stops current state, seeks to 0, starts playback with automation
- Recorded → Source: Stops playback, returns to live feed

---

## Implementation

### State Changes (recordingStore.ts)

Add to interface:
```typescript
previewMode: 'source' | 'recorded'
setPreviewMode: (mode: 'source' | 'recorded') => void
```

Add to store:
```typescript
previewMode: 'source',
setPreviewMode: (mode) => set({ previewMode: mode }),
```

### New Component (PreviewTabs.tsx)

```typescript
import { useRecordingStore } from '../../stores/recordingStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'

export function PreviewTabs() {
  const { previewMode, setPreviewMode, duration, play, stop, seek } = useRecordingStore()
  const { resetEffects } = useAutomationPlayback()

  const hasRecording = duration > 0

  const handleSourceClick = () => {
    if (previewMode === 'source') return
    stop()
    setPreviewMode('source')
  }

  const handleRecordedClick = () => {
    if (previewMode === 'recorded' || !hasRecording) return
    stop()
    resetEffects()
    seek(0)
    setPreviewMode('recorded')
    // Small delay to ensure state is set before play
    setTimeout(() => play(), 50)
  }

  return (
    <div
      className="absolute top-3 left-3 flex gap-1 rounded-full px-1 py-1 z-20"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <button
        onClick={handleSourceClick}
        className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
        style={{
          backgroundColor: previewMode === 'source' ? 'rgba(255,255,255,0.15)' : 'transparent',
          color: previewMode === 'source' ? '#ffffff' : '#888888',
        }}
      >
        Source
      </button>
      <button
        onClick={handleRecordedClick}
        disabled={!hasRecording}
        className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
        style={{
          backgroundColor: previewMode === 'recorded' ? 'rgba(255,255,255,0.15)' : 'transparent',
          color: previewMode === 'recorded' ? '#ffffff' : hasRecording ? '#888888' : '#555555',
          opacity: hasRecording ? 1 : 0.5,
          cursor: hasRecording ? 'pointer' : 'not-allowed',
        }}
      >
        Recorded
      </button>
    </div>
  )
}
```

### Integration (PerformanceLayout.tsx)

Add import:
```typescript
import { PreviewTabs } from './PreviewTabs'
```

Add inside canvas container div (after Canvas, before ThumbnailFilmstrip):
```typescript
<PreviewTabs />
```

---

## Files

**Create:**
- `src/components/performance/PreviewTabs.tsx`

**Modify:**
- `src/stores/recordingStore.ts` - add previewMode state
- `src/components/performance/PerformanceLayout.tsx` - add PreviewTabs
