import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'
import { useContourStore } from '../stores/contourStore'
import { useLandmarksStore } from '../stores/landmarksStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useAcidStore } from '../stores/acidStore'
import { useTextureOverlayStore } from '../stores/textureOverlayStore'
import { useDataOverlayStore } from '../stores/dataOverlayStore'
import { useStrandStore } from '../stores/strandStore'
import { useMotionStore } from '../stores/motionStore'
import { useDestructionStore } from '../stores/destructionStore'
import { useMorphStore } from '../stores/morphStore'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface LockableParam {
  id: string           // param key used in locks
  label: string        // display label
  min: number
  max: number
  step: number
  controlType?: 'slider' | 'knob' | 'stepper' | 'toggle' | 'arc' | 'vfader' | 'ruler' | 'bipolar'
  apply: (value: number) => void
  read: () => number
}

export interface LockableSelectParam {
  id: string
  label: string
  type: 'select'
  options: { value: string; label: string }[]
  apply: (value: string) => void
  read: () => string
}

export type AnyLockableParam = LockableParam | LockableSelectParam

export interface ParamRegistryEntry {
  getParams: () => LockableParam[]
  getSelectParams?: () => LockableSelectParam[]
  setEnabled: (enabled: boolean) => void
  getEnabled: () => boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// Registry
//
// Single source of truth for all effect parameters.
// Uses getState() so it works both inside and outside React components.
// ═══════════════════════════════════════════════════════════════════════════

const g = () => useGlitchEngineStore.getState()
const ac = () => useAcidStore.getState()
const asc = () => useAsciiRenderStore.getState()
const stp = () => useStippleStore.getState()
const cnt = () => useContourStore.getState()
const lmk = () => useLandmarksStore.getState()
const vis = () => useVisionTrackingStore.getState()
const tex = () => useTextureOverlayStore.getState()
const dat = () => useDataOverlayStore.getState()
const str = () => useStrandStore.getState()
const mot = () => useMotionStore.getState()
const des = () => useDestructionStore.getState()
const mor = () => useMorphStore.getState()

export const EFFECT_PARAM_REGISTRY: Record<string, ParamRegistryEntry> = {
  // ═══════════════════════════════════════════════════════════════════════
  // GLITCH EFFECTS
  // ═══════════════════════════════════════════════════════════════════════
  rgb_split: {
    getParams: () => [
      { id: 'amount', label: 'AMT', min: 0, max: 5, step: 0.01,
        apply: (v) => g().updateRGBSplit({ amount: v }), read: () => g().rgbSplit.amount },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateRGBSplit({ mix: v }), read: () => g().rgbSplit.mix },
      { id: 'redOffsetX', label: 'RD.X', min: -0.3, max: 0.3, step: 0.001,
        apply: (v) => g().updateRGBSplit({ redOffsetX: v }), read: () => g().rgbSplit.redOffsetX },
      { id: 'redOffsetY', label: 'RD.Y', min: -0.3, max: 0.3, step: 0.001,
        apply: (v) => g().updateRGBSplit({ redOffsetY: v }), read: () => g().rgbSplit.redOffsetY },
      { id: 'greenOffsetX', label: 'GN.X', min: -0.3, max: 0.3, step: 0.001,
        apply: (v) => g().updateRGBSplit({ greenOffsetX: v }), read: () => g().rgbSplit.greenOffsetX },
      { id: 'greenOffsetY', label: 'GN.Y', min: -0.3, max: 0.3, step: 0.001,
        apply: (v) => g().updateRGBSplit({ greenOffsetY: v }), read: () => g().rgbSplit.greenOffsetY },
      { id: 'blueOffsetX', label: 'BL.X', min: -0.3, max: 0.3, step: 0.001,
        apply: (v) => g().updateRGBSplit({ blueOffsetX: v }), read: () => g().rgbSplit.blueOffsetX },
      { id: 'blueOffsetY', label: 'BL.Y', min: -0.3, max: 0.3, step: 0.001,
        apply: (v) => g().updateRGBSplit({ blueOffsetY: v }), read: () => g().rgbSplit.blueOffsetY },
    ],
    setEnabled: (v) => g().setRGBSplitEnabled(v),
    getEnabled: () => g().rgbSplitEnabled,
  },
  block_displace: {
    getParams: () => [
      { id: 'blockSize', label: 'SIZE', min: 0.005, max: 0.5, step: 0.005,
        apply: (v) => g().updateBlockDisplace({ blockSize: v }), read: () => g().blockDisplace.blockSize },
      { id: 'displaceDistance', label: 'DIST', min: 0, max: 0.5, step: 0.001,
        apply: (v) => g().updateBlockDisplace({ displaceDistance: v }), read: () => g().blockDisplace.displaceDistance },
      { id: 'displaceChance', label: 'CHNC', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateBlockDisplace({ displaceChance: v }), read: () => g().blockDisplace.displaceChance },
      { id: 'seed', label: 'SEED', min: 0, max: 1000, step: 1,
        apply: (v) => g().updateBlockDisplace({ seed: v }), read: () => g().blockDisplace.seed },
    ],
    setEnabled: (v) => g().setBlockDisplaceEnabled(v),
    getEnabled: () => g().blockDisplaceEnabled,
  },
  scan_lines: {
    getParams: () => [
      { id: 'lineCount', label: 'CNT', min: 50, max: 500, step: 10,
        apply: (v) => g().updateScanLines({ lineCount: v }), read: () => g().scanLines.lineCount },
      { id: 'lineOpacity', label: 'OPAC', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateScanLines({ lineOpacity: v }), read: () => g().scanLines.lineOpacity },
      { id: 'lineFlicker', label: 'FLCK', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateScanLines({ lineFlicker: v }), read: () => g().scanLines.lineFlicker },
    ],
    setEnabled: (v) => g().setScanLinesEnabled(v),
    getEnabled: () => g().scanLinesEnabled,
  },
  noise: {
    getParams: () => [
      { id: 'amount', label: 'AMT', min: 0, max: 3, step: 0.01,
        apply: (v) => g().updateNoise({ amount: v }), read: () => g().noise.amount },
      { id: 'speed', label: 'SPD', min: 1, max: 200, step: 1,
        apply: (v) => g().updateNoise({ speed: v }), read: () => g().noise.speed },
    ],
    setEnabled: (v) => g().setNoiseEnabled(v),
    getEnabled: () => g().noiseEnabled,
  },
  pixelate: {
    getParams: () => [
      { id: 'pixelSize', label: 'SIZE', min: 2, max: 32, step: 1,
        apply: (v) => g().updatePixelate({ pixelSize: v }), read: () => g().pixelate.pixelSize },
    ],
    setEnabled: (v) => g().setPixelateEnabled(v),
    getEnabled: () => g().pixelateEnabled,
  },
  edges: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0.01, max: 0.5, step: 0.01,
        apply: (v) => g().updateEdgeDetection({ threshold: v }), read: () => g().edgeDetection.threshold },
      { id: 'softness', label: 'SOFT', min: 0, max: 0.3, step: 0.01,
        apply: (v) => g().updateEdgeDetection({ softness: v }), read: () => g().edgeDetection.softness },
      { id: 'thickness', label: 'THICK', min: 0.5, max: 4.0, step: 0.1,
        apply: (v) => g().updateEdgeDetection({ thickness: v }), read: () => g().edgeDetection.thickness },
      { id: 'glowAmount', label: 'GLOW', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateEdgeDetection({ glowAmount: v }), read: () => g().edgeDetection.glowAmount },
      { id: 'glowSize', label: 'G.SZ', min: 1, max: 8, step: 0.5,
        apply: (v) => g().updateEdgeDetection({ glowSize: v }), read: () => g().edgeDetection.glowSize },
      { id: 'mixAmount', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateEdgeDetection({ mixAmount: v }), read: () => g().edgeDetection.mixAmount },
    ],
    setEnabled: (v) => g().setEdgeDetectionEnabled(v),
    getEnabled: () => g().edgeDetectionEnabled,
  },
  chromatic: {
    getParams: () => [
      { id: 'intensity', label: 'INT', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateChromaticAberration({ intensity: v }), read: () => g().chromaticAberration.intensity },
      { id: 'radialAmount', label: 'RAD', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateChromaticAberration({ radialAmount: v }), read: () => g().chromaticAberration.radialAmount },
      { id: 'direction', label: 'DIR', min: 0, max: 360, step: 1,
        apply: (v) => g().updateChromaticAberration({ direction: v }), read: () => g().chromaticAberration.direction },
      { id: 'redOffset', label: 'RD.O', min: -0.05, max: 0.05, step: 0.001,
        apply: (v) => g().updateChromaticAberration({ redOffset: v }), read: () => g().chromaticAberration.redOffset },
      { id: 'blueOffset', label: 'BL.O', min: -0.05, max: 0.05, step: 0.001,
        apply: (v) => g().updateChromaticAberration({ blueOffset: v }), read: () => g().chromaticAberration.blueOffset },
    ],
    setEnabled: (v) => g().setChromaticAberrationEnabled(v),
    getEnabled: () => g().chromaticAberrationEnabled,
  },
  vhs: {
    getParams: () => [
      { id: 'tearIntensity', label: 'TEAR', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateVHSTracking({ tearIntensity: v }), read: () => g().vhsTracking.tearIntensity },
      { id: 'colorBleed', label: 'BLEED', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateVHSTracking({ colorBleed: v }), read: () => g().vhsTracking.colorBleed },
      { id: 'jitter', label: 'JITTER', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateVHSTracking({ jitter: v }), read: () => g().vhsTracking.jitter },
      { id: 'tearSpeed', label: 'TSPD', min: 0.1, max: 5, step: 0.1,
        apply: (v) => g().updateVHSTracking({ tearSpeed: v }), read: () => g().vhsTracking.tearSpeed },
      { id: 'headSwitchNoise', label: 'HDSW', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateVHSTracking({ headSwitchNoise: v }), read: () => g().vhsTracking.headSwitchNoise },
    ],
    setEnabled: (v) => g().setVHSTrackingEnabled(v),
    getEnabled: () => g().vhsTrackingEnabled,
  },
  lens: {
    getParams: () => [
      { id: 'curvature', label: 'CURVE', min: -1, max: 1, step: 0.01,
        apply: (v) => g().updateLensDistortion({ curvature: v }), read: () => g().lensDistortion.curvature },
      { id: 'vignette', label: 'VIG', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateLensDistortion({ vignette: v }), read: () => g().lensDistortion.vignette },
      { id: 'fresnelRings', label: 'FRNG', min: 0, max: 20, step: 1,
        apply: (v) => g().updateLensDistortion({ fresnelRings: v }), read: () => g().lensDistortion.fresnelRings },
      { id: 'fresnelIntensity', label: 'FINT', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateLensDistortion({ fresnelIntensity: v }), read: () => g().lensDistortion.fresnelIntensity },
      { id: 'fresnelRainbow', label: 'FRNB', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateLensDistortion({ fresnelRainbow: v }), read: () => g().lensDistortion.fresnelRainbow },
      { id: 'vignetteShape', label: 'VSHP', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateLensDistortion({ vignetteShape: v }), read: () => g().lensDistortion.vignetteShape },
      { id: 'phosphorGlow', label: 'PHOS', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateLensDistortion({ phosphorGlow: v }), read: () => g().lensDistortion.phosphorGlow },
    ],
    setEnabled: (v) => g().setLensDistortionEnabled(v),
    getEnabled: () => g().lensDistortionEnabled,
  },
  dither: {
    getParams: () => [
      { id: 'intensity', label: 'INT', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateDither({ intensity: v }), read: () => g().dither.intensity },
      { id: 'scale', label: 'SCALE', min: 1, max: 8, step: 1,
        apply: (v) => g().updateDither({ scale: v }), read: () => g().dither.scale },
      { id: 'colorDepth', label: 'DEPTH', min: 2, max: 16, step: 1,
        apply: (v) => g().updateDither({ colorDepth: v }), read: () => g().dither.colorDepth },
      { id: 'angle', label: 'ANGLE', min: 0, max: 180, step: 1,
        apply: (v) => g().updateDither({ angle: v }), read: () => g().dither.angle },
    ],
    getSelectParams: () => [
      { id: 'mode', label: 'MODE', type: 'select' as const,
        options: [{ value: 'ordered', label: 'Ordered' }, { value: 'halftone', label: 'Halftone' }, { value: 'newsprint', label: 'Newsprint' }],
        apply: (v) => g().updateDither({ mode: v as any }), read: () => g().dither.mode },
    ],
    setEnabled: (v) => g().setDitherEnabled(v),
    getEnabled: () => g().ditherEnabled,
  },
  posterize: {
    getParams: () => [
      { id: 'levels', label: 'LVL', min: 2, max: 16, step: 1,
        apply: (v) => g().updatePosterize({ levels: v }), read: () => g().posterize.levels },
      { id: 'saturationBoost', label: 'SAT', min: 0, max: 2, step: 0.01,
        apply: (v) => g().updatePosterize({ saturationBoost: v }), read: () => g().posterize.saturationBoost },
      { id: 'edgeContrast', label: 'EDGE', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updatePosterize({ edgeContrast: v }), read: () => g().posterize.edgeContrast },
    ],
    getSelectParams: () => [
      { id: 'mode', label: 'MODE', type: 'select' as const,
        options: [{ value: 'rgb', label: 'RGB' }, { value: 'hsl', label: 'HSL' }],
        apply: (v) => g().updatePosterize({ mode: v as any }), read: () => g().posterize.mode },
    ],
    setEnabled: (v) => g().setPosterizeEnabled(v),
    getEnabled: () => g().posterizeEnabled,
  },
  static_displace: {
    getParams: () => [
      { id: 'intensity', label: 'INT', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateStaticDisplacement({ intensity: v }), read: () => g().staticDisplacement.intensity },
      { id: 'scale', label: 'SCALE', min: 1, max: 100, step: 1,
        apply: (v) => g().updateStaticDisplacement({ scale: v }), read: () => g().staticDisplacement.scale },
      { id: 'speed', label: 'SPD', min: 0, max: 10, step: 0.1,
        apply: (v) => g().updateStaticDisplacement({ speed: v }), read: () => g().staticDisplacement.speed },
    ],
    getSelectParams: () => [
      { id: 'direction', label: 'DIR', type: 'select' as const,
        options: [{ value: 'both', label: 'Both' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }],
        apply: (v) => g().updateStaticDisplacement({ direction: v as any }), read: () => g().staticDisplacement.direction },
      { id: 'noiseType', label: 'NOISE', type: 'select' as const,
        options: [{ value: 'white', label: 'White' }, { value: 'perlin', label: 'Perlin' }],
        apply: (v) => g().updateStaticDisplacement({ noiseType: v as any }), read: () => g().staticDisplacement.noiseType },
    ],
    setEnabled: (v) => g().setStaticDisplacementEnabled(v),
    getEnabled: () => g().staticDisplacementEnabled,
  },
  color_grade: {
    getParams: () => [
      { id: 'saturation', label: 'SAT', min: 0, max: 2, step: 0.01,
        apply: (v) => g().updateColorGrade({ saturation: v }), read: () => g().colorGrade.saturation },
      { id: 'contrast', label: 'CONT', min: 0, max: 2, step: 0.01,
        apply: (v) => g().updateColorGrade({ contrast: v }), read: () => g().colorGrade.contrast },
      { id: 'brightness', label: 'BRT', min: -1, max: 1, step: 0.01,
        apply: (v) => g().updateColorGrade({ brightness: v }), read: () => g().colorGrade.brightness },
      { id: 'liftR', label: 'LF.R', min: -1, max: 1, step: 0.01,
        apply: (v) => g().updateColorGrade({ liftR: v }), read: () => g().colorGrade.liftR },
      { id: 'liftG', label: 'LF.G', min: -1, max: 1, step: 0.01,
        apply: (v) => g().updateColorGrade({ liftG: v }), read: () => g().colorGrade.liftG },
      { id: 'liftB', label: 'LF.B', min: -1, max: 1, step: 0.01,
        apply: (v) => g().updateColorGrade({ liftB: v }), read: () => g().colorGrade.liftB },
      { id: 'gammaR', label: 'GM.R', min: 0.5, max: 2, step: 0.01,
        apply: (v) => g().updateColorGrade({ gammaR: v }), read: () => g().colorGrade.gammaR },
      { id: 'gammaG', label: 'GM.G', min: 0.5, max: 2, step: 0.01,
        apply: (v) => g().updateColorGrade({ gammaG: v }), read: () => g().colorGrade.gammaG },
      { id: 'gammaB', label: 'GM.B', min: 0.5, max: 2, step: 0.01,
        apply: (v) => g().updateColorGrade({ gammaB: v }), read: () => g().colorGrade.gammaB },
      { id: 'gainR', label: 'GN.R', min: 0, max: 2, step: 0.01,
        apply: (v) => g().updateColorGrade({ gainR: v }), read: () => g().colorGrade.gainR },
      { id: 'gainG', label: 'GN.G', min: 0, max: 2, step: 0.01,
        apply: (v) => g().updateColorGrade({ gainG: v }), read: () => g().colorGrade.gainG },
      { id: 'gainB', label: 'GN.B', min: 0, max: 2, step: 0.01,
        apply: (v) => g().updateColorGrade({ gainB: v }), read: () => g().colorGrade.gainB },
      { id: 'tintAmount', label: 'TINT', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateColorGrade({ tintAmount: v }), read: () => g().colorGrade.tintAmount },
    ],
    getSelectParams: () => [
      { id: 'tintMode', label: 'TMODE', type: 'select' as const,
        options: [{ value: 'overlay', label: 'Overlay' }, { value: 'multiply', label: 'Multiply' }, { value: 'screen', label: 'Screen' }],
        apply: (v) => g().updateColorGrade({ tintMode: v as any }), read: () => g().colorGrade.tintMode },
    ],
    setEnabled: (v) => g().setColorGradeEnabled(v),
    getEnabled: () => g().colorGradeEnabled,
  },
  feedback: {
    getParams: () => [
      { id: 'decay', label: 'DECAY', min: 0, max: 0.99, step: 0.01,
        apply: (v) => g().updateFeedbackLoop({ decay: v }), read: () => g().feedbackLoop.decay },
      { id: 'decayCurve', label: 'CURVE', min: 0.5, max: 3.0, step: 0.1,
        apply: (v) => g().updateFeedbackLoop({ decayCurve: v }), read: () => g().feedbackLoop.decayCurve },
      { id: 'zoom', label: 'ZOOM', min: 0.9, max: 1.1, step: 0.001,
        apply: (v) => g().updateFeedbackLoop({ zoom: v }), read: () => g().feedbackLoop.zoom },
      { id: 'rotation', label: 'ROT', min: -15, max: 15, step: 0.1,
        apply: (v) => g().updateFeedbackLoop({ rotation: v }), read: () => g().feedbackLoop.rotation },
      { id: 'hueShift', label: 'HUE', min: 0, max: 360, step: 1,
        apply: (v) => g().updateFeedbackLoop({ hueShift: v }), read: () => g().feedbackLoop.hueShift },
      { id: 'satBoost', label: 'SAT+', min: 0, max: 0.5, step: 0.01,
        apply: (v) => g().updateFeedbackLoop({ satBoost: v }), read: () => g().feedbackLoop.satBoost },
      { id: 'offsetX', label: 'OF.X', min: -0.1, max: 0.1, step: 0.001,
        apply: (v) => g().updateFeedbackLoop({ offsetX: v }), read: () => g().feedbackLoop.offsetX },
      { id: 'offsetY', label: 'OF.Y', min: -0.1, max: 0.1, step: 0.001,
        apply: (v) => g().updateFeedbackLoop({ offsetY: v }), read: () => g().feedbackLoop.offsetY },
      { id: 'warpAmount', label: 'WARP', min: 0, max: 0.05, step: 0.001,
        apply: (v) => g().updateFeedbackLoop({ warpAmount: v }), read: () => g().feedbackLoop.warpAmount },
      { id: 'edgeGlow', label: 'GLOW', min: 0, max: 1, step: 0.01,
        apply: (v) => g().updateFeedbackLoop({ edgeGlow: v }), read: () => g().feedbackLoop.edgeGlow },
    ],
    setEnabled: (v) => g().setFeedbackLoopEnabled(v),
    getEnabled: () => g().feedbackLoopEnabled,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER MODES
  // ═══════════════════════════════════════════════════════════════════════
  ascii: {
    getParams: () => [
      { id: 'fontSize', label: 'SIZE', min: 4, max: 20, step: 1,
        apply: (v) => asc().updateParams({ fontSize: v }), read: () => asc().params.fontSize },
      { id: 'contrast', label: 'CONT', min: 0.5, max: 2, step: 0.05,
        apply: (v) => asc().updateParams({ contrast: v }), read: () => asc().params.contrast },
      { id: 'resolution', label: 'RES', min: 4, max: 16, step: 1,
        apply: (v) => asc().updateParams({ resolution: v }), read: () => asc().params.resolution },
      { id: 'matrixSpeed', label: 'MSPD', min: 0.1, max: 3, step: 0.1,
        apply: (v) => asc().updateParams({ matrixSpeed: v }), read: () => asc().params.matrixSpeed },
      { id: 'matrixDensity', label: 'MDEN', min: 0.1, max: 1, step: 0.05,
        apply: (v) => asc().updateParams({ matrixDensity: v }), read: () => asc().params.matrixDensity },
      { id: 'matrixTrailLength', label: 'MTRL', min: 5, max: 50, step: 1,
        apply: (v) => asc().updateParams({ matrixTrailLength: v }), read: () => asc().params.matrixTrailLength },
    ],
    getSelectParams: () => [
      { id: 'mode', label: 'MODE', type: 'select' as const,
        options: [{ value: 'standard', label: 'ASCII' }, { value: 'matrix', label: 'Matrix' }, { value: 'blocks', label: 'Blocks' }, { value: 'braille', label: 'Braille' }],
        apply: (v) => asc().updateParams({ mode: v as any }), read: () => asc().params.mode },
      { id: 'colorMode', label: 'COLOR', type: 'select' as const,
        options: [{ value: 'mono', label: 'Mono' }, { value: 'original', label: 'Original' }, { value: 'gradient', label: 'Gradient' }],
        apply: (v) => asc().updateParams({ colorMode: v as any }), read: () => asc().params.colorMode },
    ],
    setEnabled: (v) => asc().setEnabled(v),
    getEnabled: () => asc().enabled,
  },
  stipple: {
    getParams: () => [
      { id: 'particleSize', label: 'SIZE', min: 1, max: 8, step: 0.5,
        apply: (v) => stp().updateParams({ particleSize: v }), read: () => stp().params.particleSize },
      { id: 'density', label: 'DEN', min: 0.1, max: 3, step: 0.1,
        apply: (v) => stp().updateParams({ density: v }), read: () => stp().params.density },
      { id: 'particleSizeVariation', label: 'SVAR', min: 0, max: 1, step: 0.1,
        apply: (v) => stp().updateParams({ particleSizeVariation: v }), read: () => stp().params.particleSizeVariation },
      { id: 'brightnessThreshold', label: 'BTHR', min: 0, max: 1, step: 0.01,
        apply: (v) => stp().updateParams({ brightnessThreshold: v }), read: () => stp().params.brightnessThreshold },
      { id: 'jitter', label: 'JITR', min: 0, max: 1, step: 0.05,
        apply: (v) => stp().updateParams({ jitter: v }), read: () => stp().params.jitter },
    ],
    getSelectParams: () => [
      { id: 'colorMode', label: 'COLOR', type: 'select' as const,
        options: [{ value: 'mono', label: 'Mono' }, { value: 'original', label: 'Original' }, { value: 'gradient', label: 'Gradient' }],
        apply: (v) => stp().updateParams({ colorMode: v as any }), read: () => stp().params.colorMode },
    ],
    setEnabled: (v) => stp().setEnabled(v),
    getEnabled: () => stp().enabled,
  },
  contour: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0, max: 1, step: 0.01,
        apply: (v) => cnt().updateParams({ threshold: v }), read: () => cnt().params.threshold },
      { id: 'baseWidth', label: 'WIDTH', min: 1, max: 10, step: 0.5,
        apply: (v) => cnt().updateParams({ baseWidth: v }), read: () => cnt().params.baseWidth },
      { id: 'glowIntensity', label: 'GLOW', min: 0, max: 1, step: 0.05,
        apply: (v) => cnt().updateParams({ glowIntensity: v }), read: () => cnt().params.glowIntensity },
      { id: 'minSize', label: 'MNSZ', min: 0, max: 0.5, step: 0.01,
        apply: (v) => cnt().updateParams({ minSize: v }), read: () => cnt().params.minSize },
      { id: 'trailLength', label: 'TRAIL', min: 0, max: 5, step: 0.1,
        apply: (v) => cnt().updateParams({ trailLength: v }), read: () => cnt().params.trailLength },
      { id: 'positionSmoothing', label: 'SMTH', min: 0, max: 1, step: 0.05,
        apply: (v) => cnt().updateParams({ positionSmoothing: v }), read: () => cnt().params.positionSmoothing },
    ],
    getSelectParams: () => [
      { id: 'mode', label: 'MODE', type: 'select' as const,
        options: [{ value: 'brightness', label: 'Brightness' }, { value: 'edge', label: 'Edge' }, { value: 'color', label: 'Color' }, { value: 'motion', label: 'Motion' }],
        apply: (v) => cnt().updateParams({ mode: v as any }), read: () => cnt().params.mode },
      { id: 'fadeMode', label: 'FADE', type: 'select' as const,
        options: [{ value: 'fade', label: 'Fade' }, { value: 'fixed', label: 'Fixed' }, { value: 'persistent', label: 'Persistent' }],
        apply: (v) => cnt().updateParams({ fadeMode: v as any }), read: () => cnt().params.fadeMode },
    ],
    setEnabled: (v) => cnt().setEnabled(v),
    getEnabled: () => cnt().enabled,
  },
  landmarks: {
    getParams: () => [
      { id: 'minDetectionConfidence', label: 'CONF', min: 0.1, max: 0.9, step: 0.05,
        apply: (v) => lmk().setMinDetectionConfidence(v), read: () => lmk().minDetectionConfidence },
      { id: 'minTrackingConfidence', label: 'TRCK', min: 0.1, max: 0.9, step: 0.05,
        apply: (v) => lmk().setMinTrackingConfidence(v), read: () => lmk().minTrackingConfidence },
      { id: 'maxFaces', label: 'FACE', min: 1, max: 4, step: 1,
        apply: (v) => lmk().setMaxFaces(v), read: () => lmk().maxFaces },
      { id: 'maxHands', label: 'HAND', min: 1, max: 4, step: 1,
        apply: (v) => lmk().setMaxHands(v), read: () => lmk().maxHands },
    ],
    getSelectParams: () => [
      { id: 'currentMode', label: 'MODE', type: 'select' as const,
        options: [{ value: 'face', label: 'Face' }, { value: 'hands', label: 'Hands' }, { value: 'pose', label: 'Pose' }, { value: 'holistic', label: 'Holistic' }],
        apply: (v) => lmk().setCurrentMode(v as any), read: () => lmk().currentMode },
    ],
    setEnabled: (v) => lmk().setEnabled(v),
    getEnabled: () => lmk().enabled,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // VISION TRACKING
  // ═══════════════════════════════════════════════════════════════════════
  track_bright: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0, max: 255, step: 1,
        apply: (v) => vis().updateBrightParams({ threshold: v }), read: () => vis().brightParams.threshold },
      { id: 'minSize', label: 'SIZE', min: 1, max: 100, step: 1,
        apply: (v) => vis().updateBrightParams({ minSize: v }), read: () => vis().brightParams.minSize },
      { id: 'maxBlobs', label: 'BLOBS', min: 1, max: 50, step: 1,
        apply: (v) => vis().updateBrightParams({ maxBlobs: v }), read: () => vis().brightParams.maxBlobs },
      { id: 'boxFilterIntensity', label: 'FINT', min: 0, max: 100, step: 5,
        apply: (v) => vis().updateBrightParams({ boxFilterIntensity: v }), read: () => vis().brightParams.boxFilterIntensity },
      { id: 'trailDecay', label: 'TDCY', min: 0.8, max: 0.99, step: 0.01,
        apply: (v) => vis().updateBrightTraceParams({ trailDecay: v }), read: () => vis().brightTraceParams.trailDecay },
    ],
    setEnabled: (v) => vis().setBrightEnabled(v),
    getEnabled: () => vis().brightEnabled,
  },
  track_edge: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0, max: 255, step: 1,
        apply: (v) => vis().updateEdgeParams({ threshold: v }), read: () => vis().edgeParams.threshold },
      { id: 'minSize', label: 'SIZE', min: 1, max: 100, step: 1,
        apply: (v) => vis().updateEdgeParams({ minSize: v }), read: () => vis().edgeParams.minSize },
      { id: 'maxBlobs', label: 'BLOBS', min: 1, max: 50, step: 1,
        apply: (v) => vis().updateEdgeParams({ maxBlobs: v }), read: () => vis().edgeParams.maxBlobs },
      { id: 'boxFilterIntensity', label: 'FINT', min: 0, max: 100, step: 5,
        apply: (v) => vis().updateEdgeParams({ boxFilterIntensity: v }), read: () => vis().edgeParams.boxFilterIntensity },
      { id: 'trailDecay', label: 'TDCY', min: 0.8, max: 0.99, step: 0.01,
        apply: (v) => vis().updateEdgeTraceParams({ trailDecay: v }), read: () => vis().edgeTraceParams.trailDecay },
    ],
    setEnabled: (v) => vis().setEdgeEnabled(v),
    getEnabled: () => vis().edgeEnabled,
  },
  track_color: {
    getParams: () => [
      { id: 'colorRange', label: 'RANGE', min: 0, max: 1, step: 0.01,
        apply: (v) => vis().updateColorParams({ colorRange: v }), read: () => vis().colorParams.colorRange },
      { id: 'minSize', label: 'SIZE', min: 1, max: 100, step: 1,
        apply: (v) => vis().updateColorParams({ minSize: v }), read: () => vis().colorParams.minSize },
      { id: 'boxFilterIntensity', label: 'FINT', min: 0, max: 100, step: 5,
        apply: (v) => vis().updateColorParams({ boxFilterIntensity: v }), read: () => vis().colorParams.boxFilterIntensity },
      { id: 'trailDecay', label: 'TDCY', min: 0.8, max: 0.99, step: 0.01,
        apply: (v) => vis().updateColorTraceParams({ trailDecay: v }), read: () => vis().colorTraceParams.trailDecay },
      { id: 'hueRange', label: 'HUER', min: 0.01, max: 0.5, step: 0.01,
        apply: (v) => vis().updateColorTraceParams({ hueRange: v }), read: () => vis().colorTraceParams.hueRange },
      { id: 'satMin', label: 'SMIN', min: 0, max: 1, step: 0.05,
        apply: (v) => vis().updateColorTraceParams({ satMin: v }), read: () => vis().colorTraceParams.satMin },
    ],
    setEnabled: (v) => vis().setColorEnabled(v),
    getEnabled: () => vis().colorEnabled,
  },
  track_motion: {
    getParams: () => [
      { id: 'sensitivity', label: 'SENS', min: 0, max: 100, step: 1,
        apply: (v) => vis().updateMotionParams({ sensitivity: v }), read: () => vis().motionParams.sensitivity },
      { id: 'threshold', label: 'THRSH', min: 1, max: 100, step: 1,
        apply: (v) => vis().updateMotionParams({ threshold: v }), read: () => vis().motionParams.threshold },
      { id: 'minSize', label: 'SIZE', min: 1, max: 100, step: 1,
        apply: (v) => vis().updateMotionParams({ minSize: v }), read: () => vis().motionParams.minSize },
      { id: 'boxFilterIntensity', label: 'FINT', min: 0, max: 100, step: 5,
        apply: (v) => vis().updateMotionParams({ boxFilterIntensity: v }), read: () => vis().motionParams.boxFilterIntensity },
      { id: 'trailDecay', label: 'TDCY', min: 0.8, max: 0.99, step: 0.01,
        apply: (v) => vis().updateMotionTraceParams({ trailDecay: v }), read: () => vis().motionTraceParams.trailDecay },
      { id: 'traceSensitivity', label: 'TSNS', min: 1, max: 10, step: 0.5,
        apply: (v) => vis().updateMotionTraceParams({ sensitivity: v }), read: () => vis().motionTraceParams.sensitivity },
    ],
    setEnabled: (v) => vis().setMotionEnabled(v),
    getEnabled: () => vis().motionEnabled,
  },
  track_face: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0, max: 100, step: 1,
        apply: (v) => vis().updateFaceParams({ threshold: v }), read: () => vis().faceParams.threshold },
      { id: 'minSize', label: 'SIZE', min: 10, max: 200, step: 5,
        apply: (v) => vis().updateFaceParams({ minSize: v }), read: () => vis().faceParams.minSize },
      { id: 'maxBlobs', label: 'BLOBS', min: 1, max: 10, step: 1,
        apply: (v) => vis().updateFaceParams({ maxBlobs: v }), read: () => vis().faceParams.maxBlobs },
      { id: 'boxFilterIntensity', label: 'FINT', min: 0, max: 100, step: 5,
        apply: (v) => vis().updateFaceParams({ boxFilterIntensity: v }), read: () => vis().faceParams.boxFilterIntensity },
      { id: 'trailDecay', label: 'TDCY', min: 0.8, max: 0.99, step: 0.01,
        apply: (v) => vis().updateFaceTraceParams({ trailDecay: v }), read: () => vis().faceTraceParams.trailDecay },
      { id: 'feather', label: 'FTHR', min: 0, max: 0.2, step: 0.01,
        apply: (v) => vis().updateFaceTraceParams({ feather: v }), read: () => vis().faceTraceParams.feather },
    ],
    getSelectParams: () => [
      { id: 'fillMode', label: 'FILL', type: 'select' as const,
        options: [{ value: 'oval', label: 'Oval' }, { value: 'mesh', label: 'Mesh' }, { value: 'bbox', label: 'Box' }],
        apply: (v) => vis().updateFaceTraceParams({ fillMode: v as any }), read: () => vis().faceTraceParams.fillMode },
    ],
    setEnabled: (v) => vis().setFaceEnabled(v),
    getEnabled: () => vis().faceEnabled,
  },
  track_hands: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0, max: 100, step: 1,
        apply: (v) => vis().updateHandsParams({ threshold: v }), read: () => vis().handsParams.threshold },
      { id: 'minSize', label: 'SIZE', min: 1, max: 100, step: 1,
        apply: (v) => vis().updateHandsParams({ minSize: v }), read: () => vis().handsParams.minSize },
      { id: 'maxBlobs', label: 'BLOBS', min: 1, max: 20, step: 1,
        apply: (v) => vis().updateHandsParams({ maxBlobs: v }), read: () => vis().handsParams.maxBlobs },
      { id: 'boxFilterIntensity', label: 'FINT', min: 0, max: 100, step: 5,
        apply: (v) => vis().updateHandsParams({ boxFilterIntensity: v }), read: () => vis().handsParams.boxFilterIntensity },
      { id: 'trailDecay', label: 'TDCY', min: 0.8, max: 0.99, step: 0.01,
        apply: (v) => vis().updateHandsTraceParams({ trailDecay: v }), read: () => vis().handsTraceParams.trailDecay },
      { id: 'feather', label: 'FTHR', min: 0, max: 0.2, step: 0.01,
        apply: (v) => vis().updateHandsTraceParams({ feather: v }), read: () => vis().handsTraceParams.feather },
    ],
    getSelectParams: () => [
      { id: 'fillMode', label: 'FILL', type: 'select' as const,
        options: [{ value: 'hull', label: 'Hull' }, { value: 'skeleton', label: 'Skeleton' }, { value: 'bbox', label: 'Box' }],
        apply: (v) => vis().updateHandsTraceParams({ fillMode: v as any }), read: () => vis().handsTraceParams.fillMode },
    ],
    setEnabled: (v) => vis().setHandsEnabled(v),
    getEnabled: () => vis().handsEnabled,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ACID EFFECTS
  // ═══════════════════════════════════════════════════════════════════════
  acid_dots: {
    getParams: () => [
      { id: 'gridSize', label: 'GRID', min: 4, max: 32, step: 2,
        apply: (v) => ac().updateDotsParams({ gridSize: v }), read: () => ac().dotsParams.gridSize },
      { id: 'dotScale', label: 'SIZE', min: 0.5, max: 2, step: 0.1,
        apply: (v) => ac().updateDotsParams({ dotScale: v }), read: () => ac().dotsParams.dotScale },
      { id: 'threshold', label: 'THRSH', min: 0, max: 255, step: 5,
        apply: (v) => ac().updateDotsParams({ threshold: v }), read: () => ac().dotsParams.threshold },
    ],
    getSelectParams: () => [
      { id: 'shape', label: 'SHAPE', type: 'select' as const,
        options: [{ value: 'circle', label: 'Circle' }, { value: 'square', label: 'Square' }, { value: 'diamond', label: 'Diamond' }],
        apply: (v) => ac().updateDotsParams({ shape: v as any }), read: () => ac().dotsParams.shape },
    ],
    setEnabled: (v) => ac().setDotsEnabled(v),
    getEnabled: () => ac().dotsEnabled,
  },
  acid_glyph: {
    getParams: () => [
      { id: 'gridSize', label: 'GRID', min: 8, max: 24, step: 2,
        apply: (v) => ac().updateGlyphParams({ gridSize: v }), read: () => ac().glyphParams.gridSize },
      { id: 'density', label: 'DEN', min: 0.3, max: 1, step: 0.1,
        apply: (v) => ac().updateGlyphParams({ density: v }), read: () => ac().glyphParams.density },
    ],
    getSelectParams: () => [
      { id: 'charset', label: 'CHARS', type: 'select' as const,
        options: [{ value: 'geometric', label: 'Geometric' }, { value: 'arrows', label: 'Arrows' }, { value: 'blocks', label: 'Blocks' }, { value: 'math', label: 'Math' }],
        apply: (v) => ac().updateGlyphParams({ charset: v as any }), read: () => ac().glyphParams.charset },
    ],
    setEnabled: (v) => ac().setGlyphEnabled(v),
    getEnabled: () => ac().glyphEnabled,
  },
  acid_icons: {
    getParams: () => [
      { id: 'gridSize', label: 'GRID', min: 16, max: 48, step: 4,
        apply: (v) => ac().updateIconsParams({ gridSize: v }), read: () => ac().iconsParams.gridSize },
      { id: 'rotation', label: 'ROT', min: 0, max: 360, step: 15,
        apply: (v) => ac().updateIconsParams({ rotation: v }), read: () => ac().iconsParams.rotation },
    ],
    getSelectParams: () => [
      { id: 'iconSet', label: 'ICONS', type: 'select' as const,
        options: [{ value: 'tech', label: 'Tech' }, { value: 'nature', label: 'Nature' }, { value: 'abstract', label: 'Abstract' }, { value: 'faces', label: 'Faces' }],
        apply: (v) => ac().updateIconsParams({ iconSet: v as any }), read: () => ac().iconsParams.iconSet },
      { id: 'colorMode', label: 'COLOR', type: 'select' as const,
        options: [{ value: 'mono', label: 'Mono' }, { value: 'tint', label: 'Tint' }, { value: 'original', label: 'Original' }],
        apply: (v) => ac().updateIconsParams({ colorMode: v as any }), read: () => ac().iconsParams.colorMode },
    ],
    setEnabled: (v) => ac().setIconsEnabled(v),
    getEnabled: () => ac().iconsEnabled,
  },
  acid_contour: {
    getParams: () => [
      { id: 'levels', label: 'LVL', min: 4, max: 20, step: 1,
        apply: (v) => ac().updateContourParams({ levels: v }), read: () => ac().contourParams.levels },
      { id: 'lineWidth', label: 'WIDTH', min: 1, max: 4, step: 0.5,
        apply: (v) => ac().updateContourParams({ lineWidth: v }), read: () => ac().contourParams.lineWidth },
      { id: 'smooth', label: 'SMTH', min: 0, max: 1, step: 0.1,
        apply: (v) => ac().updateContourParams({ smooth: v }), read: () => ac().contourParams.smooth },
    ],
    setEnabled: (v) => ac().setContourEnabled(v),
    getEnabled: () => ac().contourEnabled,
  },
  acid_decomp: {
    getParams: () => [
      { id: 'minBlock', label: 'MIN', min: 8, max: 64, step: 8,
        apply: (v) => ac().updateDecompParams({ minBlock: v }), read: () => ac().decompParams.minBlock },
      { id: 'maxBlock', label: 'MAX', min: 32, max: 256, step: 16,
        apply: (v) => ac().updateDecompParams({ maxBlock: v }), read: () => ac().decompParams.maxBlock },
      { id: 'threshold', label: 'THRSH', min: 0, max: 100, step: 5,
        apply: (v) => ac().updateDecompParams({ threshold: v }), read: () => ac().decompParams.threshold },
    ],
    getSelectParams: () => [
      { id: 'fillMode', label: 'FILL', type: 'select' as const,
        options: [{ value: 'solid', label: 'Solid' }, { value: 'average', label: 'Average' }, { value: 'original', label: 'Original' }],
        apply: (v) => ac().updateDecompParams({ fillMode: v as any }), read: () => ac().decompParams.fillMode },
    ],
    setEnabled: (v) => ac().setDecompEnabled(v),
    getEnabled: () => ac().decompEnabled,
  },
  acid_mirror: {
    getParams: () => [
      { id: 'segments', label: 'SEG', min: 2, max: 8, step: 1,
        apply: (v) => ac().updateMirrorParams({ segments: v }), read: () => ac().mirrorParams.segments },
      { id: 'rotation', label: 'ROT', min: 0, max: 360, step: 5,
        apply: (v) => ac().updateMirrorParams({ rotation: v }), read: () => ac().mirrorParams.rotation },
      { id: 'centerX', label: 'CN.X', min: 0, max: 1, step: 0.05,
        apply: (v) => ac().updateMirrorParams({ centerX: v }), read: () => ac().mirrorParams.centerX },
      { id: 'centerY', label: 'CN.Y', min: 0, max: 1, step: 0.05,
        apply: (v) => ac().updateMirrorParams({ centerY: v }), read: () => ac().mirrorParams.centerY },
    ],
    setEnabled: (v) => ac().setMirrorEnabled(v),
    getEnabled: () => ac().mirrorEnabled,
  },
  acid_slice: {
    getParams: () => [
      { id: 'sliceCount', label: 'CNT', min: 4, max: 64, step: 4,
        apply: (v) => ac().updateSliceParams({ sliceCount: v }), read: () => ac().sliceParams.sliceCount },
      { id: 'offset', label: 'OFF', min: 0, max: 100, step: 5,
        apply: (v) => ac().updateSliceParams({ offset: v }), read: () => ac().sliceParams.offset },
    ],
    getSelectParams: () => [
      { id: 'direction', label: 'DIR', type: 'select' as const,
        options: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }, { value: 'both', label: 'Both' }],
        apply: (v) => ac().updateSliceParams({ direction: v as any }), read: () => ac().sliceParams.direction },
    ],
    setEnabled: (v) => ac().setSliceEnabled(v),
    getEnabled: () => ac().sliceEnabled,
  },
  acid_thgrid: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0, max: 255, step: 5,
        apply: (v) => ac().updateThGridParams({ threshold: v }), read: () => ac().thGridParams.threshold },
      { id: 'gridSize', label: 'GRID', min: 16, max: 128, step: 8,
        apply: (v) => ac().updateThGridParams({ gridSize: v }), read: () => ac().thGridParams.gridSize },
      { id: 'lineWidth', label: 'WIDTH', min: 1, max: 4, step: 0.5,
        apply: (v) => ac().updateThGridParams({ lineWidth: v }), read: () => ac().thGridParams.lineWidth },
    ],
    setEnabled: (v) => ac().setThGridEnabled(v),
    getEnabled: () => ac().thGridEnabled,
  },
  acid_cloud: {
    getParams: () => [
      { id: 'density', label: 'DEN', min: 1000, max: 50000, step: 1000,
        apply: (v) => ac().updateCloudParams({ density: v }), read: () => ac().cloudParams.density },
      { id: 'depthScale', label: 'DEPTH', min: 0, max: 100, step: 5,
        apply: (v) => ac().updateCloudParams({ depthScale: v }), read: () => ac().cloudParams.depthScale },
      { id: 'perspective', label: 'PERSP', min: 0.5, max: 2, step: 0.1,
        apply: (v) => ac().updateCloudParams({ perspective: v }), read: () => ac().cloudParams.perspective },
    ],
    setEnabled: (v) => ac().setCloudEnabled(v),
    getEnabled: () => ac().cloudEnabled,
  },
  acid_led: {
    getParams: () => [
      { id: 'gridSize', label: 'GRID', min: 4, max: 16, step: 2,
        apply: (v) => ac().updateLedParams({ gridSize: v }), read: () => ac().ledParams.gridSize },
      { id: 'brightness', label: 'BRT', min: 0.5, max: 2, step: 0.1,
        apply: (v) => ac().updateLedParams({ brightness: v }), read: () => ac().ledParams.brightness },
      { id: 'dotSize', label: 'DOT', min: 0.3, max: 0.9, step: 0.1,
        apply: (v) => ac().updateLedParams({ dotSize: v }), read: () => ac().ledParams.dotSize },
      { id: 'bleed', label: 'BLEED', min: 0, max: 1, step: 0.1,
        apply: (v) => ac().updateLedParams({ bleed: v }), read: () => ac().ledParams.bleed },
    ],
    setEnabled: (v) => ac().setLedEnabled(v),
    getEnabled: () => ac().ledEnabled,
  },
  acid_slit: {
    getParams: () => [
      { id: 'speed', label: 'SPD', min: 1, max: 10, step: 1,
        apply: (v) => ac().updateSlitParams({ speed: v }), read: () => ac().slitParams.speed },
      { id: 'blend', label: 'BLEND', min: 0, max: 1, step: 0.1,
        apply: (v) => ac().updateSlitParams({ blend: v }), read: () => ac().slitParams.blend },
      { id: 'slitPosition', label: 'POS', min: 0, max: 1, step: 0.05,
        apply: (v) => ac().updateSlitParams({ slitPosition: v }), read: () => ac().slitParams.slitPosition },
    ],
    getSelectParams: () => [
      { id: 'direction', label: 'DIR', type: 'select' as const,
        options: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }],
        apply: (v) => ac().updateSlitParams({ direction: v as any }), read: () => ac().slitParams.direction },
    ],
    setEnabled: (v) => ac().setSlitEnabled(v),
    getEnabled: () => ac().slitEnabled,
  },
  acid_voronoi: {
    getParams: () => [
      { id: 'cellCount', label: 'CELLS', min: 16, max: 256, step: 16,
        apply: (v) => ac().updateVoronoiParams({ cellCount: v }), read: () => ac().voronoiParams.cellCount },
    ],
    getSelectParams: () => [
      { id: 'seedMode', label: 'SEED', type: 'select' as const,
        options: [{ value: 'random', label: 'Random' }, { value: 'brightness', label: 'Brightness' }, { value: 'edges', label: 'Edges' }],
        apply: (v) => ac().updateVoronoiParams({ seedMode: v as any }), read: () => ac().voronoiParams.seedMode },
      { id: 'fillMode', label: 'FILL', type: 'select' as const,
        options: [{ value: 'average', label: 'Average' }, { value: 'centroid', label: 'Centroid' }, { value: 'original', label: 'Original' }],
        apply: (v) => ac().updateVoronoiParams({ fillMode: v as any }), read: () => ac().voronoiParams.fillMode },
    ],
    setEnabled: (v) => ac().setVoronoiEnabled(v),
    getEnabled: () => ac().voronoiEnabled,
  },
  acid_halftone: {
    getParams: () => [
      { id: 'dotSize', label: 'DOT', min: 4, max: 24, step: 1,
        apply: (v) => ac().updateHalftoneParams({ dotSize: v }), read: () => ac().halftoneParams.dotSize },
      { id: 'angle', label: 'ANGLE', min: 0, max: 90, step: 5,
        apply: (v) => ac().updateHalftoneParams({ angle: v }), read: () => ac().halftoneParams.angle },
      { id: 'contrast', label: 'CONT', min: 0.5, max: 2, step: 0.1,
        apply: (v) => ac().updateHalftoneParams({ contrast: v }), read: () => ac().halftoneParams.contrast },
    ],
    getSelectParams: () => [
      { id: 'colorMode', label: 'COLOR', type: 'select' as const,
        options: [{ value: 'mono', label: 'Mono' }, { value: 'cmyk', label: 'CMYK' }, { value: 'rgb', label: 'RGB' }],
        apply: (v) => ac().updateHalftoneParams({ colorMode: v as any }), read: () => ac().halftoneParams.colorMode },
    ],
    setEnabled: (v) => ac().setHalftoneEnabled(v),
    getEnabled: () => ac().halftoneEnabled,
  },
  acid_hex: {
    getParams: () => [
      { id: 'cellSize', label: 'CELL', min: 8, max: 48, step: 2,
        apply: (v) => ac().updateHexParams({ cellSize: v }), read: () => ac().hexParams.cellSize },
      { id: 'rotation', label: 'ROT', min: 0, max: 60, step: 5,
        apply: (v) => ac().updateHexParams({ rotation: v }), read: () => ac().hexParams.rotation },
    ],
    getSelectParams: () => [
      { id: 'fillMode', label: 'FILL', type: 'select' as const,
        options: [{ value: 'average', label: 'Average' }, { value: 'center', label: 'Center' }, { value: 'original', label: 'Original' }],
        apply: (v) => ac().updateHexParams({ fillMode: v as any }), read: () => ac().hexParams.fillMode },
    ],
    setEnabled: (v) => ac().setHexEnabled(v),
    getEnabled: () => ac().hexEnabled,
  },
  acid_scan: {
    getParams: () => [
      { id: 'speed', label: 'SPD', min: 1, max: 10, step: 0.5,
        apply: (v) => ac().updateScanParams({ speed: v }), read: () => ac().scanParams.speed },
      { id: 'width', label: 'WIDTH', min: 5, max: 100, step: 5,
        apply: (v) => ac().updateScanParams({ width: v }), read: () => ac().scanParams.width },
      { id: 'trail', label: 'TRAIL', min: 0, max: 1, step: 0.01,
        apply: (v) => ac().updateScanParams({ trail: v }), read: () => ac().scanParams.trail },
    ],
    getSelectParams: () => [
      { id: 'direction', label: 'DIR', type: 'select' as const,
        options: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }, { value: 'radial', label: 'Radial' }],
        apply: (v) => ac().updateScanParams({ direction: v as any }), read: () => ac().scanParams.direction },
    ],
    setEnabled: (v) => ac().setScanEnabled(v),
    getEnabled: () => ac().scanEnabled,
  },
  acid_ripple: {
    getParams: () => [
      { id: 'frequency', label: 'FREQ', min: 1, max: 20, step: 1,
        apply: (v) => ac().updateRippleParams({ frequency: v }), read: () => ac().rippleParams.frequency },
      { id: 'amplitude', label: 'AMP', min: 5, max: 50, step: 5,
        apply: (v) => ac().updateRippleParams({ amplitude: v }), read: () => ac().rippleParams.amplitude },
      { id: 'speed', label: 'SPD', min: 1, max: 10, step: 0.5,
        apply: (v) => ac().updateRippleParams({ speed: v }), read: () => ac().rippleParams.speed },
      { id: 'decay', label: 'DECAY', min: 0.1, max: 1, step: 0.1,
        apply: (v) => ac().updateRippleParams({ decay: v }), read: () => ac().rippleParams.decay },
    ],
    setEnabled: (v) => ac().setRippleEnabled(v),
    getEnabled: () => ac().rippleEnabled,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // OVERLAYS
  // ═══════════════════════════════════════════════════════════════════════
  texture_overlay: {
    getParams: () => [
      { id: 'opacity', label: 'OPAC', min: 0, max: 1, step: 0.01,
        apply: (v) => tex().setOpacity(v), read: () => tex().opacity },
      { id: 'scale', label: 'SCALE', min: 0.5, max: 3, step: 0.1,
        apply: (v) => tex().setScale(v), read: () => tex().scale },
      { id: 'animationSpeed', label: 'ASPD', min: 0.1, max: 2, step: 0.1,
        apply: (v) => tex().setAnimationSpeed(v), read: () => tex().animationSpeed },
    ],
    setEnabled: (v) => tex().setEnabled(v),
    getEnabled: () => tex().enabled,
  },
  data_overlay: {
    getParams: () => [
      { id: 'fontSize', label: 'SIZE', min: 8, max: 24, step: 1,
        apply: (v) => dat().setStyle({ fontSize: v }), read: () => dat().style.fontSize },
      { id: 'opacity', label: 'OPAC', min: 0, max: 1, step: 0.01,
        apply: (v) => dat().setStyle({ opacity: v }), read: () => dat().style.opacity },
    ],
    setEnabled: (v) => dat().setEnabled(v),
    getEnabled: () => dat().enabled,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // STRAND EFFECTS
  // ═══════════════════════════════════════════════════════════════════════
  strand_handprints: {
    getParams: () => [
      { id: 'density', label: 'DEN', min: 1, max: 20, step: 1,
        apply: (v) => str().updateHandprintsParams({ density: v }), read: () => str().handprintsParams.density },
      { id: 'size', label: 'SIZE', min: 0.5, max: 3, step: 0.1,
        apply: (v) => str().updateHandprintsParams({ size: v }), read: () => str().handprintsParams.size },
      { id: 'fadeSpeed', label: 'FADE', min: 0.1, max: 2, step: 0.1,
        apply: (v) => str().updateHandprintsParams({ fadeSpeed: v }), read: () => str().handprintsParams.fadeSpeed },
    ],
    setEnabled: (v) => str().setHandprintsEnabled(v),
    getEnabled: () => str().handprintsEnabled,
  },
  strand_tar: {
    getParams: () => [
      { id: 'spreadSpeed', label: 'SPD', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateTarSpreadParams({ spreadSpeed: v }), read: () => str().tarSpreadParams.spreadSpeed },
      { id: 'threshold', label: 'THRSH', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateTarSpreadParams({ threshold: v }), read: () => str().tarSpreadParams.threshold },
      { id: 'coverage', label: 'COV', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateTarSpreadParams({ coverage: v }), read: () => str().tarSpreadParams.coverage },
    ],
    setEnabled: (v) => str().setTarSpreadEnabled(v),
    getEnabled: () => str().tarSpreadEnabled,
  },
  strand_timefall: {
    getParams: () => [
      { id: 'intensity', label: 'INT', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateTimefallParams({ intensity: v }), read: () => str().timefallParams.intensity },
      { id: 'ageAmount', label: 'AGE', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateTimefallParams({ ageAmount: v }), read: () => str().timefallParams.ageAmount },
      { id: 'streakCount', label: 'STRK', min: 10, max: 500, step: 1,
        apply: (v) => str().updateTimefallParams({ streakCount: v }), read: () => str().timefallParams.streakCount },
    ],
    setEnabled: (v) => str().setTimefallEnabled(v),
    getEnabled: () => str().timefallEnabled,
  },
  strand_voidout: {
    getParams: () => [
      { id: 'speed', label: 'SPD', min: 0.1, max: 2, step: 0.1,
        apply: (v) => str().updateVoidOutParams({ speed: v }), read: () => str().voidOutParams.speed },
      { id: 'distortAmount', label: 'DIST', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateVoidOutParams({ distortAmount: v }), read: () => str().voidOutParams.distortAmount },
      { id: 'ringWidth', label: 'RING', min: 0.01, max: 0.3, step: 0.01,
        apply: (v) => str().updateVoidOutParams({ ringWidth: v }), read: () => str().voidOutParams.ringWidth },
    ],
    setEnabled: (v) => str().setVoidOutEnabled(v),
    getEnabled: () => str().voidOutEnabled,
  },
  strand_web: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateStrandWebParams({ threshold: v }), read: () => str().strandWebParams.threshold },
      { id: 'glowIntensity', label: 'GLOW', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateStrandWebParams({ glowIntensity: v }), read: () => str().strandWebParams.glowIntensity },
      { id: 'maxConnections', label: 'CONN', min: 1, max: 10, step: 1,
        apply: (v) => str().updateStrandWebParams({ maxConnections: v }), read: () => str().strandWebParams.maxConnections },
    ],
    setEnabled: (v) => str().setStrandWebEnabled(v),
    getEnabled: () => str().strandWebEnabled,
  },
  strand_bridge: {
    getParams: () => [
      { id: 'gridSize', label: 'GRID', min: 8, max: 64, step: 1,
        apply: (v) => str().updateBridgeLinkParams({ gridSize: v }), read: () => str().bridgeLinkParams.gridSize },
      { id: 'edgeSensitivity', label: 'EDGE', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateBridgeLinkParams({ edgeSensitivity: v }), read: () => str().bridgeLinkParams.edgeSensitivity },
      { id: 'opacity', label: 'OPAC', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateBridgeLinkParams({ opacity: v }), read: () => str().bridgeLinkParams.opacity },
    ],
    setEnabled: (v) => str().setBridgeLinkEnabled(v),
    getEnabled: () => str().bridgeLinkEnabled,
  },
  strand_path: {
    getParams: () => [
      { id: 'particleCount', label: 'CNT', min: 10, max: 200, step: 1,
        apply: (v) => str().updateChiralPathParams({ particleCount: v }), read: () => str().chiralPathParams.particleCount },
      { id: 'flowSpeed', label: 'FLOW', min: 0.1, max: 3, step: 0.1,
        apply: (v) => str().updateChiralPathParams({ flowSpeed: v }), read: () => str().chiralPathParams.flowSpeed },
      { id: 'trailLength', label: 'TRAIL', min: 5, max: 50, step: 1,
        apply: (v) => str().updateChiralPathParams({ trailLength: v }), read: () => str().chiralPathParams.trailLength },
    ],
    setEnabled: (v) => str().setChiralPathEnabled(v),
    getEnabled: () => str().chiralPathEnabled,
  },
  strand_umbilical: {
    getParams: () => [
      { id: 'tendrilCount', label: 'CNT', min: 2, max: 12, step: 1,
        apply: (v) => str().updateUmbilicalParams({ tendrilCount: v }), read: () => str().umbilicalParams.tendrilCount },
      { id: 'reachDistance', label: 'REACH', min: 0.1, max: 1, step: 0.1,
        apply: (v) => str().updateUmbilicalParams({ reachDistance: v }), read: () => str().umbilicalParams.reachDistance },
      { id: 'pulseSpeed', label: 'PULSE', min: 0.1, max: 3, step: 0.1,
        apply: (v) => str().updateUmbilicalParams({ pulseSpeed: v }), read: () => str().umbilicalParams.pulseSpeed },
    ],
    setEnabled: (v) => str().setUmbilicalEnabled(v),
    getEnabled: () => str().umbilicalEnabled,
  },
  strand_odradek: {
    getParams: () => [
      { id: 'sweepSpeed', label: 'SPD', min: 0.1, max: 3, step: 0.1,
        apply: (v) => str().updateOdradekParams({ sweepSpeed: v }), read: () => str().odradekParams.sweepSpeed },
      { id: 'pingIntensity', label: 'PING', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateOdradekParams({ pingIntensity: v }), read: () => str().odradekParams.pingIntensity },
      { id: 'revealDuration', label: 'RVDUR', min: 0.1, max: 1, step: 0.1,
        apply: (v) => str().updateOdradekParams({ revealDuration: v }), read: () => str().odradekParams.revealDuration },
    ],
    setEnabled: (v) => str().setOdradekEnabled(v),
    getEnabled: () => str().odradekEnabled,
  },
  strand_chiralium: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateChiraliumParams({ threshold: v }), read: () => str().chiraliumParams.threshold },
      { id: 'density', label: 'DEN', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateChiraliumParams({ density: v }), read: () => str().chiraliumParams.density },
      { id: 'shimmer', label: 'SHMR', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateChiraliumParams({ shimmer: v }), read: () => str().chiraliumParams.shimmer },
    ],
    setEnabled: (v) => str().setChiraliumEnabled(v),
    getEnabled: () => str().chiraliumEnabled,
  },
  strand_beach: {
    getParams: () => [
      { id: 'grainAmount', label: 'GRAIN', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateBeachStaticParams({ grainAmount: v }), read: () => str().beachStaticParams.grainAmount },
      { id: 'flickerSpeed', label: 'FLICK', min: 0.1, max: 3, step: 0.1,
        apply: (v) => str().updateBeachStaticParams({ flickerSpeed: v }), read: () => str().beachStaticParams.flickerSpeed },
      { id: 'invertProbability', label: 'INVP', min: 0, max: 0.5, step: 0.01,
        apply: (v) => str().updateBeachStaticParams({ invertProbability: v }), read: () => str().beachStaticParams.invertProbability },
    ],
    setEnabled: (v) => str().setBeachStaticEnabled(v),
    getEnabled: () => str().beachStaticEnabled,
  },
  strand_dooms: {
    getParams: () => [
      { id: 'haloSize', label: 'HALO', min: 0.1, max: 1, step: 0.1,
        apply: (v) => str().updateDoomsParams({ haloSize: v }), read: () => str().doomsParams.haloSize },
      { id: 'pulseSpeed', label: 'PULSE', min: 0.1, max: 2, step: 0.1,
        apply: (v) => str().updateDoomsParams({ pulseSpeed: v }), read: () => str().doomsParams.pulseSpeed },
      { id: 'sensitivity', label: 'SENS', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateDoomsParams({ sensitivity: v }), read: () => str().doomsParams.sensitivity },
    ],
    setEnabled: (v) => str().setDoomsEnabled(v),
    getEnabled: () => str().doomsEnabled,
  },
  strand_cloud: {
    getParams: () => [
      { id: 'density', label: 'DEN', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateChiralCloudParams({ density: v }), read: () => str().chiralCloudParams.density },
      { id: 'responsiveness', label: 'RESP', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateChiralCloudParams({ responsiveness: v }), read: () => str().chiralCloudParams.responsiveness },
      { id: 'tint', label: 'TINT', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateChiralCloudParams({ tint: v }), read: () => str().chiralCloudParams.tint },
    ],
    setEnabled: (v) => str().setChiralCloudEnabled(v),
    getEnabled: () => str().chiralCloudEnabled,
  },
  strand_bbpod: {
    getParams: () => [
      { id: 'vignetteSize', label: 'VIG', min: 0.5, max: 1, step: 0.01,
        apply: (v) => str().updateBBPodParams({ vignetteSize: v }), read: () => str().bbPodParams.vignetteSize },
      { id: 'tintStrength', label: 'TINT', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateBBPodParams({ tintStrength: v }), read: () => str().bbPodParams.tintStrength },
      { id: 'causticAmount', label: 'CAUST', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateBBPodParams({ causticAmount: v }), read: () => str().bbPodParams.causticAmount },
    ],
    setEnabled: (v) => str().setBBPodEnabled(v),
    getEnabled: () => str().bbPodEnabled,
  },
  strand_seam: {
    getParams: () => [
      { id: 'riftWidth', label: 'WIDTH', min: 0.01, max: 0.2, step: 0.01,
        apply: (v) => str().updateSeamParams({ riftWidth: v }), read: () => str().seamParams.riftWidth },
      { id: 'parallaxAmount', label: 'PARA', min: 0, max: 0.5, step: 0.01,
        apply: (v) => str().updateSeamParams({ parallaxAmount: v }), read: () => str().seamParams.parallaxAmount },
      { id: 'edgeDistort', label: 'EDIST', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateSeamParams({ edgeDistort: v }), read: () => str().seamParams.edgeDistort },
    ],
    setEnabled: (v) => str().setSeamEnabled(v),
    getEnabled: () => str().seamEnabled,
  },
  strand_extinction: {
    getParams: () => [
      { id: 'erosionSpeed', label: 'SPD', min: 0.1, max: 1, step: 0.1,
        apply: (v) => str().updateExtinctionParams({ erosionSpeed: v }), read: () => str().extinctionParams.erosionSpeed },
      { id: 'coverage', label: 'COV', min: 0, max: 1, step: 0.01,
        apply: (v) => str().updateExtinctionParams({ coverage: v }), read: () => str().extinctionParams.coverage },
      { id: 'decayStages', label: 'STGS', min: 1, max: 5, step: 1,
        apply: (v) => str().updateExtinctionParams({ decayStages: v }), read: () => str().extinctionParams.decayStages },
    ],
    setEnabled: (v) => str().setExtinctionEnabled(v),
    getEnabled: () => str().extinctionEnabled,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MOTION EFFECTS
  // ═══════════════════════════════════════════════════════════════════════
  motion_extract: {
    getParams: () => [
      { id: 'threshold', label: 'THRSH', min: 0, max: 0.5, step: 0.01,
        apply: (v) => mot().updateMotionExtract({ threshold: v }), read: () => mot().motionExtract.threshold },
      { id: 'amplify', label: 'AMP', min: 1, max: 10, step: 0.1,
        apply: (v) => mot().updateMotionExtract({ amplify: v }), read: () => mot().motionExtract.amplify },
      { id: 'frameCount', label: 'FRMS', min: 2, max: 8, step: 1,
        apply: (v) => mot().updateMotionExtract({ frameCount: v }), read: () => mot().motionExtract.frameCount },
      { id: 'originalMix', label: 'OMIX', min: 0, max: 1, step: 0.01,
        apply: (v) => mot().updateMotionExtract({ originalMix: v }), read: () => mot().motionExtract.originalMix },
      { id: 'showOriginal', label: 'SHOW', min: 0, max: 1, step: 1,
        apply: (v) => mot().updateMotionExtract({ showOriginal: v >= 0.5 }), read: () => mot().motionExtract.showOriginal ? 1 : 0 },
    ],
    setEnabled: (v) => mot().setMotionExtractEnabled(v),
    getEnabled: () => mot().motionExtractEnabled,
  },
  echo_trail: {
    getParams: () => [
      { id: 'decay', label: 'DECAY', min: 0.8, max: 0.99, step: 0.01,
        apply: (v) => mot().updateEchoTrail({ decay: v }), read: () => mot().echoTrail.decay },
      { id: 'decayCurve', label: 'CURVE', min: 0.5, max: 3.0, step: 0.1,
        apply: (v) => mot().updateEchoTrail({ decayCurve: v }), read: () => mot().echoTrail.decayCurve },
      { id: 'trailZoom', label: 'ZOOM', min: 0.98, max: 1.02, step: 0.001,
        apply: (v) => mot().updateEchoTrail({ trailZoom: v }), read: () => mot().echoTrail.trailZoom },
      { id: 'trailRotation', label: 'ROT', min: -5, max: 5, step: 0.1,
        apply: (v) => mot().updateEchoTrail({ trailRotation: v }), read: () => mot().echoTrail.trailRotation },
      { id: 'offset', label: 'OFF', min: 0, max: 0.3, step: 0.001,
        apply: (v) => mot().updateEchoTrail({ offset: v }), read: () => mot().echoTrail.offset },
      { id: 'hueAmount', label: 'HUE', min: 0, max: 360, step: 1,
        apply: (v) => mot().updateEchoTrail({ hueAmount: v }), read: () => mot().echoTrail.hueAmount },
      { id: 'saturationDecay', label: 'SATD', min: 0.9, max: 1.1, step: 0.01,
        apply: (v) => mot().updateEchoTrail({ saturationDecay: v }), read: () => mot().echoTrail.saturationDecay },
      { id: 'colorShift', label: 'CSHIFT', min: 0, max: 1, step: 1,
        apply: (v) => mot().updateEchoTrail({ colorShift: v >= 0.5 }), read: () => mot().echoTrail.colorShift ? 1 : 0 },
    ],
    setEnabled: (v) => mot().setEchoTrailEnabled(v),
    getEnabled: () => mot().echoTrailEnabled,
  },
  time_smear: {
    getParams: () => [
      { id: 'accumulation', label: 'ACC', min: 0, max: 1, step: 0.01,
        apply: (v) => mot().updateTimeSmear({ accumulation: v }), read: () => mot().timeSmear.accumulation },
      { id: 'threshold', label: 'THRSH', min: 0, max: 0.5, step: 0.01,
        apply: (v) => mot().updateTimeSmear({ threshold: v }), read: () => mot().timeSmear.threshold },
      { id: 'motionOnly', label: 'MOT ONLY', min: 0, max: 1, step: 1,
        apply: (v) => mot().updateTimeSmear({ motionOnly: v >= 0.5 }), read: () => mot().timeSmear.motionOnly ? 1 : 0 },
    ],
    getSelectParams: () => [
      { id: 'direction', label: 'DIR', type: 'select' as const,
        options: [{ value: 'both', label: 'Both' }, { value: 'forward', label: 'Forward' }, { value: 'backward', label: 'Backward' }],
        apply: (v) => mot().updateTimeSmear({ direction: v as any }), read: () => mot().timeSmear.direction },
    ],
    setEnabled: (v) => mot().setTimeSmearEnabled(v),
    getEnabled: () => mot().timeSmearEnabled,
  },
  freeze_mask: {
    getParams: () => [
      { id: 'freezeThreshold', label: 'THRSH', min: 0, max: 0.2, step: 0.001,
        apply: (v) => mot().updateFreezeMask({ freezeThreshold: v }), read: () => mot().freezeMask.freezeThreshold },
      { id: 'updateSpeed', label: 'SPD', min: 0, max: 0.1, step: 0.001,
        apply: (v) => mot().updateFreezeMask({ updateSpeed: v }), read: () => mot().freezeMask.updateSpeed },
      { id: 'showFreeze', label: 'SHOW', min: 0, max: 1, step: 1,
        apply: (v) => mot().updateFreezeMask({ showFreeze: v >= 0.5 }), read: () => mot().freezeMask.showFreeze ? 1 : 0 },
      { id: 'invertMask', label: 'INVERT', min: 0, max: 1, step: 1,
        apply: (v) => mot().updateFreezeMask({ invertMask: v >= 0.5 }), read: () => mot().freezeMask.invertMask ? 1 : 0 },
    ],
    setEnabled: (v) => mot().setFreezeMaskEnabled(v),
    getEnabled: () => mot().freezeMaskEnabled,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // DESTRUCTION EFFECTS
  // ═══════════════════════════════════════════════════════════════════════
  datamosh: {
    getParams: () => [
      { id: 'intensity', label: 'INT', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateDatamoshParams({ intensity: v }), read: () => des().datamoshParams.intensity },
      { id: 'chaos', label: 'CHAOS', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateDatamoshParams({ chaos: v }), read: () => des().datamoshParams.chaos },
      { id: 'blockSize', label: 'BLKSZ', min: 2, max: 128, step: 1,
        apply: (v) => des().updateDatamoshParams({ blockSize: v }), read: () => des().datamoshParams.blockSize },
      { id: 'keyframeChance', label: 'KFCH', min: 0, max: 0.5, step: 0.001,
        apply: (v) => des().updateDatamoshParams({ keyframeChance: v }), read: () => des().datamoshParams.keyframeChance },
      { id: 'feedback', label: 'FDBK', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateDatamoshParams({ feedback: v }), read: () => des().datamoshParams.feedback },
      { id: 'motionSmooth', label: 'SMTH', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateDatamoshParams({ motionSmooth: v }), read: () => des().datamoshParams.motionSmooth },
      { id: 'colorCorrupt', label: 'COLR', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateDatamoshParams({ colorCorrupt: v }), read: () => des().datamoshParams.colorCorrupt },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateDatamoshParams({ mix: v }), read: () => des().datamoshParams.mix },
    ],
    setEnabled: (v) => des().setDatamoshEnabled(v),
    getEnabled: () => des().datamoshEnabled,
  },
  pixelSort: {
    getParams: () => [
      { id: 'intensity', label: 'INT', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updatePixelSortParams({ intensity: v }), read: () => des().pixelSortParams.intensity },
      { id: 'threshold', label: 'THRSH', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updatePixelSortParams({ threshold: v }), read: () => des().pixelSortParams.threshold },
      { id: 'streakLength', label: 'STRK', min: 1, max: 2000, step: 1,
        apply: (v) => des().updatePixelSortParams({ streakLength: v }), read: () => des().pixelSortParams.streakLength },
      { id: 'randomness', label: 'RAND', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updatePixelSortParams({ randomness: v }), read: () => des().pixelSortParams.randomness },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updatePixelSortParams({ mix: v }), read: () => des().pixelSortParams.mix },
    ],
    setEnabled: (v) => des().setPixelSortEnabled(v),
    getEnabled: () => des().pixelSortEnabled,
  },
  sonify: {
    getParams: () => [
      { id: 'sampleRate', label: 'RATE', min: 0.01, max: 1, step: 0.01,
        apply: (v) => des().updateSonifyParams({ sampleRate: v }), read: () => des().sonifyParams.sampleRate },
      { id: 'bitDepth', label: 'BITS', min: 1, max: 16, step: 1,
        apply: (v) => des().updateSonifyParams({ bitDepth: v }), read: () => des().sonifyParams.bitDepth },
      { id: 'drive', label: 'DRIVE', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateSonifyParams({ drive: v }), read: () => des().sonifyParams.drive },
      { id: 'filterCutoff', label: 'FILTER', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateSonifyParams({ filterCutoff: v }), read: () => des().sonifyParams.filterCutoff },
      { id: 'byteOffset', label: 'OFFSET', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateSonifyParams({ byteOffset: v }), read: () => des().sonifyParams.byteOffset },
      { id: 'intensity', label: 'INT', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateSonifyParams({ intensity: v }), read: () => des().sonifyParams.intensity },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updateSonifyParams({ mix: v }), read: () => des().sonifyParams.mix },
    ],
    getSelectParams: () => [
      { id: 'channelMode', label: 'CHAN', type: 'select' as const,
        options: [{ value: 'all', label: 'All' }, { value: 'red', label: 'Red' }, { value: 'green', label: 'Green' }, { value: 'blue', label: 'Blue' }],
        apply: (v) => des().updateSonifyParams({ channelMode: v as 'all' | 'red' | 'green' | 'blue' }),
        read: () => des().sonifyParams.channelMode },
    ],
    setEnabled: (v) => des().setSonifyEnabled(v),
    getEnabled: () => des().sonifyEnabled,
  },
  point_cloud: {
    getParams: () => [
      { id: 'density', label: 'DENS', min: 64, max: 512, step: 8,
        apply: (v) => des().updatePointCloudParams({ density: v }), read: () => des().pointCloudParams.density },
      { id: 'pointSize', label: 'SIZE', min: 1, max: 20, step: 0.5,
        apply: (v) => des().updatePointCloudParams({ pointSize: v }), read: () => des().pointCloudParams.pointSize },
      { id: 'depthMultiplier', label: 'DEPTH', min: 0, max: 2, step: 0.01,
        apply: (v) => des().updatePointCloudParams({ depthMultiplier: v }), read: () => des().pointCloudParams.depthMultiplier },
      { id: 'noiseDisplace', label: 'NOISE', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updatePointCloudParams({ noiseDisplace: v }), read: () => des().pointCloudParams.noiseDisplace },
      { id: 'noiseScale', label: 'N.SCALE', min: 0.1, max: 10, step: 0.1,
        apply: (v) => des().updatePointCloudParams({ noiseScale: v }), read: () => des().pointCloudParams.noiseScale },
      { id: 'noiseSpeed', label: 'N.SPD', min: 0, max: 2, step: 0.01,
        apply: (v) => des().updatePointCloudParams({ noiseSpeed: v }), read: () => des().pointCloudParams.noiseSpeed },
      { id: 'opacity', label: 'OPAC', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updatePointCloudParams({ opacity: v }), read: () => des().pointCloudParams.opacity },
      { id: 'rotateX', label: 'ROT.X', min: -3.14159, max: 3.14159, step: 0.01,
        apply: (v) => des().updatePointCloudParams({ rotateX: v }), read: () => des().pointCloudParams.rotateX },
      { id: 'rotateY', label: 'ROT.Y', min: -1.5708, max: 1.5708, step: 0.01,
        apply: (v) => des().updatePointCloudParams({ rotateY: v }), read: () => des().pointCloudParams.rotateY },
      { id: 'zoom', label: 'ZOOM', min: 0.5, max: 5, step: 0.05,
        apply: (v) => des().updatePointCloudParams({ zoom: v }), read: () => des().pointCloudParams.zoom },
      { id: 'scaleX', label: 'SCL.X', min: 0.3, max: 2, step: 0.01,
        apply: (v) => des().updatePointCloudParams({ scaleX: v }), read: () => des().pointCloudParams.scaleX },
      { id: 'scaleY', label: 'SCL.Y', min: 0.3, max: 2, step: 0.01,
        apply: (v) => des().updatePointCloudParams({ scaleY: v }), read: () => des().pointCloudParams.scaleY },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => des().updatePointCloudParams({ mix: v }), read: () => des().pointCloudParams.mix },
    ],
    getSelectParams: () => [
      { id: 'depthChannel', label: 'CHAN', type: 'select' as const,
        options: [{ value: 'luminance', label: 'Luma' }, { value: 'red', label: 'Red' }, { value: 'green', label: 'Green' }, { value: 'blue', label: 'Blue' }],
        apply: (v) => des().updatePointCloudParams({ depthChannel: v as 'luminance' | 'red' | 'green' | 'blue' }),
        read: () => des().pointCloudParams.depthChannel },
    ],
    setEnabled: (v) => des().setPointCloudEnabled(v),
    getEnabled: () => des().pointCloudEnabled,
  },

  // Face HUD
  face_hud: {
    getParams: () => [
      { id: 'wireframeOpacity', label: 'WIRE', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateFaceHudParams({ wireframeOpacity: v }), read: () => mor().faceHudParams.wireframeOpacity },
      { id: 'smoothing', label: 'SMTH', min: 0, max: 0.95, step: 0.01,
        apply: (v) => mor().updateFaceHudParams({ smoothing: v }), read: () => mor().faceHudParams.smoothing },
      { id: 'scanLines', label: 'SCAN', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateFaceHudParams({ scanLines: v }), read: () => mor().faceHudParams.scanLines },
      { id: 'detectionInterval', label: 'DET', min: 1, max: 10, step: 1, controlType: 'stepper' as const,
        apply: (v) => mor().updateFaceHudParams({ detectionInterval: v }), read: () => mor().faceHudParams.detectionInterval },
      { id: 'emotionDisplay', label: 'EMO', min: 0, max: 1, step: 1,
        apply: (v) => mor().updateFaceHudParams({ emotionDisplay: v >= 0.5 }), read: () => mor().faceHudParams.emotionDisplay ? 1 : 0 },
      { id: 'mix', label: 'MIX', min: 0, max: 1, step: 0.01,
        apply: (v) => mor().updateFaceHudParams({ mix: v }), read: () => mor().faceHudParams.mix },
    ],
    getSelectParams: () => [
      { id: 'hudColor', label: 'COLOR', type: 'select' as const,
        options: [
          { value: '#00ffcc', label: 'Cyber' },
          { value: '#ff0055', label: 'Red' },
          { value: '#00aaff', label: 'Blue' },
          { value: '#ffff00', label: 'Yellow' },
          { value: '#ff6b9d', label: 'Pink' },
          { value: '#ffffff', label: 'White' },
          { value: '#00ff00', label: 'Green' },
        ],
        apply: (v) => mor().updateFaceHudParams({ hudColor: v }),
        read: () => mor().faceHudParams.hudColor },
    ],
    setEnabled: (v) => mor().setFaceHudEnabled(v),
    getEnabled: () => mor().faceHudEnabled,
  },
}
