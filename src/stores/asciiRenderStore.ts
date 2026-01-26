import { create } from 'zustand'

export type AsciiMode = 'standard' | 'matrix' | 'blocks' | 'braille'

export interface AsciiRenderParams {
  // Character set
  mode: AsciiMode
  customChars: string    // custom character ramp (dark to light)
  fontSize: number

  // Colors
  colorMode: 'mono' | 'original' | 'gradient'
  monoColor: string
  gradientStart: string
  gradientEnd: string
  backgroundColor: string

  // Rendering
  resolution: number     // cell size in pixels
  contrast: number       // 0-2
  invert: boolean

  // Matrix mode specific
  matrixSpeed: number
  matrixDensity: number
  matrixTrailLength: number

  // Masking
  maskToDetections: boolean  // only render ASCII inside detected regions
}

export const DEFAULT_ASCII_PARAMS: AsciiRenderParams = {
  mode: 'standard',
  customChars: ' .:-=+*#%@',
  fontSize: 10,

  colorMode: 'mono',
  monoColor: '#00ff00',
  gradientStart: '#000000',
  gradientEnd: '#00ff00',
  backgroundColor: '#000000',

  resolution: 8,
  contrast: 1.0,
  invert: false,

  matrixSpeed: 1.0,
  matrixDensity: 0.8,
  matrixTrailLength: 20,

  maskToDetections: false,
}

// Character ramps for different modes
export const ASCII_CHAR_SETS: Record<AsciiMode, string> = {
  standard: ' .:-=+*#%@',
  matrix: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789',
  blocks: ' ░▒▓█',
  braille: ' ⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿',
}

interface AsciiRenderState {
  enabled: boolean
  params: AsciiRenderParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<AsciiRenderParams>) => void
  reset: () => void
}

export const useAsciiRenderStore = create<AsciiRenderState>((set) => ({
  enabled: false,
  params: { ...DEFAULT_ASCII_PARAMS },

  setEnabled: (enabled) => set({ enabled }),
  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),
  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_ASCII_PARAMS },
  }),
}))
