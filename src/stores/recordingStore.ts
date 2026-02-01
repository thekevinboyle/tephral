import { create } from 'zustand'
import { useSlicerBufferStore } from './slicerBufferStore'
import { sampleFrames, MAX_FRAMES_PER_CLIP } from '../utils/frameSampler'

export interface AutomationEvent {
  t: number  // timestamp in seconds
  effect: string
  action?: 'on' | 'off'
  param?: number
}

export interface Thumbnail {
  time: number
  dataUrl: string
}

export type ExportFormat = 'webm' | 'mp4'
export type ExportQuality = 'low' | 'med' | 'high'

export const EXPORT_BITRATES: Record<ExportQuality, number> = {
  low: 1_000_000,
  med: 4_000_000,
  high: 8_000_000,
}

interface RecordingState {
  isRecording: boolean
  isPreviewing: boolean
  isPlaying: boolean
  startTime: number | null
  currentTime: number
  duration: number
  events: AutomationEvent[]
  thumbnails: Thumbnail[]
  source: 'webcam' | 'file' | null
  pendingFrames: ImageData[] | null

  // Export state
  previewTime: number | null
  isExporting: boolean
  exportProgress: number
  exportFormat: ExportFormat
  exportQuality: ExportQuality
  showExportModal: boolean

  startRecording: (initialEvents?: AutomationEvent[]) => void
  stopRecording: () => ImageData[]
  addEvent: (event: Omit<AutomationEvent, 't'>) => void
  addThumbnail: (thumbnail: Thumbnail) => void
  clearRecording: () => void
  setSource: (source: 'webcam' | 'file') => void

  startPreview: () => void
  stopPreview: () => void
  play: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  setCurrentTime: (time: number) => void

  // Export actions
  setPreviewTime: (time: number | null) => void
  setShowExportModal: (show: boolean) => void
  setExportFormat: (format: ExportFormat) => void
  setExportQuality: (quality: ExportQuality) => void
  startExport: () => void
  setExportProgress: (progress: number) => void
  cancelExport: () => void
  finishExport: () => void

  exportAutomation: () => string
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  isRecording: false,
  isPreviewing: false,
  isPlaying: false,
  startTime: null,
  currentTime: 0,
  duration: 0,
  events: [],
  thumbnails: [],
  source: null,
  pendingFrames: null,

  // Export state
  previewTime: null,
  isExporting: false,
  exportProgress: 0,
  exportFormat: 'webm',
  exportQuality: 'med',
  showExportModal: false,

  startRecording: (initialEvents?: AutomationEvent[]) => set({
    isRecording: true,
    isPlaying: false,
    startTime: performance.now(),
    currentTime: 0,
    events: initialEvents || [],
    thumbnails: [],
  }),

  stopRecording: () => {
    const { startTime } = get()
    const duration = startTime ? (performance.now() - startTime) / 1000 : 0

    // Capture frames from slicer buffer before they're cleared
    const slicerBuffer = useSlicerBufferStore.getState()
    const capturedFrames = [...slicerBuffer.frames]
    const sampledFrames = sampleFrames(capturedFrames, MAX_FRAMES_PER_CLIP)

    set({
      isRecording: false,
      duration,
      pendingFrames: sampledFrames,
    })

    return sampledFrames
  },

  addEvent: (event) => {
    const { isRecording, startTime } = get()
    if (!isRecording || !startTime) return

    const t = (performance.now() - startTime) / 1000
    set((state) => ({
      events: [...state.events, { ...event, t }],
    }))
  },

  addThumbnail: (thumbnail) => set((state) => ({
    thumbnails: [...state.thumbnails, thumbnail].slice(-20) // Keep last 20
  })),

  clearRecording: () => set({
    events: [],
    thumbnails: [],
    duration: 0,
    currentTime: 0,
    startTime: null,
  }),

  setSource: (source) => set({ source }),

  startPreview: () => set({ isPreviewing: true }),
  stopPreview: () => set({ isPreviewing: false }),

  play: () => set({ isPlaying: true, isRecording: false }),
  pause: () => set({ isPlaying: false }),
  stop: () => set({ isPlaying: false, currentTime: 0 }),
  seek: (time) => set({ currentTime: Math.max(0, Math.min(time, get().duration)) }),
  setCurrentTime: (time) => set({ currentTime: time }),

  // Export actions
  setPreviewTime: (time) => set({ previewTime: time }),
  setShowExportModal: (show) => set({ showExportModal: show }),
  setExportFormat: (format) => set({ exportFormat: format }),
  setExportQuality: (quality) => set({ exportQuality: quality }),
  startExport: () => set({ isExporting: true, exportProgress: 0 }),
  setExportProgress: (progress) => set({ exportProgress: progress }),
  cancelExport: () => set({ isExporting: false, exportProgress: 0 }),
  finishExport: () => set({ isExporting: false, exportProgress: 100, showExportModal: false }),

  exportAutomation: () => {
    const { duration, source, events } = get()
    return JSON.stringify({ duration, source, events }, null, 2)
  },
}))
