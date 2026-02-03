import { create } from 'zustand'

// SequencerContainer now only holds the Slicer
// Euclidean and Ricochet sequencers are in SequencerPanel
export type SequencerType = 'slicer'

interface SequencerContainerState {
  activeSequencer: SequencerType
  setActiveSequencer: (id: SequencerType) => void
}

export const useSequencerContainerStore = create<SequencerContainerState>((set) => ({
  activeSequencer: 'slicer',
  setActiveSequencer: (id) => set({ activeSequencer: id }),
}))
