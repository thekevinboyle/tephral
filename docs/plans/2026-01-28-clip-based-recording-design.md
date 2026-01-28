# Clip-Based Recording Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign recording so each recording creates a clip with thumbnail. Export happens from within the clip detail modal with full transcoding options.

**Architecture:** Recording captures canvas with effects baked in. Clips stored in clipStore with blob + thumbnail. Click clip to open modal with preview and export options. FFmpeg WebAssembly handles transcoding to user's chosen format/quality/resolution.

**Tech Stack:** React, Zustand, @ffmpeg/ffmpeg (WebAssembly)

---

## Task 1: Create Clip Store

**Files:**
- Create: `src/stores/clipStore.ts`

**Implementation:**

```typescript
import { create } from 'zustand'

export interface Clip {
  id: string
  blob: Blob
  url: string           // Object URL for playback
  thumbnailUrl: string  // First frame as data URL
  duration: number
  createdAt: number
}

export type ExportResolution = 'hd' | '1080p' | '4k'
export type ExportQuality = 'low' | 'medium' | 'high'
export type ExportFrameRate = 30 | 60
export type ExportFormat = 'webm' | 'mp4' | 'mov'

interface ClipState {
  clips: Clip[]
  selectedClipId: string | null

  // Export settings (persisted for convenience)
  exportResolution: ExportResolution
  exportQuality: ExportQuality
  exportFrameRate: ExportFrameRate
  exportFormat: ExportFormat

  addClip: (blob: Blob, duration: number) => Promise<void>
  removeClip: (id: string) => void
  clearAllClips: () => void
  selectClip: (id: string | null) => void

  setExportResolution: (resolution: ExportResolution) => void
  setExportQuality: (quality: ExportQuality) => void
  setExportFrameRate: (frameRate: ExportFrameRate) => void
  setExportFormat: (format: ExportFormat) => void
}

// Helper to generate thumbnail from video blob
async function generateThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.src = URL.createObjectURL(blob)
    video.muted = true
    video.currentTime = 0.1 // Grab frame slightly after start

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      URL.revokeObjectURL(video.src)
    }
  })
}

export const useClipStore = create<ClipState>((set, get) => ({
  clips: [],
  selectedClipId: null,

  exportResolution: '1080p',
  exportQuality: 'high',
  exportFrameRate: 30,
  exportFormat: 'mp4',

  addClip: async (blob: Blob, duration: number) => {
    const id = crypto.randomUUID()
    const url = URL.createObjectURL(blob)
    const thumbnailUrl = await generateThumbnail(blob)

    const clip: Clip = {
      id,
      blob,
      url,
      thumbnailUrl,
      duration,
      createdAt: Date.now(),
    }

    set((state) => ({ clips: [...state.clips, clip] }))
  },

  removeClip: (id: string) => {
    const clip = get().clips.find(c => c.id === id)
    if (clip) {
      URL.revokeObjectURL(clip.url)
    }
    set((state) => ({
      clips: state.clips.filter(c => c.id !== id),
      selectedClipId: state.selectedClipId === id ? null : state.selectedClipId,
    }))
  },

  clearAllClips: () => {
    get().clips.forEach(clip => URL.revokeObjectURL(clip.url))
    set({ clips: [], selectedClipId: null })
  },

  selectClip: (id: string | null) => set({ selectedClipId: id }),

  setExportResolution: (resolution) => set({ exportResolution: resolution }),
  setExportQuality: (quality) => set({ exportQuality: quality }),
  setExportFrameRate: (frameRate) => set({ exportFrameRate: frameRate }),
  setExportFormat: (format) => set({ exportFormat: format }),
}))
```

**Commit:** `git commit -m "feat: add clip store for managing recorded clips"`

---

## Task 2: Create Video Transcode Hook

**Files:**
- Create: `src/hooks/useVideoTranscode.ts`

**First, install FFmpeg:**
```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

**Implementation:**

```typescript
import { useState, useCallback, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { ExportResolution, ExportQuality, ExportFrameRate, ExportFormat } from '../stores/clipStore'

interface TranscodeOptions {
  resolution: ExportResolution
  quality: ExportQuality
  frameRate: ExportFrameRate
  format: ExportFormat
}

const RESOLUTION_MAP: Record<ExportResolution, string> = {
  'hd': '1280:720',
  '1080p': '1920:1080',
  '4k': '3840:2160',
}

const QUALITY_CRF: Record<ExportQuality, number> = {
  'low': 35,
  'medium': 28,
  'high': 20,
}

export function useVideoTranscode() {
  const [isTranscoding, setIsTranscoding] = useState(false)
  const [progress, setProgress] = useState(0)
  const ffmpegRef = useRef<FFmpeg | null>(null)

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current

    const ffmpeg = new FFmpeg()

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100))
    })

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    ffmpegRef.current = ffmpeg
    return ffmpeg
  }, [])

  const transcode = useCallback(async (
    inputBlob: Blob,
    options: TranscodeOptions
  ): Promise<Blob> => {
    setIsTranscoding(true)
    setProgress(0)

    try {
      const ffmpeg = await loadFFmpeg()

      const inputName = 'input.webm'
      const outputExt = options.format === 'mov' ? 'mov' : options.format
      const outputName = `output.${outputExt}`

      await ffmpeg.writeFile(inputName, await fetchFile(inputBlob))

      const args = [
        '-i', inputName,
        '-vf', `scale=${RESOLUTION_MAP[options.resolution]}`,
        '-r', String(options.frameRate),
        '-crf', String(QUALITY_CRF[options.quality]),
      ]

      // Codec selection based on format
      if (options.format === 'mp4' || options.format === 'mov') {
        args.push('-c:v', 'libx264', '-preset', 'medium')
      } else {
        args.push('-c:v', 'libvpx-vp9')
      }

      args.push('-y', outputName)

      await ffmpeg.exec(args)

      const data = await ffmpeg.readFile(outputName)
      const mimeType = options.format === 'webm'
        ? 'video/webm'
        : options.format === 'mov'
          ? 'video/quicktime'
          : 'video/mp4'

      return new Blob([data], { type: mimeType })
    } finally {
      setIsTranscoding(false)
    }
  }, [loadFFmpeg])

  const cancel = useCallback(() => {
    // FFmpeg doesn't have great cancel support, but we can reset state
    setIsTranscoding(false)
    setProgress(0)
  }, [])

  return { transcode, isTranscoding, progress, cancel }
}
```

**Commit:** `git commit -m "feat: add video transcode hook with FFmpeg"`

---

## Task 3: Create Clip Bin Component

**Files:**
- Create: `src/components/performance/ClipBin.tsx`

**Implementation:**

```typescript
import { useClipStore } from '../../stores/clipStore'

export function ClipBin() {
  const { clips, selectedClipId, selectClip, removeClip, clearAllClips } = useClipStore()

  if (clips.length === 0) {
    return (
      <div
        className="absolute bottom-3 left-3 right-3 h-16 flex items-center justify-center rounded-lg"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      >
        <span className="text-sm text-gray-400">Record to create clips</span>
      </div>
    )
  }

  return (
    <div
      className="absolute bottom-3 left-3 right-3 h-20 flex items-center gap-2 px-3 rounded-lg overflow-x-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      {clips.map((clip) => (
        <div
          key={clip.id}
          className="relative flex-shrink-0 cursor-pointer group"
          style={{
            width: '80px',
            height: '60px',
            borderRadius: '6px',
            overflow: 'hidden',
            border: selectedClipId === clip.id ? '2px solid #3b82f6' : '2px solid transparent',
          }}
          onClick={() => selectClip(clip.id)}
        >
          {/* Thumbnail */}
          <img
            src={clip.thumbnailUrl}
            alt="Clip thumbnail"
            className="w-full h-full object-cover"
          />

          {/* Duration badge */}
          <div
            className="absolute bottom-1 right-1 px-1 text-[10px] rounded"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#ffffff' }}
          >
            {formatDuration(clip.duration)}
          </div>

          {/* Delete button */}
          <button
            className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => {
              e.stopPropagation()
              removeClip(clip.id)
            }}
          >
            <span className="text-white text-[10px]">✕</span>
          </button>
        </div>
      ))}

      {/* Clear all button */}
      <button
        className="flex-shrink-0 px-3 py-1 text-xs rounded-md transition-colors"
        style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#999',
        }}
        onClick={clearAllClips}
      >
        Clear All
      </button>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
```

**Commit:** `git commit -m "feat: add clip bin component"`

---

## Task 4: Create Clip Detail Modal

**Files:**
- Create: `src/components/performance/ClipDetailModal.tsx`

**Implementation:**

```typescript
import { useRef, useEffect, useState } from 'react'
import { useClipStore } from '../../stores/clipStore'
import { useVideoTranscode } from '../../hooks/useVideoTranscode'

export function ClipDetailModal() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const {
    clips,
    selectedClipId,
    selectClip,
    removeClip,
    exportResolution,
    exportQuality,
    exportFrameRate,
    exportFormat,
    setExportResolution,
    setExportQuality,
    setExportFrameRate,
    setExportFormat,
  } = useClipStore()

  const { transcode, isTranscoding, progress, cancel } = useVideoTranscode()

  const selectedClip = clips.find(c => c.id === selectedClipId)

  // Sync video time
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    // Auto-play when modal opens
    video.play().catch(() => {})

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [selectedClipId])

  const handlePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !selectedClip) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    video.currentTime = percentage * selectedClip.duration
  }

  const handleExport = async () => {
    if (!selectedClip) return

    const outputBlob = await transcode(selectedClip.blob, {
      resolution: exportResolution,
      quality: exportQuality,
      frameRate: exportFrameRate,
      format: exportFormat,
    })

    // Download the file
    const url = URL.createObjectURL(outputBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tephral-clip.${exportFormat}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = () => {
    if (selectedClipId) {
      removeClip(selectedClipId)
    }
  }

  if (!selectedClip) return null

  const progressPercent = selectedClip.duration > 0
    ? (currentTime / selectedClip.duration) * 100
    : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={() => !isTranscoding && selectClip(null)}
    >
      <div
        className="rounded-xl p-6 w-full max-w-lg"
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          onClick={() => !isTranscoding && selectClip(null)}
        >
          ✕
        </button>

        {/* Video preview */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            src={selectedClip.url}
            className="w-full h-full object-contain"
            muted
            playsInline
          />
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handlePlayPause}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
                <path d="M4 2l10 6-10 6V2z" />
              </svg>
            )}
          </button>

          <div
            className="flex-1 h-2 bg-white/20 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-xs text-gray-400 tabular-nums w-12">
            {formatTime(currentTime)}
          </span>
        </div>

        {isTranscoding ? (
          /* Transcoding progress */
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-300">
              Exporting... {progress}%
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              onClick={cancel}
              className="w-full py-2 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {/* Export options */}
            <div className="space-y-4 mb-6">
              {/* Resolution */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Resolution</label>
                <div className="flex gap-2">
                  {(['hd', '1080p', '4k'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setExportResolution(res)}
                      className="flex-1 py-2 rounded-lg text-sm transition-colors"
                      style={{
                        backgroundColor: exportResolution === res ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                        color: exportResolution === res ? '#fff' : '#999',
                      }}
                    >
                      {res === 'hd' ? 'HD 720p' : res === '1080p' ? 'Full HD' : '4K'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Quality</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setExportQuality(q)}
                      className="flex-1 py-2 rounded-lg text-sm capitalize transition-colors"
                      style={{
                        backgroundColor: exportQuality === q ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                        color: exportQuality === q ? '#fff' : '#999',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame rate */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Frame Rate</label>
                <div className="flex gap-2">
                  {([30, 60] as const).map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setExportFrameRate(fps)}
                      className="flex-1 py-2 rounded-lg text-sm transition-colors"
                      style={{
                        backgroundColor: exportFrameRate === fps ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                        color: exportFrameRate === fps ? '#fff' : '#999',
                      }}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Format</label>
                <div className="flex gap-2">
                  {(['webm', 'mp4', 'mov'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className="flex-1 py-2 rounded-lg text-sm uppercase transition-colors"
                      style={{
                        backgroundColor: exportFormat === fmt ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                        color: exportFormat === fmt ? '#fff' : '#999',
                      }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                Delete
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-3 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
              >
                Export
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
```

**Commit:** `git commit -m "feat: add clip detail modal with export options"`

---

## Task 5: Update Recording Capture Hook

**Files:**
- Modify: `src/hooks/useRecordingCapture.ts`

**Changes:**
- On recording stop, add clip to clipStore instead of recordingStore

```typescript
import { useEffect, useRef } from 'react'
import { useRecordingStore, EXPORT_BITRATES } from '../stores/recordingStore'
import { useClipStore } from '../stores/clipStore'

export function useRecordingCapture(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)

  const { isRecording, exportQuality } = useRecordingStore()
  const { addClip } = useClipStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (isRecording) {
      chunksRef.current = []
      startTimeRef.current = performance.now()

      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      let mimeType = ''
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          mimeType = mime
          break
        }
      }

      if (!mimeType) {
        console.error('No supported video mime type found')
        return
      }

      try {
        const stream = canvas.captureStream(30)
        const bitrate = EXPORT_BITRATES[exportQuality]

        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: bitrate,
        })

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data)
          }
        }

        mediaRecorderRef.current.onstop = () => {
          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: mimeType })
            const duration = (performance.now() - startTimeRef.current) / 1000
            addClip(blob, duration)
            console.log('[Recording] Clip created, size:', blob.size, 'duration:', duration)
          }
        }

        mediaRecorderRef.current.start(100)
        console.log('[Recording] Started capturing canvas')
      } catch (err) {
        console.error('Failed to start MediaRecorder:', err)
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        console.log('[Recording] Stopped capturing')
      }
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording, canvasRef, exportQuality, addClip])
}
```

**Commit:** `git commit -m "feat: update recording capture to create clips"`

---

## Task 6: Update Transport Bar

**Files:**
- Modify: `src/components/performance/TransportBar.tsx`

**Changes:**
- Remove Stop button
- Remove Export button
- Simplify to just: Source buttons, Record (toggles to Stop), Play/Pause, Timeline, Clear

**Key changes to make:**

1. Remove `setShowExportModal` from imports/usage
2. Remove the Stop button JSX
3. Remove the Export button JSX
4. Update Clear button to use `clearAllClips` from clipStore when clips exist

**Commit:** `git commit -m "feat: simplify transport bar, remove export button"`

---

## Task 7: Update Performance Layout

**Files:**
- Modify: `src/components/performance/PerformanceLayout.tsx`

**Changes:**
- Replace ThumbnailFilmstrip with ClipBin
- Add ClipDetailModal
- Remove RecordedVideoOverlay
- Remove ExportModal

```typescript
// Remove these imports:
// import { ThumbnailFilmstrip } from './ThumbnailFilmstrip'
// import { RecordedVideoOverlay } from './RecordedVideoOverlay'
// import { ExportModal } from './ExportModal'

// Add these imports:
import { ClipBin } from './ClipBin'
import { ClipDetailModal } from './ClipDetailModal'

// In the JSX:
// Replace <ThumbnailFilmstrip /> with <ClipBin />
// Replace <RecordedVideoOverlay /> with nothing
// Replace <ExportModal ... /> with <ClipDetailModal />
```

**Commit:** `git commit -m "feat: update layout with clip bin and modal"`

---

## Task 8: Clean Up Recording Store

**Files:**
- Modify: `src/stores/recordingStore.ts`

**Changes:**
- Remove `recordedVideoBlob`, `recordedVideoUrl`, `setRecordedVideo`
- Remove `previewMode`, `setPreviewMode`
- Keep recording state: `isRecording`, `startRecording`, `stopRecording`, `currentTime`, `duration`, etc.

**Commit:** `git commit -m "refactor: clean up recording store, remove video blob state"`

---

## Task 9: Delete Unused Files

**Files to delete:**
- `src/components/performance/PreviewTabs.tsx`
- `src/components/performance/RecordedVideoOverlay.tsx`
- `src/components/performance/ThumbnailFilmstrip.tsx`
- `src/components/performance/ExportModal.tsx`

```bash
rm src/components/performance/PreviewTabs.tsx
rm src/components/performance/RecordedVideoOverlay.tsx
rm src/components/performance/ThumbnailFilmstrip.tsx
rm src/components/performance/ExportModal.tsx
```

**Commit:** `git commit -m "chore: remove unused components"`

---

## Summary

**New files:**
- `src/stores/clipStore.ts`
- `src/hooks/useVideoTranscode.ts`
- `src/components/performance/ClipBin.tsx`
- `src/components/performance/ClipDetailModal.tsx`

**Modified files:**
- `src/hooks/useRecordingCapture.ts`
- `src/components/performance/TransportBar.tsx`
- `src/components/performance/PerformanceLayout.tsx`
- `src/stores/recordingStore.ts`

**Deleted files:**
- `src/components/performance/PreviewTabs.tsx`
- `src/components/performance/RecordedVideoOverlay.tsx`
- `src/components/performance/ThumbnailFilmstrip.tsx`
- `src/components/performance/ExportModal.tsx`

**New dependency:**
- `@ffmpeg/ffmpeg`
- `@ffmpeg/util`
