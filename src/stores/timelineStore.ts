import { create } from 'zustand'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type TimelineTriggerMode = 'audioThreshold' | 'kickDetection' | 'manual' | 'timed'

export interface TimelineClip {
  id: string                    // unique timeline placement ID
  clipId: string                // references clipStore clip
  duration: number              // inherited from source clip
  individualEffects: Record<string, boolean>  // effectId -> enabled override
  triggerMode: TimelineTriggerMode
  threshold: number             // 0-1, for audioThreshold mode
}

// ═══════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineState {
  clips: TimelineClip[]
  isPlaying: boolean
  currentClipIndex: number
  isLooping: boolean
  selectedTimelineClipId: string | null
  defaultTriggerMode: TimelineTriggerMode
  defaultThreshold: number
  isActive: boolean  // true when timeline controls the video source

  // Actions
  addClipToTimeline: (clipId: string, duration: number) => void
  removeClipFromTimeline: (id: string) => void
  reorderClip: (from: number, to: number) => void
  selectTimelineClip: (id: string | null) => void
  setClipEffects: (id: string, effects: Record<string, boolean>) => void
  setClipTriggerMode: (id: string, mode: TimelineTriggerMode) => void
  setClipThreshold: (id: string, threshold: number) => void
  setDefaultTriggerMode: (mode: TimelineTriggerMode) => void
  setDefaultThreshold: (threshold: number) => void
  play: () => void
  stop: () => void
  advanceToNextClip: () => void
  goToClip: (index: number) => void
  setLooping: (loop: boolean) => void
  activate: () => void
  deactivate: () => void
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  clips: [],
  isPlaying: false,
  currentClipIndex: 0,
  isLooping: true,
  selectedTimelineClipId: null,
  defaultTriggerMode: 'kickDetection',
  defaultThreshold: 0.5,
  isActive: false,

  addClipToTimeline: (clipId, duration) => {
    const id = crypto.randomUUID()
    const { defaultTriggerMode, defaultThreshold } = get()

    const clip: TimelineClip = {
      id,
      clipId,
      duration,
      individualEffects: {},
      triggerMode: defaultTriggerMode,
      threshold: defaultThreshold,
    }

    set((state) => ({
      clips: [...state.clips, clip],
    }))
  },

  removeClipFromTimeline: (id) => {
    const { clips, selectedTimelineClipId, currentClipIndex } = get()
    const removeIndex = clips.findIndex((c) => c.id === id)
    const newClips = clips.filter((c) => c.id !== id)

    set({
      clips: newClips,
      selectedTimelineClipId: selectedTimelineClipId === id ? null : selectedTimelineClipId,
      currentClipIndex: removeIndex <= currentClipIndex
        ? Math.max(0, currentClipIndex - 1)
        : currentClipIndex,
    })
  },

  reorderClip: (from, to) => {
    const { clips } = get()
    const newClips = [...clips]
    const [moved] = newClips.splice(from, 1)
    newClips.splice(to, 0, moved)
    set({ clips: newClips })
  },

  selectTimelineClip: (id) => set({ selectedTimelineClipId: id }),

  setClipEffects: (id, effects) => {
    set((state) => ({
      clips: state.clips.map((c) =>
        c.id === id ? { ...c, individualEffects: effects } : c
      ),
    }))
  },

  setClipTriggerMode: (id, mode) => {
    set((state) => ({
      clips: state.clips.map((c) =>
        c.id === id ? { ...c, triggerMode: mode } : c
      ),
    }))
  },

  setClipThreshold: (id, threshold) => {
    set((state) => ({
      clips: state.clips.map((c) =>
        c.id === id ? { ...c, threshold } : c
      ),
    }))
  },

  setDefaultTriggerMode: (mode) => set({ defaultTriggerMode: mode }),
  setDefaultThreshold: (threshold) => set({ defaultThreshold: threshold }),

  play: () => {
    const { clips } = get()
    if (clips.length === 0) return
    set({ isPlaying: true })
  },

  stop: () => {
    set({ isPlaying: false, currentClipIndex: 0 })
  },

  advanceToNextClip: () => {
    const { clips, currentClipIndex, isLooping } = get()
    if (clips.length === 0) return

    const nextIndex = currentClipIndex + 1

    if (nextIndex >= clips.length) {
      if (isLooping) {
        set({ currentClipIndex: 0 })
      } else {
        set({ isPlaying: false })
      }
    } else {
      set({ currentClipIndex: nextIndex })
    }
  },

  goToClip: (index) => {
    const { clips } = get()
    if (index >= 0 && index < clips.length) {
      set({ currentClipIndex: index })
    }
  },

  setLooping: (loop) => set({ isLooping: loop }),

  activate: () => set({ isActive: true }),
  deactivate: () => set({ isActive: false, isPlaying: false, currentClipIndex: 0 }),
}))
