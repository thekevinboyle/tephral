# Recording Export & Timeline Preview Design

## Overview

Enhance the recording system with video export capabilities and interactive timeline scrubbing. Two export modes: live capture during performance and render-after-recording. Timeline thumbnails support hover-to-preview and click-to-jump interactions.

## Export System

### Two Capture Modes

**Live Capture:**
- Records canvas output in real-time while performing
- What you see is what you get
- Press record → perform → stop → export dialog

**Render Export:**
- After a recording session, replays automation and captures result
- Useful for re-rendering at different quality
- Plays back source + automation → captures canvas → exports

### Format Options

Shown in a modal before export:

```
┌─────────────────────────────┐
│  EXPORT VIDEO               │
├─────────────────────────────┤
│  Format:  [WebM] [MP4]      │
│  Quality: [Low] [Med] [High]│
│                             │
│  [Cancel]      [Export]     │
└─────────────────────────────┘
```

- **Format:** WebM (VP9) or MP4 (H.264) - availability depends on browser
- **Quality:** Low (1Mbps), Medium (4Mbps), High (8Mbps)

### Browser Compatibility

- Use `MediaRecorder.isTypeSupported()` to detect available formats
- Disable unavailable format buttons with tooltip
- WebM has broader support; MP4/H.264 varies by browser

## Timeline Interaction

### Hover Preview

- Mouse enters thumbnail → canvas shows that frame
- Source video seeks to thumbnail's timestamp
- Current effects applied live
- Subtle highlight on hovered thumbnail (brighter border)
- Disabled during active recording

### Click to Jump

- Click thumbnail → seeks to that time and starts playback
- Playhead indicator updates to new position
- If paused, starts playing from clicked position
- If playing, continues from new position

### State Separation

- `previewTime` - set on hover, cleared on mouse leave
- `currentTime` - actual playback position
- Canvas checks `previewTime` first, falls back to `currentTime`

## Export UI

### Button Placement

In PreviewHeader, after recording stops:
- Appears next to play/stop controls
- Button labeled "EXPORT"

### During Export

- Modal shows progress bar: "Rendering... 45%"
- Elapsed time display
- Cancel button to abort
- Export button disabled while rendering

### After Export

- Browser's native download dialog
- Filename: `strand-tracer-{timestamp}.webm`
- Modal closes automatically

### Live Capture Indicator

- Small "REC" badge when canvas is being captured
- Stop triggers export modal for format selection

## State Management

Add to `recordingStore`:

```typescript
// New state
previewTime: number | null      // hover preview timestamp
isExporting: boolean            // render export in progress
exportProgress: number          // 0-100 percentage
exportFormat: 'webm' | 'mp4'
exportQuality: 'low' | 'med' | 'high'

// New actions
setPreviewTime(time: number | null)
startExport(format, quality)
setExportProgress(progress: number)
cancelExport()
```

## Canvas Capture

### Setup

- Canvas component exposes ref to canvas element
- New `useCanvasCapture` hook handles MediaRecorder
- Uses `canvas.captureStream()` to grab frames

### Bitrate Mapping

```typescript
const BITRATES = {
  low: 1_000_000,   // 1 Mbps
  med: 4_000_000,   // 4 Mbps
  high: 8_000_000,  // 8 Mbps
}
```

### Render Export Flow

1. User clicks Export → modal opens
2. Selects format/quality → clicks Export
3. Source video seeks to start
4. Playback begins with automation
5. MediaRecorder captures canvas stream
6. On completion, blob is downloaded
7. Modal closes

## Files to Create/Modify

**Create:**
- `src/components/performance/ExportModal.tsx` - format/quality selection UI
- `src/hooks/useCanvasCapture.ts` - MediaRecorder wrapper

**Modify:**
- `src/stores/recordingStore.ts` - add previewTime, export state/actions
- `src/components/performance/ThumbnailFilmstrip.tsx` - hover/click handlers
- `src/components/performance/PreviewHeader.tsx` - export button
- `src/components/Canvas.tsx` - expose canvas ref for capture
