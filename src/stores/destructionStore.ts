import { create } from 'zustand'
import {
  DEFAULT_DATAMOSH_PARAMS,
  DEFAULT_PIXEL_SORT_PARAMS,
  type DatamoshParams,
  type PixelSortParams,
} from '../effects/glitch-engine'

// Re-export for convenience
export type { DatamoshParams, PixelSortParams }

interface DestructionState {
  // Enable states
  datamoshEnabled: boolean
  pixelSortEnabled: boolean

  // Parameters
  datamoshParams: DatamoshParams
  pixelSortParams: PixelSortParams

  // Actions
  setDatamoshEnabled: (enabled: boolean) => void
  updateDatamoshParams: (params: Partial<DatamoshParams>) => void
  setPixelSortEnabled: (enabled: boolean) => void
  updatePixelSortParams: (params: Partial<PixelSortParams>) => void

  // Snapshot for presets
  getSnapshot: () => DestructionSnapshot
  applySnapshot: (snapshot: DestructionSnapshot) => void
}

export interface DestructionSnapshot {
  datamoshEnabled: boolean
  datamoshParams: DatamoshParams
  pixelSortEnabled: boolean
  pixelSortParams: PixelSortParams
}

export const useDestructionStore = create<DestructionState>((set, get) => ({
  datamoshEnabled: false,
  datamoshParams: { ...DEFAULT_DATAMOSH_PARAMS, chaos: 0.7 },

  pixelSortEnabled: false,
  pixelSortParams: { ...DEFAULT_PIXEL_SORT_PARAMS },

  setDatamoshEnabled: (enabled) => set({ datamoshEnabled: enabled }),
  updateDatamoshParams: (params) => set((state) => ({
    datamoshParams: { ...state.datamoshParams, ...params },
  })),

  setPixelSortEnabled: (enabled) => set({ pixelSortEnabled: enabled }),
  updatePixelSortParams: (params) => set((state) => ({
    pixelSortParams: { ...state.pixelSortParams, ...params },
  })),

  getSnapshot: () => {
    const state = get()
    return {
      datamoshEnabled: state.datamoshEnabled,
      datamoshParams: { ...state.datamoshParams },
      pixelSortEnabled: state.pixelSortEnabled,
      pixelSortParams: { ...state.pixelSortParams },
    }
  },

  applySnapshot: (snapshot) => set({
    datamoshEnabled: snapshot.datamoshEnabled,
    datamoshParams: { ...snapshot.datamoshParams },
    pixelSortEnabled: snapshot.pixelSortEnabled,
    pixelSortParams: { ...snapshot.pixelSortParams },
  }),
}))
