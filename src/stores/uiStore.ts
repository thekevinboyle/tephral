import { create } from 'zustand'

interface UIState {
  // Selection state for graphic panel
  selectedEffectId: string | null
  selectedParamIndex: number

  setSelectedEffect: (id: string | null) => void
  setSelectedParamIndex: (index: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedEffectId: null,
  selectedParamIndex: 0,

  setSelectedEffect: (id) => set({ selectedEffectId: id, selectedParamIndex: 0 }),
  setSelectedParamIndex: (index) => set({ selectedParamIndex: index }),
}))
