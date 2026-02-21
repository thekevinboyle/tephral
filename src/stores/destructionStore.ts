import { create } from 'zustand'
import {
  DEFAULT_DATAMOSH_PARAMS,
  DEFAULT_PIXEL_SORT_PARAMS,
  DEFAULT_SONIFY_PARAMS,
  DEFAULT_POINT_CLOUD_PARAMS,
  type DatamoshParams,
  type PixelSortParams,
  type SonifyParams,
  type PointCloudParams,
} from '../effects/glitch-engine'

// Re-export for convenience
export type { DatamoshParams, PixelSortParams, SonifyParams, PointCloudParams }

interface DestructionState {
  // Enable states
  datamoshEnabled: boolean
  pixelSortEnabled: boolean
  sonifyEnabled: boolean
  pointCloudEnabled: boolean

  // Parameters
  datamoshParams: DatamoshParams
  pixelSortParams: PixelSortParams
  sonifyParams: SonifyParams
  pointCloudParams: PointCloudParams

  // Actions
  setDatamoshEnabled: (enabled: boolean) => void
  updateDatamoshParams: (params: Partial<DatamoshParams>) => void
  setPixelSortEnabled: (enabled: boolean) => void
  updatePixelSortParams: (params: Partial<PixelSortParams>) => void
  setSonifyEnabled: (enabled: boolean) => void
  updateSonifyParams: (params: Partial<SonifyParams>) => void
  setPointCloudEnabled: (enabled: boolean) => void
  updatePointCloudParams: (params: Partial<PointCloudParams>) => void

  // Snapshot for presets
  getSnapshot: () => DestructionSnapshot
  applySnapshot: (snapshot: DestructionSnapshot) => void
}

export interface DestructionSnapshot {
  datamoshEnabled: boolean
  datamoshParams: DatamoshParams
  pixelSortEnabled: boolean
  pixelSortParams: PixelSortParams
  sonifyEnabled: boolean
  sonifyParams: SonifyParams
  pointCloudEnabled: boolean
  pointCloudParams: PointCloudParams
}

export const useDestructionStore = create<DestructionState>((set, get) => ({
  datamoshEnabled: false,
  datamoshParams: { ...DEFAULT_DATAMOSH_PARAMS, chaos: 0.7 },

  pixelSortEnabled: false,
  pixelSortParams: { ...DEFAULT_PIXEL_SORT_PARAMS },

  sonifyEnabled: false,
  sonifyParams: { ...DEFAULT_SONIFY_PARAMS },

  pointCloudEnabled: false,
  pointCloudParams: { ...DEFAULT_POINT_CLOUD_PARAMS },

  setDatamoshEnabled: (enabled) => set({ datamoshEnabled: enabled }),
  updateDatamoshParams: (params) => set((state) => ({
    datamoshParams: { ...state.datamoshParams, ...params },
  })),

  setPixelSortEnabled: (enabled) => set({ pixelSortEnabled: enabled }),
  updatePixelSortParams: (params) => set((state) => ({
    pixelSortParams: { ...state.pixelSortParams, ...params },
  })),

  setSonifyEnabled: (enabled) => set({ sonifyEnabled: enabled }),
  updateSonifyParams: (params) => set((state) => ({
    sonifyParams: { ...state.sonifyParams, ...params },
  })),

  setPointCloudEnabled: (enabled) => set({ pointCloudEnabled: enabled }),
  updatePointCloudParams: (params) => set((state) => ({
    pointCloudParams: { ...state.pointCloudParams, ...params },
  })),

  getSnapshot: () => {
    const state = get()
    return {
      datamoshEnabled: state.datamoshEnabled,
      datamoshParams: { ...state.datamoshParams },
      pixelSortEnabled: state.pixelSortEnabled,
      pixelSortParams: { ...state.pixelSortParams },
      sonifyEnabled: state.sonifyEnabled,
      sonifyParams: { ...state.sonifyParams },
      pointCloudEnabled: state.pointCloudEnabled,
      pointCloudParams: { ...state.pointCloudParams },
    }
  },

  applySnapshot: (snapshot) => set({
    datamoshEnabled: snapshot.datamoshEnabled,
    datamoshParams: { ...snapshot.datamoshParams },
    pixelSortEnabled: snapshot.pixelSortEnabled,
    pixelSortParams: { ...snapshot.pixelSortParams },
    sonifyEnabled: snapshot.sonifyEnabled ?? false,
    sonifyParams: snapshot.sonifyParams ? { ...snapshot.sonifyParams } : { ...DEFAULT_SONIFY_PARAMS },
    pointCloudEnabled: snapshot.pointCloudEnabled ?? false,
    pointCloudParams: snapshot.pointCloudParams ? { ...snapshot.pointCloudParams } : { ...DEFAULT_POINT_CLOUD_PARAMS },
  }),
}))
