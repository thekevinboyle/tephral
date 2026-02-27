/**
 * Imperative utility for enabling/disabling effects and applying params
 * outside React components. Uses `.getState()` for imperative access.
 */
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'
import { useLandmarksStore } from '../stores/landmarksStore'
import { useContourStore } from '../stores/contourStore'
import { useAcidStore } from '../stores/acidStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'
import { useTextureOverlayStore } from '../stores/textureOverlayStore'
import { useDataOverlayStore } from '../stores/dataOverlayStore'
import { useStrandStore } from '../stores/strandStore'
import { useMotionStore } from '../stores/motionStore'
import { useDestructionStore } from '../stores/destructionStore'

// ============================================================================
// setEffectEnabled — enable or disable any effect by ID
// ============================================================================

export function setEffectEnabled(effectId: string, enabled: boolean): void {
  const glitch = useGlitchEngineStore.getState()
  const ascii = useAsciiRenderStore.getState()
  const stipple = useStippleStore.getState()
  const contour = useContourStore.getState()
  const landmarks = useLandmarksStore.getState()
  const acid = useAcidStore.getState()
  const vision = useVisionTrackingStore.getState()
  const textureOverlay = useTextureOverlayStore.getState()
  const dataOverlay = useDataOverlayStore.getState()
  const strand = useStrandStore.getState()
  const motion = useMotionStore.getState()
  const destruction = useDestructionStore.getState()

  switch (effectId) {
    // Glitch effects
    case 'rgb_split': glitch.setRGBSplitEnabled(enabled); break
    case 'block_displace': glitch.setBlockDisplaceEnabled(enabled); break
    case 'scan_lines': glitch.setScanLinesEnabled(enabled); break
    case 'noise': glitch.setNoiseEnabled(enabled); break
    case 'pixelate': glitch.setPixelateEnabled(enabled); break
    case 'edges': glitch.setEdgeDetectionEnabled(enabled); break
    case 'chromatic': glitch.setChromaticAberrationEnabled(enabled); break
    case 'vhs': glitch.setVHSTrackingEnabled(enabled); break
    case 'lens': glitch.setLensDistortionEnabled(enabled); break
    case 'dither': glitch.setDitherEnabled(enabled); break
    case 'posterize': glitch.setPosterizeEnabled(enabled); break
    case 'static_displace': glitch.setStaticDisplacementEnabled(enabled); break
    case 'color_grade': glitch.setColorGradeEnabled(enabled); break
    case 'feedback': glitch.setFeedbackLoopEnabled(enabled); break
    // Render modes
    case 'ascii': ascii.setEnabled(enabled); break
    case 'stipple': stipple.setEnabled(enabled); break
    case 'contour': contour.setEnabled(enabled); break
    case 'landmarks': landmarks.setEnabled(enabled); break
    // Vision tracking
    case 'track_bright': vision.setBrightEnabled(enabled); break
    case 'track_edge': vision.setEdgeEnabled(enabled); break
    case 'track_color': vision.setColorEnabled(enabled); break
    case 'track_motion': vision.setMotionEnabled(enabled); break
    case 'track_face': vision.setFaceEnabled(enabled); break
    case 'track_hands': vision.setHandsEnabled(enabled); break
    // Acid effects
    case 'acid_dots': acid.setDotsEnabled(enabled); break
    case 'acid_glyph': acid.setGlyphEnabled(enabled); break
    case 'acid_icons': acid.setIconsEnabled(enabled); break
    case 'acid_contour': acid.setContourEnabled(enabled); break
    case 'acid_decomp': acid.setDecompEnabled(enabled); break
    case 'acid_mirror': acid.setMirrorEnabled(enabled); break
    case 'acid_slice': acid.setSliceEnabled(enabled); break
    case 'acid_thgrid': acid.setThGridEnabled(enabled); break
    case 'acid_cloud': acid.setCloudEnabled(enabled); break
    case 'acid_led': acid.setLedEnabled(enabled); break
    case 'acid_slit': acid.setSlitEnabled(enabled); break
    case 'acid_voronoi': acid.setVoronoiEnabled(enabled); break
    case 'acid_halftone': acid.setHalftoneEnabled(enabled); break
    case 'acid_hex': acid.setHexEnabled(enabled); break
    case 'acid_scan': acid.setScanEnabled(enabled); break
    case 'acid_ripple': acid.setRippleEnabled(enabled); break
    // Overlays
    case 'texture_overlay': textureOverlay.setEnabled(enabled); break
    case 'data_overlay': dataOverlay.setEnabled(enabled); break
    // Strand effects
    case 'strand_handprints': strand.setHandprintsEnabled(enabled); break
    case 'strand_tar': strand.setTarSpreadEnabled(enabled); break
    case 'strand_timefall': strand.setTimefallEnabled(enabled); break
    case 'strand_voidout': strand.setVoidOutEnabled(enabled); break
    case 'strand_web': strand.setStrandWebEnabled(enabled); break
    case 'strand_bridge': strand.setBridgeLinkEnabled(enabled); break
    case 'strand_path': strand.setChiralPathEnabled(enabled); break
    case 'strand_umbilical': strand.setUmbilicalEnabled(enabled); break
    case 'strand_odradek': strand.setOdradekEnabled(enabled); break
    case 'strand_chiralium': strand.setChiraliumEnabled(enabled); break
    case 'strand_beach': strand.setBeachStaticEnabled(enabled); break
    case 'strand_dooms': strand.setDoomsEnabled(enabled); break
    case 'strand_cloud': strand.setChiralCloudEnabled(enabled); break
    case 'strand_bbpod': strand.setBBPodEnabled(enabled); break
    case 'strand_seam': strand.setSeamEnabled(enabled); break
    case 'strand_extinction': strand.setExtinctionEnabled(enabled); break
    // Motion effects
    case 'motion_extract': motion.setMotionExtractEnabled(enabled); break
    case 'echo_trail': motion.setEchoTrailEnabled(enabled); break
    case 'time_smear': motion.setTimeSmearEnabled(enabled); break
    case 'freeze_mask': motion.setFreezeMaskEnabled(enabled); break
    // Destruction effects
    case 'datamosh': destruction.setDatamoshEnabled(enabled); break
    case 'pixelSort': destruction.setPixelSortEnabled(enabled); break
    case 'sonify': destruction.setSonifyEnabled(enabled); break
    case 'point_cloud': destruction.setPointCloudEnabled(enabled); break
  }
}

// ============================================================================
// applyEffectParams — apply a params snapshot to an effect
// ============================================================================

export function applyEffectParams(effectId: string, params: Record<string, number | string | boolean>): void {
  const glitch = useGlitchEngineStore.getState()
  const ascii = useAsciiRenderStore.getState()
  const stipple = useStippleStore.getState()
  const contour = useContourStore.getState()
  const landmarks = useLandmarksStore.getState()
  const acid = useAcidStore.getState()
  const vision = useVisionTrackingStore.getState()
  const textureOverlay = useTextureOverlayStore.getState()
  const dataOverlay = useDataOverlayStore.getState()
  const strand = useStrandStore.getState()
  const motion = useMotionStore.getState()
  const destruction = useDestructionStore.getState()

  switch (effectId) {
    // Glitch effects
    case 'rgb_split': glitch.updateRGBSplit(params); break
    case 'block_displace': glitch.updateBlockDisplace(params); break
    case 'scan_lines': glitch.updateScanLines(params); break
    case 'noise': glitch.updateNoise(params); break
    case 'pixelate': glitch.updatePixelate(params); break
    case 'edges': glitch.updateEdgeDetection(params); break
    case 'chromatic': glitch.updateChromaticAberration(params); break
    case 'vhs': glitch.updateVHSTracking(params); break
    case 'lens': glitch.updateLensDistortion(params); break
    case 'dither': glitch.updateDither(params); break
    case 'posterize': glitch.updatePosterize(params); break
    case 'static_displace': glitch.updateStaticDisplacement(params); break
    case 'color_grade': glitch.updateColorGrade(params); break
    case 'feedback': glitch.updateFeedbackLoop(params); break
    // Render modes
    case 'ascii': ascii.updateParams(params); break
    case 'stipple': stipple.updateParams(params); break
    case 'contour': contour.updateParams(params); break
    case 'landmarks':
      // Landmarks store uses individual setters, apply each key
      if ('minDetectionConfidence' in params) landmarks.setMinDetectionConfidence(params.minDetectionConfidence as number)
      if ('minTrackingConfidence' in params) landmarks.setMinTrackingConfidence(params.minTrackingConfidence as number)
      if ('maxFaces' in params) landmarks.setMaxFaces(params.maxFaces as number)
      if ('maxHands' in params) landmarks.setMaxHands(params.maxHands as number)
      break
    // Vision tracking
    case 'track_bright': vision.updateBrightParams(params); break
    case 'track_edge': vision.updateEdgeParams(params); break
    case 'track_color': vision.updateColorParams(params); break
    case 'track_motion': vision.updateMotionParams(params); break
    case 'track_face': vision.updateFaceParams(params); break
    case 'track_hands': vision.updateHandsParams(params); break
    // Acid effects
    case 'acid_dots': acid.updateDotsParams(params); break
    case 'acid_glyph': acid.updateGlyphParams(params); break
    case 'acid_icons': acid.updateIconsParams(params); break
    case 'acid_contour': acid.updateContourParams(params); break
    case 'acid_decomp': acid.updateDecompParams(params); break
    case 'acid_mirror': acid.updateMirrorParams(params); break
    case 'acid_slice': acid.updateSliceParams(params); break
    case 'acid_thgrid': acid.updateThGridParams(params); break
    case 'acid_cloud': acid.updateCloudParams(params); break
    case 'acid_led': acid.updateLedParams(params); break
    case 'acid_slit': acid.updateSlitParams(params); break
    case 'acid_voronoi': acid.updateVoronoiParams(params); break
    case 'acid_halftone': acid.updateHalftoneParams(params); break
    case 'acid_hex': acid.updateHexParams(params); break
    case 'acid_scan': acid.updateScanParams(params); break
    case 'acid_ripple': acid.updateRippleParams(params); break
    // Overlays
    case 'texture_overlay':
      // Texture overlay uses individual setters
      if ('opacity' in params) textureOverlay.setOpacity(params.opacity as number)
      if ('scale' in params) textureOverlay.setScale(params.scale as number)
      if ('animationSpeed' in params) textureOverlay.setAnimationSpeed(params.animationSpeed as number)
      break
    case 'data_overlay':
      dataOverlay.setStyle(params)
      break
    // Strand effects
    case 'strand_handprints': strand.updateHandprintsParams(params); break
    case 'strand_tar': strand.updateTarSpreadParams(params); break
    case 'strand_timefall': strand.updateTimefallParams(params); break
    case 'strand_voidout': strand.updateVoidOutParams(params); break
    case 'strand_web': strand.updateStrandWebParams(params); break
    case 'strand_bridge': strand.updateBridgeLinkParams(params); break
    case 'strand_path': strand.updateChiralPathParams(params); break
    case 'strand_umbilical': strand.updateUmbilicalParams(params); break
    case 'strand_odradek': strand.updateOdradekParams(params); break
    case 'strand_chiralium': strand.updateChiraliumParams(params); break
    case 'strand_beach': strand.updateBeachStaticParams(params); break
    case 'strand_dooms': strand.updateDoomsParams(params); break
    case 'strand_cloud': strand.updateChiralCloudParams(params); break
    case 'strand_bbpod': strand.updateBBPodParams(params); break
    case 'strand_seam': strand.updateSeamParams(params); break
    case 'strand_extinction': strand.updateExtinctionParams(params); break
    // Motion effects
    case 'motion_extract': motion.updateMotionExtract(params); break
    case 'echo_trail': motion.updateEchoTrail(params); break
    case 'time_smear': motion.updateTimeSmear(params); break
    case 'freeze_mask': motion.updateFreezeMask(params); break
    // Destruction effects
    case 'datamosh': destruction.updateDatamoshParams(params); break
    case 'pixelSort': destruction.updatePixelSortParams(params); break
    case 'sonify': destruction.updateSonifyParams(params); break
    case 'point_cloud': destruction.updatePointCloudParams(params); break
  }
}

// ============================================================================
// getEffectParams — read current params snapshot from any effect's store
// ============================================================================

export function getEffectParams(effectId: string): Record<string, number | string | boolean> {
  const glitch = useGlitchEngineStore.getState()
  const ascii = useAsciiRenderStore.getState()
  const stipple = useStippleStore.getState()
  const contour = useContourStore.getState()
  const landmarks = useLandmarksStore.getState()
  const acid = useAcidStore.getState()
  const vision = useVisionTrackingStore.getState()
  const textureOverlay = useTextureOverlayStore.getState()
  const dataOverlay = useDataOverlayStore.getState()
  const strand = useStrandStore.getState()
  const motion = useMotionStore.getState()
  const destruction = useDestructionStore.getState()

  switch (effectId) {
    // Glitch effects
    case 'rgb_split': return { ...glitch.rgbSplit }
    case 'block_displace': return { ...glitch.blockDisplace }
    case 'scan_lines': return { ...glitch.scanLines }
    case 'noise': return { ...glitch.noise }
    case 'pixelate': return { ...glitch.pixelate }
    case 'edges': return { ...glitch.edgeDetection }
    case 'chromatic': return { ...glitch.chromaticAberration }
    case 'vhs': return { ...glitch.vhsTracking }
    case 'lens': return { ...glitch.lensDistortion }
    case 'dither': return { ...glitch.dither }
    case 'posterize': return { ...glitch.posterize }
    case 'static_displace': return { ...glitch.staticDisplacement }
    case 'color_grade': return { ...glitch.colorGrade }
    case 'feedback': return { ...glitch.feedbackLoop }
    // Render modes
    case 'ascii': return { ...ascii.params }
    case 'stipple': return { ...stipple.params }
    case 'contour': return { ...contour.params }
    case 'landmarks': return {
      minDetectionConfidence: landmarks.minDetectionConfidence,
      minTrackingConfidence: landmarks.minTrackingConfidence,
      maxFaces: landmarks.maxFaces,
      maxHands: landmarks.maxHands,
    }
    // Vision tracking
    case 'track_bright': return { ...vision.brightParams }
    case 'track_edge': return { ...vision.edgeParams }
    case 'track_color': return { ...vision.colorParams }
    case 'track_motion': return { ...vision.motionParams }
    case 'track_face': return { ...vision.faceParams }
    case 'track_hands': return { ...vision.handsParams }
    // Acid effects
    case 'acid_dots': return { ...acid.dotsParams }
    case 'acid_glyph': return { ...acid.glyphParams }
    case 'acid_icons': return { ...acid.iconsParams }
    case 'acid_contour': return { ...acid.contourParams }
    case 'acid_decomp': return { ...acid.decompParams }
    case 'acid_mirror': return { ...acid.mirrorParams }
    case 'acid_slice': return { ...acid.sliceParams }
    case 'acid_thgrid': return { ...acid.thGridParams }
    case 'acid_cloud': return { ...acid.cloudParams }
    case 'acid_led': return { ...acid.ledParams }
    case 'acid_slit': return { ...acid.slitParams }
    case 'acid_voronoi': return { ...acid.voronoiParams }
    case 'acid_halftone': return { ...acid.halftoneParams }
    case 'acid_hex': return { ...acid.hexParams }
    case 'acid_scan': return { ...acid.scanParams }
    case 'acid_ripple': return { ...acid.rippleParams }
    // Overlays
    case 'texture_overlay': return {
      opacity: textureOverlay.opacity,
      scale: textureOverlay.scale,
      animationSpeed: textureOverlay.animationSpeed,
    }
    case 'data_overlay': return {
      fontSize: dataOverlay.style.fontSize,
      opacity: dataOverlay.style.opacity,
    }
    // Strand effects
    case 'strand_handprints': return { ...strand.handprintsParams }
    case 'strand_tar': return { ...strand.tarSpreadParams }
    case 'strand_timefall': return { ...strand.timefallParams }
    case 'strand_voidout': return { ...strand.voidOutParams }
    case 'strand_web': return { ...strand.strandWebParams }
    case 'strand_bridge': return { ...strand.bridgeLinkParams }
    case 'strand_path': return { ...strand.chiralPathParams }
    case 'strand_umbilical': return { ...strand.umbilicalParams }
    case 'strand_odradek': return { ...strand.odradekParams }
    case 'strand_chiralium': return { ...strand.chiraliumParams }
    case 'strand_beach': return { ...strand.beachStaticParams }
    case 'strand_dooms': return { ...strand.doomsParams }
    case 'strand_cloud': return { ...strand.chiralCloudParams }
    case 'strand_bbpod': return { ...strand.bbPodParams }
    case 'strand_seam': return { ...strand.seamParams }
    case 'strand_extinction': return { ...strand.extinctionParams }
    // Motion effects
    case 'motion_extract': return { ...motion.motionExtract }
    case 'echo_trail': return { ...motion.echoTrail }
    case 'time_smear': return { ...motion.timeSmear }
    case 'freeze_mask': return { ...motion.freezeMask }
    // Destruction effects
    case 'datamosh': return { ...destruction.datamoshParams }
    case 'pixelSort': return { ...destruction.pixelSortParams }
    case 'sonify': return { ...destruction.sonifyParams }
    case 'point_cloud': return { ...destruction.pointCloudParams }
    default: return {}
  }
}
