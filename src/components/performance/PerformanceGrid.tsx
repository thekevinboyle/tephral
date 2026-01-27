import { EffectButton } from './EffectButton'
import { EFFECTS } from '../../config/effects'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useBlobDetectStore } from '../../stores/blobDetectStore'
import { useLandmarksStore } from '../../stores/landmarksStore'

export function PerformanceGrid() {
  // Glitch engine store
  const glitch = useGlitchEngineStore()
  const { soloEffectId } = useGlitchEngineStore()

  // Render stores
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const blobDetect = useBlobDetectStore()

  // Vision stores
  const landmarks = useLandmarksStore()

  // Check if an effect is soloed
  const isSoloing = soloEffectId !== null

  // Helper to get effect state
  const getEffectState = (effectId: string) => {
    switch (effectId) {
      case 'rgb_split':
        return {
          active: glitch.rgbSplitEnabled,
          value: glitch.rgbSplit.amount,
          onToggle: () => glitch.setRGBSplitEnabled(!glitch.rgbSplitEnabled),
          onValueChange: (v: number) => glitch.updateRGBSplit({ amount: v }),
        }
      case 'block_displace':
        return {
          active: glitch.blockDisplaceEnabled,
          value: glitch.blockDisplace.displaceDistance * 1000, // Scale for display (0-100)
          onToggle: () => glitch.setBlockDisplaceEnabled(!glitch.blockDisplaceEnabled),
          onValueChange: (v: number) => glitch.updateBlockDisplace({ displaceDistance: v / 1000 }),
        }
      case 'scan_lines':
        return {
          active: glitch.scanLinesEnabled,
          value: glitch.scanLines.lineCount,
          onToggle: () => glitch.setScanLinesEnabled(!glitch.scanLinesEnabled),
          onValueChange: (v: number) => glitch.updateScanLines({ lineCount: v }),
        }
      case 'noise':
        return {
          active: glitch.noiseEnabled,
          value: glitch.noise.amount * 100, // Scale for display (0-100)
          onToggle: () => glitch.setNoiseEnabled(!glitch.noiseEnabled),
          onValueChange: (v: number) => glitch.updateNoise({ amount: v / 100 }),
        }
      case 'pixelate':
        return {
          active: glitch.pixelateEnabled,
          value: glitch.pixelate.pixelSize,
          onToggle: () => glitch.setPixelateEnabled(!glitch.pixelateEnabled),
          onValueChange: (v: number) => glitch.updatePixelate({ pixelSize: v }),
        }
      case 'edges':
        return {
          active: glitch.edgeDetectionEnabled,
          value: glitch.edgeDetection.threshold * 100, // Scale for display (0-100)
          onToggle: () => glitch.setEdgeDetectionEnabled(!glitch.edgeDetectionEnabled),
          onValueChange: (v: number) => glitch.updateEdgeDetection({ threshold: v / 100 }),
        }
      case 'blob_detect':
        return {
          active: blobDetect.enabled,
          value: blobDetect.params.threshold * 100,
          onToggle: () => blobDetect.setEnabled(!blobDetect.enabled),
          onValueChange: (v: number) => blobDetect.updateParams({ threshold: v / 100 }),
        }
      case 'ascii':
        return {
          active: ascii.enabled && ascii.params.mode === 'standard',
          value: ascii.params.fontSize,
          onToggle: () => {
            if (ascii.enabled && ascii.params.mode === 'standard') {
              ascii.setEnabled(false)
            } else {
              ascii.setEnabled(true)
              ascii.updateParams({ mode: 'standard' })
            }
          },
          onValueChange: (v: number) => ascii.updateParams({ fontSize: v }),
        }
      case 'matrix':
        return {
          active: ascii.enabled && ascii.params.mode === 'matrix',
          value: ascii.params.matrixSpeed * 100,
          onToggle: () => {
            if (ascii.enabled && ascii.params.mode === 'matrix') {
              ascii.setEnabled(false)
            } else {
              ascii.setEnabled(true)
              ascii.updateParams({ mode: 'matrix' })
            }
          },
          onValueChange: (v: number) => ascii.updateParams({ matrixSpeed: v / 100 }),
        }
      case 'stipple':
        return {
          active: stipple.enabled,
          value: stipple.params.particleSize,
          onToggle: () => stipple.setEnabled(!stipple.enabled),
          onValueChange: (v: number) => stipple.updateParams({ particleSize: v }),
        }
      case 'face_mesh':
        return {
          active: landmarks.enabled && landmarks.currentMode === 'face',
          value: landmarks.minDetectionConfidence * 100,
          onToggle: () => {
            if (landmarks.enabled && landmarks.currentMode === 'face') {
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
            if (landmarks.enabled && landmarks.currentMode === 'hands') {
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
            if (landmarks.enabled && landmarks.currentMode === 'pose') {
              landmarks.setEnabled(false)
              landmarks.setCurrentMode('off')
            } else {
              landmarks.setEnabled(true)
              landmarks.setCurrentMode('pose')
            }
          },
          onValueChange: (v: number) => landmarks.setMinDetectionConfidence(v / 100),
        }
      case 'holistic':
        return {
          active: landmarks.enabled && landmarks.currentMode === 'holistic',
          value: landmarks.minDetectionConfidence * 100,
          onToggle: () => {
            if (landmarks.enabled && landmarks.currentMode === 'holistic') {
              landmarks.setEnabled(false)
              landmarks.setCurrentMode('off')
            } else {
              landmarks.setEnabled(true)
              landmarks.setCurrentMode('holistic')
            }
          },
          onValueChange: (v: number) => landmarks.setMinDetectionConfidence(v / 100),
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
      className="h-full flex items-center justify-center p-3"
      style={{ width: '50vw' }}
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
