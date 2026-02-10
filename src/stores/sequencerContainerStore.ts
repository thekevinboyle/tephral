import { create } from 'zustand'

// SequencerContainer holds Slicer, Euclidean, and Step sequencers as tabs
export type SequencerType = 'slicer' | 'euclid' | 'steps'

interface SequencerContainerState {
  activeSequencer: SequencerType
  setActiveSequencer: (id: SequencerType) => void
}

export const useSequencerContainerStore = create<SequencerContainerState>((set) => ({
  activeSequencer: 'slicer',
  setActiveSequencer: (id) => set({ activeSequencer: id }),
}))
