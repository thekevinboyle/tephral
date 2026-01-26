import { create } from 'zustand'

export interface AutomationEvent {
  t: number  // timestamp in seconds
  effect: string
  action?: 'on' | 'off'
  param?: number
}

interface RecordingState {
  isRecording: boolean
  isPreviewing: boolean
  startTime: number | null
  duration: number
  events: AutomationEvent[]
  source: 'webcam' | 'file' | null

  startRecording: () => void
  stopRecording: () => void
  addEvent: (event: Omit<AutomationEvent, 't'>) => void
  clearRecording: () => void
  setSource: (source: 'webcam' | 'file') => void

  startPreview: () => void
  stopPreview: () => void

  exportAutomation: () => string
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  isRecording: false,
  isPreviewing: false,
  startTime: null,
  duration: 0,
  events: [],
  source: null,

  startRecording: () => set({
    isRecording: true,
    startTime: performance.now(),
    events: [],
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

  clearRecording: () => set({
    events: [],
    duration: 0,
    startTime: null,
  }),

  setSource: (source) => set({ source }),

  startPreview: () => set({ isPreviewing: true }),
  stopPreview: () => set({ isPreviewing: false }),

  exportAutomation: () => {
    const { duration, source, events } = get()
    return JSON.stringify({ duration, source, events }, null, 2)
  },
}))
