import { create } from 'zustand'
import type {
  RGBSplitParams,
  BlockDisplaceParams,
  ScanLinesParams,
  NoiseParams,
  PixelateParams,
  EdgeDetectionParams,
  ChromaticAberrationParams,
  VHSTrackingParams,
  LensDistortionParams,
  DitherParams,
  PosterizeParams,
  StaticDisplacementParams,
  ColorGradeParams,
  FeedbackLoopParams,
} from '../effects/glitch-engine'
import type { AsciiRenderParams } from './asciiRenderStore'
import type { StippleParams } from './stippleStore'
import type { ContourParams } from './contourStore'
import type { LandmarkMode } from './landmarksStore'

import { useGlitchEngineStore } from './glitchEngineStore'
import { useAsciiRenderStore } from './asciiRenderStore'
import { useStippleStore } from './stippleStore'
import { useContourStore } from './contourStore'
import { useLandmarksStore } from './landmarksStore'
import { useRoutingStore } from './routingStore'

/**
 * BankSnapshot stores a complete effect state for A/B/C/D bank recall
 */
export interface BankSnapshot {
  // Glitch engine effects
  glitch: {
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
  }
  // Vision effects
  ascii: { enabled: boolean; params: AsciiRenderParams }
  stipple: { enabled: boolean; params: StippleParams }
  contour: { enabled: boolean; params: ContourParams }
  landmarks: { enabled: boolean; mode: LandmarkMode }
  // Chain order
  effectOrder: string[]
  // Metadata
  savedAt: number
}

interface BankState {
  banks: (BankSnapshot | null)[]  // [A, B, C, D] - 4 slots
  activeBank: number | null       // 0-3 or null if no bank loaded/modified

  saveBank: (index: number) => void   // Capture current state to bank
  loadBank: (index: number) => void   // Apply bank state to all stores
  clearBank: (index: number) => void  // Clear a bank slot
  setActiveBank: (index: number | null) => void
}

export const useBankStore = create<BankState>((set, get) => ({
  banks: [null, null, null, null],
  activeBank: null,

  saveBank: (index: number) => {
    if (index < 0 || index > 3) return

    // Read current state from all effect stores
    const glitchState = useGlitchEngineStore.getState()
    const asciiState = useAsciiRenderStore.getState()
    const stippleState = useStippleStore.getState()
    const contourState = useContourStore.getState()
    const landmarksState = useLandmarksStore.getState()
    const routingState = useRoutingStore.getState()

    // Create a BankSnapshot with all the data
    const snapshot: BankSnapshot = {
      glitch: {
        rgbSplitEnabled: glitchState.rgbSplitEnabled,
        rgbSplit: { ...glitchState.rgbSplit },
        blockDisplaceEnabled: glitchState.blockDisplaceEnabled,
        blockDisplace: { ...glitchState.blockDisplace },
        scanLinesEnabled: glitchState.scanLinesEnabled,
        scanLines: { ...glitchState.scanLines },
        noiseEnabled: glitchState.noiseEnabled,
        noise: { ...glitchState.noise },
        pixelateEnabled: glitchState.pixelateEnabled,
        pixelate: { ...glitchState.pixelate },
        edgeDetectionEnabled: glitchState.edgeDetectionEnabled,
        edgeDetection: { ...glitchState.edgeDetection },
        chromaticAberrationEnabled: glitchState.chromaticAberrationEnabled,
        chromaticAberration: { ...glitchState.chromaticAberration },
        vhsTrackingEnabled: glitchState.vhsTrackingEnabled,
        vhsTracking: { ...glitchState.vhsTracking },
        lensDistortionEnabled: glitchState.lensDistortionEnabled,
        lensDistortion: { ...glitchState.lensDistortion },
        ditherEnabled: glitchState.ditherEnabled,
        dither: { ...glitchState.dither },
        posterizeEnabled: glitchState.posterizeEnabled,
        posterize: { ...glitchState.posterize },
        staticDisplacementEnabled: glitchState.staticDisplacementEnabled,
        staticDisplacement: { ...glitchState.staticDisplacement },
        colorGradeEnabled: glitchState.colorGradeEnabled,
        colorGrade: { ...glitchState.colorGrade },
        feedbackLoopEnabled: glitchState.feedbackLoopEnabled,
        feedbackLoop: { ...glitchState.feedbackLoop },
      },
      ascii: {
        enabled: asciiState.enabled,
        params: { ...asciiState.params },
      },
      stipple: {
        enabled: stippleState.enabled,
        params: { ...stippleState.params },
      },
      contour: {
        enabled: contourState.enabled,
        params: { ...contourState.params },
      },
      landmarks: {
        enabled: landmarksState.enabled,
        mode: landmarksState.currentMode,
      },
      effectOrder: [...routingState.effectOrder],
      savedAt: Date.now(),
    }

    // Store it in banks[index] and set activeBank
    set((state) => {
      const newBanks = [...state.banks]
      newBanks[index] = snapshot
      return {
        banks: newBanks,
        activeBank: index,
      }
    })
  },

  loadBank: (index: number) => {
    if (index < 0 || index > 3) return

    const { banks } = get()
    const snapshot = banks[index]

    // Check if banks[index] is not null
    if (!snapshot) return

    // Apply the snapshot to glitch engine store
    useGlitchEngineStore.setState({
      rgbSplitEnabled: snapshot.glitch.rgbSplitEnabled,
      rgbSplit: { ...snapshot.glitch.rgbSplit },
      blockDisplaceEnabled: snapshot.glitch.blockDisplaceEnabled,
      blockDisplace: { ...snapshot.glitch.blockDisplace },
      scanLinesEnabled: snapshot.glitch.scanLinesEnabled,
      scanLines: { ...snapshot.glitch.scanLines },
      noiseEnabled: snapshot.glitch.noiseEnabled,
      noise: { ...snapshot.glitch.noise },
      pixelateEnabled: snapshot.glitch.pixelateEnabled,
      pixelate: { ...snapshot.glitch.pixelate },
      edgeDetectionEnabled: snapshot.glitch.edgeDetectionEnabled,
      edgeDetection: { ...snapshot.glitch.edgeDetection },
      chromaticAberrationEnabled: snapshot.glitch.chromaticAberrationEnabled ?? false,
      chromaticAberration: snapshot.glitch.chromaticAberration ? { ...snapshot.glitch.chromaticAberration } : useGlitchEngineStore.getState().chromaticAberration,
      vhsTrackingEnabled: snapshot.glitch.vhsTrackingEnabled ?? false,
      vhsTracking: snapshot.glitch.vhsTracking ? { ...snapshot.glitch.vhsTracking } : useGlitchEngineStore.getState().vhsTracking,
      lensDistortionEnabled: snapshot.glitch.lensDistortionEnabled ?? false,
      lensDistortion: snapshot.glitch.lensDistortion ? { ...snapshot.glitch.lensDistortion } : useGlitchEngineStore.getState().lensDistortion,
      ditherEnabled: snapshot.glitch.ditherEnabled ?? false,
      dither: snapshot.glitch.dither ? { ...snapshot.glitch.dither } : useGlitchEngineStore.getState().dither,
      posterizeEnabled: snapshot.glitch.posterizeEnabled ?? false,
      posterize: snapshot.glitch.posterize ? { ...snapshot.glitch.posterize } : useGlitchEngineStore.getState().posterize,
      staticDisplacementEnabled: snapshot.glitch.staticDisplacementEnabled ?? false,
      staticDisplacement: snapshot.glitch.staticDisplacement ? { ...snapshot.glitch.staticDisplacement } : useGlitchEngineStore.getState().staticDisplacement,
      colorGradeEnabled: snapshot.glitch.colorGradeEnabled ?? false,
      colorGrade: snapshot.glitch.colorGrade ? { ...snapshot.glitch.colorGrade } : useGlitchEngineStore.getState().colorGrade,
      feedbackLoopEnabled: snapshot.glitch.feedbackLoopEnabled ?? false,
      feedbackLoop: snapshot.glitch.feedbackLoop ? { ...snapshot.glitch.feedbackLoop } : useGlitchEngineStore.getState().feedbackLoop,
    })

    // Apply to ascii render store
    useAsciiRenderStore.setState({
      enabled: snapshot.ascii.enabled,
      params: { ...snapshot.ascii.params },
    })

    // Apply to stipple store
    useStippleStore.setState({
      enabled: snapshot.stipple.enabled,
      params: { ...snapshot.stipple.params },
    })

    // Apply to contour store
    useContourStore.setState({
      enabled: snapshot.contour.enabled,
      params: { ...snapshot.contour.params },
    })

    // Apply to landmarks store
    useLandmarksStore.setState({
      enabled: snapshot.landmarks.enabled,
      currentMode: snapshot.landmarks.mode,
    })

    // Apply effect order to routing store
    useRoutingStore.setState({
      effectOrder: [...snapshot.effectOrder],
    })

    // Set activeBank to index
    set({ activeBank: index })
  },

  clearBank: (index: number) => {
    if (index < 0 || index > 3) return

    set((state) => {
      const newBanks = [...state.banks]
      newBanks[index] = null
      return {
        banks: newBanks,
        // If clearing the active bank, set activeBank to null
        activeBank: state.activeBank === index ? null : state.activeBank,
      }
    })
  },

  setActiveBank: (index: number | null) => {
    if (index !== null && (index < 0 || index > 3)) return
    set({ activeBank: index })
  },
}))
