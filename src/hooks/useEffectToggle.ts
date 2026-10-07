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

/**
 * Pure snapshot of an effect's enabled flag plus its toggle, read from the stores' current state.
 * Shared by the pad grid and the browser list; call it at render or click time (never cache onToggle).
 */
export function getEffectState(effectId: string): EffectState {
  const glitch = useGlitchEngineStore.getState()
  const ascii = useAsciiRenderStore.getState()
  const stipple = useStippleStore.getState()
  const contour = useContourStore.getState()
  const landmarks = useLandmarksStore.getState()
  const visionTracking = useVisionTrackingStore.getState()
  const acid = useAcidStore.getState()
  const textureOverlay = useTextureOverlayStore.getState()
  const dataOverlay = useDataOverlayStore.getState()
  const strand = useStrandStore.getState()
  const motion = useMotionStore.getState()
  const destruction = useDestructionStore.getState()
  const morph = useMorphStore.getState()
  const trend = useTrendStore.getState()
  const seg = useSegStore.getState()

  switch (effectId) {
    // ═══════════════════════════════════════════════════════════════
    // PAGE 2: GLITCH EFFECTS
    // ═══════════════════════════════════════════════════════════════
    case 'rgb_split':
      return {
        active: glitch.rgbSplitEnabled,
        onToggle: () => {
          if (!glitch.rgbSplitEnabled) moveToEndOfChain(effectId)
          glitch.setRGBSplitEnabled(!glitch.rgbSplitEnabled)
        },
      }
    case 'block_displace':
      return {
        active: glitch.blockDisplaceEnabled,
        onToggle: () => {
          if (!glitch.blockDisplaceEnabled) moveToEndOfChain(effectId)
          glitch.setBlockDisplaceEnabled(!glitch.blockDisplaceEnabled)
        },
      }
    case 'scan_lines':
      return {
        active: glitch.scanLinesEnabled,
        onToggle: () => {
          if (!glitch.scanLinesEnabled) moveToEndOfChain(effectId)
          glitch.setScanLinesEnabled(!glitch.scanLinesEnabled)
        },
      }
    case 'noise':
      return {
        active: glitch.noiseEnabled,
        onToggle: () => {
          if (!glitch.noiseEnabled) moveToEndOfChain(effectId)
          glitch.setNoiseEnabled(!glitch.noiseEnabled)
        },
      }
    case 'pixelate':
      return {
        active: glitch.pixelateEnabled,
        onToggle: () => {
          if (!glitch.pixelateEnabled) moveToEndOfChain(effectId)
          glitch.setPixelateEnabled(!glitch.pixelateEnabled)
        },
      }
    case 'edges':
      return {
        active: glitch.edgeDetectionEnabled,
        onToggle: () => {
          if (!glitch.edgeDetectionEnabled) moveToEndOfChain(effectId)
          glitch.setEdgeDetectionEnabled(!glitch.edgeDetectionEnabled)
        },
      }
    case 'chromatic':
      return {
        active: glitch.chromaticAberrationEnabled,
        onToggle: () => {
          if (!glitch.chromaticAberrationEnabled) moveToEndOfChain(effectId)
          glitch.setChromaticAberrationEnabled(!glitch.chromaticAberrationEnabled)
        },
      }
    case 'posterize':
      return {
        active: glitch.posterizeEnabled,
        onToggle: () => {
          if (!glitch.posterizeEnabled) moveToEndOfChain(effectId)
          glitch.setPosterizeEnabled(!glitch.posterizeEnabled)
        },
      }
    case 'color_grade':
      return {
        active: glitch.colorGradeEnabled,
        onToggle: () => {
          if (!glitch.colorGradeEnabled) moveToEndOfChain(effectId)
          glitch.setColorGradeEnabled(!glitch.colorGradeEnabled)
        },
      }
    case 'static_displace':
      return {
        active: glitch.staticDisplacementEnabled,
        onToggle: () => {
          if (!glitch.staticDisplacementEnabled) moveToEndOfChain(effectId)
          glitch.setStaticDisplacementEnabled(!glitch.staticDisplacementEnabled)
        },
      }
    case 'lens':
      return {
        active: glitch.lensDistortionEnabled,
        onToggle: () => {
          if (!glitch.lensDistortionEnabled) moveToEndOfChain(effectId)
          glitch.setLensDistortionEnabled(!glitch.lensDistortionEnabled)
        },
      }
    case 'vhs':
      return {
        active: glitch.vhsTrackingEnabled,
        onToggle: () => {
          if (!glitch.vhsTrackingEnabled) moveToEndOfChain(effectId)
          glitch.setVHSTrackingEnabled(!glitch.vhsTrackingEnabled)
        },
      }
    case 'dither':
      return {
        active: glitch.ditherEnabled,
        onToggle: () => {
          if (!glitch.ditherEnabled) moveToEndOfChain(effectId)
          glitch.setDitherEnabled(!glitch.ditherEnabled)
        },
      }
    case 'feedback':
      return {
        active: glitch.feedbackLoopEnabled,
        onToggle: () => {
          if (!glitch.feedbackLoopEnabled) moveToEndOfChain(effectId)
          glitch.setFeedbackLoopEnabled(!glitch.feedbackLoopEnabled)
        },
      }
    case 'ascii':
      return {
        active: ascii.enabled,
        onToggle: () => {
          if (!ascii.enabled) moveToEndOfChain(effectId)
          ascii.setEnabled(!ascii.enabled)
        },
      }
    case 'stipple':
      return {
        active: stipple.enabled,
        onToggle: () => {
          if (!stipple.enabled) moveToEndOfChain(effectId)
          stipple.setEnabled(!stipple.enabled)
        },
      }

    // ═══════════════════════════════════════════════════════════════
    // PAGE 1: VISION EFFECTS
    // ═══════════════════════════════════════════════════════════════

    // Blob tracking modes
    case 'track_bright':
      return {
        active: visionTracking.brightEnabled,
        onToggle: () => {
          if (!visionTracking.brightEnabled) moveToEndOfChain(effectId)
          visionTracking.setBrightEnabled(!visionTracking.brightEnabled)
        },
      }
    case 'track_edge':
      return {
        active: visionTracking.edgeEnabled,
        onToggle: () => {
          if (!visionTracking.edgeEnabled) moveToEndOfChain(effectId)
          visionTracking.setEdgeEnabled(!visionTracking.edgeEnabled)
        },
      }
    case 'track_color':
      return {
        active: visionTracking.colorEnabled,
        onToggle: () => {
          if (!visionTracking.colorEnabled) moveToEndOfChain(effectId)
          visionTracking.setColorEnabled(!visionTracking.colorEnabled)
        },
      }
    case 'track_motion':
      return {
        active: visionTracking.motionEnabled,
        onToggle: () => {
          if (!visionTracking.motionEnabled) moveToEndOfChain(effectId)
          visionTracking.setMotionEnabled(!visionTracking.motionEnabled)
        },
      }

    // Skin-tone based tracking modes
    case 'track_face':
      return {
        active: visionTracking.faceEnabled,
        onToggle: () => {
          if (!visionTracking.faceEnabled) moveToEndOfChain(effectId)
          visionTracking.setFaceEnabled(!visionTracking.faceEnabled)
        },
      }
    case 'track_hands':
      return {
        active: visionTracking.handsEnabled,
        onToggle: () => {
          if (!visionTracking.handsEnabled) moveToEndOfChain(effectId)
          visionTracking.setHandsEnabled(!visionTracking.handsEnabled)
        },
      }
    case 'contour':
      return {
        active: contour.enabled,
        onToggle: () => {
          if (!contour.enabled) moveToEndOfChain(effectId)
          contour.setEnabled(!contour.enabled)
        },
      }
    case 'landmarks':
      return {
        active: landmarks.enabled,
        onToggle: () => {
          if (landmarks.enabled) {
            landmarks.setEnabled(false)
            landmarks.setCurrentMode('off')
          } else {
            moveToEndOfChain(effectId)
            landmarks.setEnabled(true)
            landmarks.setCurrentMode('face')
          }
        },
      }

    // Trend effects — VISION
    case 'halation':
      return {
        active: trend.halationEnabled,
        onToggle: () => {
          if (!trend.halationEnabled) moveToEndOfChain(effectId)
          trend.setHalationEnabled(!trend.halationEnabled)
        },
      }
    case 'y2k_digicam':
      return {
        active: trend.y2kEnabled,
        onToggle: () => {
          if (!trend.y2kEnabled) moveToEndOfChain(effectId)
          trend.setY2kEnabled(!trend.y2kEnabled)
        },
      }
    case 'thermal':
      return {
        active: trend.thermalEnabled,
        onToggle: () => {
          if (!trend.thermalEnabled) moveToEndOfChain(effectId)
          trend.setThermalEnabled(!trend.thermalEnabled)
        },
      }
    case 'dreamcore':
      return {
        active: trend.dreamcoreEnabled,
        onToggle: () => {
          if (!trend.dreamcoreEnabled) moveToEndOfChain(effectId)
          trend.setDreamcoreEnabled(!trend.dreamcoreEnabled)
        },
      }
    case 'anamorphic':
      return {
        active: trend.anamorphicEnabled,
        onToggle: () => {
          if (!trend.anamorphicEnabled) moveToEndOfChain(effectId)
          trend.setAnamorphicEnabled(!trend.anamorphicEnabled)
        },
      }

    // ═══════════════════════════════════════════════════════════════
    // PAGE 0: ACID EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'acid_dots':
      return {
        active: acid.dotsEnabled,
        onToggle: () => {
          if (!acid.dotsEnabled) moveToEndOfChain(effectId)
          acid.setDotsEnabled(!acid.dotsEnabled)
        },
      }
    case 'acid_glyph':
      return {
        active: acid.glyphEnabled,
        onToggle: () => {
          if (!acid.glyphEnabled) moveToEndOfChain(effectId)
          acid.setGlyphEnabled(!acid.glyphEnabled)
        },
      }
    case 'acid_icons':
      return {
        active: acid.iconsEnabled,
        onToggle: () => {
          if (!acid.iconsEnabled) moveToEndOfChain(effectId)
          acid.setIconsEnabled(!acid.iconsEnabled)
        },
      }
    case 'acid_contour':
      return {
        active: acid.contourEnabled,
        onToggle: () => {
          if (!acid.contourEnabled) moveToEndOfChain(effectId)
          acid.setContourEnabled(!acid.contourEnabled)
        },
      }
    case 'acid_decomp':
      return {
        active: acid.decompEnabled,
        onToggle: () => {
          if (!acid.decompEnabled) moveToEndOfChain(effectId)
          acid.setDecompEnabled(!acid.decompEnabled)
        },
      }
    case 'acid_mirror':
      return {
        active: acid.mirrorEnabled,
        onToggle: () => {
          if (!acid.mirrorEnabled) moveToEndOfChain(effectId)
          acid.setMirrorEnabled(!acid.mirrorEnabled)
        },
      }
    case 'acid_slice':
      return {
        active: acid.sliceEnabled,
        onToggle: () => {
          if (!acid.sliceEnabled) moveToEndOfChain(effectId)
          acid.setSliceEnabled(!acid.sliceEnabled)
        },
      }
    case 'acid_thgrid':
      return {
        active: acid.thGridEnabled,
        onToggle: () => {
          if (!acid.thGridEnabled) moveToEndOfChain(effectId)
          acid.setThGridEnabled(!acid.thGridEnabled)
        },
      }
    case 'acid_cloud':
      return {
        active: acid.cloudEnabled,
        onToggle: () => {
          if (!acid.cloudEnabled) moveToEndOfChain(effectId)
          acid.setCloudEnabled(!acid.cloudEnabled)
        },
      }
    case 'acid_led':
      return {
        active: acid.ledEnabled,
        onToggle: () => {
          if (!acid.ledEnabled) moveToEndOfChain(effectId)
          acid.setLedEnabled(!acid.ledEnabled)
        },
      }
    case 'acid_slit':
      return {
        active: acid.slitEnabled,
        onToggle: () => {
          if (!acid.slitEnabled) moveToEndOfChain(effectId)
          acid.setSlitEnabled(!acid.slitEnabled)
        },
      }
    case 'acid_voronoi':
      return {
        active: acid.voronoiEnabled,
        onToggle: () => {
          if (!acid.voronoiEnabled) moveToEndOfChain(effectId)
          acid.setVoronoiEnabled(!acid.voronoiEnabled)
        },
      }
    case 'acid_halftone':
      return {
        active: acid.halftoneEnabled,
        onToggle: () => {
          if (!acid.halftoneEnabled) moveToEndOfChain(effectId)
          acid.setHalftoneEnabled(!acid.halftoneEnabled)
        },
      }
    case 'acid_hex':
      return {
        active: acid.hexEnabled,
        onToggle: () => {
          if (!acid.hexEnabled) moveToEndOfChain(effectId)
          acid.setHexEnabled(!acid.hexEnabled)
        },
      }
    case 'acid_scan':
      return {
        active: acid.scanEnabled,
        onToggle: () => {
          if (!acid.scanEnabled) moveToEndOfChain(effectId)
          acid.setScanEnabled(!acid.scanEnabled)
        },
      }
    case 'acid_ripple':
      return {
        active: acid.rippleEnabled,
        onToggle: () => {
          if (!acid.rippleEnabled) moveToEndOfChain(effectId)
          acid.setRippleEnabled(!acid.rippleEnabled)
        },
      }

    // ═══════════════════════════════════════════════════════════════
    // (OVERLAY effects removed - kept handlers for compatibility)
    // ═══════════════════════════════════════════════════════════════

    // Texture overlays
    case 'texture_grain':
      return {
        active: textureOverlay.enabled && textureOverlay.textureId === 'grain_fine',
        onToggle: () => {
          if (textureOverlay.enabled && textureOverlay.textureId === 'grain_fine') {
            textureOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            textureOverlay.setTextureId('grain_fine')
            textureOverlay.setEnabled(true)
          }
        },
      }
    case 'texture_dust':
      return {
        active: textureOverlay.enabled && textureOverlay.textureId === 'dust',
        onToggle: () => {
          if (textureOverlay.enabled && textureOverlay.textureId === 'dust') {
            textureOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            textureOverlay.setTextureId('dust')
            textureOverlay.setEnabled(true)
          }
        },
      }
    case 'texture_leak':
      return {
        active: textureOverlay.enabled && textureOverlay.textureId === 'vignette',
        onToggle: () => {
          if (textureOverlay.enabled && textureOverlay.textureId === 'vignette') {
            textureOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            textureOverlay.setTextureId('vignette')
            textureOverlay.setEnabled(true)
          }
        },
      }
    case 'texture_paper':
      return {
        active: textureOverlay.enabled && textureOverlay.textureId === 'paper',
        onToggle: () => {
          if (textureOverlay.enabled && textureOverlay.textureId === 'paper') {
            textureOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            textureOverlay.setTextureId('paper')
            textureOverlay.setEnabled(true)
          }
        },
      }
    case 'texture_canvas':
      return {
        active: textureOverlay.enabled && textureOverlay.textureId === 'canvas',
        onToggle: () => {
          if (textureOverlay.enabled && textureOverlay.textureId === 'canvas') {
            textureOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            textureOverlay.setTextureId('canvas')
            textureOverlay.setEnabled(true)
          }
        },
      }
    case 'texture_vhs':
      return {
        active: textureOverlay.enabled && textureOverlay.textureId === 'vhs_noise',
        onToggle: () => {
          if (textureOverlay.enabled && textureOverlay.textureId === 'vhs_noise') {
            textureOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            textureOverlay.setTextureId('vhs_noise')
            textureOverlay.setEnabled(true)
          }
        },
      }

    // Data overlays
    case 'data_watermark':
      return {
        active: dataOverlay.enabled && dataOverlay.template === 'watermark',
        onToggle: () => {
          if (dataOverlay.enabled && dataOverlay.template === 'watermark') {
            dataOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            dataOverlay.setTemplate('watermark')
            dataOverlay.setEnabled(true)
          }
        },
      }
    case 'data_stats':
      return {
        active: dataOverlay.enabled && dataOverlay.template === 'statsBar',
        onToggle: () => {
          if (dataOverlay.enabled && dataOverlay.template === 'statsBar') {
            dataOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            dataOverlay.setTemplate('statsBar')
            dataOverlay.setEnabled(true)
          }
        },
      }
    case 'data_title':
      return {
        active: dataOverlay.enabled && dataOverlay.template === 'titleCard',
        onToggle: () => {
          if (dataOverlay.enabled && dataOverlay.template === 'titleCard') {
            dataOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            dataOverlay.setTemplate('titleCard')
            dataOverlay.setEnabled(true)
          }
        },
      }
    case 'data_social':
      return {
        active: dataOverlay.enabled && dataOverlay.template === 'socialCard',
        onToggle: () => {
          if (dataOverlay.enabled && dataOverlay.template === 'socialCard') {
            dataOverlay.setEnabled(false)
          } else {
            moveToEndOfChain(effectId)
            dataOverlay.setTemplate('socialCard')
            dataOverlay.setEnabled(true)
          }
        },
      }

    // ═══════════════════════════════════════════════════════════════
    // PAGE 3: STRAND EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'strand_handprints':
      return {
        active: strand.handprintsEnabled,
        onToggle: () => {
          if (!strand.handprintsEnabled) moveToEndOfChain(effectId)
          strand.setHandprintsEnabled(!strand.handprintsEnabled)
        },
      }
    case 'strand_tar':
      return {
        active: strand.tarSpreadEnabled,
        onToggle: () => {
          if (!strand.tarSpreadEnabled) moveToEndOfChain(effectId)
          strand.setTarSpreadEnabled(!strand.tarSpreadEnabled)
        },
      }
    case 'strand_timefall':
      return {
        active: strand.timefallEnabled,
        onToggle: () => {
          if (!strand.timefallEnabled) moveToEndOfChain(effectId)
          strand.setTimefallEnabled(!strand.timefallEnabled)
        },
      }
    case 'strand_voidout':
      return {
        active: strand.voidOutEnabled,
        onToggle: () => {
          if (!strand.voidOutEnabled) moveToEndOfChain(effectId)
          strand.setVoidOutEnabled(!strand.voidOutEnabled)
        },
      }
    case 'strand_web':
      return {
        active: strand.strandWebEnabled,
        onToggle: () => {
          if (!strand.strandWebEnabled) moveToEndOfChain(effectId)
          strand.setStrandWebEnabled(!strand.strandWebEnabled)
        },
      }
    case 'strand_bridge':
      return {
        active: strand.bridgeLinkEnabled,
        onToggle: () => {
          if (!strand.bridgeLinkEnabled) moveToEndOfChain(effectId)
          strand.setBridgeLinkEnabled(!strand.bridgeLinkEnabled)
        },
      }
    case 'strand_path':
      return {
        active: strand.chiralPathEnabled,
        onToggle: () => {
          if (!strand.chiralPathEnabled) moveToEndOfChain(effectId)
          strand.setChiralPathEnabled(!strand.chiralPathEnabled)
        },
      }
    case 'strand_umbilical':
      return {
        active: strand.umbilicalEnabled,
        onToggle: () => {
          if (!strand.umbilicalEnabled) moveToEndOfChain(effectId)
          strand.setUmbilicalEnabled(!strand.umbilicalEnabled)
        },
      }
    case 'strand_odradek':
      return {
        active: strand.odradekEnabled,
        onToggle: () => {
          if (!strand.odradekEnabled) moveToEndOfChain(effectId)
          strand.setOdradekEnabled(!strand.odradekEnabled)
        },
      }
    case 'strand_chiralium':
      return {
        active: strand.chiraliumEnabled,
        onToggle: () => {
          if (!strand.chiraliumEnabled) moveToEndOfChain(effectId)
          strand.setChiraliumEnabled(!strand.chiraliumEnabled)
        },
      }
    case 'strand_beach':
      return {
        active: strand.beachStaticEnabled,
        onToggle: () => {
          if (!strand.beachStaticEnabled) moveToEndOfChain(effectId)
          strand.setBeachStaticEnabled(!strand.beachStaticEnabled)
        },
      }
    case 'strand_dooms':
      return {
        active: strand.doomsEnabled,
        onToggle: () => {
          if (!strand.doomsEnabled) moveToEndOfChain(effectId)
          strand.setDoomsEnabled(!strand.doomsEnabled)
        },
      }
    case 'strand_cloud':
      return {
        active: strand.chiralCloudEnabled,
        onToggle: () => {
          if (!strand.chiralCloudEnabled) moveToEndOfChain(effectId)
          strand.setChiralCloudEnabled(!strand.chiralCloudEnabled)
        },
      }
    case 'strand_bbpod':
      return {
        active: strand.bbPodEnabled,
        onToggle: () => {
          if (!strand.bbPodEnabled) moveToEndOfChain(effectId)
          strand.setBBPodEnabled(!strand.bbPodEnabled)
        },
      }
    case 'strand_seam':
      return {
        active: strand.seamEnabled,
        onToggle: () => {
          if (!strand.seamEnabled) moveToEndOfChain(effectId)
          strand.setSeamEnabled(!strand.seamEnabled)
        },
      }
    case 'strand_extinction':
      return {
        active: strand.extinctionEnabled,
        onToggle: () => {
          if (!strand.extinctionEnabled) moveToEndOfChain(effectId)
          strand.setExtinctionEnabled(!strand.extinctionEnabled)
        },
      }

    // ═══════════════════════════════════════════════════════════════
    // PAGE 4: MOTION EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'motion_extract':
      return {
        active: motion.motionExtractEnabled,
        onToggle: () => {
          if (!motion.motionExtractEnabled) moveToEndOfChain(effectId)
          motion.setMotionExtractEnabled(!motion.motionExtractEnabled)
        },
      }
    case 'echo_trail':
      return {
        active: motion.echoTrailEnabled,
        onToggle: () => {
          if (!motion.echoTrailEnabled) moveToEndOfChain(effectId)
          motion.setEchoTrailEnabled(!motion.echoTrailEnabled)
        },
      }
    case 'time_smear':
      return {
        active: motion.timeSmearEnabled,
        onToggle: () => {
          if (!motion.timeSmearEnabled) moveToEndOfChain(effectId)
          motion.setTimeSmearEnabled(!motion.timeSmearEnabled)
        },
      }
    case 'freeze_mask':
      return {
        active: motion.freezeMaskEnabled,
        onToggle: () => {
          if (!motion.freezeMaskEnabled) moveToEndOfChain(effectId)
          motion.setFreezeMaskEnabled(!motion.freezeMaskEnabled)
        },
      }

    // Trend effects — MOTION
    case 'flow_smear':
      return {
        active: trend.flowSmearEnabled,
        onToggle: () => {
          if (!trend.flowSmearEnabled) moveToEndOfChain(effectId)
          trend.setFlowSmearEnabled(!trend.flowSmearEnabled)
        },
      }
    case 'feedback_tunnel':
      return {
        active: trend.feedbackTunnelEnabled,
        onToggle: () => {
          if (!trend.feedbackTunnelEnabled) moveToEndOfChain(effectId)
          trend.setFeedbackTunnelEnabled(!trend.feedbackTunnelEnabled)
        },
      }
    case 'opium_trails':
      return {
        active: trend.opiumTrailsEnabled,
        onToggle: () => {
          if (!trend.opiumTrailsEnabled) moveToEndOfChain(effectId)
          trend.setOpiumTrailsEnabled(!trend.opiumTrailsEnabled)
        },
      }
    case 'rutt_etra':
      return {
        active: trend.ruttEtraEnabled,
        onToggle: () => {
          if (!trend.ruttEtraEnabled) moveToEndOfChain(effectId)
          trend.setRuttEtraEnabled(!trend.ruttEtraEnabled)
        },
      }
    case 'reaction_diffusion':
      return {
        active: trend.reactionDiffusionEnabled,
        onToggle: () => {
          if (!trend.reactionDiffusionEnabled) moveToEndOfChain(effectId)
          trend.setReactionDiffusionEnabled(!trend.reactionDiffusionEnabled)
        },
      }
    case 'physarum':
      return {
        active: trend.physarumEnabled,
        onToggle: () => {
          if (!trend.physarumEnabled) moveToEndOfChain(effectId)
          trend.setPhysarumEnabled(!trend.physarumEnabled)
        },
      }

    // ═══════════════════════════════════════════════════════════════
    // PAGE 5: DESTRUCTION EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'datamosh':
      return {
        active: destruction.datamoshEnabled,
        onToggle: () => {
          if (!destruction.datamoshEnabled) moveToEndOfChain(effectId)
          destruction.setDatamoshEnabled(!destruction.datamoshEnabled)
        },
      }

    case 'pixelSort':
      return {
        active: destruction.pixelSortEnabled,
        onToggle: () => {
          if (!destruction.pixelSortEnabled) moveToEndOfChain(effectId)
          destruction.setPixelSortEnabled(!destruction.pixelSortEnabled)
        },
      }

    case 'sonify':
      return {
        active: destruction.sonifyEnabled,
        onToggle: () => {
          if (!destruction.sonifyEnabled) moveToEndOfChain(effectId)
          destruction.setSonifyEnabled(!destruction.sonifyEnabled)
        },
      }

    case 'point_cloud':
      return {
        active: destruction.pointCloudEnabled,
        onToggle: () => {
          if (!destruction.pointCloudEnabled) moveToEndOfChain(effectId)
          destruction.setPointCloudEnabled(!destruction.pointCloudEnabled)
        },
      }

    case 'face_hud':
      return {
        active: morph.faceHudEnabled,
        onToggle: () => {
          if (!morph.faceHudEnabled) moveToEndOfChain(effectId)
          morph.setFaceHudEnabled(!morph.faceHudEnabled)
        },
      }

    // Trend effects — DESTROY
    case 'kaleidoscope':
      return {
        active: trend.kaleidoscopeEnabled,
        onToggle: () => {
          if (!trend.kaleidoscopeEnabled) moveToEndOfChain(effectId)
          trend.setKaleidoscopeEnabled(!trend.kaleidoscopeEnabled)
        },
      }
    case 'liquid_morph':
      return {
        active: trend.liquidMorphEnabled,
        onToggle: () => {
          if (!trend.liquidMorphEnabled) moveToEndOfChain(effectId)
          trend.setLiquidMorphEnabled(!trend.liquidMorphEnabled)
        },
      }
    case 'crystallize':
      return {
        active: trend.crystallizeEnabled,
        onToggle: () => {
          if (!trend.crystallizeEnabled) moveToEndOfChain(effectId)
          trend.setCrystallizeEnabled(!trend.crystallizeEnabled)
        },
      }
    case 'ripple_warp':
      return {
        active: trend.rippleWarpEnabled,
        onToggle: () => {
          if (!trend.rippleWarpEnabled) moveToEndOfChain(effectId)
          trend.setRippleWarpEnabled(!trend.rippleWarpEnabled)
        },
      }
    case 'fractal_domain':
      return {
        active: trend.fractalDomainEnabled,
        onToggle: () => {
          if (!trend.fractalDomainEnabled) moveToEndOfChain(effectId)
          trend.setFractalDomainEnabled(!trend.fractalDomainEnabled)
        },
      }
    case 'seg_voxel':
      return {
        active: seg.voxelEnabled,
        onToggle: () => {
          if (!seg.voxelEnabled) moveToEndOfChain(effectId)
          seg.setVoxelEnabled(!seg.voxelEnabled)
        },
      }
    case 'seg_echo':
      return {
        active: seg.echoEnabled,
        onToggle: () => {
          if (!seg.echoEnabled) moveToEndOfChain(effectId)
          seg.setEchoEnabled(!seg.echoEnabled)
        },
      }
    case 'seg_matter':
      return {
        active: seg.matterEnabled,
        onToggle: () => {
          if (!seg.matterEnabled) moveToEndOfChain(effectId)
          seg.setMatterEnabled(!seg.matterEnabled)
        },
      }
    case 'seg_stale':
      return {
        active: seg.staleEnabled,
        onToggle: () => {
          if (!seg.staleEnabled) moveToEndOfChain(effectId)
          seg.setStaleEnabled(!seg.staleEnabled)
        },
      }
    case 'seg_torn':
      return {
        active: seg.tornEnabled,
        onToggle: () => {
          if (!seg.tornEnabled) moveToEndOfChain(effectId)
          seg.setTornEnabled(!seg.tornEnabled)
        },
      }

    // Reserved / empty slots
    default:
      if (effectId.includes('reserved')) {
        return {
          active: false,
          onToggle: () => {},
          isReserved: true,
        }
      }
      return {
        active: false,
        onToggle: () => {},
      }
  }
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
  return ALL_IDS.filter((id) => getEffectState(id).active).join(',')
}

/** Set of enabled effect ids. Re-renders only when an effect is switched on or off. */
export function useEnabledEffectIds(): ReadonlySet<string> {
  const key = useSyncExternalStore(subscribeEnabled, enabledKey)
  return useMemo(() => new Set(key ? key.split(',') : []), [key])
}
