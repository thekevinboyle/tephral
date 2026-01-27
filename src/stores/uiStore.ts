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

  // Sequencer routing drag state
  sequencerDrag: SequencerDragState

  setSelectedEffect: (id: string | null) => void
  setSelectedParamIndex: (index: number) => void

  // Sequencer drag actions
  startSequencerDrag: (trackId: string, trackColor: string) => void
  endSequencerDrag: () => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedEffectId: null,
  selectedParamIndex: 0,

  sequencerDrag: {
    isDragging: false,
    trackId: null,
    trackColor: null,
  },

  setSelectedEffect: (id) => set({ selectedEffectId: id, selectedParamIndex: 0 }),
  setSelectedParamIndex: (index) => set({ selectedParamIndex: index }),

  startSequencerDrag: (trackId, trackColor) => set({
    sequencerDrag: { isDragging: true, trackId, trackColor },
  }),
  endSequencerDrag: () => set({
    sequencerDrag: { isDragging: false, trackId: null, trackColor: null },
  }),
}))
