import { create } from 'zustand'

// SequencerContainer holds Effect Sequencer, Slicer, and other sequencers as tabs
export type SequencerType = 'effects' | 'slicer' | 'euclid' | 'steps'

interface SequencerContainerState {
  activeSequencer: SequencerType
  setActiveSequencer: (id: SequencerType) => void
}

export const useSequencerContainerStore = create<SequencerContainerState>((set) => ({
  activeSequencer: 'effects',
  setActiveSequencer: (id) => set({ activeSequencer: id }),
}))
