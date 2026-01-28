import { useCallback } from 'react'
import { EffectButton } from './EffectButton'
import { getEffectsForPage, PAGE_NAMES } from '../../config/effects'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useAcidStore } from '../../stores/acidStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useUIStore } from '../../stores/uiStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'

export function PerformanceGrid() {
  // Glitch engine store
  const glitch = useGlitchEngineStore()
  const { soloEffectId } = useGlitchEngineStore()

  // Render stores
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()

  // Vision store
  const visionTracking = useVisionTrackingStore()

  // Acid store
  const acid = useAcidStore()

  // Texture and Data overlay stores
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()

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
      // PAGE 0: GLITCH EFFECTS
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
      // PAGE 1: VISION TRACKING EFFECTS
      // ═══════════════════════════════════════════════════════════════

      // Blob tracking modes
      case 'track_bright':
        return {
          active: visionTracking.brightEnabled,
          value: visionTracking.brightParams.threshold,
          onToggle: () => visionTracking.setBrightEnabled(!visionTracking.brightEnabled),
          onValueChange: (v: number) => visionTracking.updateBrightParams({ threshold: v }),
        }
      case 'track_edge':
        return {
          active: visionTracking.edgeEnabled,
          value: visionTracking.edgeParams.threshold,
          onToggle: () => visionTracking.setEdgeEnabled(!visionTracking.edgeEnabled),
          onValueChange: (v: number) => visionTracking.updateEdgeParams({ threshold: v }),
        }
      case 'track_color':
        return {
          active: visionTracking.colorEnabled,
          value: visionTracking.colorParams.colorRange * 100,
          onToggle: () => visionTracking.setColorEnabled(!visionTracking.colorEnabled),
          onValueChange: (v: number) => visionTracking.updateColorParams({ colorRange: v / 100 }),
        }
      case 'track_motion':
        return {
          active: visionTracking.motionEnabled,
          value: visionTracking.motionParams.sensitivity,
          onToggle: () => visionTracking.setMotionEnabled(!visionTracking.motionEnabled),
          onValueChange: (v: number) => visionTracking.updateMotionParams({ sensitivity: v }),
        }

      // Skin-tone based tracking modes
      case 'track_face':
        return {
          active: visionTracking.faceEnabled,
          value: visionTracking.faceParams.threshold,
          onToggle: () => visionTracking.setFaceEnabled(!visionTracking.faceEnabled),
          onValueChange: (v: number) => visionTracking.updateFaceParams({ threshold: v }),
        }
      case 'track_hands':
        return {
          active: visionTracking.handsEnabled,
          value: visionTracking.handsParams.threshold,
          onToggle: () => visionTracking.setHandsEnabled(!visionTracking.handsEnabled),
          onValueChange: (v: number) => visionTracking.updateHandsParams({ threshold: v }),
        }

      // ═══════════════════════════════════════════════════════════════
      // PAGE 2: ACID EFFECTS
      // ═══════════════════════════════════════════════════════════════

      case 'acid_dots':
        return {
          active: acid.dotsEnabled,
          value: acid.dotsParams.gridSize,
          onToggle: () => acid.setDotsEnabled(!acid.dotsEnabled),
          onValueChange: (v: number) => acid.updateDotsParams({ gridSize: v }),
        }
      case 'acid_glyph':
        return {
          active: acid.glyphEnabled,
          value: acid.glyphParams.gridSize,
          onToggle: () => acid.setGlyphEnabled(!acid.glyphEnabled),
          onValueChange: (v: number) => acid.updateGlyphParams({ gridSize: v }),
        }
      case 'acid_icons':
        return {
          active: acid.iconsEnabled,
          value: acid.iconsParams.gridSize,
          onToggle: () => acid.setIconsEnabled(!acid.iconsEnabled),
          onValueChange: (v: number) => acid.updateIconsParams({ gridSize: v }),
        }
      case 'acid_contour':
        return {
          active: acid.contourEnabled,
          value: acid.contourParams.levels,
          onToggle: () => acid.setContourEnabled(!acid.contourEnabled),
          onValueChange: (v: number) => acid.updateContourParams({ levels: v }),
        }
      case 'acid_decomp':
        return {
          active: acid.decompEnabled,
          value: acid.decompParams.minBlock,
          onToggle: () => acid.setDecompEnabled(!acid.decompEnabled),
          onValueChange: (v: number) => acid.updateDecompParams({ minBlock: v }),
        }
      case 'acid_mirror':
        return {
          active: acid.mirrorEnabled,
          value: acid.mirrorParams.segments,
          onToggle: () => acid.setMirrorEnabled(!acid.mirrorEnabled),
          onValueChange: (v: number) => acid.updateMirrorParams({ segments: v }),
        }
      case 'acid_slice':
        return {
          active: acid.sliceEnabled,
          value: acid.sliceParams.sliceCount,
          onToggle: () => acid.setSliceEnabled(!acid.sliceEnabled),
          onValueChange: (v: number) => acid.updateSliceParams({ sliceCount: v }),
        }
      case 'acid_thgrid':
        return {
          active: acid.thGridEnabled,
          value: acid.thGridParams.threshold,
          onToggle: () => acid.setThGridEnabled(!acid.thGridEnabled),
          onValueChange: (v: number) => acid.updateThGridParams({ threshold: v }),
        }
      case 'acid_cloud':
        return {
          active: acid.cloudEnabled,
          value: acid.cloudParams.density,
          onToggle: () => acid.setCloudEnabled(!acid.cloudEnabled),
          onValueChange: (v: number) => acid.updateCloudParams({ density: v }),
        }
      case 'acid_led':
        return {
          active: acid.ledEnabled,
          value: acid.ledParams.gridSize,
          onToggle: () => acid.setLedEnabled(!acid.ledEnabled),
          onValueChange: (v: number) => acid.updateLedParams({ gridSize: v }),
        }
      case 'acid_slit':
        return {
          active: acid.slitEnabled,
          value: acid.slitParams.speed,
          onToggle: () => acid.setSlitEnabled(!acid.slitEnabled),
          onValueChange: (v: number) => acid.updateSlitParams({ speed: v }),
        }
      case 'acid_voronoi':
        return {
          active: acid.voronoiEnabled,
          value: acid.voronoiParams.cellCount,
          onToggle: () => acid.setVoronoiEnabled(!acid.voronoiEnabled),
          onValueChange: (v: number) => acid.updateVoronoiParams({ cellCount: v }),
        }

      // ═══════════════════════════════════════════════════════════════
      // PAGE 3: OVERLAY EFFECTS
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
              dataOverlay.setTemplate('socialCard')
              dataOverlay.setEnabled(true)
            }
          },
          onValueChange: (v: number) => dataOverlay.setStyle({ fontSize: v }),
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
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {PAGE_NAMES.map((name, index) => (
            <button
              key={index}
              onClick={() => setGridPage(index)}
              className={`px-2 py-0.5 text-[12px] font-medium uppercase tracking-wider rounded transition-colors ${
                gridPage === index
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <button
          onClick={() => setGridPage(Math.min(3, gridPage + 1))}
          disabled={gridPage === 3}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                className="rounded-lg"
                style={{
                  backgroundColor: '#e5e5e5',
                  border: '1px solid #d0d0d0',
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
                className="rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: '#f3f4f6',
                  border: '1px dashed #d1d5db',
                }}
              >
                <span className="text-gray-300 text-lg">—</span>
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
              value={state.value}
              min={effect.min}
              max={effect.max}
              onToggle={state.onToggle}
              onValueChange={state.onValueChange}
              isSoloed={isSoloed}
              isMuted={isMuted}
            />
          )
        })}
      </div>
    </div>
  )
}
