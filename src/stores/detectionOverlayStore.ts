import { create } from 'zustand'

export interface DetectionOverlayParams {
  // Bounding box style
  boxColor: string
  boxOpacity: number
  boxLineWidth: number
  boxStyle: 'solid' | 'dashed' | 'corners'

  // Label style
  showLabels: boolean
  labelColor: string
  labelBgColor: string
  labelFontSize: number
  showConfidence: boolean
  customLabelText: string // e.g., "REPROGRAM" - empty = use detected class

  // Animation
  animateBoxes: boolean
  pulseSpeed: number
  glitchLabels: boolean
}

export const DEFAULT_DETECTION_OVERLAY_PARAMS: DetectionOverlayParams = {
  boxColor: '#00ff00',
  boxOpacity: 1.0,
  boxLineWidth: 2,
  boxStyle: 'solid',

  showLabels: true,
  labelColor: '#00ff00',
  labelBgColor: '#000000',
  labelFontSize: 12,
  showConfidence: false,
  customLabelText: '',

  animateBoxes: false,
  pulseSpeed: 1.0,
  glitchLabels: true,
}

interface DetectionOverlayState {
  enabled: boolean
  params: DetectionOverlayParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<DetectionOverlayParams>) => void
  reset: () => void
}

export const useDetectionOverlayStore = create<DetectionOverlayState>((set) => ({
  enabled: false,
  params: { ...DEFAULT_DETECTION_OVERLAY_PARAMS },

  setEnabled: (enabled) => set({ enabled }),
  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),
  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_DETECTION_OVERLAY_PARAMS },
  }),
}))
