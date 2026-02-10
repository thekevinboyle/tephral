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
 * Helper to get a random interval - FAST for chaos
 */
function randomInterval(): number {
  return randomInRange(30, 150) // Much faster modulation
}

/**
 * Chaos engine hook for Destruction Mode.
 * ABSOLUTE MAYHEM - stacks ALL effects at extreme values
 * and rapidly modulates everything to look like a system crash.
 */
export function useDestructionChaos() {
  const savedStateRef = useRef<GlitchSnapshot | null>(null)
  const intervalIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const active = useDestructionModeStore((state) => state.active)

  useEffect(() => {
    const glitchStore = useGlitchEngineStore.getState()

    if (active) {
      // Save current effect state
      savedStateRef.current = glitchStore.getSnapshot()

      // ENABLE EVERYTHING - MAXIMUM DESTRUCTION
      glitchStore.setEnabled(true)

      // RGB Split - CRANKED
      glitchStore.setRGBSplitEnabled(true)
      glitchStore.updateRGBSplit({
        amount: 1.0,
        redOffsetX: 0.08,
        redOffsetY: -0.04,
        greenOffsetX: -0.02,
        greenOffsetY: 0.03,
        blueOffsetX: -0.06,
        blueOffsetY: 0.02,
        mix: 1.0,
      })

      // Block Displace - HEAVY
      glitchStore.setBlockDisplaceEnabled(true)
      glitchStore.updateBlockDisplace({
        displaceChance: 0.9,
        displaceDistance: 0.2,
        blockSize: 0.04,
        mix: 1.0,
      })

      // Feedback Loop - INTENSE TRAILS
      glitchStore.setFeedbackLoopEnabled(true)
      glitchStore.updateFeedbackLoop({
        decay: 0.92,
        zoom: 1.03,
        rotation: 3,
        hueShift: 25,
        offsetX: 0.01,
        offsetY: 0.005,
        mix: 1.0,
      })

      // Chromatic Aberration - MAXED
      glitchStore.setChromaticAberrationEnabled(true)
      glitchStore.updateChromaticAberration({
        intensity: 1.0,
        radialAmount: 0.9,
        direction: 45,
        redOffset: 0.04,
        blueOffset: -0.04,
        mix: 1.0,
      })

      // VHS Tracking - CORRUPTED TAPE
      glitchStore.setVHSTrackingEnabled(true)
      glitchStore.updateVHSTracking({
        tearIntensity: 1.0,
        tearSpeed: 3.0,
        headSwitchNoise: 0.8,
        colorBleed: 0.9,
        jitter: 0.7,
        mix: 1.0,
      })

      // Noise - HEAVY STATIC
      glitchStore.setNoiseEnabled(true)
      glitchStore.updateNoise({
        amount: 0.5,
        speed: 20,
        mix: 1.0,
      })

      // Static Displacement - WARPED
      glitchStore.setStaticDisplacementEnabled(true)
      glitchStore.updateStaticDisplacement({
        intensity: 0.8,
        scale: 30,
        speed: 5,
        mix: 1.0,
      })

      // Pixelate - CHUNKY
      glitchStore.setPixelateEnabled(true)
      glitchStore.updatePixelate({
        pixelSize: 8,
        mix: 0.7,
      })

      // Scan Lines - HEAVY
      glitchStore.setScanLinesEnabled(true)
      glitchStore.updateScanLines({
        lineCount: 400,
        lineOpacity: 0.4,
        lineFlicker: 0.3,
        mix: 1.0,
      })

      // Edge Detection - HARSH
      glitchStore.setEdgeDetectionEnabled(true)
      glitchStore.updateEdgeDetection({
        threshold: 0.15,
        mix: 0.5,
      })

      // Posterize - BANDED
      glitchStore.setPosterizeEnabled(true)
      glitchStore.updatePosterize({
        levels: 4,
        mix: 0.6,
      })

      // Lens Distortion - WARPED
      glitchStore.setLensDistortionEnabled(true)
      glitchStore.updateLensDistortion({
        curvature: 0.4,
        vignette: 0.5,
        phosphorGlow: 0.3,
        mix: 0.8,
      })

      // Dither - GRAINY
      glitchStore.setDitherEnabled(true)
      glitchStore.updateDither({
        scale: 2,
        intensity: 0.5,
        mix: 0.6,
      })

      // Color Grade - SHIFTED
      glitchStore.setColorGradeEnabled(true)
      glitchStore.updateColorGrade({
        brightness: 1.2,
        contrast: 1.4,
        saturation: 1.5,
        mix: 0.8,
      })

      // CHAOS MODULATION - rapid random changes
      const runModulation = () => {
        const store = useGlitchEngineStore.getState()

        // Wildly modulate RGB split
        store.updateRGBSplit({
          amount: randomInRange(0.5, 1.0),
          redOffsetX: randomInRange(-0.1, 0.1),
          redOffsetY: randomInRange(-0.05, 0.05),
          blueOffsetX: randomInRange(-0.1, 0.1),
          blueOffsetY: randomInRange(-0.05, 0.05),
        })

        // Chaotic block displacement
        store.updateBlockDisplace({
          displaceChance: randomInRange(0.6, 1.0),
          displaceDistance: randomInRange(0.1, 0.3),
          blockSize: randomInRange(0.02, 0.08),
        })

        // Feedback wobble
        store.updateFeedbackLoop({
          decay: randomInRange(0.85, 0.96),
          zoom: randomInRange(0.97, 1.05),
          rotation: randomInRange(-8, 8),
          hueShift: randomInRange(0, 40),
        })

        // VHS chaos
        store.updateVHSTracking({
          tearIntensity: randomInRange(0.5, 1.0),
          tearSpeed: randomInRange(1, 5),
          jitter: randomInRange(0.3, 1.0),
        })

        // Noise fluctuation
        store.updateNoise({
          amount: randomInRange(0.3, 0.7),
        })

        // Static displacement warp
        store.updateStaticDisplacement({
          intensity: randomInRange(0.4, 1.0),
          scale: randomInRange(10, 50),
        })

        // Random pixelation
        store.updatePixelate({
          pixelSize: Math.floor(randomInRange(4, 16)),
        })

        // Chromatic shift
        store.updateChromaticAberration({
          intensity: randomInRange(0.5, 1.0),
          direction: randomInRange(0, 360),
        })

        // Posterize bands
        store.updatePosterize({
          levels: Math.floor(randomInRange(2, 8)),
        })

        // Color grade shift
        store.updateColorGrade({
          saturation: randomInRange(0.8, 2.0),
          contrast: randomInRange(1.0, 1.8),
          brightness: randomInRange(0.8, 1.4),
        })

        // Lens warp
        store.updateLensDistortion({
          curvature: randomInRange(-0.5, 0.5),
          vignette: randomInRange(0.3, 0.8),
        })

        // Schedule next modulation - FAST
        intervalIdRef.current = setTimeout(runModulation, randomInterval())
      }

      // Start the chaos loop immediately
      intervalIdRef.current = setTimeout(runModulation, 50)
    } else {
      // Clear the modulation interval
      if (intervalIdRef.current !== null) {
        clearTimeout(intervalIdRef.current)
        intervalIdRef.current = null
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
    }
  }, [active])
}
