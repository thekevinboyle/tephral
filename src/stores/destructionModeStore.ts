import { create } from 'zustand'

interface DestructionModeState {
  active: boolean
  escapeHeldStart: number | null
  activate: () => void
  deactivate: () => void
  setEscapeHeldStart: (time: number | null) => void
}

export const useDestructionModeStore = create<DestructionModeState>((set) => ({
  active: false,
  escapeHeldStart: null,

  activate: () => set({ active: true }),
  deactivate: () => set({ active: false, escapeHeldStart: null }),
  setEscapeHeldStart: (time) => set({ escapeHeldStart: time }),
}))
