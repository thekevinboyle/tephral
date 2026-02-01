# Slicer Instant Load Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make slicer clip loading instant by pre-extracting frames at clip creation time.

**Architecture:** Store frames with clips in clipStore. Recordings grab frames from buffer (zero cost). File imports extract once with progress. Slicer load becomes a simple reference copy.

**Tech Stack:** React, Zustand, Canvas API

---

## Task 1: Update Clip Interface and Store

**Files:**
- Modify: `src/stores/clipStore.ts`

**Step 1: Add constants and update interface**

Add at top of file:
```typescript
const MAX_FRAMES_PER_CLIP = 150
```

Update Clip interface to include frames:
```typescript
interface Clip {
  id: string
  blob: Blob
  url: string
  thumbnailUrl: string
  duration: number
  createdAt: number
  frames: ImageData[]  // Add this field
}
```

**Step 2: Update addClip action**

Change signature to accept optional frames parameter:
```typescript
addClip: async (blob: Blob, duration: number, frames?: ImageData[]) => {
  // ... existing thumbnail generation logic ...

  const newClip: Clip = {
    id,
    blob,
    url,
    thumbnailUrl: '', // gets set async
    duration,
    createdAt: Date.now(),
    frames: frames ?? []  // Use provided frames or empty array
  }
  // ... rest of logic
}
```

**Step 3: Verify build**

Run: `npm run build`

---

## Task 2: Add Frame Sampling Utility

**Files:**
- Create: `src/utils/frameSampler.ts`

**Step 1: Create utility function**

```typescript
/**
 * Sample frames down to target count, evenly distributed
 */
export function sampleFrames(frames: ImageData[], maxFrames: number): ImageData[] {
  if (frames.length <= maxFrames) {
    return [...frames]
  }

  const sampled: ImageData[] = []
  const step = frames.length / maxFrames

  for (let i = 0; i < maxFrames; i++) {
    const index = Math.floor(i * step)
    sampled.push(frames[index])
  }

  return sampled
}

export const MAX_FRAMES_PER_CLIP = 150
```

**Step 2: Verify build**

Run: `npm run build`

---

## Task 3: Capture Frames on Recording Stop

**Files:**
- Modify: `src/stores/recordingStore.ts`

**Step 1: Add imports**

```typescript
import { useSlicerBufferStore } from './slicerBufferStore'
import { sampleFrames, MAX_FRAMES_PER_CLIP } from '../utils/frameSampler'
```

**Step 2: Modify stopRecording to capture frames**

In the stopRecording action, before calling clipStore.addClip:

```typescript
// Grab frames from slicer buffer before they're cleared
const slicerBuffer = useSlicerBufferStore.getState()
const capturedFrames = [...slicerBuffer.frames]
const sampledFrames = sampleFrames(capturedFrames, MAX_FRAMES_PER_CLIP)

// Pass frames to clip store
clipStore.addClip(blob, duration, sampledFrames)
```

**Step 3: Verify build**

Run: `npm run build`

---

## Task 4: Update Frame Extractor for Max Frames

**Files:**
- Modify: `src/utils/clipFrameExtractor.ts`

**Step 1: Import constant**

```typescript
import { MAX_FRAMES_PER_CLIP } from './frameSampler'
```

**Step 2: Update extraction to respect frame limit**

Modify the frame count calculation:
```typescript
// Calculate target frames (capped at MAX_FRAMES_PER_CLIP)
const rawFrameCount = Math.ceil(knownDuration * 30)
const targetFrames = Math.min(rawFrameCount, MAX_FRAMES_PER_CLIP)
const timeInterval = knownDuration / targetFrames
```

Update the loop to use interval:
```typescript
for (let i = 0; i < targetFrames; i++) {
  const time = i * timeInterval
  // ... existing seek and capture logic using 'time' instead of 'i / 30'
}
```

**Step 3: Verify build**

Run: `npm run build`

---

## Task 5: Simplify Slicer Drop Handler

**Files:**
- Modify: `src/components/sequencer/SlicerPanel.tsx`

**Step 1: Simplify handleDrop**

Change from async extraction to instant frame copy:

```typescript
const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  setDragOver(false)

  const clipId = e.dataTransfer.getData('application/x-clip-id')
  if (!clipId) return

  const clip = clips.find(c => c.id === clipId)
  if (!clip) return

  // Instant - frames already extracted
  if (clip.frames.length > 0) {
    importFrames(clip.frames)
    setCaptureState('imported')
    setImportedClipId(clipId)
  }
}, [clips, importFrames, setCaptureState, setImportedClipId])
```

**Step 2: Remove loading state if present**

Remove any `isLoading` state or progress indicators related to frame extraction on drop.

**Step 3: Verify build**

Run: `npm run build`

---

## Task 6: Add Progress UI for File Imports

**Files:**
- Modify: `src/components/performance/ClipBin.tsx` (or wherever file import happens)

**Step 1: Find file import handler**

Locate where video files are imported (likely file input or drop handler).

**Step 2: Add import progress state**

```typescript
const [importProgress, setImportProgress] = useState<number | null>(null)
```

**Step 3: Update import flow**

```typescript
const handleFileImport = async (file: File) => {
  setImportProgress(0)

  const blob = file
  const url = URL.createObjectURL(blob)
  const duration = await getVideoDuration(url)

  // Extract frames with progress
  const frames = await extractFramesFromClip(url, duration, (progress) => {
    setImportProgress(progress)
  })

  // Add clip with pre-extracted frames
  await addClip(blob, duration, frames)

  setImportProgress(null)
  URL.revokeObjectURL(url)
}
```

**Step 4: Add progress indicator to UI**

Show a simple progress bar or percentage when `importProgress !== null`.

**Step 5: Verify build**

Run: `npm run build`

---

## Verification

1. Run `npm run build` - no TypeScript errors
2. Start dev server: `npm run dev`
3. Test recording flow:
   - Record a clip
   - Stop recording
   - Verify clip appears in bin
   - Drag clip to slicer
   - **Expected:** Instant load, no delay
4. Test file import flow:
   - Import a video file
   - **Expected:** Progress indicator shows during extraction
   - Drag imported clip to slicer
   - **Expected:** Instant load
5. Test with clips of various lengths (short, medium, long)
