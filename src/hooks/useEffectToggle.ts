import { useMemo, useSyncExternalStore } from 'react'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'
import { useContourStore } from '../stores/contourStore'
import { useLandmarksStore } from '../stores/landmarksStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useAcidStore } from '../stores/acidStore'
import { useRoutingStore } from '../stores/routingStore'
import { useTextureOverlayStore } from '../stores/textureOverlayStore'
import { useDataOverlayStore } from '../stores/dataOverlayStore'
import { useStrandStore } from '../stores/strandStore'
import { useMotionStore } from '../stores/motionStore'
import { useDestructionStore } from '../stores/destructionStore'
import { useMorphStore } from '../stores/morphStore'
import { useTrendStore } from '../stores/trendStore'
import { useSegStore } from '../stores/segStore'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS } from '../config/effects'

export interface EffectState {
  active: boolean
  onToggle: () => void
  isReserved?: boolean
}

/** Move an effect to the end of the chain when it is enabled. */
function moveToEndOfChain(effectId: string) {
  const { effectOrder, setEffectOrder } = useRoutingStore.getState()
  setEffectOrder([...effectOrder.filter((id) => id !== effectId), effectId])
}

// Live store state, read at call time (each getter is one getState()).
const S = {
  get glitch() { return useGlitchEngineStore.getState() },
  get ascii() { return useAsciiRenderStore.getState() },
  get stipple() { return useStippleStore.getState() },
  get contour() { return useContourStore.getState() },
  get landmarks() { return useLandmarksStore.getState() },
  get visionTracking() { return useVisionTrackingStore.getState() },
  get acid() { return useAcidStore.getState() },
  get textureOverlay() { return useTextureOverlayStore.getState() },
  get dataOverlay() { return useDataOverlayStore.getState() },
  get strand() { return useStrandStore.getState() },
  get motion() { return useMotionStore.getState() },
  get destruction() { return useDestructionStore.getState() },
  get morph() { return useMorphStore.getState() },
  get trend() { return useTrendStore.getState() },
  get seg() { return useSegStore.getState() },
}

interface EffectEntry {
  /** The effect's enabled flag. getEffectState and isEffectActive both read this, so they cannot drift apart. */
  active: () => boolean
  toggle: (effectId: string) => void
}

/** One entry per toggleable effect id (pad grid / browser list). */
const EFFECT_ENTRIES: Record<string, EffectEntry> = {
  rgb_split: {
    active: () => S.glitch.rgbSplitEnabled,
    toggle: (effectId) => {
      if (!S.glitch.rgbSplitEnabled) moveToEndOfChain(effectId)
      S.glitch.setRGBSplitEnabled(!S.glitch.rgbSplitEnabled)
    },
  },
  block_displace: {
    active: () => S.glitch.blockDisplaceEnabled,
    toggle: (effectId) => {
      if (!S.glitch.blockDisplaceEnabled) moveToEndOfChain(effectId)
      S.glitch.setBlockDisplaceEnabled(!S.glitch.blockDisplaceEnabled)
    },
  },
  scan_lines: {
    active: () => S.glitch.scanLinesEnabled,
    toggle: (effectId) => {
      if (!S.glitch.scanLinesEnabled) moveToEndOfChain(effectId)
      S.glitch.setScanLinesEnabled(!S.glitch.scanLinesEnabled)
    },
  },
  noise: {
    active: () => S.glitch.noiseEnabled,
    toggle: (effectId) => {
      if (!S.glitch.noiseEnabled) moveToEndOfChain(effectId)
      S.glitch.setNoiseEnabled(!S.glitch.noiseEnabled)
    },
  },
  pixelate: {
    active: () => S.glitch.pixelateEnabled,
    toggle: (effectId) => {
      if (!S.glitch.pixelateEnabled) moveToEndOfChain(effectId)
      S.glitch.setPixelateEnabled(!S.glitch.pixelateEnabled)
    },
  },
  edges: {
    active: () => S.glitch.edgeDetectionEnabled,
    toggle: (effectId) => {
      if (!S.glitch.edgeDetectionEnabled) moveToEndOfChain(effectId)
      S.glitch.setEdgeDetectionEnabled(!S.glitch.edgeDetectionEnabled)
    },
  },
  chromatic: {
    active: () => S.glitch.chromaticAberrationEnabled,
    toggle: (effectId) => {
      if (!S.glitch.chromaticAberrationEnabled) moveToEndOfChain(effectId)
      S.glitch.setChromaticAberrationEnabled(!S.glitch.chromaticAberrationEnabled)
    },
  },
  posterize: {
    active: () => S.glitch.posterizeEnabled,
    toggle: (effectId) => {
      if (!S.glitch.posterizeEnabled) moveToEndOfChain(effectId)
      S.glitch.setPosterizeEnabled(!S.glitch.posterizeEnabled)
    },
  },
  color_grade: {
    active: () => S.glitch.colorGradeEnabled,
    toggle: (effectId) => {
      if (!S.glitch.colorGradeEnabled) moveToEndOfChain(effectId)
      S.glitch.setColorGradeEnabled(!S.glitch.colorGradeEnabled)
    },
  },
  static_displace: {
    active: () => S.glitch.staticDisplacementEnabled,
    toggle: (effectId) => {
      if (!S.glitch.staticDisplacementEnabled) moveToEndOfChain(effectId)
      S.glitch.setStaticDisplacementEnabled(!S.glitch.staticDisplacementEnabled)
    },
  },
  lens: {
    active: () => S.glitch.lensDistortionEnabled,
    toggle: (effectId) => {
      if (!S.glitch.lensDistortionEnabled) moveToEndOfChain(effectId)
      S.glitch.setLensDistortionEnabled(!S.glitch.lensDistortionEnabled)
    },
  },
  vhs: {
    active: () => S.glitch.vhsTrackingEnabled,
    toggle: (effectId) => {
      if (!S.glitch.vhsTrackingEnabled) moveToEndOfChain(effectId)
      S.glitch.setVHSTrackingEnabled(!S.glitch.vhsTrackingEnabled)
    },
  },
  dither: {
    active: () => S.glitch.ditherEnabled,
    toggle: (effectId) => {
      if (!S.glitch.ditherEnabled) moveToEndOfChain(effectId)
      S.glitch.setDitherEnabled(!S.glitch.ditherEnabled)
    },
  },
  feedback: {
    active: () => S.glitch.feedbackLoopEnabled,
    toggle: (effectId) => {
      if (!S.glitch.feedbackLoopEnabled) moveToEndOfChain(effectId)
      S.glitch.setFeedbackLoopEnabled(!S.glitch.feedbackLoopEnabled)
    },
  },
  ascii: {
    active: () => S.ascii.enabled,
    toggle: (effectId) => {
      if (!S.ascii.enabled) moveToEndOfChain(effectId)
      S.ascii.setEnabled(!S.ascii.enabled)
    },
  },
  stipple: {
    active: () => S.stipple.enabled,
    toggle: (effectId) => {
      if (!S.stipple.enabled) moveToEndOfChain(effectId)
      S.stipple.setEnabled(!S.stipple.enabled)
    },
  },
  // ═══════════════════════════════════════════════════════════════
  // PAGE 1: VISION EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // Blob tracking modes
  track_bright: {
    active: () => S.visionTracking.brightEnabled,
    toggle: (effectId) => {
      if (!S.visionTracking.brightEnabled) moveToEndOfChain(effectId)
      S.visionTracking.setBrightEnabled(!S.visionTracking.brightEnabled)
    },
  },
  track_edge: {
    active: () => S.visionTracking.edgeEnabled,
    toggle: (effectId) => {
      if (!S.visionTracking.edgeEnabled) moveToEndOfChain(effectId)
      S.visionTracking.setEdgeEnabled(!S.visionTracking.edgeEnabled)
    },
  },
  track_color: {
    active: () => S.visionTracking.colorEnabled,
    toggle: (effectId) => {
      if (!S.visionTracking.colorEnabled) moveToEndOfChain(effectId)
      S.visionTracking.setColorEnabled(!S.visionTracking.colorEnabled)
    },
  },
  track_motion: {
    active: () => S.visionTracking.motionEnabled,
    toggle: (effectId) => {
      if (!S.visionTracking.motionEnabled) moveToEndOfChain(effectId)
      S.visionTracking.setMotionEnabled(!S.visionTracking.motionEnabled)
    },
  },
  // Skin-tone based tracking modes
  track_face: {
    active: () => S.visionTracking.faceEnabled,
    toggle: (effectId) => {
      if (!S.visionTracking.faceEnabled) moveToEndOfChain(effectId)
      S.visionTracking.setFaceEnabled(!S.visionTracking.faceEnabled)
    },
  },
  track_hands: {
    active: () => S.visionTracking.handsEnabled,
    toggle: (effectId) => {
      if (!S.visionTracking.handsEnabled) moveToEndOfChain(effectId)
      S.visionTracking.setHandsEnabled(!S.visionTracking.handsEnabled)
    },
  },
  contour: {
    active: () => S.contour.enabled,
    toggle: (effectId) => {
      if (!S.contour.enabled) moveToEndOfChain(effectId)
      S.contour.setEnabled(!S.contour.enabled)
    },
  },
  landmarks: {
    active: () => S.landmarks.enabled,
    toggle: (effectId) => {
      if (S.landmarks.enabled) {
        S.landmarks.setEnabled(false)
        S.landmarks.setCurrentMode('off')
      } else {
        moveToEndOfChain(effectId)
        S.landmarks.setEnabled(true)
        S.landmarks.setCurrentMode('face')
      }
    },
  },
  // Trend effects — VISION
  halation: {
    active: () => S.trend.halationEnabled,
    toggle: (effectId) => {
      if (!S.trend.halationEnabled) moveToEndOfChain(effectId)
      S.trend.setHalationEnabled(!S.trend.halationEnabled)
    },
  },
  y2k_digicam: {
    active: () => S.trend.y2kEnabled,
    toggle: (effectId) => {
      if (!S.trend.y2kEnabled) moveToEndOfChain(effectId)
      S.trend.setY2kEnabled(!S.trend.y2kEnabled)
    },
  },
  thermal: {
    active: () => S.trend.thermalEnabled,
    toggle: (effectId) => {
      if (!S.trend.thermalEnabled) moveToEndOfChain(effectId)
      S.trend.setThermalEnabled(!S.trend.thermalEnabled)
    },
  },
  dreamcore: {
    active: () => S.trend.dreamcoreEnabled,
    toggle: (effectId) => {
      if (!S.trend.dreamcoreEnabled) moveToEndOfChain(effectId)
      S.trend.setDreamcoreEnabled(!S.trend.dreamcoreEnabled)
    },
  },
  anamorphic: {
    active: () => S.trend.anamorphicEnabled,
    toggle: (effectId) => {
      if (!S.trend.anamorphicEnabled) moveToEndOfChain(effectId)
      S.trend.setAnamorphicEnabled(!S.trend.anamorphicEnabled)
    },
  },
  // ═══════════════════════════════════════════════════════════════
  // PAGE 0: ACID EFFECTS
  // ═══════════════════════════════════════════════════════════════
  acid_dots: {
    active: () => S.acid.dotsEnabled,
    toggle: (effectId) => {
      if (!S.acid.dotsEnabled) moveToEndOfChain(effectId)
      S.acid.setDotsEnabled(!S.acid.dotsEnabled)
    },
  },
  acid_glyph: {
    active: () => S.acid.glyphEnabled,
    toggle: (effectId) => {
      if (!S.acid.glyphEnabled) moveToEndOfChain(effectId)
      S.acid.setGlyphEnabled(!S.acid.glyphEnabled)
    },
  },
  acid_icons: {
    active: () => S.acid.iconsEnabled,
    toggle: (effectId) => {
      if (!S.acid.iconsEnabled) moveToEndOfChain(effectId)
      S.acid.setIconsEnabled(!S.acid.iconsEnabled)
    },
  },
  acid_contour: {
    active: () => S.acid.contourEnabled,
    toggle: (effectId) => {
      if (!S.acid.contourEnabled) moveToEndOfChain(effectId)
      S.acid.setContourEnabled(!S.acid.contourEnabled)
    },
  },
  acid_decomp: {
    active: () => S.acid.decompEnabled,
    toggle: (effectId) => {
      if (!S.acid.decompEnabled) moveToEndOfChain(effectId)
      S.acid.setDecompEnabled(!S.acid.decompEnabled)
    },
  },
  acid_mirror: {
    active: () => S.acid.mirrorEnabled,
    toggle: (effectId) => {
      if (!S.acid.mirrorEnabled) moveToEndOfChain(effectId)
      S.acid.setMirrorEnabled(!S.acid.mirrorEnabled)
    },
  },
  acid_slice: {
    active: () => S.acid.sliceEnabled,
    toggle: (effectId) => {
      if (!S.acid.sliceEnabled) moveToEndOfChain(effectId)
      S.acid.setSliceEnabled(!S.acid.sliceEnabled)
    },
  },
  acid_thgrid: {
    active: () => S.acid.thGridEnabled,
    toggle: (effectId) => {
      if (!S.acid.thGridEnabled) moveToEndOfChain(effectId)
      S.acid.setThGridEnabled(!S.acid.thGridEnabled)
    },
  },
  acid_cloud: {
    active: () => S.acid.cloudEnabled,
    toggle: (effectId) => {
      if (!S.acid.cloudEnabled) moveToEndOfChain(effectId)
      S.acid.setCloudEnabled(!S.acid.cloudEnabled)
    },
  },
  acid_led: {
    active: () => S.acid.ledEnabled,
    toggle: (effectId) => {
      if (!S.acid.ledEnabled) moveToEndOfChain(effectId)
      S.acid.setLedEnabled(!S.acid.ledEnabled)
    },
  },
  acid_slit: {
    active: () => S.acid.slitEnabled,
    toggle: (effectId) => {
      if (!S.acid.slitEnabled) moveToEndOfChain(effectId)
      S.acid.setSlitEnabled(!S.acid.slitEnabled)
    },
  },
  acid_voronoi: {
    active: () => S.acid.voronoiEnabled,
    toggle: (effectId) => {
      if (!S.acid.voronoiEnabled) moveToEndOfChain(effectId)
      S.acid.setVoronoiEnabled(!S.acid.voronoiEnabled)
    },
  },
  acid_halftone: {
    active: () => S.acid.halftoneEnabled,
    toggle: (effectId) => {
      if (!S.acid.halftoneEnabled) moveToEndOfChain(effectId)
      S.acid.setHalftoneEnabled(!S.acid.halftoneEnabled)
    },
  },
  acid_hex: {
    active: () => S.acid.hexEnabled,
    toggle: (effectId) => {
      if (!S.acid.hexEnabled) moveToEndOfChain(effectId)
      S.acid.setHexEnabled(!S.acid.hexEnabled)
    },
  },
  acid_scan: {
    active: () => S.acid.scanEnabled,
    toggle: (effectId) => {
      if (!S.acid.scanEnabled) moveToEndOfChain(effectId)
      S.acid.setScanEnabled(!S.acid.scanEnabled)
    },
  },
  acid_ripple: {
    active: () => S.acid.rippleEnabled,
    toggle: (effectId) => {
      if (!S.acid.rippleEnabled) moveToEndOfChain(effectId)
      S.acid.setRippleEnabled(!S.acid.rippleEnabled)
    },
  },
  // ═══════════════════════════════════════════════════════════════
  // (OVERLAY effects removed - kept handlers for compatibility)
  // ═══════════════════════════════════════════════════════════════

  // Texture overlays
  texture_grain: {
    active: () => S.textureOverlay.enabled && S.textureOverlay.textureId === 'grain_fine',
    toggle: (effectId) => {
      if (S.textureOverlay.enabled && S.textureOverlay.textureId === 'grain_fine') {
        S.textureOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.textureOverlay.setTextureId('grain_fine')
        S.textureOverlay.setEnabled(true)
      }
    },
  },
  texture_dust: {
    active: () => S.textureOverlay.enabled && S.textureOverlay.textureId === 'dust',
    toggle: (effectId) => {
      if (S.textureOverlay.enabled && S.textureOverlay.textureId === 'dust') {
        S.textureOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.textureOverlay.setTextureId('dust')
        S.textureOverlay.setEnabled(true)
      }
    },
  },
  texture_leak: {
    active: () => S.textureOverlay.enabled && S.textureOverlay.textureId === 'vignette',
    toggle: (effectId) => {
      if (S.textureOverlay.enabled && S.textureOverlay.textureId === 'vignette') {
        S.textureOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.textureOverlay.setTextureId('vignette')
        S.textureOverlay.setEnabled(true)
      }
    },
  },
  texture_paper: {
    active: () => S.textureOverlay.enabled && S.textureOverlay.textureId === 'paper',
    toggle: (effectId) => {
      if (S.textureOverlay.enabled && S.textureOverlay.textureId === 'paper') {
        S.textureOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.textureOverlay.setTextureId('paper')
        S.textureOverlay.setEnabled(true)
      }
    },
  },
  texture_canvas: {
    active: () => S.textureOverlay.enabled && S.textureOverlay.textureId === 'canvas',
    toggle: (effectId) => {
      if (S.textureOverlay.enabled && S.textureOverlay.textureId === 'canvas') {
        S.textureOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.textureOverlay.setTextureId('canvas')
        S.textureOverlay.setEnabled(true)
      }
    },
  },
  texture_vhs: {
    active: () => S.textureOverlay.enabled && S.textureOverlay.textureId === 'vhs_noise',
    toggle: (effectId) => {
      if (S.textureOverlay.enabled && S.textureOverlay.textureId === 'vhs_noise') {
        S.textureOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.textureOverlay.setTextureId('vhs_noise')
        S.textureOverlay.setEnabled(true)
      }
    },
  },
  // Data overlays
  data_watermark: {
    active: () => S.dataOverlay.enabled && S.dataOverlay.template === 'watermark',
    toggle: (effectId) => {
      if (S.dataOverlay.enabled && S.dataOverlay.template === 'watermark') {
        S.dataOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.dataOverlay.setTemplate('watermark')
        S.dataOverlay.setEnabled(true)
      }
    },
  },
  data_stats: {
    active: () => S.dataOverlay.enabled && S.dataOverlay.template === 'statsBar',
    toggle: (effectId) => {
      if (S.dataOverlay.enabled && S.dataOverlay.template === 'statsBar') {
        S.dataOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.dataOverlay.setTemplate('statsBar')
        S.dataOverlay.setEnabled(true)
      }
    },
  },
  data_title: {
    active: () => S.dataOverlay.enabled && S.dataOverlay.template === 'titleCard',
    toggle: (effectId) => {
      if (S.dataOverlay.enabled && S.dataOverlay.template === 'titleCard') {
        S.dataOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.dataOverlay.setTemplate('titleCard')
        S.dataOverlay.setEnabled(true)
      }
    },
  },
  data_social: {
    active: () => S.dataOverlay.enabled && S.dataOverlay.template === 'socialCard',
    toggle: (effectId) => {
      if (S.dataOverlay.enabled && S.dataOverlay.template === 'socialCard') {
        S.dataOverlay.setEnabled(false)
      } else {
        moveToEndOfChain(effectId)
        S.dataOverlay.setTemplate('socialCard')
        S.dataOverlay.setEnabled(true)
      }
    },
  },
  // ═══════════════════════════════════════════════════════════════
  // PAGE 3: STRAND EFFECTS
  // ═══════════════════════════════════════════════════════════════
  strand_handprints: {
    active: () => S.strand.handprintsEnabled,
    toggle: (effectId) => {
      if (!S.strand.handprintsEnabled) moveToEndOfChain(effectId)
      S.strand.setHandprintsEnabled(!S.strand.handprintsEnabled)
    },
  },
  strand_tar: {
    active: () => S.strand.tarSpreadEnabled,
    toggle: (effectId) => {
      if (!S.strand.tarSpreadEnabled) moveToEndOfChain(effectId)
      S.strand.setTarSpreadEnabled(!S.strand.tarSpreadEnabled)
    },
  },
  strand_timefall: {
    active: () => S.strand.timefallEnabled,
    toggle: (effectId) => {
      if (!S.strand.timefallEnabled) moveToEndOfChain(effectId)
      S.strand.setTimefallEnabled(!S.strand.timefallEnabled)
    },
  },
  strand_voidout: {
    active: () => S.strand.voidOutEnabled,
    toggle: (effectId) => {
      if (!S.strand.voidOutEnabled) moveToEndOfChain(effectId)
      S.strand.setVoidOutEnabled(!S.strand.voidOutEnabled)
    },
  },
  strand_web: {
    active: () => S.strand.strandWebEnabled,
    toggle: (effectId) => {
      if (!S.strand.strandWebEnabled) moveToEndOfChain(effectId)
      S.strand.setStrandWebEnabled(!S.strand.strandWebEnabled)
    },
  },
  strand_bridge: {
    active: () => S.strand.bridgeLinkEnabled,
    toggle: (effectId) => {
      if (!S.strand.bridgeLinkEnabled) moveToEndOfChain(effectId)
      S.strand.setBridgeLinkEnabled(!S.strand.bridgeLinkEnabled)
    },
  },
  strand_path: {
    active: () => S.strand.chiralPathEnabled,
    toggle: (effectId) => {
      if (!S.strand.chiralPathEnabled) moveToEndOfChain(effectId)
      S.strand.setChiralPathEnabled(!S.strand.chiralPathEnabled)
    },
  },
  strand_umbilical: {
    active: () => S.strand.umbilicalEnabled,
    toggle: (effectId) => {
      if (!S.strand.umbilicalEnabled) moveToEndOfChain(effectId)
      S.strand.setUmbilicalEnabled(!S.strand.umbilicalEnabled)
    },
  },
  strand_odradek: {
    active: () => S.strand.odradekEnabled,
    toggle: (effectId) => {
      if (!S.strand.odradekEnabled) moveToEndOfChain(effectId)
      S.strand.setOdradekEnabled(!S.strand.odradekEnabled)
    },
  },
  strand_chiralium: {
    active: () => S.strand.chiraliumEnabled,
    toggle: (effectId) => {
      if (!S.strand.chiraliumEnabled) moveToEndOfChain(effectId)
      S.strand.setChiraliumEnabled(!S.strand.chiraliumEnabled)
    },
  },
  strand_beach: {
    active: () => S.strand.beachStaticEnabled,
    toggle: (effectId) => {
      if (!S.strand.beachStaticEnabled) moveToEndOfChain(effectId)
      S.strand.setBeachStaticEnabled(!S.strand.beachStaticEnabled)
    },
  },
  strand_dooms: {
    active: () => S.strand.doomsEnabled,
    toggle: (effectId) => {
      if (!S.strand.doomsEnabled) moveToEndOfChain(effectId)
      S.strand.setDoomsEnabled(!S.strand.doomsEnabled)
    },
  },
  strand_cloud: {
    active: () => S.strand.chiralCloudEnabled,
    toggle: (effectId) => {
      if (!S.strand.chiralCloudEnabled) moveToEndOfChain(effectId)
      S.strand.setChiralCloudEnabled(!S.strand.chiralCloudEnabled)
    },
  },
  strand_bbpod: {
    active: () => S.strand.bbPodEnabled,
    toggle: (effectId) => {
      if (!S.strand.bbPodEnabled) moveToEndOfChain(effectId)
      S.strand.setBBPodEnabled(!S.strand.bbPodEnabled)
    },
  },
  strand_seam: {
    active: () => S.strand.seamEnabled,
    toggle: (effectId) => {
      if (!S.strand.seamEnabled) moveToEndOfChain(effectId)
      S.strand.setSeamEnabled(!S.strand.seamEnabled)
    },
  },
  strand_extinction: {
    active: () => S.strand.extinctionEnabled,
    toggle: (effectId) => {
      if (!S.strand.extinctionEnabled) moveToEndOfChain(effectId)
      S.strand.setExtinctionEnabled(!S.strand.extinctionEnabled)
    },
  },
  // ═══════════════════════════════════════════════════════════════
  // PAGE 4: MOTION EFFECTS
  // ═══════════════════════════════════════════════════════════════
  motion_extract: {
    active: () => S.motion.motionExtractEnabled,
    toggle: (effectId) => {
      if (!S.motion.motionExtractEnabled) moveToEndOfChain(effectId)
      S.motion.setMotionExtractEnabled(!S.motion.motionExtractEnabled)
    },
  },
  echo_trail: {
    active: () => S.motion.echoTrailEnabled,
    toggle: (effectId) => {
      if (!S.motion.echoTrailEnabled) moveToEndOfChain(effectId)
      S.motion.setEchoTrailEnabled(!S.motion.echoTrailEnabled)
    },
  },
  time_smear: {
    active: () => S.motion.timeSmearEnabled,
    toggle: (effectId) => {
      if (!S.motion.timeSmearEnabled) moveToEndOfChain(effectId)
      S.motion.setTimeSmearEnabled(!S.motion.timeSmearEnabled)
    },
  },
  freeze_mask: {
    active: () => S.motion.freezeMaskEnabled,
    toggle: (effectId) => {
      if (!S.motion.freezeMaskEnabled) moveToEndOfChain(effectId)
      S.motion.setFreezeMaskEnabled(!S.motion.freezeMaskEnabled)
    },
  },
  // Trend effects — MOTION
  flow_smear: {
    active: () => S.trend.flowSmearEnabled,
    toggle: (effectId) => {
      if (!S.trend.flowSmearEnabled) moveToEndOfChain(effectId)
      S.trend.setFlowSmearEnabled(!S.trend.flowSmearEnabled)
    },
  },
  feedback_tunnel: {
    active: () => S.trend.feedbackTunnelEnabled,
    toggle: (effectId) => {
      if (!S.trend.feedbackTunnelEnabled) moveToEndOfChain(effectId)
      S.trend.setFeedbackTunnelEnabled(!S.trend.feedbackTunnelEnabled)
    },
  },
  opium_trails: {
    active: () => S.trend.opiumTrailsEnabled,
    toggle: (effectId) => {
      if (!S.trend.opiumTrailsEnabled) moveToEndOfChain(effectId)
      S.trend.setOpiumTrailsEnabled(!S.trend.opiumTrailsEnabled)
    },
  },
  rutt_etra: {
    active: () => S.trend.ruttEtraEnabled,
    toggle: (effectId) => {
      if (!S.trend.ruttEtraEnabled) moveToEndOfChain(effectId)
      S.trend.setRuttEtraEnabled(!S.trend.ruttEtraEnabled)
    },
  },
  reaction_diffusion: {
    active: () => S.trend.reactionDiffusionEnabled,
    toggle: (effectId) => {
      if (!S.trend.reactionDiffusionEnabled) moveToEndOfChain(effectId)
      S.trend.setReactionDiffusionEnabled(!S.trend.reactionDiffusionEnabled)
    },
  },
  physarum: {
    active: () => S.trend.physarumEnabled,
    toggle: (effectId) => {
      if (!S.trend.physarumEnabled) moveToEndOfChain(effectId)
      S.trend.setPhysarumEnabled(!S.trend.physarumEnabled)
    },
  },
  // ═══════════════════════════════════════════════════════════════
  // PAGE 5: DESTRUCTION EFFECTS
  // ═══════════════════════════════════════════════════════════════
  datamosh: {
    active: () => S.destruction.datamoshEnabled,
    toggle: (effectId) => {
      if (!S.destruction.datamoshEnabled) moveToEndOfChain(effectId)
      S.destruction.setDatamoshEnabled(!S.destruction.datamoshEnabled)
    },
  },
  pixelSort: {
    active: () => S.destruction.pixelSortEnabled,
    toggle: (effectId) => {
      if (!S.destruction.pixelSortEnabled) moveToEndOfChain(effectId)
      S.destruction.setPixelSortEnabled(!S.destruction.pixelSortEnabled)
    },
  },
  sonify: {
    active: () => S.destruction.sonifyEnabled,
    toggle: (effectId) => {
      if (!S.destruction.sonifyEnabled) moveToEndOfChain(effectId)
      S.destruction.setSonifyEnabled(!S.destruction.sonifyEnabled)
    },
  },
  point_cloud: {
    active: () => S.destruction.pointCloudEnabled,
    toggle: (effectId) => {
      if (!S.destruction.pointCloudEnabled) moveToEndOfChain(effectId)
      S.destruction.setPointCloudEnabled(!S.destruction.pointCloudEnabled)
    },
  },
  face_hud: {
    active: () => S.morph.faceHudEnabled,
    toggle: (effectId) => {
      if (!S.morph.faceHudEnabled) moveToEndOfChain(effectId)
      S.morph.setFaceHudEnabled(!S.morph.faceHudEnabled)
    },
  },
  // Trend effects — DESTROY
  kaleidoscope: {
    active: () => S.trend.kaleidoscopeEnabled,
    toggle: (effectId) => {
      if (!S.trend.kaleidoscopeEnabled) moveToEndOfChain(effectId)
      S.trend.setKaleidoscopeEnabled(!S.trend.kaleidoscopeEnabled)
    },
  },
  liquid_morph: {
    active: () => S.trend.liquidMorphEnabled,
    toggle: (effectId) => {
      if (!S.trend.liquidMorphEnabled) moveToEndOfChain(effectId)
      S.trend.setLiquidMorphEnabled(!S.trend.liquidMorphEnabled)
    },
  },
  crystallize: {
    active: () => S.trend.crystallizeEnabled,
    toggle: (effectId) => {
      if (!S.trend.crystallizeEnabled) moveToEndOfChain(effectId)
      S.trend.setCrystallizeEnabled(!S.trend.crystallizeEnabled)
    },
  },
  ripple_warp: {
    active: () => S.trend.rippleWarpEnabled,
    toggle: (effectId) => {
      if (!S.trend.rippleWarpEnabled) moveToEndOfChain(effectId)
      S.trend.setRippleWarpEnabled(!S.trend.rippleWarpEnabled)
    },
  },
  fractal_domain: {
    active: () => S.trend.fractalDomainEnabled,
    toggle: (effectId) => {
      if (!S.trend.fractalDomainEnabled) moveToEndOfChain(effectId)
      S.trend.setFractalDomainEnabled(!S.trend.fractalDomainEnabled)
    },
  },
  seg_voxel: {
    active: () => S.seg.voxelEnabled,
    toggle: (effectId) => {
      if (!S.seg.voxelEnabled) moveToEndOfChain(effectId)
      S.seg.setVoxelEnabled(!S.seg.voxelEnabled)
    },
  },
  seg_echo: {
    active: () => S.seg.echoEnabled,
    toggle: (effectId) => {
      if (!S.seg.echoEnabled) moveToEndOfChain(effectId)
      S.seg.setEchoEnabled(!S.seg.echoEnabled)
    },
  },
  seg_matter: {
    active: () => S.seg.matterEnabled,
    toggle: (effectId) => {
      if (!S.seg.matterEnabled) moveToEndOfChain(effectId)
      S.seg.setMatterEnabled(!S.seg.matterEnabled)
    },
  },
  seg_stale: {
    active: () => S.seg.staleEnabled,
    toggle: (effectId) => {
      if (!S.seg.staleEnabled) moveToEndOfChain(effectId)
      S.seg.setStaleEnabled(!S.seg.staleEnabled)
    },
  },
  seg_torn: {
    active: () => S.seg.tornEnabled,
    toggle: (effectId) => {
      if (!S.seg.tornEnabled) moveToEndOfChain(effectId)
      S.seg.setTornEnabled(!S.seg.tornEnabled)
    },
  },
}

/** Lean enabled-flag lookup: reads only the one store the effect lives in. */
export function isEffectActive(effectId: string): boolean {
  return EFFECT_ENTRIES[effectId]?.active() ?? false
}

/**
 * Snapshot of an effect's enabled flag plus its toggle, read from the stores' current state.
 * Shared by the pad grid and the browser list.
 */
export function getEffectState(effectId: string): EffectState {
  const entry = EFFECT_ENTRIES[effectId]
  if (entry) return { active: entry.active(), onToggle: () => entry.toggle(effectId) }
  // Reserved / empty slots
  return { active: false, onToggle: () => {}, ...(effectId.includes('reserved') ? { isReserved: true } : {}) }
}

/** Toggle an effect the way a pad click does: flip it, then make sure it has a sequencer track. */
export function toggleEffect(effectId: string) {
  getEffectState(effectId).onToggle()
  useEffectSequencerStore.getState().ensureTrack(effectId)
}

// ─── Enabled-set subscription ─────────────────────────────────────────
// Param ticks change these stores many times a second; components only care when an enabled flag flips.
// The snapshot is a string key, so useSyncExternalStore bails out of re-rendering unless the set changes.
const ENABLE_STORES = [
  useGlitchEngineStore, useAsciiRenderStore, useStippleStore, useContourStore, useLandmarksStore,
  useVisionTrackingStore, useAcidStore, useTextureOverlayStore, useDataOverlayStore, useStrandStore,
  useMotionStore, useDestructionStore, useMorphStore, useTrendStore, useSegStore,
] as const
const ALL_IDS = [...EFFECTS, ...STRAND_EFFECTS, ...MOTION_EFFECTS, ...DESTRUCTION_EFFECTS]
  .map((e) => e.id)
  .filter((id) => !id.includes('reserved'))

function subscribeEnabled(onChange: () => void) {
  const unsubs = ENABLE_STORES.map((s) => s.subscribe(onChange))
  return () => unsubs.forEach((u) => u())
}
function enabledKey(): string {
  return ALL_IDS.filter(isEffectActive).join(',')
}

/** Set of enabled effect ids. Re-renders only when an effect is switched on or off. */
export function useEnabledEffectIds(): ReadonlySet<string> {
  const key = useSyncExternalStore(subscribeEnabled, enabledKey)
  return useMemo(() => new Set(key ? key.split(',') : []), [key])
}
