import { useCallback } from 'react'
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

export function useEffectDisable() {
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const contour = useContourStore()
  const landmarks = useLandmarksStore()
  const acid = useAcidStore()
  const vision = useVisionTrackingStore()
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()
  const strand = useStrandStore()
  const motion = useMotionStore()
  const destruction = useDestructionStore()

  const disableEffect = useCallback((effectId: string) => {
    switch (effectId) {
      // Glitch effects
      case 'rgb_split': glitch.setRGBSplitEnabled(false); break
      case 'block_displace': glitch.setBlockDisplaceEnabled(false); break
      case 'scan_lines': glitch.setScanLinesEnabled(false); break
      case 'noise': glitch.setNoiseEnabled(false); break
      case 'pixelate': glitch.setPixelateEnabled(false); break
      case 'edges': glitch.setEdgeDetectionEnabled(false); break
      case 'chromatic': glitch.setChromaticAberrationEnabled(false); break
      case 'vhs': glitch.setVHSTrackingEnabled(false); break
      case 'lens': glitch.setLensDistortionEnabled(false); break
      case 'dither': glitch.setDitherEnabled(false); break
      case 'posterize': glitch.setPosterizeEnabled(false); break
      case 'static_displace': glitch.setStaticDisplacementEnabled(false); break
      case 'color_grade': glitch.setColorGradeEnabled(false); break
      case 'feedback': glitch.setFeedbackLoopEnabled(false); break
      // Render modes
      case 'ascii': ascii.setEnabled(false); break
      case 'stipple': stipple.setEnabled(false); break
      case 'contour': contour.setEnabled(false); break
      case 'landmarks': landmarks.setEnabled(false); break
      // Vision tracking
      case 'track_bright': vision.setBrightEnabled(false); break
      case 'track_edge': vision.setEdgeEnabled(false); break
      case 'track_color': vision.setColorEnabled(false); break
      case 'track_motion': vision.setMotionEnabled(false); break
      case 'track_face': vision.setFaceEnabled(false); break
      case 'track_hands': vision.setHandsEnabled(false); break
      // Acid effects
      case 'acid_dots': acid.setDotsEnabled(false); break
      case 'acid_glyph': acid.setGlyphEnabled(false); break
      case 'acid_icons': acid.setIconsEnabled(false); break
      case 'acid_contour': acid.setContourEnabled(false); break
      case 'acid_decomp': acid.setDecompEnabled(false); break
      case 'acid_mirror': acid.setMirrorEnabled(false); break
      case 'acid_slice': acid.setSliceEnabled(false); break
      case 'acid_thgrid': acid.setThGridEnabled(false); break
      case 'acid_cloud': acid.setCloudEnabled(false); break
      case 'acid_led': acid.setLedEnabled(false); break
      case 'acid_slit': acid.setSlitEnabled(false); break
      case 'acid_voronoi': acid.setVoronoiEnabled(false); break
      case 'acid_halftone': acid.setHalftoneEnabled(false); break
      case 'acid_hex': acid.setHexEnabled(false); break
      case 'acid_scan': acid.setScanEnabled(false); break
      case 'acid_ripple': acid.setRippleEnabled(false); break
      // Overlays
      case 'texture_overlay': textureOverlay.setEnabled(false); break
      case 'data_overlay': dataOverlay.setEnabled(false); break
      // Strand effects
      case 'strand_handprints': strand.setHandprintsEnabled(false); break
      case 'strand_tar': strand.setTarSpreadEnabled(false); break
      case 'strand_timefall': strand.setTimefallEnabled(false); break
      case 'strand_voidout': strand.setVoidOutEnabled(false); break
      case 'strand_web': strand.setStrandWebEnabled(false); break
      case 'strand_bridge': strand.setBridgeLinkEnabled(false); break
      case 'strand_path': strand.setChiralPathEnabled(false); break
      case 'strand_umbilical': strand.setUmbilicalEnabled(false); break
      case 'strand_odradek': strand.setOdradekEnabled(false); break
      case 'strand_chiralium': strand.setChiraliumEnabled(false); break
      case 'strand_beach': strand.setBeachStaticEnabled(false); break
      case 'strand_dooms': strand.setDoomsEnabled(false); break
      case 'strand_cloud': strand.setChiralCloudEnabled(false); break
      case 'strand_bbpod': strand.setBBPodEnabled(false); break
      case 'strand_seam': strand.setSeamEnabled(false); break
      case 'strand_extinction': strand.setExtinctionEnabled(false); break
      // Motion effects
      case 'motion_extract': motion.setMotionExtractEnabled(false); break
      case 'echo_trail': motion.setEchoTrailEnabled(false); break
      case 'time_smear': motion.setTimeSmearEnabled(false); break
      case 'freeze_mask': motion.setFreezeMaskEnabled(false); break
      // Destruction effects
      case 'datamosh': destruction.setDatamoshEnabled(false); break
      case 'pixelSort': destruction.setPixelSortEnabled(false); break
    }
  }, [glitch, ascii, stipple, contour, landmarks, acid, vision, textureOverlay, dataOverlay, strand, motion, destruction])

  return { disableEffect }
}
