import { create } from 'zustand'

// SequencerContainer holds both Slicer and Euclidean sequencers as tabs
// Ricochet sequencer is in SequencerPanel
export type SequencerType = 'slicer' | 'euclid'

interface SequencerContainerState {
  activeSequencer: SequencerType
  setActiveSequencer: (id: SequencerType) => void
}

export const useSequencerContainerStore = create<SequencerContainerState>((set) => ({
  activeSequencer: 'slicer',
  setActiveSequencer: (id) => set({ activeSequencer: id }),
}))
