import { create } from 'zustand'

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

  startRecording: () => void
  stopRecording: () => void
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

  startRecording: () => set({
    isRecording: true,
    isPlaying: false,
    startTime: performance.now(),
    currentTime: 0,
    events: [],
    thumbnails: [],
  }),

  stopRecording: () => {
    const { startTime } = get()
    const duration = startTime ? (performance.now() - startTime) / 1000 : 0
    set({
      isRecording: false,
      duration,
    })
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

  exportAutomation: () => {
    const { duration, source, events } = get()
    return JSON.stringify({ duration, source, events }, null, 2)
  },
}))
