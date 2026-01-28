# Performance Preview & Export Feature

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to preview recorded performances with automation replay and export as video files.

**Architecture:**
- New `useAutomationPlayback` hook replays recorded automation events at correct timestamps
- Preview mode advances `currentTime` and applies events in real-time
- Export mode uses existing canvas capture infrastructure, synced with automation playback
- Transport bar gets dedicated preview/export controls

**Tech Stack:** React 18, Zustand, requestAnimationFrame, MediaRecorder API

---

## Task 1: Create useAutomationPlayback Hook

**Files:**
- Create: `src/hooks/useAutomationPlayback.ts`

**Step 1: Create the hook file**

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useRecordingStore } from '../stores/recordingStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAcidStore } from '../stores/acidStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'

export function useAutomationPlayback() {
  const {
    isPlaying,
    currentTime,
    duration,
    events,
    setCurrentTime,
    stop,
  } = useRecordingStore()

  const glitch = useGlitchEngineStore()
  const acid = useAcidStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()

  const animationFrameId = useRef<number | null>(null)
  const lastFrameTime = useRef<number>(0)
  const lastAppliedIndex = useRef<number>(-1)

  // Apply an automation event to the appropriate store
  const applyEvent = useCallback((event: { effect: string; action?: 'on' | 'off'; param?: number }) => {
    const { effect, action, param } = event

    // Handle effect toggle (on/off)
    if (action) {
      const enabled = action === 'on'
      switch (effect) {
        case 'rgb_split': glitch.setRGBSplitEnabled(enabled); break
        case 'block_displace': glitch.setBlockDisplaceEnabled(enabled); break
        case 'scan_lines': glitch.setScanLinesEnabled(enabled); break
        case 'noise': glitch.setNoiseEnabled(enabled); break
        case 'pixelate': glitch.setPixelateEnabled(enabled); break
        case 'edges': glitch.setEdgeDetectionEnabled(enabled); break
        case 'ascii': ascii.setEnabled(enabled); break
        case 'stipple': stipple.setEnabled(enabled); break
        // Acid effects
        case 'acid_dots': acid.setDotsEnabled(enabled); break
        case 'acid_glyph': acid.setGlyphEnabled(enabled); break
        case 'acid_icons': acid.setIconsEnabled(enabled); break
        case 'acid_contour': acid.setContourEnabled(enabled); break
        case 'acid_decomp': acid.setDecompEnabled(enabled); break
        case 'acid_mirror': acid.setMirrorEnabled(enabled); break
        case 'acid_slice': acid.setSliceEnabled(enabled); break
        case 'acid_thgrid': acid.setThGridEnabled(enabled); break
        case 'acid_cloud': acid.setCloudEnabled(enabled); break
        case 'acid_led': acid.setLedEnabled(enabled); break
        case 'acid_slit': acid.setSlitEnabled(enabled); break
        case 'acid_voronoi': acid.setVoronoiEnabled(enabled); break
        // Vision tracking effects would go here
      }
    }

    // Handle parameter change
    if (param !== undefined) {
      // Parameter changes are recorded with the current value
      // The effect name is the key to know which parameter changed
      // For now, we store it but need expanded logic per-effect
    }
  }, [glitch, acid, ascii, stipple])

  // Main playback loop
  const playbackLoop = useCallback((timestamp: number) => {
    if (!isPlaying) return

    // Calculate delta time
    const deltaMs = timestamp - lastFrameTime.current
    lastFrameTime.current = timestamp

    // Advance current time
    const newTime = currentTime + deltaMs / 1000

    if (newTime >= duration) {
      // Reached end of recording
      stop()
      return
    }

    setCurrentTime(newTime)

    // Find and apply all events up to current time
    for (let i = lastAppliedIndex.current + 1; i < events.length; i++) {
      if (events[i].t <= newTime) {
        applyEvent(events[i])
        lastAppliedIndex.current = i
      } else {
        break
      }
    }

    animationFrameId.current = requestAnimationFrame(playbackLoop)
  }, [isPlaying, currentTime, duration, events, setCurrentTime, stop, applyEvent])

  // Start/stop playback
  useEffect(() => {
    if (isPlaying) {
      lastFrameTime.current = performance.now()
      // Find starting index based on current time
      lastAppliedIndex.current = events.findIndex(e => e.t > currentTime) - 1
      animationFrameId.current = requestAnimationFrame(playbackLoop)
    } else {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
    }

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [isPlaying, playbackLoop, events, currentTime])

  // Reset index when seeking
  useEffect(() => {
    if (!isPlaying) {
      lastAppliedIndex.current = events.findIndex(e => e.t > currentTime) - 1
    }
  }, [currentTime, isPlaying, events])

  return { isPlaying, currentTime, duration }
}
```

**Step 2: Commit**

```bash
git add src/hooks/useAutomationPlayback.ts
git commit -m "feat: add useAutomationPlayback hook for performance replay"
```

---

## Task 2: Create PreviewControls Component

**Files:**
- Create: `src/components/performance/PreviewControls.tsx`

**Step 1: Create the component**

```typescript
import { useRecordingStore } from '../../stores/recordingStore'

export function PreviewControls() {
  const {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    stop,
    seek,
    setShowExportModal,
  } = useRecordingStore()

  // Format time as MM:SS.ms
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Handle timeline click to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const seekTime = percentage * duration
    seek(seekTime)
  }

  if (duration === 0) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* Play/Pause button */}
      <button
        onClick={isPlaying ? pause : play}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </button>

      {/* Stop button */}
      <button
        onClick={stop}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <rect x="2" y="2" width="10" height="10" rx="1" />
        </svg>
      </button>

      {/* Timeline */}
      <div
        className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
        onClick={handleTimelineClick}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
        {/* Playhead */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow-sm transition-all duration-75"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>

      {/* Timecode */}
      <div
        className="text-sm font-mono tabular-nums text-gray-600 min-w-[120px]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Export button */}
      <button
        onClick={() => setShowExportModal(true)}
        className="px-4 py-1.5 text-sm font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Export
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/performance/PreviewControls.tsx
git commit -m "feat: add PreviewControls component with timeline scrubbing"
```

---

## Task 3: Integrate Automation Playback into App

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`

**Step 1: Import and use the automation playback hook**

Add import at top:
```typescript
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'
import { PreviewControls } from './PreviewControls'
```

**Step 2: Add hook call inside component**

Add near the top of the `PerformanceLayout` function body:
```typescript
// Initialize automation playback
useAutomationPlayback()
```

**Step 3: Add PreviewControls below TransportBar**

Find the TransportBar section and add PreviewControls after it:
```typescript
{/* Transport bar */}
<div
  className="flex-shrink-0 mx-3 mt-3 rounded-xl overflow-hidden"
  style={{
    height: '5vh',
    minHeight: '32px',
    backgroundColor: '#ffffff',
    border: '1px solid #d0d0d0',
  }}
>
  <TransportBar />
</div>

{/* Preview controls - only show when recording exists */}
<div
  className="flex-shrink-0 mx-3 mt-1 rounded-xl overflow-hidden"
  style={{
    backgroundColor: '#ffffff',
    border: '1px solid #d0d0d0',
  }}
>
  <PreviewControls />
</div>
```

**Step 4: Commit**

```bash
git add src/components/performance/PerformanceLayout.tsx
git commit -m "feat: integrate automation playback and preview controls"
```

---

## Task 4: Update Export Flow to Sync with Playback

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`

**Step 1: Update handleExport to sync playback with capture**

Replace the existing `handleExport` function:
```typescript
const handleExport = useCallback((format: ExportFormat, quality: ExportQuality) => {
  updateCaptureRef()
  if (!captureRef.current) {
    console.error('Canvas not available for export')
    return
  }

  // Reset to beginning and start export
  stop()
  startExport()

  // Small delay to ensure state is reset
  setTimeout(() => {
    // Start canvas capture
    const started = startCapture({ format, quality })

    if (started) {
      // Start playback - automation will be replayed automatically
      play()

      // Stop capture after duration (with buffer for encoding)
      setTimeout(() => {
        stopCapture()
        stop()
      }, duration * 1000 + 500)
    }
  }, 100)
}, [updateCaptureRef, startExport, startCapture, stopCapture, play, stop, duration])
```

**Step 2: Commit**

```bash
git add src/components/performance/PerformanceLayout.tsx
git commit -m "feat: sync export with automation playback"
```

---

## Task 5: Add Progress Updates During Export

**Files:**
- Modify: `src/hooks/useCanvasCapture.ts`

**Step 1: Read the current hook**

Read the file to understand the current implementation.

**Step 2: Add progress callback**

Update the hook to accept an `onProgress` callback and report progress during recording.

In the `startCapture` function, add:
```typescript
// Calculate expected chunks based on duration
const expectedDuration = duration * 1000 // ms
let elapsedTime = 0
const progressInterval = setInterval(() => {
  elapsedTime += 100
  const progress = Math.min(99, (elapsedTime / expectedDuration) * 100)
  onProgress?.(progress)
}, 100)
```

Store the interval ID and clear it in `stopCapture`:
```typescript
clearInterval(progressIntervalRef.current)
onProgress?.(100)
```

**Step 3: Wire up progress to recordingStore**

In PerformanceLayout, update the startCapture call:
```typescript
const started = startCapture({
  format,
  quality,
  onProgress: (progress) => setExportProgress(progress)
})
```

**Step 4: Commit**

```bash
git add src/hooks/useCanvasCapture.ts src/components/performance/PerformanceLayout.tsx
git commit -m "feat: add progress reporting during export"
```

---

## Task 6: Handle Effect State Reset for Playback

**Files:**
- Modify: `src/hooks/useAutomationPlayback.ts`

**Step 1: Add state snapshot/restore**

Before playback starts, we should capture the current effect states so we can restore them after, or reset all effects to a known state.

Add a `resetEffects` function:
```typescript
const resetEffects = useCallback(() => {
  // Reset all glitch effects to off
  glitch.setRGBSplitEnabled(false)
  glitch.setBlockDisplaceEnabled(false)
  glitch.setScanLinesEnabled(false)
  glitch.setNoiseEnabled(false)
  glitch.setPixelateEnabled(false)
  glitch.setEdgeDetectionEnabled(false)

  // Reset render effects
  ascii.setEnabled(false)
  stipple.setEnabled(false)

  // Reset acid effects
  acid.setDotsEnabled(false)
  acid.setGlyphEnabled(false)
  acid.setIconsEnabled(false)
  acid.setContourEnabled(false)
  acid.setDecompEnabled(false)
  acid.setMirrorEnabled(false)
  acid.setSliceEnabled(false)
  acid.setThGridEnabled(false)
  acid.setCloudEnabled(false)
  acid.setLedEnabled(false)
  acid.setSlitEnabled(false)
  acid.setVoronoiEnabled(false)
}, [glitch, acid, ascii, stipple])
```

**Step 2: Call resetEffects when playback starts from beginning**

In the playback start effect:
```typescript
if (isPlaying && currentTime === 0) {
  resetEffects()
}
```

**Step 3: Commit**

```bash
git add src/hooks/useAutomationPlayback.ts
git commit -m "feat: reset effects to clean state at playback start"
```

---

## Task 7: Add Keyboard Shortcuts for Preview

**Files:**
- Modify: `src/hooks/useAutomationPlayback.ts`

**Step 1: Add keyboard event listener**

Add useEffect for keyboard shortcuts:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault()
        if (duration > 0) {
          isPlaying ? pause() : play()
        }
        break
      case 'Escape':
        if (isPlaying) {
          stop()
        }
        break
      case 'Home':
        seek(0)
        break
      case 'End':
        seek(duration)
        break
      case 'ArrowLeft':
        seek(Math.max(0, currentTime - 1))
        break
      case 'ArrowRight':
        seek(Math.min(duration, currentTime + 1))
        break
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isPlaying, duration, currentTime, play, pause, stop, seek])
```

**Step 2: Commit**

```bash
git add src/hooks/useAutomationPlayback.ts
git commit -m "feat: add keyboard shortcuts for preview playback"
```

---

## Summary

**New files created:**
- `src/hooks/useAutomationPlayback.ts` - Replays recorded automation events at correct timestamps
- `src/components/performance/PreviewControls.tsx` - Play/pause/stop/seek UI with timeline

**Files modified:**
- `src/components/performance/PerformanceLayout.tsx` - Integrates playback hook and preview controls
- `src/hooks/useCanvasCapture.ts` - Adds progress reporting

**Features added:**
- Preview playback with timeline scrubbing
- Effect state reset at playback start
- Synced export (automation replays while canvas records)
- Progress updates during export
- Keyboard shortcuts (Space, Escape, Home, End, Arrows)

**User flow:**
1. Record a performance (existing functionality)
2. Click Play or press Space to preview
3. Scrub timeline to seek
4. Click Export to render video with all effects applied
5. Progress bar shows rendering status
6. Video downloads automatically when complete
