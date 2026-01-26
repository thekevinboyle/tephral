import { create } from 'zustand'
import {
  type RGBSplitParams,
  DEFAULT_RGB_SPLIT_PARAMS
} from '../effects/glitch-engine/RGBSplitEffect'
import {
  type BlockDisplaceParams,
  DEFAULT_BLOCK_DISPLACE_PARAMS
} from '../effects/glitch-engine/BlockDisplaceEffect'
import {
  type ScanLinesParams,
  DEFAULT_SCAN_LINES_PARAMS
} from '../effects/glitch-engine/ScanLinesEffect'
import {
  type NoiseParams,
  DEFAULT_NOISE_PARAMS
} from '../effects/glitch-engine/NoiseEffect'
import {
  type PixelateParams,
  DEFAULT_PIXELATE_PARAMS
} from '../effects/glitch-engine/PixelateEffect'
import {
  type EdgeDetectionParams,
  DEFAULT_EDGE_DETECTION_PARAMS
} from '../effects/glitch-engine/EdgeDetectionEffect'

interface GlitchEngineState {
  enabled: boolean

  rgbSplitEnabled: boolean
  blockDisplaceEnabled: boolean
  scanLinesEnabled: boolean
  noiseEnabled: boolean
  pixelateEnabled: boolean
  edgeDetectionEnabled: boolean

  rgbSplit: RGBSplitParams
  blockDisplace: BlockDisplaceParams
  scanLines: ScanLinesParams
  noise: NoiseParams
  pixelate: PixelateParams
  edgeDetection: EdgeDetectionParams

  // Mix controls
  wetMix: number        // 0-1, default 1 (100% wet)
  bypassActive: boolean // true while kill switch held

  // Per-effect bypass (double-click to mute)
  effectBypassed: Record<string, boolean>
  toggleEffectBypassed: (effectId: string) => void

  setEnabled: (enabled: boolean) => void
  setRGBSplitEnabled: (enabled: boolean) => void
  setBlockDisplaceEnabled: (enabled: boolean) => void
  setScanLinesEnabled: (enabled: boolean) => void
  setNoiseEnabled: (enabled: boolean) => void
  setPixelateEnabled: (enabled: boolean) => void
  setEdgeDetectionEnabled: (enabled: boolean) => void
  updateRGBSplit: (params: Partial<RGBSplitParams>) => void
  updateBlockDisplace: (params: Partial<BlockDisplaceParams>) => void
  updateScanLines: (params: Partial<ScanLinesParams>) => void
  updateNoise: (params: Partial<NoiseParams>) => void
  updatePixelate: (params: Partial<PixelateParams>) => void
  updateEdgeDetection: (params: Partial<EdgeDetectionParams>) => void
  setWetMix: (value: number) => void
  setBypassActive: (active: boolean) => void
  reset: () => void
}

export const useGlitchEngineStore = create<GlitchEngineState>((set) => ({
  enabled: true,

  rgbSplitEnabled: true,
  blockDisplaceEnabled: false,
  scanLinesEnabled: false,
  noiseEnabled: false,
  pixelateEnabled: false,
  edgeDetectionEnabled: false,

  rgbSplit: { ...DEFAULT_RGB_SPLIT_PARAMS },
  blockDisplace: { ...DEFAULT_BLOCK_DISPLACE_PARAMS },
  scanLines: { ...DEFAULT_SCAN_LINES_PARAMS },
  noise: { ...DEFAULT_NOISE_PARAMS },
  pixelate: { ...DEFAULT_PIXELATE_PARAMS },
  edgeDetection: { ...DEFAULT_EDGE_DETECTION_PARAMS },

  wetMix: 1,
  bypassActive: false,

  effectBypassed: {},

  toggleEffectBypassed: (effectId) => set((state) => ({
    effectBypassed: {
      ...state.effectBypassed,
      [effectId]: !state.effectBypassed[effectId]
    }
  })),

  setEnabled: (enabled) => set({ enabled }),
  setRGBSplitEnabled: (enabled) => set({ rgbSplitEnabled: enabled }),
  setBlockDisplaceEnabled: (enabled) => set({ blockDisplaceEnabled: enabled }),
  setScanLinesEnabled: (enabled) => set({ scanLinesEnabled: enabled }),
  setNoiseEnabled: (enabled) => set({ noiseEnabled: enabled }),
  setPixelateEnabled: (enabled) => set({ pixelateEnabled: enabled }),
  setEdgeDetectionEnabled: (enabled) => set({ edgeDetectionEnabled: enabled }),

  updateRGBSplit: (params) => set((state) => ({
    rgbSplit: { ...state.rgbSplit, ...params }
  })),
  updateBlockDisplace: (params) => set((state) => ({
    blockDisplace: { ...state.blockDisplace, ...params }
  })),
  updateScanLines: (params) => set((state) => ({
    scanLines: { ...state.scanLines, ...params }
  })),
  updateNoise: (params) => set((state) => ({
    noise: { ...state.noise, ...params }
  })),
  updatePixelate: (params) => set((state) => ({
    pixelate: { ...state.pixelate, ...params }
  })),
  updateEdgeDetection: (params) => set((state) => ({
    edgeDetection: { ...state.edgeDetection, ...params }
  })),

  setWetMix: (value) => set({ wetMix: Math.max(0, Math.min(1, value)) }),
  setBypassActive: (active) => set({ bypassActive: active }),

  reset: () => set({
    enabled: true,
    rgbSplitEnabled: true,
    blockDisplaceEnabled: false,
    scanLinesEnabled: false,
    noiseEnabled: false,
    pixelateEnabled: false,
    edgeDetectionEnabled: false,
    rgbSplit: { ...DEFAULT_RGB_SPLIT_PARAMS },
    blockDisplace: { ...DEFAULT_BLOCK_DISPLACE_PARAMS },
    scanLines: { ...DEFAULT_SCAN_LINES_PARAMS },
    noise: { ...DEFAULT_NOISE_PARAMS },
    pixelate: { ...DEFAULT_PIXELATE_PARAMS },
    edgeDetection: { ...DEFAULT_EDGE_DETECTION_PARAMS },
  }),
}))
