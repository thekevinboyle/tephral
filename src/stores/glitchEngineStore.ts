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
import {
  type ChromaticAberrationParams,
  DEFAULT_CHROMATIC_ABERRATION_PARAMS
} from '../effects/glitch-engine/ChromaticAberrationEffect'
import {
  type VHSTrackingParams,
  DEFAULT_VHS_TRACKING_PARAMS
} from '../effects/glitch-engine/VHSTrackingEffect'
import {
  type LensDistortionParams,
  DEFAULT_LENS_DISTORTION_PARAMS
} from '../effects/glitch-engine/LensDistortionEffect'
import {
  type DitherParams,
  DEFAULT_DITHER_PARAMS
} from '../effects/glitch-engine/DitherEffect'
import {
  type PosterizeParams,
  DEFAULT_POSTERIZE_PARAMS
} from '../effects/glitch-engine/PosterizeEffect'
import {
  type StaticDisplacementParams,
  DEFAULT_STATIC_DISPLACEMENT_PARAMS
} from '../effects/glitch-engine/StaticDisplacementEffect'
import {
  type ColorGradeParams,
  DEFAULT_COLOR_GRADE_PARAMS
} from '../effects/glitch-engine/ColorGradeEffect'
import {
  type FeedbackLoopParams,
  DEFAULT_FEEDBACK_LOOP_PARAMS
} from '../effects/glitch-engine/FeedbackLoopEffect'

export interface GlitchSnapshot {
  rgbSplitEnabled: boolean
  rgbSplit: RGBSplitParams
  blockDisplaceEnabled: boolean
  blockDisplace: BlockDisplaceParams
  scanLinesEnabled: boolean
  scanLines: ScanLinesParams
  noiseEnabled: boolean
  noise: NoiseParams
  pixelateEnabled: boolean
  pixelate: PixelateParams
  edgeDetectionEnabled: boolean
  edgeDetection: EdgeDetectionParams
  chromaticAberrationEnabled: boolean
  chromaticAberration: ChromaticAberrationParams
  vhsTrackingEnabled: boolean
  vhsTracking: VHSTrackingParams
  lensDistortionEnabled: boolean
  lensDistortion: LensDistortionParams
  ditherEnabled: boolean
  dither: DitherParams
  posterizeEnabled: boolean
  posterize: PosterizeParams
  staticDisplacementEnabled: boolean
  staticDisplacement: StaticDisplacementParams
  colorGradeEnabled: boolean
  colorGrade: ColorGradeParams
  feedbackLoopEnabled: boolean
  feedbackLoop: FeedbackLoopParams
  wetMix: number
}

interface GlitchEngineState {
  enabled: boolean

  rgbSplitEnabled: boolean
  blockDisplaceEnabled: boolean
  scanLinesEnabled: boolean
  noiseEnabled: boolean
  pixelateEnabled: boolean
  edgeDetectionEnabled: boolean
  chromaticAberrationEnabled: boolean
  vhsTrackingEnabled: boolean
  lensDistortionEnabled: boolean
  ditherEnabled: boolean
  posterizeEnabled: boolean
  staticDisplacementEnabled: boolean
  colorGradeEnabled: boolean
  feedbackLoopEnabled: boolean

  rgbSplit: RGBSplitParams
  blockDisplace: BlockDisplaceParams
  scanLines: ScanLinesParams
  noise: NoiseParams
  pixelate: PixelateParams
  edgeDetection: EdgeDetectionParams
  chromaticAberration: ChromaticAberrationParams
  vhsTracking: VHSTrackingParams
  lensDistortion: LensDistortionParams
  dither: DitherParams
  posterize: PosterizeParams
  staticDisplacement: StaticDisplacementParams
  colorGrade: ColorGradeParams
  feedbackLoop: FeedbackLoopParams

  // Mix controls
  wetMix: number        // 0-1, default 1 (100% wet)
  bypassActive: boolean // true while kill switch held

  // Per-effect bypass (double-click to mute)
  effectBypassed: Record<string, boolean>
  toggleEffectBypassed: (effectId: string) => void

  // Per-effect mix (dry/wet, 0-1)
  effectMix: Record<string, number>
  setEffectMix: (effectId: string, value: number) => void
  getEffectMix: (effectId: string) => number

  // Solo state
  soloEffectId: string | null    // which effect is soloed (null = no solo)
  soloLatched: boolean           // true if latched, false if momentary
  setSolo: (effectId: string | null, latched: boolean) => void
  clearSolo: () => void

  setEnabled: (enabled: boolean) => void
  setRGBSplitEnabled: (enabled: boolean) => void
  setBlockDisplaceEnabled: (enabled: boolean) => void
  setScanLinesEnabled: (enabled: boolean) => void
  setNoiseEnabled: (enabled: boolean) => void
  setPixelateEnabled: (enabled: boolean) => void
  setEdgeDetectionEnabled: (enabled: boolean) => void
  setChromaticAberrationEnabled: (enabled: boolean) => void
  setVHSTrackingEnabled: (enabled: boolean) => void
  setLensDistortionEnabled: (enabled: boolean) => void
  setDitherEnabled: (enabled: boolean) => void
  setPosterizeEnabled: (enabled: boolean) => void
  setStaticDisplacementEnabled: (enabled: boolean) => void
  setColorGradeEnabled: (enabled: boolean) => void
  setFeedbackLoopEnabled: (enabled: boolean) => void
  updateRGBSplit: (params: Partial<RGBSplitParams>) => void
  updateBlockDisplace: (params: Partial<BlockDisplaceParams>) => void
  updateScanLines: (params: Partial<ScanLinesParams>) => void
  updateNoise: (params: Partial<NoiseParams>) => void
  updatePixelate: (params: Partial<PixelateParams>) => void
  updateEdgeDetection: (params: Partial<EdgeDetectionParams>) => void
  updateChromaticAberration: (params: Partial<ChromaticAberrationParams>) => void
  updateVHSTracking: (params: Partial<VHSTrackingParams>) => void
  updateLensDistortion: (params: Partial<LensDistortionParams>) => void
  updateDither: (params: Partial<DitherParams>) => void
  updatePosterize: (params: Partial<PosterizeParams>) => void
  updateStaticDisplacement: (params: Partial<StaticDisplacementParams>) => void
  updateColorGrade: (params: Partial<ColorGradeParams>) => void
  updateFeedbackLoop: (params: Partial<FeedbackLoopParams>) => void
  setWetMix: (value: number) => void
  setBypassActive: (active: boolean) => void
  reset: () => void
  getSnapshot: () => GlitchSnapshot
  applySnapshot: (snapshot: GlitchSnapshot) => void
}

export const useGlitchEngineStore = create<GlitchEngineState>((set, get) => ({
  enabled: true,

  rgbSplitEnabled: false,
  blockDisplaceEnabled: false,
  scanLinesEnabled: false,
  noiseEnabled: false,
  pixelateEnabled: false,
  edgeDetectionEnabled: false,
  chromaticAberrationEnabled: false,
  vhsTrackingEnabled: false,
  lensDistortionEnabled: false,
  ditherEnabled: false,
  posterizeEnabled: false,
  staticDisplacementEnabled: false,
  colorGradeEnabled: false,
  feedbackLoopEnabled: false,

  rgbSplit: { ...DEFAULT_RGB_SPLIT_PARAMS },
  blockDisplace: { ...DEFAULT_BLOCK_DISPLACE_PARAMS },
  scanLines: { ...DEFAULT_SCAN_LINES_PARAMS },
  noise: { ...DEFAULT_NOISE_PARAMS },
  pixelate: { ...DEFAULT_PIXELATE_PARAMS },
  edgeDetection: { ...DEFAULT_EDGE_DETECTION_PARAMS },
  chromaticAberration: { ...DEFAULT_CHROMATIC_ABERRATION_PARAMS },
  vhsTracking: { ...DEFAULT_VHS_TRACKING_PARAMS },
  lensDistortion: { ...DEFAULT_LENS_DISTORTION_PARAMS },
  dither: { ...DEFAULT_DITHER_PARAMS },
  posterize: { ...DEFAULT_POSTERIZE_PARAMS },
  staticDisplacement: { ...DEFAULT_STATIC_DISPLACEMENT_PARAMS },
  colorGrade: { ...DEFAULT_COLOR_GRADE_PARAMS },
  feedbackLoop: { ...DEFAULT_FEEDBACK_LOOP_PARAMS },

  wetMix: 1,
  bypassActive: false,

  effectBypassed: {},

  toggleEffectBypassed: (effectId) => set((state) => ({
    effectBypassed: {
      ...state.effectBypassed,
      [effectId]: !state.effectBypassed[effectId]
    }
  })),

  effectMix: {},

  setEffectMix: (effectId, value) => set((state) => ({
    effectMix: {
      ...state.effectMix,
      [effectId]: Math.max(0, Math.min(1, value))
    }
  })),

  getEffectMix: (effectId) => {
    const state = get()
    return state.effectMix[effectId] ?? 1
  },

  // Solo state
  soloEffectId: null,
  soloLatched: false,

  setSolo: (effectId, latched) => set({ soloEffectId: effectId, soloLatched: latched }),
  clearSolo: () => set({ soloEffectId: null, soloLatched: false }),

  setEnabled: (enabled) => set({ enabled }),
  setRGBSplitEnabled: (enabled) => set({ rgbSplitEnabled: enabled }),
  setBlockDisplaceEnabled: (enabled) => set({ blockDisplaceEnabled: enabled }),
  setScanLinesEnabled: (enabled) => set({ scanLinesEnabled: enabled }),
  setNoiseEnabled: (enabled) => set({ noiseEnabled: enabled }),
  setPixelateEnabled: (enabled) => set({ pixelateEnabled: enabled }),
  setEdgeDetectionEnabled: (enabled) => set({ edgeDetectionEnabled: enabled }),
  setChromaticAberrationEnabled: (enabled) => set({ chromaticAberrationEnabled: enabled }),
  setVHSTrackingEnabled: (enabled) => set({ vhsTrackingEnabled: enabled }),
  setLensDistortionEnabled: (enabled) => set({ lensDistortionEnabled: enabled }),
  setDitherEnabled: (enabled) => set({ ditherEnabled: enabled }),
  setPosterizeEnabled: (enabled) => set({ posterizeEnabled: enabled }),
  setStaticDisplacementEnabled: (enabled) => set({ staticDisplacementEnabled: enabled }),
  setColorGradeEnabled: (enabled) => set({ colorGradeEnabled: enabled }),
  setFeedbackLoopEnabled: (enabled) => set({ feedbackLoopEnabled: enabled }),

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
  updateChromaticAberration: (params) => set((state) => ({
    chromaticAberration: { ...state.chromaticAberration, ...params }
  })),
  updateVHSTracking: (params) => set((state) => ({
    vhsTracking: { ...state.vhsTracking, ...params }
  })),
  updateLensDistortion: (params) => set((state) => ({
    lensDistortion: { ...state.lensDistortion, ...params }
  })),
  updateDither: (params) => set((state) => ({
    dither: { ...state.dither, ...params }
  })),
  updatePosterize: (params) => set((state) => ({
    posterize: { ...state.posterize, ...params }
  })),
  updateStaticDisplacement: (params) => set((state) => ({
    staticDisplacement: { ...state.staticDisplacement, ...params }
  })),
  updateColorGrade: (params) => set((state) => ({
    colorGrade: { ...state.colorGrade, ...params }
  })),
  updateFeedbackLoop: (params) => set((state) => ({
    feedbackLoop: { ...state.feedbackLoop, ...params }
  })),

  setWetMix: (value) => set({ wetMix: Math.max(0, Math.min(1, value)) }),
  setBypassActive: (active) => set({ bypassActive: active }),

  reset: () => set({
    enabled: true,
    rgbSplitEnabled: false,
    blockDisplaceEnabled: false,
    scanLinesEnabled: false,
    noiseEnabled: false,
    pixelateEnabled: false,
    edgeDetectionEnabled: false,
    chromaticAberrationEnabled: false,
    vhsTrackingEnabled: false,
    lensDistortionEnabled: false,
    ditherEnabled: false,
    posterizeEnabled: false,
    staticDisplacementEnabled: false,
    colorGradeEnabled: false,
    feedbackLoopEnabled: false,
    rgbSplit: { ...DEFAULT_RGB_SPLIT_PARAMS },
    blockDisplace: { ...DEFAULT_BLOCK_DISPLACE_PARAMS },
    scanLines: { ...DEFAULT_SCAN_LINES_PARAMS },
    noise: { ...DEFAULT_NOISE_PARAMS },
    pixelate: { ...DEFAULT_PIXELATE_PARAMS },
    edgeDetection: { ...DEFAULT_EDGE_DETECTION_PARAMS },
    chromaticAberration: { ...DEFAULT_CHROMATIC_ABERRATION_PARAMS },
    vhsTracking: { ...DEFAULT_VHS_TRACKING_PARAMS },
    lensDistortion: { ...DEFAULT_LENS_DISTORTION_PARAMS },
    dither: { ...DEFAULT_DITHER_PARAMS },
    posterize: { ...DEFAULT_POSTERIZE_PARAMS },
    staticDisplacement: { ...DEFAULT_STATIC_DISPLACEMENT_PARAMS },
    colorGrade: { ...DEFAULT_COLOR_GRADE_PARAMS },
    feedbackLoop: { ...DEFAULT_FEEDBACK_LOOP_PARAMS },
  }),

  getSnapshot: () => {
    const state = get()
    return {
      rgbSplitEnabled: state.rgbSplitEnabled,
      rgbSplit: { ...state.rgbSplit },
      blockDisplaceEnabled: state.blockDisplaceEnabled,
      blockDisplace: { ...state.blockDisplace },
      scanLinesEnabled: state.scanLinesEnabled,
      scanLines: { ...state.scanLines },
      noiseEnabled: state.noiseEnabled,
      noise: { ...state.noise },
      pixelateEnabled: state.pixelateEnabled,
      pixelate: { ...state.pixelate },
      edgeDetectionEnabled: state.edgeDetectionEnabled,
      edgeDetection: { ...state.edgeDetection },
      chromaticAberrationEnabled: state.chromaticAberrationEnabled,
      chromaticAberration: { ...state.chromaticAberration },
      vhsTrackingEnabled: state.vhsTrackingEnabled,
      vhsTracking: { ...state.vhsTracking },
      lensDistortionEnabled: state.lensDistortionEnabled,
      lensDistortion: { ...state.lensDistortion },
      ditherEnabled: state.ditherEnabled,
      dither: { ...state.dither },
      posterizeEnabled: state.posterizeEnabled,
      posterize: { ...state.posterize },
      staticDisplacementEnabled: state.staticDisplacementEnabled,
      staticDisplacement: { ...state.staticDisplacement },
      colorGradeEnabled: state.colorGradeEnabled,
      colorGrade: { ...state.colorGrade },
      feedbackLoopEnabled: state.feedbackLoopEnabled,
      feedbackLoop: { ...state.feedbackLoop },
      wetMix: state.wetMix,
    }
  },

  applySnapshot: (snapshot) => set({
    rgbSplitEnabled: snapshot.rgbSplitEnabled,
    rgbSplit: { ...snapshot.rgbSplit },
    blockDisplaceEnabled: snapshot.blockDisplaceEnabled,
    blockDisplace: { ...snapshot.blockDisplace },
    scanLinesEnabled: snapshot.scanLinesEnabled,
    scanLines: { ...snapshot.scanLines },
    noiseEnabled: snapshot.noiseEnabled,
    noise: { ...snapshot.noise },
    pixelateEnabled: snapshot.pixelateEnabled,
    pixelate: { ...snapshot.pixelate },
    edgeDetectionEnabled: snapshot.edgeDetectionEnabled,
    edgeDetection: { ...snapshot.edgeDetection },
    chromaticAberrationEnabled: snapshot.chromaticAberrationEnabled ?? false,
    chromaticAberration: snapshot.chromaticAberration ? { ...snapshot.chromaticAberration } : { ...DEFAULT_CHROMATIC_ABERRATION_PARAMS },
    vhsTrackingEnabled: snapshot.vhsTrackingEnabled ?? false,
    vhsTracking: snapshot.vhsTracking ? { ...snapshot.vhsTracking } : { ...DEFAULT_VHS_TRACKING_PARAMS },
    lensDistortionEnabled: snapshot.lensDistortionEnabled ?? false,
    lensDistortion: snapshot.lensDistortion ? { ...snapshot.lensDistortion } : { ...DEFAULT_LENS_DISTORTION_PARAMS },
    ditherEnabled: snapshot.ditherEnabled ?? false,
    dither: snapshot.dither ? { ...snapshot.dither } : { ...DEFAULT_DITHER_PARAMS },
    posterizeEnabled: snapshot.posterizeEnabled ?? false,
    posterize: snapshot.posterize ? { ...snapshot.posterize } : { ...DEFAULT_POSTERIZE_PARAMS },
    staticDisplacementEnabled: snapshot.staticDisplacementEnabled ?? false,
    staticDisplacement: snapshot.staticDisplacement ? { ...snapshot.staticDisplacement } : { ...DEFAULT_STATIC_DISPLACEMENT_PARAMS },
    colorGradeEnabled: snapshot.colorGradeEnabled ?? false,
    colorGrade: snapshot.colorGrade ? { ...snapshot.colorGrade } : { ...DEFAULT_COLOR_GRADE_PARAMS },
    feedbackLoopEnabled: snapshot.feedbackLoopEnabled ?? false,
    feedbackLoop: snapshot.feedbackLoop ? { ...snapshot.feedbackLoop } : { ...DEFAULT_FEEDBACK_LOOP_PARAMS },
    wetMix: snapshot.wetMix,
  }),
}))
