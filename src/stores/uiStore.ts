import { create } from 'zustand'

// Drag state for sequencer track routing
interface SequencerDragState {
  isDragging: boolean
  trackId: string | null
  trackColor: string | null
}

interface UIState {
  // Selection state for graphic panel
  selectedEffectId: string | null
  selectedParamIndex: number

  // Grid page state (0-3 for 4 pages of 16 effects)
  gridPage: number

  // Sequencer routing drag state
  sequencerDrag: SequencerDragState

  setSelectedEffect: (id: string | null) => void
  setSelectedParamIndex: (index: number) => void

  // Grid page actions
  setGridPage: (page: number) => void
  nextGridPage: () => void
  prevGridPage: () => void

  // Sequencer drag actions
  startSequencerDrag: (trackId: string, trackColor: string) => void
  endSequencerDrag: () => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedEffectId: null,
  selectedParamIndex: 0,
  gridPage: 0,

  sequencerDrag: {
    isDragging: false,
    trackId: null,
    trackColor: null,
  },

  setSelectedEffect: (id) => set({ selectedEffectId: id, selectedParamIndex: 0 }),
  setSelectedParamIndex: (index) => set({ selectedParamIndex: index }),

  setGridPage: (page) => set({ gridPage: Math.max(0, Math.min(3, page)) }),
  nextGridPage: () => set((state) => ({ gridPage: Math.min(3, state.gridPage + 1) })),
  prevGridPage: () => set((state) => ({ gridPage: Math.max(0, state.gridPage - 1) })),

  startSequencerDrag: (trackId, trackColor) => set({
    sequencerDrag: { isDragging: true, trackId, trackColor },
  }),
  endSequencerDrag: () => set({
    sequencerDrag: { isDragging: false, trackId: null, trackColor: null },
  }),
}))
