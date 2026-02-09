import { useCallback } from 'react'
import { EffectButton } from './EffectButton'
import { getEffectsForPage, PAGE_NAMES } from '../../config/effects'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useContourStore } from '../../stores/contourStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useAcidStore } from '../../stores/acidStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useUIStore } from '../../stores/uiStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { useStrandStore } from '../../stores/strandStore'
import { useMotionStore } from '../../stores/motionStore'

export function PerformanceGrid() {
  // Glitch engine store
  const glitch = useGlitchEngineStore()
  const { soloEffectId, effectMix, setEffectMix } = useGlitchEngineStore()

  // Render stores
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const contour = useContourStore()
  const landmarks = useLandmarksStore()

  // Vision store
  const visionTracking = useVisionTrackingStore()

  // Acid store
  const acid = useAcidStore()

  // Texture and Data overlay stores
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()

  // Strand store
  const strand = useStrandStore()

  // Motion store
  const motion = useMotionStore()

  // Routing store for effect order
  const { effectOrder, setEffectOrder } = useRoutingStore()

  // UI store for grid page
  const { gridPage, setGridPage } = useUIStore()

  // Move an effect to the end of the chain when enabled
  const moveToEndOfChain = useCallback((effectId: string) => {
    const newOrder = effectOrder.filter(id => id !== effectId)
    newOrder.push(effectId)
    setEffectOrder(newOrder)
  }, [effectOrder, setEffectOrder])

  // Check if an effect is soloed
  const isSoloing = soloEffectId !== null

  // Helper to get effect state
  const getEffectState = (effectId: string) => {
    switch (effectId) {
      // ═══════════════════════════════════════════════════════════════
      // PAGE 2: GLITCH EFFECTS
      // ═══════════════════════════════════════════════════════════════
      case 'rgb_split':
        return {
          active: glitch.rgbSplitEnabled,
          value: glitch.rgbSplit.amount,
          onToggle: () => {
            if (!glitch.rgbSplitEnabled) moveToEndOfChain(effectId)
            glitch.setRGBSplitEnabled(!glitch.rgbSplitEnabled)
          },
          onValueChange: (v: number) => glitch.updateRGBSplit({ amount: v }),
        }
      case 'block_displace':
        return {
          active: glitch.blockDisplaceEnabled,
          value: glitch.blockDisplace.displaceDistance * 1000,
          onToggle: () => {
            if (!glitch.blockDisplaceEnabled) moveToEndOfChain(effectId)
            glitch.setBlockDisplaceEnabled(!glitch.blockDisplaceEnabled)
          },
          onValueChange: (v: number) => glitch.updateBlockDisplace({ displaceDistance: v / 1000 }),
        }
      case 'scan_lines':
        return {
          active: glitch.scanLinesEnabled,
          value: glitch.scanLines.lineCount,
          onToggle: () => {
            if (!glitch.scanLinesEnabled) moveToEndOfChain(effectId)
            glitch.setScanLinesEnabled(!glitch.scanLinesEnabled)
          },
          onValueChange: (v: number) => glitch.updateScanLines({ lineCount: v }),
        }
      case 'noise':
        return {
          active: glitch.noiseEnabled,
          value: glitch.noise.amount * 100,
          onToggle: () => {
            if (!glitch.noiseEnabled) moveToEndOfChain(effectId)
            glitch.setNoiseEnabled(!glitch.noiseEnabled)
          },
          onValueChange: (v: number) => glitch.updateNoise({ amount: v / 100 }),
        }
      case 'pixelate':
        return {
          active: glitch.pixelateEnabled,
          value: glitch.pixelate.pixelSize,
          onToggle: () => {
            if (!glitch.pixelateEnabled) moveToEndOfChain(effectId)
            glitch.setPixelateEnabled(!glitch.pixelateEnabled)
          },
          onValueChange: (v: number) => glitch.updatePixelate({ pixelSize: v }),
        }
      case 'edges':
        return {
          active: glitch.edgeDetectionEnabled,
          value: glitch.edgeDetection.threshold * 100,
          onToggle: () => {
            if (!glitch.edgeDetectionEnabled) moveToEndOfChain(effectId)
            glitch.setEdgeDetectionEnabled(!glitch.edgeDetectionEnabled)
          },
          onValueChange: (v: number) => glitch.updateEdgeDetection({ threshold: v / 100 }),
        }
      case 'chromatic':
        return {
          active: glitch.chromaticAberrationEnabled,
          value: glitch.chromaticAberration.intensity * 100,
          onToggle: () => {
            if (!glitch.chromaticAberrationEnabled) moveToEndOfChain(effectId)
            glitch.setChromaticAberrationEnabled(!glitch.chromaticAberrationEnabled)
          },
          onValueChange: (v: number) => glitch.updateChromaticAberration({ intensity: v / 100 }),
        }
      case 'posterize':
        return {
          active: glitch.posterizeEnabled,
          value: glitch.posterize.levels,
          onToggle: () => {
            if (!glitch.posterizeEnabled) moveToEndOfChain(effectId)
            glitch.setPosterizeEnabled(!glitch.posterizeEnabled)
          },
          onValueChange: (v: number) => glitch.updatePosterize({ levels: v }),
        }
      case 'color_grade':
        return {
          active: glitch.colorGradeEnabled,
          value: glitch.colorGrade.saturation * 100,
          onToggle: () => {
            if (!glitch.colorGradeEnabled) moveToEndOfChain(effectId)
            glitch.setColorGradeEnabled(!glitch.colorGradeEnabled)
          },
          onValueChange: (v: number) => glitch.updateColorGrade({ saturation: v / 100 }),
        }
      case 'static_displace':
        return {
          active: glitch.staticDisplacementEnabled,
          value: glitch.staticDisplacement.intensity * 100,
          onToggle: () => {
            if (!glitch.staticDisplacementEnabled) moveToEndOfChain(effectId)
            glitch.setStaticDisplacementEnabled(!glitch.staticDisplacementEnabled)
          },
          onValueChange: (v: number) => glitch.updateStaticDisplacement({ intensity: v / 100 }),
        }
      case 'lens':
        return {
          active: glitch.lensDistortionEnabled,
          value: glitch.lensDistortion.curvature * 100,
          onToggle: () => {
            if (!glitch.lensDistortionEnabled) moveToEndOfChain(effectId)
            glitch.setLensDistortionEnabled(!glitch.lensDistortionEnabled)
          },
          onValueChange: (v: number) => glitch.updateLensDistortion({ curvature: v / 100 }),
        }
      case 'vhs':
        return {
          active: glitch.vhsTrackingEnabled,
          value: glitch.vhsTracking.tearIntensity * 100,
          onToggle: () => {
            if (!glitch.vhsTrackingEnabled) moveToEndOfChain(effectId)
            glitch.setVHSTrackingEnabled(!glitch.vhsTrackingEnabled)
          },
          onValueChange: (v: number) => glitch.updateVHSTracking({ tearIntensity: v / 100 }),
        }
      case 'dither':
        return {
          active: glitch.ditherEnabled,
          value: glitch.dither.colorDepth,
          onToggle: () => {
            if (!glitch.ditherEnabled) moveToEndOfChain(effectId)
            glitch.setDitherEnabled(!glitch.ditherEnabled)
          },
          onValueChange: (v: number) => glitch.updateDither({ colorDepth: v }),
        }
      case 'feedback':
        return {
          active: glitch.feedbackLoopEnabled,
          value: glitch.feedbackLoop.decay * 100,
          onToggle: () => {
            if (!glitch.feedbackLoopEnabled) moveToEndOfChain(effectId)
            glitch.setFeedbackLoopEnabled(!glitch.feedbackLoopEnabled)
          },
          onValueChange: (v: number) => glitch.updateFeedbackLoop({ decay: v / 100 }),
        }
      case 'ascii':
        return {
          active: ascii.enabled,
          value: ascii.params.fontSize,
          onToggle: () => {
            if (!ascii.enabled) moveToEndOfChain(effectId)
            ascii.setEnabled(!ascii.enabled)
          },
          onValueChange: (v: number) => ascii.updateParams({ fontSize: v }),
        }
      case 'stipple':
        return {
          active: stipple.enabled,
          value: stipple.params.particleSize,
          onToggle: () => {
            if (!stipple.enabled) moveToEndOfChain(effectId)
            stipple.setEnabled(!stipple.enabled)
          },
          onValueChange: (v: number) => stipple.updateParams({ particleSize: v }),
        }

      // ═══════════════════════════════════════════════════════════════
      // PAGE 1: VISION EFFECTS
      // ═══════════════════════════════════════════════════════════════

      // Blob tracking modes
      case 'track_bright':
        return {
          active: visionTracking.brightEnabled,
          value: visionTracking.brightParams.threshold,
          onToggle: () => {
            if (!visionTracking.brightEnabled) moveToEndOfChain(effectId)
            visionTracking.setBrightEnabled(!visionTracking.brightEnabled)
          },
          onValueChange: (v: number) => visionTracking.updateBrightParams({ threshold: v }),
        }
      case 'track_edge':
        return {
          active: visionTracking.edgeEnabled,
          value: visionTracking.edgeParams.threshold,
          onToggle: () => {
            if (!visionTracking.edgeEnabled) moveToEndOfChain(effectId)
            visionTracking.setEdgeEnabled(!visionTracking.edgeEnabled)
          },
          onValueChange: (v: number) => visionTracking.updateEdgeParams({ threshold: v }),
        }
      case 'track_color':
        return {
          active: visionTracking.colorEnabled,
          value: visionTracking.colorParams.colorRange * 100,
          onToggle: () => {
            if (!visionTracking.colorEnabled) moveToEndOfChain(effectId)
            visionTracking.setColorEnabled(!visionTracking.colorEnabled)
          },
          onValueChange: (v: number) => visionTracking.updateColorParams({ colorRange: v / 100 }),
        }
      case 'track_motion':
        return {
          active: visionTracking.motionEnabled,
          value: visionTracking.motionParams.sensitivity,
          onToggle: () => {
            if (!visionTracking.motionEnabled) moveToEndOfChain(effectId)
            visionTracking.setMotionEnabled(!visionTracking.motionEnabled)
          },
          onValueChange: (v: number) => visionTracking.updateMotionParams({ sensitivity: v }),
        }

      // Skin-tone based tracking modes
      case 'track_face':
        return {
          active: visionTracking.faceEnabled,
          value: visionTracking.faceParams.threshold,
          onToggle: () => {
            if (!visionTracking.faceEnabled) moveToEndOfChain(effectId)
            visionTracking.setFaceEnabled(!visionTracking.faceEnabled)
          },
          onValueChange: (v: number) => visionTracking.updateFaceParams({ threshold: v }),
        }
      case 'track_hands':
        return {
          active: visionTracking.handsEnabled,
          value: visionTracking.handsParams.threshold,
          onToggle: () => {
            if (!visionTracking.handsEnabled) moveToEndOfChain(effectId)
            visionTracking.setHandsEnabled(!visionTracking.handsEnabled)
          },
          onValueChange: (v: number) => visionTracking.updateHandsParams({ threshold: v }),
        }
      case 'contour':
        return {
          active: contour.enabled,
          value: contour.params.threshold * 100,
          onToggle: () => {
            if (!contour.enabled) moveToEndOfChain(effectId)
            contour.setEnabled(!contour.enabled)
          },
          onValueChange: (v: number) => contour.updateParams({ threshold: v / 100 }),
        }
      case 'landmarks':
        return {
          active: landmarks.enabled,
          value: landmarks.minDetectionConfidence * 100,
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
          onValueChange: (v: number) => landmarks.setMinDetectionConfidence(v / 100),
        }

      // ═══════════════════════════════════════════════════════════════
      // PAGE 0: ACID EFFECTS
      // ═══════════════════════════════════════════════════════════════

      case 'acid_dots':
        return {
          active: acid.dotsEnabled,
          value: acid.dotsParams.gridSize,
          onToggle: () => {
            if (!acid.dotsEnabled) moveToEndOfChain(effectId)
            acid.setDotsEnabled(!acid.dotsEnabled)
          },
          onValueChange: (v: number) => acid.updateDotsParams({ gridSize: v }),
        }
      case 'acid_glyph':
        return {
          active: acid.glyphEnabled,
          value: acid.glyphParams.gridSize,
          onToggle: () => {
            if (!acid.glyphEnabled) moveToEndOfChain(effectId)
            acid.setGlyphEnabled(!acid.glyphEnabled)
          },
          onValueChange: (v: number) => acid.updateGlyphParams({ gridSize: v }),
        }
      case 'acid_icons':
        return {
          active: acid.iconsEnabled,
          value: acid.iconsParams.gridSize,
          onToggle: () => {
            if (!acid.iconsEnabled) moveToEndOfChain(effectId)
            acid.setIconsEnabled(!acid.iconsEnabled)
          },
          onValueChange: (v: number) => acid.updateIconsParams({ gridSize: v }),
        }
      case 'acid_contour':
        return {
          active: acid.contourEnabled,
          value: acid.contourParams.levels,
          onToggle: () => {
            if (!acid.contourEnabled) moveToEndOfChain(effectId)
            acid.setContourEnabled(!acid.contourEnabled)
          },
          onValueChange: (v: number) => acid.updateContourParams({ levels: v }),
        }
      case 'acid_decomp':
        return {
          active: acid.decompEnabled,
          value: acid.decompParams.minBlock,
          onToggle: () => {
            if (!acid.decompEnabled) moveToEndOfChain(effectId)
            acid.setDecompEnabled(!acid.decompEnabled)
          },
          onValueChange: (v: number) => acid.updateDecompParams({ minBlock: v }),
        }
      case 'acid_mirror':
        return {
          active: acid.mirrorEnabled,
          value: acid.mirrorParams.segments,
          onToggle: () => {
            if (!acid.mirrorEnabled) moveToEndOfChain(effectId)
            acid.setMirrorEnabled(!acid.mirrorEnabled)
          },
          onValueChange: (v: number) => acid.updateMirrorParams({ segments: v }),
        }
      case 'acid_slice':
        return {
          active: acid.sliceEnabled,
          value: acid.sliceParams.sliceCount,
          onToggle: () => {
            if (!acid.sliceEnabled) moveToEndOfChain(effectId)
            acid.setSliceEnabled(!acid.sliceEnabled)
          },
          onValueChange: (v: number) => acid.updateSliceParams({ sliceCount: v }),
        }
      case 'acid_thgrid':
        return {
          active: acid.thGridEnabled,
          value: acid.thGridParams.threshold,
          onToggle: () => {
            if (!acid.thGridEnabled) moveToEndOfChain(effectId)
            acid.setThGridEnabled(!acid.thGridEnabled)
          },
          onValueChange: (v: number) => acid.updateThGridParams({ threshold: v }),
        }
      case 'acid_cloud':
        return {
          active: acid.cloudEnabled,
          value: acid.cloudParams.density,
          onToggle: () => {
            if (!acid.cloudEnabled) moveToEndOfChain(effectId)
            acid.setCloudEnabled(!acid.cloudEnabled)
          },
          onValueChange: (v: number) => acid.updateCloudParams({ density: v }),
        }
      case 'acid_led':
        return {
          active: acid.ledEnabled,
          value: acid.ledParams.gridSize,
          onToggle: () => {
            if (!acid.ledEnabled) moveToEndOfChain(effectId)
            acid.setLedEnabled(!acid.ledEnabled)
          },
          onValueChange: (v: number) => acid.updateLedParams({ gridSize: v }),
        }
      case 'acid_slit':
        return {
          active: acid.slitEnabled,
          value: acid.slitParams.speed,
          onToggle: () => {
            if (!acid.slitEnabled) moveToEndOfChain(effectId)
            acid.setSlitEnabled(!acid.slitEnabled)
          },
          onValueChange: (v: number) => acid.updateSlitParams({ speed: v }),
        }
      case 'acid_voronoi':
        return {
          active: acid.voronoiEnabled,
          value: acid.voronoiParams.cellCount,
          onToggle: () => {
            if (!acid.voronoiEnabled) moveToEndOfChain(effectId)
            acid.setVoronoiEnabled(!acid.voronoiEnabled)
          },
          onValueChange: (v: number) => acid.updateVoronoiParams({ cellCount: v }),
        }

      // ═══════════════════════════════════════════════════════════════
      // (OVERLAY effects removed - kept handlers for compatibility)
      // ═══════════════════════════════════════════════════════════════

      // Texture overlays
      case 'texture_grain':
        return {
          active: textureOverlay.enabled && textureOverlay.textureId === 'grain_fine',
          value: textureOverlay.opacity * 100,
          onToggle: () => {
            if (textureOverlay.enabled && textureOverlay.textureId === 'grain_fine') {
              textureOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              textureOverlay.setTextureId('grain_fine')
              textureOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => textureOverlay.setOpacity(v / 100),
        }
      case 'texture_dust':
        return {
          active: textureOverlay.enabled && textureOverlay.textureId === 'dust',
          value: textureOverlay.opacity * 100,
          onToggle: () => {
            if (textureOverlay.enabled && textureOverlay.textureId === 'dust') {
              textureOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              textureOverlay.setTextureId('dust')
              textureOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => textureOverlay.setOpacity(v / 100),
        }
      case 'texture_leak':
        return {
          active: textureOverlay.enabled && textureOverlay.textureId === 'vignette',
          value: textureOverlay.opacity * 100,
          onToggle: () => {
            if (textureOverlay.enabled && textureOverlay.textureId === 'vignette') {
              textureOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              textureOverlay.setTextureId('vignette')
              textureOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => textureOverlay.setOpacity(v / 100),
        }
      case 'texture_paper':
        return {
          active: textureOverlay.enabled && textureOverlay.textureId === 'paper',
          value: textureOverlay.opacity * 100,
          onToggle: () => {
            if (textureOverlay.enabled && textureOverlay.textureId === 'paper') {
              textureOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              textureOverlay.setTextureId('paper')
              textureOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => textureOverlay.setOpacity(v / 100),
        }
      case 'texture_canvas':
        return {
          active: textureOverlay.enabled && textureOverlay.textureId === 'canvas',
          value: textureOverlay.opacity * 100,
          onToggle: () => {
            if (textureOverlay.enabled && textureOverlay.textureId === 'canvas') {
              textureOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              textureOverlay.setTextureId('canvas')
              textureOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => textureOverlay.setOpacity(v / 100),
        }
      case 'texture_vhs':
        return {
          active: textureOverlay.enabled && textureOverlay.textureId === 'vhs_noise',
          value: textureOverlay.opacity * 100,
          onToggle: () => {
            if (textureOverlay.enabled && textureOverlay.textureId === 'vhs_noise') {
              textureOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              textureOverlay.setTextureId('vhs_noise')
              textureOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => textureOverlay.setOpacity(v / 100),
        }

      // Data overlays
      case 'data_watermark':
        return {
          active: dataOverlay.enabled && dataOverlay.template === 'watermark',
          value: dataOverlay.style.fontSize,
          onToggle: () => {
            if (dataOverlay.enabled && dataOverlay.template === 'watermark') {
              dataOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              dataOverlay.setTemplate('watermark')
              dataOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => dataOverlay.setStyle({ fontSize: v }),
        }
      case 'data_stats':
        return {
          active: dataOverlay.enabled && dataOverlay.template === 'statsBar',
          value: dataOverlay.style.fontSize,
          onToggle: () => {
            if (dataOverlay.enabled && dataOverlay.template === 'statsBar') {
              dataOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              dataOverlay.setTemplate('statsBar')
              dataOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => dataOverlay.setStyle({ fontSize: v }),
        }
      case 'data_title':
        return {
          active: dataOverlay.enabled && dataOverlay.template === 'titleCard',
          value: dataOverlay.style.fontSize,
          onToggle: () => {
            if (dataOverlay.enabled && dataOverlay.template === 'titleCard') {
              dataOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              dataOverlay.setTemplate('titleCard')
              dataOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => dataOverlay.setStyle({ fontSize: v }),
        }
      case 'data_social':
        return {
          active: dataOverlay.enabled && dataOverlay.template === 'socialCard',
          value: dataOverlay.style.fontSize,
          onToggle: () => {
            if (dataOverlay.enabled && dataOverlay.template === 'socialCard') {
              dataOverlay.setEnabled(false)
            } else {
              moveToEndOfChain(effectId)
              dataOverlay.setTemplate('socialCard')
              dataOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => dataOverlay.setStyle({ fontSize: v }),
        }

      // ═══════════════════════════════════════════════════════════════
      // PAGE 3: STRAND EFFECTS
      // ═══════════════════════════════════════════════════════════════

      case 'strand_handprints':
        return {
          active: strand.handprintsEnabled,
          value: strand.handprintsParams.density,
          onToggle: () => {
            if (!strand.handprintsEnabled) moveToEndOfChain(effectId)
            strand.setHandprintsEnabled(!strand.handprintsEnabled)
          },
          onValueChange: (v: number) => strand.updateHandprintsParams({ density: v }),
        }
      case 'strand_tar':
        return {
          active: strand.tarSpreadEnabled,
          value: strand.tarSpreadParams.coverage * 100,
          onToggle: () => {
            if (!strand.tarSpreadEnabled) moveToEndOfChain(effectId)
            strand.setTarSpreadEnabled(!strand.tarSpreadEnabled)
          },
          onValueChange: (v: number) => strand.updateTarSpreadParams({ coverage: v / 100 }),
        }
      case 'strand_timefall':
        return {
          active: strand.timefallEnabled,
          value: strand.timefallParams.intensity * 100,
          onToggle: () => {
            if (!strand.timefallEnabled) moveToEndOfChain(effectId)
            strand.setTimefallEnabled(!strand.timefallEnabled)
          },
          onValueChange: (v: number) => strand.updateTimefallParams({ intensity: v / 100 }),
        }
      case 'strand_voidout':
        return {
          active: strand.voidOutEnabled,
          value: strand.voidOutParams.distortAmount * 100,
          onToggle: () => {
            if (!strand.voidOutEnabled) moveToEndOfChain(effectId)
            strand.setVoidOutEnabled(!strand.voidOutEnabled)
          },
          onValueChange: (v: number) => strand.updateVoidOutParams({ distortAmount: v / 100 }),
        }
      case 'strand_web':
        return {
          active: strand.strandWebEnabled,
          value: strand.strandWebParams.glowIntensity * 100,
          onToggle: () => {
            if (!strand.strandWebEnabled) moveToEndOfChain(effectId)
            strand.setStrandWebEnabled(!strand.strandWebEnabled)
          },
          onValueChange: (v: number) => strand.updateStrandWebParams({ glowIntensity: v / 100 }),
        }
      case 'strand_bridge':
        return {
          active: strand.bridgeLinkEnabled,
          value: strand.bridgeLinkParams.gridSize,
          onToggle: () => {
            if (!strand.bridgeLinkEnabled) moveToEndOfChain(effectId)
            strand.setBridgeLinkEnabled(!strand.bridgeLinkEnabled)
          },
          onValueChange: (v: number) => strand.updateBridgeLinkParams({ gridSize: v }),
        }
      case 'strand_path':
        return {
          active: strand.chiralPathEnabled,
          value: strand.chiralPathParams.particleCount,
          onToggle: () => {
            if (!strand.chiralPathEnabled) moveToEndOfChain(effectId)
            strand.setChiralPathEnabled(!strand.chiralPathEnabled)
          },
          onValueChange: (v: number) => strand.updateChiralPathParams({ particleCount: v }),
        }
      case 'strand_umbilical':
        return {
          active: strand.umbilicalEnabled,
          value: strand.umbilicalParams.tendrilCount,
          onToggle: () => {
            if (!strand.umbilicalEnabled) moveToEndOfChain(effectId)
            strand.setUmbilicalEnabled(!strand.umbilicalEnabled)
          },
          onValueChange: (v: number) => strand.updateUmbilicalParams({ tendrilCount: v }),
        }
      case 'strand_odradek':
        return {
          active: strand.odradekEnabled,
          value: strand.odradekParams.sweepSpeed * 100,
          onToggle: () => {
            if (!strand.odradekEnabled) moveToEndOfChain(effectId)
            strand.setOdradekEnabled(!strand.odradekEnabled)
          },
          onValueChange: (v: number) => strand.updateOdradekParams({ sweepSpeed: v / 100 }),
        }
      case 'strand_chiralium':
        return {
          active: strand.chiraliumEnabled,
          value: strand.chiraliumParams.density * 100,
          onToggle: () => {
            if (!strand.chiraliumEnabled) moveToEndOfChain(effectId)
            strand.setChiraliumEnabled(!strand.chiraliumEnabled)
          },
          onValueChange: (v: number) => strand.updateChiraliumParams({ density: v / 100 }),
        }
      case 'strand_beach':
        return {
          active: strand.beachStaticEnabled,
          value: strand.beachStaticParams.grainAmount * 100,
          onToggle: () => {
            if (!strand.beachStaticEnabled) moveToEndOfChain(effectId)
            strand.setBeachStaticEnabled(!strand.beachStaticEnabled)
          },
          onValueChange: (v: number) => strand.updateBeachStaticParams({ grainAmount: v / 100 }),
        }
      case 'strand_dooms':
        return {
          active: strand.doomsEnabled,
          value: strand.doomsParams.haloSize * 100,
          onToggle: () => {
            if (!strand.doomsEnabled) moveToEndOfChain(effectId)
            strand.setDoomsEnabled(!strand.doomsEnabled)
          },
          onValueChange: (v: number) => strand.updateDoomsParams({ haloSize: v / 100 }),
        }
      case 'strand_cloud':
        return {
          active: strand.chiralCloudEnabled,
          value: strand.chiralCloudParams.density * 100,
          onToggle: () => {
            if (!strand.chiralCloudEnabled) moveToEndOfChain(effectId)
            strand.setChiralCloudEnabled(!strand.chiralCloudEnabled)
          },
          onValueChange: (v: number) => strand.updateChiralCloudParams({ density: v / 100 }),
        }
      case 'strand_bbpod':
        return {
          active: strand.bbPodEnabled,
          value: strand.bbPodParams.vignetteSize * 100,
          onToggle: () => {
            if (!strand.bbPodEnabled) moveToEndOfChain(effectId)
            strand.setBBPodEnabled(!strand.bbPodEnabled)
          },
          onValueChange: (v: number) => strand.updateBBPodParams({ vignetteSize: v / 100 }),
        }
      case 'strand_seam':
        return {
          active: strand.seamEnabled,
          value: strand.seamParams.riftWidth * 100,
          onToggle: () => {
            if (!strand.seamEnabled) moveToEndOfChain(effectId)
            strand.setSeamEnabled(!strand.seamEnabled)
          },
          onValueChange: (v: number) => strand.updateSeamParams({ riftWidth: v / 100 }),
        }
      case 'strand_extinction':
        return {
          active: strand.extinctionEnabled,
          value: strand.extinctionParams.coverage * 100,
          onToggle: () => {
            if (!strand.extinctionEnabled) moveToEndOfChain(effectId)
            strand.setExtinctionEnabled(!strand.extinctionEnabled)
          },
          onValueChange: (v: number) => strand.updateExtinctionParams({ coverage: v / 100 }),
        }

      // ═══════════════════════════════════════════════════════════════
      // PAGE 4: MOTION EFFECTS
      // ═══════════════════════════════════════════════════════════════

      case 'motion_extract':
        return {
          active: motion.motionExtractEnabled,
          value: motion.motionExtract.threshold * 100,
          onToggle: () => {
            if (!motion.motionExtractEnabled) moveToEndOfChain(effectId)
            motion.setMotionExtractEnabled(!motion.motionExtractEnabled)
          },
          onValueChange: (v: number) => motion.updateMotionExtract({ threshold: v / 100 }),
        }
      case 'echo_trail':
        return {
          active: motion.echoTrailEnabled,
          value: motion.echoTrail.decay * 100,
          onToggle: () => {
            if (!motion.echoTrailEnabled) moveToEndOfChain(effectId)
            motion.setEchoTrailEnabled(!motion.echoTrailEnabled)
          },
          onValueChange: (v: number) => motion.updateEchoTrail({ decay: v / 100 }),
        }
      case 'time_smear':
        return {
          active: motion.timeSmearEnabled,
          value: motion.timeSmear.accumulation * 100,
          onToggle: () => {
            if (!motion.timeSmearEnabled) moveToEndOfChain(effectId)
            motion.setTimeSmearEnabled(!motion.timeSmearEnabled)
          },
          onValueChange: (v: number) => motion.updateTimeSmear({ accumulation: v / 100 }),
        }
      case 'freeze_mask':
        return {
          active: motion.freezeMaskEnabled,
          value: motion.freezeMask.freezeThreshold * 100,
          onToggle: () => {
            if (!motion.freezeMaskEnabled) moveToEndOfChain(effectId)
            motion.setFreezeMaskEnabled(!motion.freezeMaskEnabled)
          },
          onValueChange: (v: number) => motion.updateFreezeMask({ freezeThreshold: v / 100 }),
        }

      // Reserved / empty slots
      default:
        if (effectId.startsWith('reserved')) {
          return {
            active: false,
            value: 0,
            onToggle: () => {},
            onValueChange: () => {},
            isReserved: true,
          }
        }
        return {
          active: false,
          value: 0,
          onToggle: () => {},
          onValueChange: () => {},
        }
    }
  }

  // Check which pages have active effects
  const pageHasActiveEffects = (pageIndex: number): boolean => {
    switch (pageIndex) {
      case 0: // ACID
        return acid.dotsEnabled || acid.glyphEnabled || acid.iconsEnabled ||
               acid.contourEnabled || acid.decompEnabled || acid.mirrorEnabled ||
               acid.sliceEnabled || acid.thGridEnabled || acid.cloudEnabled ||
               acid.ledEnabled || acid.slitEnabled || acid.voronoiEnabled
      case 1: // VISION
        return visionTracking.brightEnabled || visionTracking.edgeEnabled ||
               visionTracking.colorEnabled || visionTracking.motionEnabled ||
               visionTracking.faceEnabled || visionTracking.handsEnabled ||
               contour.enabled || landmarks.enabled
      case 2: // GLITCH
        return glitch.rgbSplitEnabled || glitch.chromaticAberrationEnabled ||
               glitch.posterizeEnabled || glitch.colorGradeEnabled ||
               glitch.blockDisplaceEnabled || glitch.staticDisplacementEnabled ||
               glitch.pixelateEnabled || glitch.lensDistortionEnabled ||
               glitch.scanLinesEnabled || glitch.vhsTrackingEnabled ||
               glitch.noiseEnabled || glitch.ditherEnabled ||
               glitch.edgeDetectionEnabled || glitch.feedbackLoopEnabled ||
               ascii.enabled || stipple.enabled
      case 3: // STRAND
        return strand.handprintsEnabled || strand.tarSpreadEnabled ||
               strand.timefallEnabled || strand.voidOutEnabled ||
               strand.strandWebEnabled || strand.bridgeLinkEnabled ||
               strand.chiralPathEnabled || strand.umbilicalEnabled ||
               strand.odradekEnabled || strand.chiraliumEnabled ||
               strand.beachStaticEnabled || strand.doomsEnabled ||
               strand.chiralCloudEnabled || strand.bbPodEnabled ||
               strand.seamEnabled || strand.extinctionEnabled
      case 4: // MOTION
        return motion.motionExtractEnabled || motion.echoTrailEnabled ||
               motion.timeSmearEnabled || motion.freezeMaskEnabled
      default:
        return false
    }
  }

  // Get effects for current page
  const pageEffects = getEffectsForPage(gridPage)

  // Create 16 slots for 4x4 grid
  const gridSlots = [...pageEffects]
  while (gridSlots.length < 16) {
    gridSlots.push(null as unknown as typeof pageEffects[0])
  }

  return (
    <div className="h-full w-full flex flex-col p-2">
      {/* Page navigation */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <button
          onClick={() => setGridPage(Math.max(0, gridPage - 1))}
          disabled={gridPage === 0}
          className="w-5 h-5 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-ghost)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-0.5">
          {PAGE_NAMES.map((name, index) => {
            const hasActive = pageHasActiveEffects(index)
            const isSelected = gridPage === index
            return (
              <button
                key={index}
                onClick={() => setGridPage(index)}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-sm transition-colors"
                style={{
                  backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  color: isSelected ? 'var(--text-secondary)' : 'var(--text-ghost)',
                }}
              >
                {/* LED indicator - always reserve space */}
                <span
                  className="w-1 h-1 rounded-full flex-shrink-0 transition-opacity"
                  style={{
                    backgroundColor: 'var(--accent)',
                    boxShadow: hasActive ? '0 0 4px var(--accent-glow)' : 'none',
                    opacity: hasActive ? 1 : 0,
                  }}
                />
                {name}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setGridPage(Math.min(4, gridPage + 1))}
          disabled={gridPage === 4}
          className="w-5 h-5 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--text-ghost)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Effect grid */}
      <div className="flex-1 min-h-0 grid grid-cols-4 gap-1.5" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
        {gridSlots.map((effect, index) => {
          if (!effect) {
            // Empty placeholder cell
            return (
              <div
                key={`empty-${index}`}
                className="rounded-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              />
            )
          }

          const state = getEffectState(effect.id)

          // Reserved slot styling
          if ('isReserved' in state && state.isReserved) {
            return (
              <div
                key={effect.id}
                className="rounded-sm flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px dashed var(--border)',
                }}
              >
                <span style={{ color: 'var(--text-ghost)', fontSize: '14px' }}>—</span>
              </div>
            )
          }

          const isSoloed = soloEffectId === effect.id
          const isMuted = isSoloing && !isSoloed && state.active

          return (
            <EffectButton
              key={effect.id}
              id={effect.id}
              label={effect.label}
              color={effect.color}
              active={state.active}
              mix={effectMix[effect.id] ?? 1}
              onToggle={state.onToggle}
              onMixChange={(v) => setEffectMix(effect.id, v)}
              isSoloed={isSoloed}
              isMuted={isMuted}
            />
          )
        })}
      </div>
    </div>
  )
}
