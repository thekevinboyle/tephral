import { create } from 'zustand'
import { useEffectSequencerStore } from './effectSequencerStore'

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

export type PanelId = 'browser' | 'inspector' | 'bottom'
export type DrawerPanel = 'browser' | 'inspector'
export type BottomTab = 'devices' | 'sequencer'

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

  // Bottom panel state
  bottomPanelTab: string | null  // null = collapsed, string = active tab name
  bottomPanelPage: number        // 1-indexed page within active tab

  // Shell panels (Bitwig-style). Browser/inspector/bottom visibility, bottom tab, modulator selection.
  showBrowser: boolean
  showInspector: boolean
  showBottom: boolean
  bottomTab: BottomTab
  selectedModulator: string | null  // 'lfo-0'..'lfo-3' | 'random' | 'step' | 'envelope' | 'sampleHold' | 'midi' | 'audio'
  // Below 1100px the browser/inspector are drawers; at most one is open
  drawer: DrawerPanel | null
  togglePanel: (p: PanelId) => void
  toggleDrawer: (p: DrawerPanel) => void
  closeDrawer: () => void
  setBottomTab: (t: BottomTab) => void
  setSelectedModulator: (id: string | null) => void

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

  // Bottom panel actions
  toggleBottomPanelTab: (tab: string) => void
  setBottomPanelPage: (page: number) => void
  nextBottomPanelPage: () => void
  prevBottomPanelPage: () => void

  // Status bar
  statusText: string | null
  setStatusText: (text: string | null) => void
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
  bottomPanelTab: null,
  bottomPanelPage: 1,
  statusText: null,

  showBrowser: true,
  showInspector: true,
  showBottom: true,
  bottomTab: 'devices',
  selectedModulator: null,
  drawer: null,

  togglePanel: (p) => set((state) =>
    p === 'browser' ? { showBrowser: !state.showBrowser }
    : p === 'inspector' ? { showInspector: !state.showInspector }
    : { showBottom: !state.showBottom }),
  toggleDrawer: (p) => set((state) => ({ drawer: state.drawer === p ? null : p })),
  closeDrawer: () => set({ drawer: null }),
  setBottomTab: (t) => set({ bottomTab: t }),
  setSelectedModulator: (id) => set(id != null ? { selectedModulator: id, selectedEffectId: null } : { selectedModulator: null }),

  setSelectedEffect: (id) => {
    // A step selection on another track would immediately re-select that
    // track (UnifiedSequencerPanel's auto-switch), overriding this call —
    // selectedStep must always belong to selectedEffectId or be null.
    const { selectedStep, clearSelection } = useEffectSequencerStore.getState()
    if (selectedStep && selectedStep.effectId !== id) clearSelection()
    set(id != null ? { selectedEffectId: id, selectedParamIndex: 0, selectedModulator: null } : { selectedEffectId: id, selectedParamIndex: 0 })
  },
  setSelectedParamIndex: (index) => set({ selectedParamIndex: index }),

  setGridPage: (page) => set({ gridPage: Math.max(0, Math.min(5, page)) }),
  nextGridPage: () => set((state) => ({ gridPage: Math.min(5, state.gridPage + 1) })),
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

  toggleBottomPanelTab: (tab) => set((state) => ({
    bottomPanelTab: state.bottomPanelTab === tab ? null : tab,
    bottomPanelPage: state.bottomPanelTab === tab ? state.bottomPanelPage : 1,
  })),
  setBottomPanelPage: (page) => set({ bottomPanelPage: Math.max(1, Math.min(4, page)) }),
  nextBottomPanelPage: () => set((state) => ({ bottomPanelPage: Math.min(4, state.bottomPanelPage + 1) })),
  prevBottomPanelPage: () => set((state) => ({ bottomPanelPage: Math.max(1, state.bottomPanelPage - 1) })),

  setStatusText: (text) => set({ statusText: text }),
}))
