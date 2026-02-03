import { create } from 'zustand'

export type SequencerType = 'slicer' | 'euclidean' | 'ricochet'

interface SequencerContainerState {
  activeSequencer: SequencerType
  setActiveSequencer: (id: SequencerType) => void
}

export const useSequencerContainerStore = create<SequencerContainerState>((set) => ({
  activeSequencer: 'slicer',
  setActiveSequencer: (id) => set({ activeSequencer: id }),
}))
