import { create } from 'zustand'

export type SequencerType = 'steps' | 'slicer' | 'slot3' | 'slot4'

interface SequencerContainerState {
  activeSequencer: SequencerType
  setActiveSequencer: (id: SequencerType) => void
}

export const useSequencerContainerStore = create<SequencerContainerState>((set) => ({
  activeSequencer: 'steps',
  setActiveSequencer: (id) => set({ activeSequencer: id }),
}))
