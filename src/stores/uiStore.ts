import { create } from 'zustand'

// Drag state for sequencer track routing
interface SequencerDragState {
  isDragging: boolean
  trackId: string | null
  trackColor: string | null
}

// Unified selection for info panel
export type InfoPanelSelection =
  | { type: 'track'; trackId: string }
  | { type: 'effect'; effectId: string }
  | { type: 'step'; trackId: string; stepIndex: number }
  | { type: 'routing'; routingId: string }
  | { type: 'preset'; presetId: string }
  | null

interface UIState {
  // Selection state for graphic panel
  selectedEffectId: string | null
  selectedParamIndex: number

  // Grid page state (0-4 for 5 pages: ACID, VISION, GLITCH, STRAND, MOTION)
  gridPage: number

  // Sequencer routing drag state
  sequencerDrag: SequencerDragState

  // Info panel selection (unified)
  infoPanelSelection: InfoPanelSelection

  setSelectedEffect: (id: string | null) => void
  setSelectedParamIndex: (index: number) => void

  // Grid page actions
  setGridPage: (page: number) => void
  nextGridPage: () => void
  prevGridPage: () => void

  // Sequencer drag actions
  startSequencerDrag: (trackId: string, trackColor: string) => void
  endSequencerDrag: () => void

  // Info panel selection actions
  selectTrack: (trackId: string) => void
  selectEffect: (effectId: string) => void
  selectStep: (trackId: string, stepIndex: number) => void
  selectRouting: (routingId: string) => void
  selectPreset: (presetId: string) => void
  clearInfoPanelSelection: () => void
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

  infoPanelSelection: null,

  setSelectedEffect: (id) => set({ selectedEffectId: id, selectedParamIndex: 0 }),
  setSelectedParamIndex: (index) => set({ selectedParamIndex: index }),

  setGridPage: (page) => set({ gridPage: Math.max(0, Math.min(4, page)) }),
  nextGridPage: () => set((state) => ({ gridPage: Math.min(4, state.gridPage + 1) })),
  prevGridPage: () => set((state) => ({ gridPage: Math.max(0, state.gridPage - 1) })),

  startSequencerDrag: (trackId, trackColor) => set({
    sequencerDrag: { isDragging: true, trackId, trackColor },
  }),
  endSequencerDrag: () => set({
    sequencerDrag: { isDragging: false, trackId: null, trackColor: null },
  }),

  // Info panel selection actions
  selectTrack: (trackId) => set({ infoPanelSelection: { type: 'track', trackId } }),
  selectEffect: (effectId) => set({ infoPanelSelection: { type: 'effect', effectId } }),
  selectStep: (trackId, stepIndex) => set({ infoPanelSelection: { type: 'step', trackId, stepIndex } }),
  selectRouting: (routingId) => set({ infoPanelSelection: { type: 'routing', routingId } }),
  selectPreset: (presetId) => set({ infoPanelSelection: { type: 'preset', presetId } }),
  clearInfoPanelSelection: () => set({ infoPanelSelection: null }),
}))
