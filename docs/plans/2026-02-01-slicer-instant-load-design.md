# Slicer Instant Load Design

## Problem

Loading clips into the slicer is slow. The current flow extracts frames from the video blob every time a clip is dragged to the slicer, using sequential seeking that can take several seconds to minutes depending on clip length.

## Solution

Pre-extract frames when clips are created, not when they're loaded into the slicer. Store frames alongside each clip so slicer import is instant.

## Frame Budget

- **Max frames per clip:** 150 (~5 seconds at 30fps)
- **Frame resolution:** 480×270
- **Memory per frame:** ~0.5MB
- **Total budget:** 4 clips × 150 frames × 0.5MB = ~300MB

Clips longer than 5 seconds sample evenly (e.g., 10 second clip extracts every 2nd frame).

## Data Structure Changes

### clipStore.ts

Add frames to Clip interface:

```typescript
interface Clip {
  id: string
  blob: Blob
  url: string
  thumbnailUrl: string
  duration: number
  createdAt: number
  frames: ImageData[]  // NEW - pre-extracted frames
}
```

Update `addClip` to accept optional frames parameter:

```typescript
addClip: (blob: Blob, duration: number, frames?: ImageData[]) => void
```

### Constants

```typescript
const MAX_FRAMES_PER_CLIP = 150
const FRAME_WIDTH = 480
const FRAME_HEIGHT = 270
```

## Recording Flow

When recording stops, grab frames from the slicer buffer before saving:

**recordingStore.ts:**

```typescript
// In stopRecording():
const slicerBuffer = useSlicerBufferStore.getState()
const capturedFrames = [...slicerBuffer.frames]

// Sample down if over limit
const frames = sampleFrames(capturedFrames, MAX_FRAMES_PER_CLIP)

// Pass frames to clip store
clipStore.addClip(blob, duration, frames)
```

This is zero-cost since frames are already in memory.

## File Import Flow

When importing a video file, extract frames immediately with progress UI:

1. Show "Importing..." state with progress bar
2. Extract frames (capped at 150, sampled evenly for long clips)
3. Add clip with extracted frames
4. Clear progress UI

**clipFrameExtractor.ts** - Modify to respect frame limit:

```typescript
export async function extractFramesFromClip(
  url: string,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<ImageData[]> {
  const targetFrames = Math.min(duration * 30, MAX_FRAMES_PER_CLIP)
  const interval = duration / targetFrames

  for (let i = 0; i < targetFrames; i++) {
    const time = i * interval
    // seek and capture at calculated intervals
  }
}
```

Extraction still takes time, but happens once when adding to bin.

## Slicer Load Flow

**SlicerPanel.tsx** - Simplified drop handler:

```typescript
// Before (slow):
const handleDrop = async (e) => {
  const clip = clipStore.getClip(clipId)
  const frames = await extractFramesFromClip(clip.url, clip.duration)
  slicerBuffer.importFrames(frames)
}

// After (instant):
const handleDrop = (e) => {
  const clip = clipStore.getClip(clipId)
  slicerBuffer.importFrames(clip.frames)
}
```

No async, no loading state. Just copy the reference.

## Files to Modify

| File | Changes |
|------|---------|
| `src/stores/clipStore.ts` | Add `frames` to Clip interface, update `addClip` signature |
| `src/stores/recordingStore.ts` | Capture frames from buffer when recording stops |
| `src/utils/clipFrameExtractor.ts` | Cap at 150 frames, sample evenly for long clips |
| `src/components/sequencer/SlicerPanel.tsx` | Simplify drop handler to use pre-extracted frames |
| `src/components/performance/ClipBin.tsx` | Add progress UI for file imports |

## Result

- Dragging clips to slicer is instant
- Recordings: zero extraction cost (frames already in memory)
- File imports: extraction happens once at import time with progress feedback
- Memory usage capped at ~300MB for 4 clips
