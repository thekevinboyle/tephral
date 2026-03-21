# Screen Capture Source

## Overview

Add screen/tab/window capture as a new media source, accessed via a dropdown on the existing File button. Uses the `getDisplayMedia()` browser API which provides a native picker for tabs, windows, or entire screens. Behaves as a live stream (like webcam), not a seekable file.

## Media Store Changes

Add `'screen'` to the `MediaSource` type: `'none' | 'webcam' | 'file' | 'slicer' | 'screen'`

The screen capture produces a `MediaStream` attached to an `HTMLVideoElement` — same as webcam. The `stopCurrentMedia` function needs a new case to stop the display stream tracks when switching away.

## New Hook: useScreenCapture

A small hook/function that:
- Calls `navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })`
- Creates an `HTMLVideoElement`, sets `srcObject` to the stream
- Calls `mediaStore.setVideoElement()` and `setSource('screen')`
- Listens for the stream's `ended` event (user clicks "Stop sharing" in the browser chrome) and resets back to `'none'`

## UI Changes

### SourceSelector
- File button gets a dropdown chevron
- Clicking shows a popup with "Load File..." and "Capture Screen..."
- When screen capture is active, button label shows "Screen" in active state
- Dropdown closes on click or outside click

### CanvasTransportBar
- `SRC: SCREEN` label when source is screen
- Play/pause button hidden (live stream)
- Record button works as normal

### TransportBar
- Shows "LIVE" indicator when source is screen instead of scrub bar

## Files to Modify

1. `src/stores/mediaStore.ts` — Add `'screen'` to MediaSource, add stopCurrentMedia case
2. `src/hooks/useMediaSource.ts` — Add `startScreenCapture()` function
3. `src/components/ui/SourceSelector.tsx` — Dropdown on File button
4. `src/components/performance/CanvasTransportBar.tsx` — Handle screen source label, hide play/pause
5. `src/components/performance/TransportBar.tsx` — LIVE indicator for screen source

## Out of Scope

- No audio capture from screen
- No recording screen stream to downloadable video
- No picture-in-picture preview
- No advanced getDisplayMedia constraints
