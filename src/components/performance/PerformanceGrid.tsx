import { useCallback } from 'react'
import { EffectButton } from './EffectButton'
import { EFFECTS } from '../../config/effects'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useRoutingStore } from '../../stores/routingStore'

export function PerformanceGrid() {
  // Glitch engine store
  const glitch = useGlitchEngineStore()
  const { soloEffectId } = useGlitchEngineStore()

  // Render stores
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()

  // Routing store for effect order
  const { effectOrder, setEffectOrder } = useRoutingStore()

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
      default:
        return {
          active: false,
          value: 0,
          onToggle: () => {},
          onValueChange: () => {},
        }
    }
  }

  // Create 16 slots for 4x4 grid, padding with nulls if needed
  const gridSlots = [...EFFECTS]
  while (gridSlots.length < 16) {
    gridSlots.push(null as unknown as typeof EFFECTS[0])
  }

  return (
    <div
      className="h-full w-full flex items-center justify-center p-3"
    >
      <div className="grid grid-cols-4 grid-rows-4 gap-2 w-full h-full">
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
