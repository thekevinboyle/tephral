import { useMemo } from 'react'
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
import { useRoutingStore } from '../stores/routingStore'
import { EFFECTS } from '../config/effects'

export interface ActiveEffect {
  id: string
  label: string
  color: string
  primaryValue: number
  primaryLabel: string
}

export function useActiveEffects() {
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const contour = useContourStore()
  const acid = useAcidStore()
  const vision = useVisionTrackingStore()
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()
  const strand = useStrandStore()
  const motion = useMotionStore()
  const destruction = useDestructionStore()
  const effectOrder = useRoutingStore(s => s.effectOrder)

  const sortedEffects = useMemo(() => {
    const activeEffects: ActiveEffect[] = []

    // Glitch effects
    if (glitch.rgbSplitEnabled) {
      const effect = EFFECTS.find(e => e.id === 'rgb_split')
      activeEffects.push({ id: 'rgb_split', label: 'RGB Split', color: effect?.color || '#0891b2', primaryValue: Math.round(glitch.rgbSplit.amount * 50), primaryLabel: 'amt' })
    }
    if (glitch.blockDisplaceEnabled) {
      const effect = EFFECTS.find(e => e.id === 'block_displace')
      activeEffects.push({ id: 'block_displace', label: 'Block', color: effect?.color || '#a855f7', primaryValue: Math.round(glitch.blockDisplace.displaceDistance * 1000), primaryLabel: 'dist' })
    }
    if (glitch.scanLinesEnabled) {
      const effect = EFFECTS.find(e => e.id === 'scan_lines')
      activeEffects.push({ id: 'scan_lines', label: 'Scan Lines', color: effect?.color || '#65a30d', primaryValue: glitch.scanLines.lineCount, primaryLabel: 'lines' })
    }
    if (glitch.noiseEnabled) {
      const effect = EFFECTS.find(e => e.id === 'noise')
      activeEffects.push({ id: 'noise', label: 'Noise', color: effect?.color || '#84cc16', primaryValue: Math.round(glitch.noise.amount * 100), primaryLabel: 'amt' })
    }
    if (glitch.pixelateEnabled) {
      const effect = EFFECTS.find(e => e.id === 'pixelate')
      activeEffects.push({ id: 'pixelate', label: 'Pixelate', color: effect?.color || '#d946ef', primaryValue: glitch.pixelate.pixelSize, primaryLabel: 'size' })
    }
    if (glitch.edgeDetectionEnabled) {
      const effect = EFFECTS.find(e => e.id === 'edges')
      activeEffects.push({ id: 'edges', label: 'Edges', color: effect?.color || '#f59e0b', primaryValue: Math.round(glitch.edgeDetection.threshold * 100), primaryLabel: 'thresh' })
    }
    if (glitch.chromaticAberrationEnabled) {
      const effect = EFFECTS.find(e => e.id === 'chromatic')
      activeEffects.push({ id: 'chromatic', label: 'Chromatic', color: effect?.color || '#6366f1', primaryValue: Math.round(glitch.chromaticAberration.intensity * 100), primaryLabel: 'int' })
    }
    if (glitch.vhsTrackingEnabled) {
      const effect = EFFECTS.find(e => e.id === 'vhs')
      activeEffects.push({ id: 'vhs', label: 'VHS', color: effect?.color || '#059669', primaryValue: Math.round(glitch.vhsTracking.tearIntensity * 100), primaryLabel: 'tear' })
    }
    if (glitch.lensDistortionEnabled) {
      const effect = EFFECTS.find(e => e.id === 'lens')
      activeEffects.push({ id: 'lens', label: 'Lens', color: effect?.color || '#0284c7', primaryValue: Math.round(glitch.lensDistortion.curvature * 100), primaryLabel: 'curve' })
    }
    if (glitch.ditherEnabled) {
      const effect = EFFECTS.find(e => e.id === 'dither')
      activeEffects.push({ id: 'dither', label: 'Dither', color: effect?.color || '#22c55e', primaryValue: Math.round(glitch.dither.intensity * 100), primaryLabel: 'int' })
    }
    if (glitch.posterizeEnabled) {
      const effect = EFFECTS.find(e => e.id === 'posterize')
      activeEffects.push({ id: 'posterize', label: 'Posterize', color: effect?.color || '#dc2626', primaryValue: glitch.posterize.levels, primaryLabel: 'lvl' })
    }
    if (glitch.staticDisplacementEnabled) {
      const effect = EFFECTS.find(e => e.id === 'static_displace')
      activeEffects.push({ id: 'static_displace', label: 'Static', color: effect?.color || '#8b5cf6', primaryValue: Math.round(glitch.staticDisplacement.intensity * 100), primaryLabel: 'int' })
    }
    if (glitch.colorGradeEnabled) {
      const effect = EFFECTS.find(e => e.id === 'color_grade')
      activeEffects.push({ id: 'color_grade', label: 'Grade', color: effect?.color || '#ea580c', primaryValue: Math.round(glitch.colorGrade.saturation * 100), primaryLabel: 'sat' })
    }
    if (glitch.feedbackLoopEnabled) {
      const effect = EFFECTS.find(e => e.id === 'feedback')
      activeEffects.push({ id: 'feedback', label: 'Feedback', color: effect?.color || '#d97706', primaryValue: Math.round(glitch.feedbackLoop.decay * 100), primaryLabel: 'decay' })
    }

    // ASCII
    if (ascii.enabled) {
      activeEffects.push({ id: 'ascii', label: ascii.params.mode === 'matrix' ? 'Matrix' : 'ASCII', color: ascii.params.mode === 'matrix' ? '#88ff00' : '#ffaa00', primaryValue: ascii.params.fontSize, primaryLabel: 'size' })
    }

    // Stipple
    if (stipple.enabled) {
      activeEffects.push({ id: 'stipple', label: 'Stipple', color: '#ff6600', primaryValue: Math.round(stipple.params.particleSize), primaryLabel: 'size' })
    }

    // Contour
    if (contour.enabled) {
      activeEffects.push({ id: 'contour', label: 'Contour', color: '#65a30d', primaryValue: Math.round(contour.params.threshold * 100), primaryLabel: 'thresh' })
    }

    // Landmarks
    if (landmarks.enabled && landmarks.currentMode !== 'off') {
      activeEffects.push({ id: 'landmarks', label: landmarks.currentMode.charAt(0).toUpperCase() + landmarks.currentMode.slice(1), color: '#88ff00', primaryValue: Math.round(landmarks.minDetectionConfidence * 100), primaryLabel: 'conf' })
    }

    // Vision tracking effects
    if (vision.brightEnabled) activeEffects.push({ id: 'track_bright', label: 'Bright', color: '#eab308', primaryValue: vision.brightParams.threshold, primaryLabel: 'thresh' })
    if (vision.edgeEnabled) activeEffects.push({ id: 'track_edge', label: 'Edge Track', color: '#06b6d4', primaryValue: vision.edgeParams.threshold, primaryLabel: 'thresh' })
    if (vision.colorEnabled) activeEffects.push({ id: 'track_color', label: 'Color Track', color: '#ec4899', primaryValue: Math.round(vision.colorParams.colorRange * 100), primaryLabel: 'range' })
    if (vision.motionEnabled) activeEffects.push({ id: 'track_motion', label: 'Motion Track', color: '#AA55FF', primaryValue: vision.motionParams.sensitivity, primaryLabel: 'sens' })
    if (vision.faceEnabled) activeEffects.push({ id: 'track_face', label: 'Face Track', color: '#f97316', primaryValue: vision.faceParams.threshold, primaryLabel: 'thresh' })
    if (vision.handsEnabled) activeEffects.push({ id: 'track_hands', label: 'Hands Track', color: '#a855f7', primaryValue: vision.handsParams.threshold, primaryLabel: 'thresh' })

    // Acid effects
    if (acid.dotsEnabled) activeEffects.push({ id: 'acid_dots', label: 'Dots', color: '#e5e5e5', primaryValue: acid.dotsParams.gridSize, primaryLabel: 'grid' })
    if (acid.glyphEnabled) activeEffects.push({ id: 'acid_glyph', label: 'Glyph', color: '#d4d4d4', primaryValue: acid.glyphParams.gridSize, primaryLabel: 'grid' })
    if (acid.iconsEnabled) activeEffects.push({ id: 'acid_icons', label: 'Icons', color: '#c4c4c4', primaryValue: acid.iconsParams.gridSize, primaryLabel: 'grid' })
    if (acid.contourEnabled) activeEffects.push({ id: 'acid_contour', label: 'Contour', color: '#b4b4b4', primaryValue: acid.contourParams.levels, primaryLabel: 'lvl' })
    if (acid.decompEnabled) activeEffects.push({ id: 'acid_decomp', label: 'Decomp', color: '#94a3b8', primaryValue: acid.decompParams.minBlock, primaryLabel: 'min' })
    if (acid.mirrorEnabled) activeEffects.push({ id: 'acid_mirror', label: 'Mirror', color: '#7dd3fc', primaryValue: acid.mirrorParams.segments, primaryLabel: 'seg' })
    if (acid.sliceEnabled) activeEffects.push({ id: 'acid_slice', label: 'Slice', color: '#67e8f9', primaryValue: acid.sliceParams.sliceCount, primaryLabel: 'cnt' })
    if (acid.thGridEnabled) activeEffects.push({ id: 'acid_thgrid', label: 'ThGrid', color: '#a5f3fc', primaryValue: acid.thGridParams.threshold, primaryLabel: 'thresh' })
    if (acid.cloudEnabled) activeEffects.push({ id: 'acid_cloud', label: 'Cloud', color: '#f0abfc', primaryValue: Math.round(acid.cloudParams.density / 1000), primaryLabel: 'den' })
    if (acid.ledEnabled) activeEffects.push({ id: 'acid_led', label: 'LED', color: '#c084fc', primaryValue: acid.ledParams.gridSize, primaryLabel: 'grid' })
    if (acid.slitEnabled) activeEffects.push({ id: 'acid_slit', label: 'Slit', color: '#a78bfa', primaryValue: Math.round(acid.slitParams.speed * 10), primaryLabel: 'spd' })
    if (acid.voronoiEnabled) activeEffects.push({ id: 'acid_voronoi', label: 'Voronoi', color: '#818cf8', primaryValue: acid.voronoiParams.cellCount, primaryLabel: 'cells' })
    if (acid.halftoneEnabled) activeEffects.push({ id: 'acid_halftone', label: 'Halftone', color: '#fbbf24', primaryValue: acid.halftoneParams.dotSize, primaryLabel: 'dot' })
    if (acid.hexEnabled) activeEffects.push({ id: 'acid_hex', label: 'Hex', color: '#f59e0b', primaryValue: acid.hexParams.cellSize, primaryLabel: 'cell' })
    if (acid.scanEnabled) activeEffects.push({ id: 'acid_scan', label: 'Scan', color: '#f97316', primaryValue: Math.round(acid.scanParams.speed * 10), primaryLabel: 'spd' })
    if (acid.rippleEnabled) activeEffects.push({ id: 'acid_ripple', label: 'Ripple', color: '#ef4444', primaryValue: Math.round(acid.rippleParams.frequency), primaryLabel: 'freq' })

    // Overlay effects
    if (textureOverlay.enabled) activeEffects.push({ id: 'texture_overlay', label: 'Texture', color: '#a3a3a3', primaryValue: Math.round(textureOverlay.opacity * 100), primaryLabel: 'opac' })
    if (dataOverlay.enabled) activeEffects.push({ id: 'data_overlay', label: 'Data', color: '#60a5fa', primaryValue: dataOverlay.style.fontSize, primaryLabel: 'size' })

    // Strand effects
    if (strand.handprintsEnabled) activeEffects.push({ id: 'strand_handprints', label: 'Handprints', color: '#1a1a1a', primaryValue: strand.handprintsParams.density, primaryLabel: 'den' })
    if (strand.tarSpreadEnabled) activeEffects.push({ id: 'strand_tar', label: 'Tar', color: '#ff6b35', primaryValue: Math.round(strand.tarSpreadParams.spreadSpeed * 100), primaryLabel: 'spd' })
    if (strand.timefallEnabled) activeEffects.push({ id: 'strand_timefall', label: 'Timefall', color: '#4a5568', primaryValue: Math.round(strand.timefallParams.intensity * 100), primaryLabel: 'int' })
    if (strand.voidOutEnabled) activeEffects.push({ id: 'strand_voidout', label: 'Void Out', color: '#ff6b35', primaryValue: Math.round(strand.voidOutParams.speed * 100), primaryLabel: 'spd' })
    if (strand.strandWebEnabled) activeEffects.push({ id: 'strand_web', label: 'Strand Web', color: '#00d4ff', primaryValue: Math.round(strand.strandWebParams.threshold * 100), primaryLabel: 'thresh' })
    if (strand.bridgeLinkEnabled) activeEffects.push({ id: 'strand_bridge', label: 'Bridge', color: '#00d4ff', primaryValue: strand.bridgeLinkParams.gridSize, primaryLabel: 'grid' })
    if (strand.chiralPathEnabled) activeEffects.push({ id: 'strand_path', label: 'Chiral Path', color: '#00d4ff', primaryValue: strand.chiralPathParams.particleCount, primaryLabel: 'cnt' })
    if (strand.umbilicalEnabled) activeEffects.push({ id: 'strand_umbilical', label: 'Umbilical', color: '#00d4ff', primaryValue: strand.umbilicalParams.tendrilCount, primaryLabel: 'cnt' })
    if (strand.odradekEnabled) activeEffects.push({ id: 'strand_odradek', label: 'Odradek', color: '#ffd700', primaryValue: Math.round(strand.odradekParams.sweepSpeed * 100), primaryLabel: 'spd' })
    if (strand.chiraliumEnabled) activeEffects.push({ id: 'strand_chiralium', label: 'Chiralium', color: '#ffd700', primaryValue: Math.round(strand.chiraliumParams.threshold * 100), primaryLabel: 'thresh' })
    if (strand.beachStaticEnabled) activeEffects.push({ id: 'strand_beach', label: 'Beach', color: '#ffd700', primaryValue: Math.round(strand.beachStaticParams.grainAmount * 100), primaryLabel: 'grain' })
    if (strand.doomsEnabled) activeEffects.push({ id: 'strand_dooms', label: 'Dooms', color: '#ffd700', primaryValue: Math.round(strand.doomsParams.haloSize * 100), primaryLabel: 'halo' })
    if (strand.chiralCloudEnabled) activeEffects.push({ id: 'strand_cloud', label: 'Chiral Cloud', color: '#7b68ee', primaryValue: Math.round(strand.chiralCloudParams.density * 100), primaryLabel: 'den' })
    if (strand.bbPodEnabled) activeEffects.push({ id: 'strand_bbpod', label: 'BB Pod', color: '#7b68ee', primaryValue: Math.round(strand.bbPodParams.vignetteSize * 100), primaryLabel: 'vig' })
    if (strand.seamEnabled) activeEffects.push({ id: 'strand_seam', label: 'Seam', color: '#7b68ee', primaryValue: Math.round(strand.seamParams.riftWidth * 100), primaryLabel: 'width' })
    if (strand.extinctionEnabled) activeEffects.push({ id: 'strand_extinction', label: 'Extinction', color: '#7b68ee', primaryValue: Math.round(strand.extinctionParams.erosionSpeed * 100), primaryLabel: 'spd' })

    // Motion effects
    if (motion.motionExtractEnabled) activeEffects.push({ id: 'motion_extract', label: 'Motion Extract', color: '#AA55FF', primaryValue: Math.round(motion.motionExtract.threshold * 100), primaryLabel: 'thresh' })
    if (motion.echoTrailEnabled) activeEffects.push({ id: 'echo_trail', label: 'Echo Trail', color: '#06b6d4', primaryValue: Math.round(motion.echoTrail.decay * 100), primaryLabel: 'decay' })
    if (motion.timeSmearEnabled) activeEffects.push({ id: 'time_smear', label: 'Time Smear', color: '#8b5cf6', primaryValue: Math.round(motion.timeSmear.accumulation * 100), primaryLabel: 'acc' })
    if (motion.freezeMaskEnabled) activeEffects.push({ id: 'freeze_mask', label: 'Freeze Mask', color: '#f97316', primaryValue: Math.round(motion.freezeMask.freezeThreshold * 100), primaryLabel: 'thresh' })

    // Destruction effects
    if (destruction.datamoshEnabled) activeEffects.push({ id: 'datamosh', label: 'Datamosh', color: '#ff0000', primaryValue: Math.round(destruction.datamoshParams.intensity * 100), primaryLabel: 'int' })
    if (destruction.pixelSortEnabled) activeEffects.push({ id: 'pixelSort', label: 'Pixel Sort', color: '#ff3366', primaryValue: Math.round(destruction.pixelSortParams.intensity * 100), primaryLabel: 'int' })

    // Sort by effectOrder
    return [...activeEffects].sort((a, b) => {
      const aIndex = effectOrder.indexOf(a.id)
      const bIndex = effectOrder.indexOf(b.id)
      const aPos = aIndex === -1 ? Infinity : aIndex
      const bPos = bIndex === -1 ? Infinity : bIndex
      return aPos - bPos
    })
  }, [
    glitch, ascii, stipple, landmarks, contour, acid, vision,
    textureOverlay, dataOverlay, strand, motion, destruction, effectOrder,
  ])

  return { sortedEffects }
}
