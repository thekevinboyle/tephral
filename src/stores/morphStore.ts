import { create } from 'zustand'
import {
  DEFAULT_FACE_HUD_PARAMS,
  type FaceHudParams,
} from '../effects/morph'

export type { FaceHudParams }

interface MorphState {
  faceHudEnabled: boolean
  faceHudParams: FaceHudParams

  setFaceHudEnabled: (enabled: boolean) => void
  updateFaceHudParams: (params: Partial<FaceHudParams>) => void
}

export const useMorphStore = create<MorphState>((set) => ({
  faceHudEnabled: false,
  faceHudParams: { ...DEFAULT_FACE_HUD_PARAMS },

  setFaceHudEnabled: (enabled) => set({ faceHudEnabled: enabled }),
  updateFaceHudParams: (params) => set((state) => ({
    faceHudParams: { ...state.faceHudParams, ...params },
  })),
}))
