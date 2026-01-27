import { useCallback } from 'react'
import { EffectButton } from './EffectButton'
import { getEffectsForPage, PAGE_NAMES } from '../../config/effects'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useBlobDetectStore } from '../../stores/blobDetectStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useUIStore } from '../../stores/uiStore'

export function PerformanceGrid() {
  // Glitch engine store
  const glitch = useGlitchEngineStore()
  const { soloEffectId } = useGlitchEngineStore()

  // Render stores
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()

  // Vision stores
  const blobDetect = useBlobDetectStore()
  const landmarks = useLandmarksStore()

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
      // PAGE 1: VISION EFFECTS
      // ═══════════════════════════════════════════════════════════════
      case 'blob_detect':
        return {
          active: blobDetect.enabled,
          value: blobDetect.params.threshold * 100,
          onToggle: () => {
            blobDetect.setEnabled(!blobDetect.enabled)
          },
          onValueChange: (v: number) => blobDetect.updateParams({ threshold: v / 100 }),
        }
      case 'face_mesh':
        return {
          active: landmarks.enabled && landmarks.currentMode === 'face',
          value: landmarks.minDetectionConfidence * 100,
          onToggle: () => {
            if (landmarks.currentMode === 'face' && landmarks.enabled) {
              landmarks.setEnabled(false)
              landmarks.setCurrentMode('off')
            } else {
              landmarks.setEnabled(true)
              landmarks.setCurrentMode('face')
            }
          },
          onValueChange: (v: number) => landmarks.setMinDetectionConfidence(v / 100),
        }
      case 'hands':
        return {
          active: landmarks.enabled && landmarks.currentMode === 'hands',
          value: landmarks.minDetectionConfidence * 100,
          onToggle: () => {
            if (landmarks.currentMode === 'hands' && landmarks.enabled) {
              landmarks.setEnabled(false)
              landmarks.setCurrentMode('off')
            } else {
              landmarks.setEnabled(true)
              landmarks.setCurrentMode('hands')
            }
          },
          onValueChange: (v: number) => landmarks.setMinDetectionConfidence(v / 100),
        }
      case 'pose':
        return {
          active: landmarks.enabled && landmarks.currentMode === 'pose',
          value: landmarks.minDetectionConfidence * 100,
          onToggle: () => {
            if (landmarks.currentMode === 'pose' && landmarks.enabled) {
              landmarks.setEnabled(false)
              landmarks.setCurrentMode('off')
            } else {
              landmarks.setEnabled(true)
              landmarks.setCurrentMode('pose')
            }
          },
          onValueChange: (v: number) => landmarks.setMinDetectionConfidence(v / 100),
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
    <div className="h-full w-full flex flex-col p-3">
      {/* Page navigation */}
      <div className="flex items-center justify-between mb-2 px-1">
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
              className={`px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider rounded transition-colors ${
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
      <div className="flex-1 grid grid-cols-4 grid-rows-4 gap-2">
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
