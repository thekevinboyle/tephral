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

interface GlitchEngineState {
  enabled: boolean

  rgbSplitEnabled: boolean
  blockDisplaceEnabled: boolean
  scanLinesEnabled: boolean

  rgbSplit: RGBSplitParams
  blockDisplace: BlockDisplaceParams
  scanLines: ScanLinesParams

  setEnabled: (enabled: boolean) => void
  setRGBSplitEnabled: (enabled: boolean) => void
  setBlockDisplaceEnabled: (enabled: boolean) => void
  setScanLinesEnabled: (enabled: boolean) => void
  updateRGBSplit: (params: Partial<RGBSplitParams>) => void
  updateBlockDisplace: (params: Partial<BlockDisplaceParams>) => void
  updateScanLines: (params: Partial<ScanLinesParams>) => void
  reset: () => void
}

export const useGlitchEngineStore = create<GlitchEngineState>((set) => ({
  enabled: true,

  rgbSplitEnabled: true,
  blockDisplaceEnabled: false,
  scanLinesEnabled: false,

  rgbSplit: { ...DEFAULT_RGB_SPLIT_PARAMS },
  blockDisplace: { ...DEFAULT_BLOCK_DISPLACE_PARAMS },
  scanLines: { ...DEFAULT_SCAN_LINES_PARAMS },

  setEnabled: (enabled) => set({ enabled }),
  setRGBSplitEnabled: (enabled) => set({ rgbSplitEnabled: enabled }),
  setBlockDisplaceEnabled: (enabled) => set({ blockDisplaceEnabled: enabled }),
  setScanLinesEnabled: (enabled) => set({ scanLinesEnabled: enabled }),

  updateRGBSplit: (params) => set((state) => ({
    rgbSplit: { ...state.rgbSplit, ...params }
  })),
  updateBlockDisplace: (params) => set((state) => ({
    blockDisplace: { ...state.blockDisplace, ...params }
  })),
  updateScanLines: (params) => set((state) => ({
    scanLines: { ...state.scanLines, ...params }
  })),

  reset: () => set({
    enabled: true,
    rgbSplitEnabled: true,
    blockDisplaceEnabled: false,
    scanLinesEnabled: false,
    rgbSplit: { ...DEFAULT_RGB_SPLIT_PARAMS },
    blockDisplace: { ...DEFAULT_BLOCK_DISPLACE_PARAMS },
    scanLines: { ...DEFAULT_SCAN_LINES_PARAMS },
  }),
}))
