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

  // Drawer state for responsive panels
  leftDrawerOpen: boolean
  rightDrawerOpen: boolean

  setSelectedEffect: (id: string | null) => void
  setSelectedParamIndex: (index: number) => void

  // Grid page actions
  setGridPage: (page: number) => void
  nextGridPage: () => void
  prevGridPage: () => void

  // Sequencer drag actions
  startSequencerDrag: (trackId: string, trackColor: string) => void
  endSequencerDrag: () => void

  // Drawer actions
  setLeftDrawerOpen: (open: boolean) => void
  setRightDrawerOpen: (open: boolean) => void
  toggleLeftDrawer: () => void
  toggleRightDrawer: () => void
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

  leftDrawerOpen: false,
  rightDrawerOpen: false,

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

  setLeftDrawerOpen: (open) => set({ leftDrawerOpen: open }),
  setRightDrawerOpen: (open) => set({ rightDrawerOpen: open }),
  toggleLeftDrawer: () => set((s) => ({ leftDrawerOpen: !s.leftDrawerOpen })),
  toggleRightDrawer: () => set((s) => ({ rightDrawerOpen: !s.rightDrawerOpen })),
}))
