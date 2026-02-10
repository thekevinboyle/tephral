import { useEffect, useRef } from 'react'
import { useDestructionModeStore } from '../stores/destructionModeStore'
import { useGlitchEngineStore, type GlitchSnapshot } from '../stores/glitchEngineStore'

/**
 * Helper to get a random number in a range
 */
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/**
 * Chaos modes - different destructive effect combinations
 */
type ChaosMode =
  | 'FULL_MELT'      // Everything maxed
  | 'PIXEL_HELL'     // Heavy pixelation + posterize + edges
  | 'VHS_DEATH'      // VHS tracking + noise + scan lines
  | 'FEEDBACK_LOOP'  // Intense feedback + chromatic
  | 'BLOCK_CORRUPT'  // Block displacement + static + RGB split
  | 'COLOR_MELT'     // Color grade extremes + dither + lens
  | 'STROBE'         // Rapid flickering effects

const CHAOS_MODES: ChaosMode[] = [
  'FULL_MELT', 'PIXEL_HELL', 'VHS_DEATH', 'FEEDBACK_LOOP',
  'BLOCK_CORRUPT', 'COLOR_MELT', 'STROBE'
]

/**
 * Apply a specific chaos mode
 */
function applyChaosMode(mode: ChaosMode) {
  const store = useGlitchEngineStore.getState()

  // First disable everything for clean slate
  store.setRGBSplitEnabled(false)
  store.setBlockDisplaceEnabled(false)
  store.setFeedbackLoopEnabled(false)
  store.setChromaticAberrationEnabled(false)
  store.setVHSTrackingEnabled(false)
  store.setNoiseEnabled(false)
  store.setStaticDisplacementEnabled(false)
  store.setPixelateEnabled(false)
  store.setScanLinesEnabled(false)
  store.setEdgeDetectionEnabled(false)
  store.setPosterizeEnabled(false)
  store.setLensDistortionEnabled(false)
  store.setDitherEnabled(false)
  store.setColorGradeEnabled(false)

  switch (mode) {
    case 'FULL_MELT':
      // Everything at once - maximum destruction
      store.setRGBSplitEnabled(true)
      store.setBlockDisplaceEnabled(true)
      store.setFeedbackLoopEnabled(true)
      store.setChromaticAberrationEnabled(true)
      store.setVHSTrackingEnabled(true)
      store.setNoiseEnabled(true)
      store.setStaticDisplacementEnabled(true)
      store.updateRGBSplit({ amount: 1.0, redOffsetX: 0.1, blueOffsetX: -0.1, mix: 1.0 })
      store.updateBlockDisplace({ displaceChance: 0.9, displaceDistance: 0.25, blockSize: 0.05, mix: 1.0 })
      store.updateFeedbackLoop({ decay: 0.9, zoom: 1.04, rotation: 5, hueShift: 30, mix: 1.0 })
      store.updateChromaticAberration({ intensity: 1.0, radialAmount: 0.8, mix: 1.0 })
      store.updateVHSTracking({ tearIntensity: 1.0, jitter: 0.8, colorBleed: 0.9, mix: 1.0 })
      store.updateNoise({ amount: 0.6, mix: 1.0 })
      store.updateStaticDisplacement({ intensity: 0.9, scale: 40, mix: 1.0 })
      break

    case 'PIXEL_HELL':
      // Chunky pixels + edges + posterize
      store.setPixelateEnabled(true)
      store.setPosterizeEnabled(true)
      store.setEdgeDetectionEnabled(true)
      store.setDitherEnabled(true)
      store.setNoiseEnabled(true)
      store.updatePixelate({ pixelSize: Math.floor(randomInRange(8, 24)), mix: 1.0 })
      store.updatePosterize({ levels: Math.floor(randomInRange(2, 5)), mix: 1.0 })
      store.updateEdgeDetection({ threshold: randomInRange(0.05, 0.2), mix: 0.8 })
      store.updateDither({ scale: 3, intensity: 0.7, mix: 1.0 })
      store.updateNoise({ amount: 0.4, mix: 0.8 })
      break

    case 'VHS_DEATH':
      // Corrupted tape look
      store.setVHSTrackingEnabled(true)
      store.setNoiseEnabled(true)
      store.setScanLinesEnabled(true)
      store.setColorGradeEnabled(true)
      store.setChromaticAberrationEnabled(true)
      store.updateVHSTracking({ tearIntensity: 1.0, tearSpeed: 4, headSwitchNoise: 1.0, colorBleed: 1.0, jitter: 1.0, mix: 1.0 })
      store.updateNoise({ amount: 0.5, speed: 30, mix: 1.0 })
      store.updateScanLines({ lineCount: 500, lineOpacity: 0.5, lineFlicker: 0.5, mix: 1.0 })
      store.updateColorGrade({ saturation: 0.6, contrast: 1.5, brightness: 0.9, mix: 1.0 })
      store.updateChromaticAberration({ intensity: 0.6, direction: 90, mix: 1.0 })
      break

    case 'FEEDBACK_LOOP':
      // Infinite mirror tunnel
      store.setFeedbackLoopEnabled(true)
      store.setChromaticAberrationEnabled(true)
      store.setRGBSplitEnabled(true)
      store.setLensDistortionEnabled(true)
      store.updateFeedbackLoop({ decay: 0.95, zoom: 1.06, rotation: 8, hueShift: 50, offsetX: 0.02, offsetY: 0.01, mix: 1.0 })
      store.updateChromaticAberration({ intensity: 0.8, radialAmount: 1.0, mix: 1.0 })
      store.updateRGBSplit({ amount: 0.8, redOffsetX: 0.05, blueOffsetX: -0.05, mix: 1.0 })
      store.updateLensDistortion({ curvature: 0.5, vignette: 0.6, phosphorGlow: 0.4, mix: 1.0 })
      break

    case 'BLOCK_CORRUPT':
      // Macro block corruption like broken codec
      store.setBlockDisplaceEnabled(true)
      store.setStaticDisplacementEnabled(true)
      store.setRGBSplitEnabled(true)
      store.setNoiseEnabled(true)
      store.setPixelateEnabled(true)
      store.updateBlockDisplace({ displaceChance: 1.0, displaceDistance: 0.4, blockSize: 0.08, mix: 1.0 })
      store.updateStaticDisplacement({ intensity: 1.0, scale: 60, speed: 8, mix: 1.0 })
      store.updateRGBSplit({ amount: 1.0, redOffsetX: 0.15, redOffsetY: 0.05, blueOffsetX: -0.15, blueOffsetY: -0.05, mix: 1.0 })
      store.updateNoise({ amount: 0.3, mix: 0.7 })
      store.updatePixelate({ pixelSize: 6, mix: 0.5 })
      break

    case 'COLOR_MELT':
      // Colors going insane
      store.setColorGradeEnabled(true)
      store.setDitherEnabled(true)
      store.setLensDistortionEnabled(true)
      store.setChromaticAberrationEnabled(true)
      store.setPosterizeEnabled(true)
      store.setFeedbackLoopEnabled(true)
      store.updateColorGrade({ saturation: 3.0, contrast: 2.0, brightness: 1.3, mix: 1.0 })
      store.updateDither({ scale: 4, intensity: 0.8, mix: 1.0 })
      store.updateLensDistortion({ curvature: 0.3, vignette: 0.7, fresnelRainbow: 0.5, mix: 1.0 })
      store.updateChromaticAberration({ intensity: 1.0, radialAmount: 0.5, direction: randomInRange(0, 360), mix: 1.0 })
      store.updatePosterize({ levels: 6, mix: 0.7 })
      store.updateFeedbackLoop({ decay: 0.8, hueShift: 60, mix: 0.6 })
      break

    case 'STROBE':
      // Rapid flickering madness
      store.setNoiseEnabled(true)
      store.setColorGradeEnabled(true)
      store.setRGBSplitEnabled(true)
      store.setScanLinesEnabled(true)
      store.setBlockDisplaceEnabled(true)
      // High contrast strobe-like
      store.updateNoise({ amount: Math.random() > 0.5 ? 0.8 : 0.2, speed: 50, mix: 1.0 })
      store.updateColorGrade({ brightness: randomInRange(0.5, 2.0), contrast: randomInRange(1.5, 3.0), saturation: randomInRange(0, 2.5), mix: 1.0 })
      store.updateRGBSplit({ amount: randomInRange(0.5, 1.5), redOffsetX: randomInRange(-0.2, 0.2), blueOffsetX: randomInRange(-0.2, 0.2), mix: 1.0 })
      store.updateScanLines({ lineCount: 600, lineOpacity: 0.6, lineFlicker: 1.0, mix: 1.0 })
      store.updateBlockDisplace({ displaceChance: 0.5, displaceDistance: 0.15, blockSize: 0.03, mix: 1.0 })
      break
  }
}

/**
 * Chaos engine hook for Destruction Mode.
 * Randomly switches between different destructive effect modes
 * and rapidly modulates parameters within each mode.
 */
export function useDestructionChaos() {
  const savedStateRef = useRef<GlitchSnapshot | null>(null)
  const intervalIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modeIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentModeRef = useRef<ChaosMode>('FULL_MELT')

  const active = useDestructionModeStore((state) => state.active)

  useEffect(() => {
    const glitchStore = useGlitchEngineStore.getState()

    if (active) {
      // Save current effect state
      savedStateRef.current = glitchStore.getSnapshot()
      glitchStore.setEnabled(true)

      // Pick initial random mode
      currentModeRef.current = CHAOS_MODES[Math.floor(Math.random() * CHAOS_MODES.length)]
      applyChaosMode(currentModeRef.current)

      // Mode switching - change chaos mode every 0.5-2 seconds
      const switchMode = () => {
        // Pick a different mode
        let newMode = currentModeRef.current
        while (newMode === currentModeRef.current) {
          newMode = CHAOS_MODES[Math.floor(Math.random() * CHAOS_MODES.length)]
        }
        currentModeRef.current = newMode
        applyChaosMode(newMode)

        // Schedule next mode switch
        modeIntervalRef.current = setTimeout(switchMode, randomInRange(500, 2000))
      }
      modeIntervalRef.current = setTimeout(switchMode, randomInRange(500, 1500))

      // Fast parameter modulation within current mode
      const runModulation = () => {
        const store = useGlitchEngineStore.getState()

        // Modulate based on what's currently enabled
        if (store.rgbSplitEnabled) {
          store.updateRGBSplit({
            amount: randomInRange(0.5, 1.5),
            redOffsetX: randomInRange(-0.15, 0.15),
            redOffsetY: randomInRange(-0.08, 0.08),
            blueOffsetX: randomInRange(-0.15, 0.15),
          })
        }

        if (store.blockDisplaceEnabled) {
          store.updateBlockDisplace({
            displaceChance: randomInRange(0.5, 1.0),
            displaceDistance: randomInRange(0.1, 0.4),
            blockSize: randomInRange(0.02, 0.1),
          })
        }

        if (store.feedbackLoopEnabled) {
          store.updateFeedbackLoop({
            decay: randomInRange(0.8, 0.98),
            zoom: randomInRange(0.96, 1.08),
            rotation: randomInRange(-10, 10),
            hueShift: randomInRange(0, 60),
          })
        }

        if (store.vhsTrackingEnabled) {
          store.updateVHSTracking({
            tearIntensity: randomInRange(0.5, 1.0),
            tearSpeed: randomInRange(1, 6),
            jitter: randomInRange(0.3, 1.0),
          })
        }

        if (store.noiseEnabled) {
          store.updateNoise({
            amount: randomInRange(0.2, 0.8),
          })
        }

        if (store.staticDisplacementEnabled) {
          store.updateStaticDisplacement({
            intensity: randomInRange(0.4, 1.0),
            scale: randomInRange(15, 70),
          })
        }

        if (store.pixelateEnabled) {
          store.updatePixelate({
            pixelSize: Math.floor(randomInRange(4, 20)),
          })
        }

        if (store.chromaticAberrationEnabled) {
          store.updateChromaticAberration({
            intensity: randomInRange(0.5, 1.0),
            direction: randomInRange(0, 360),
          })
        }

        if (store.posterizeEnabled) {
          store.updatePosterize({
            levels: Math.floor(randomInRange(2, 8)),
          })
        }

        if (store.colorGradeEnabled) {
          store.updateColorGrade({
            saturation: randomInRange(0.5, 3.0),
            contrast: randomInRange(1.0, 2.5),
            brightness: randomInRange(0.6, 1.6),
          })
        }

        if (store.lensDistortionEnabled) {
          store.updateLensDistortion({
            curvature: randomInRange(-0.6, 0.6),
            vignette: randomInRange(0.2, 0.9),
          })
        }

        // Schedule next modulation - FAST
        intervalIdRef.current = setTimeout(runModulation, randomInRange(30, 120))
      }

      // Start the modulation loop
      intervalIdRef.current = setTimeout(runModulation, 50)
    } else {
      // Clear all intervals
      if (intervalIdRef.current !== null) {
        clearTimeout(intervalIdRef.current)
        intervalIdRef.current = null
      }
      if (modeIntervalRef.current !== null) {
        clearTimeout(modeIntervalRef.current)
        modeIntervalRef.current = null
      }

      // Restore saved effect states
      if (savedStateRef.current !== null) {
        glitchStore.applySnapshot(savedStateRef.current)
        savedStateRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalIdRef.current !== null) {
        clearTimeout(intervalIdRef.current)
        intervalIdRef.current = null
      }
      if (modeIntervalRef.current !== null) {
        clearTimeout(modeIntervalRef.current)
        modeIntervalRef.current = null
      }
    }
  }, [active])
}
