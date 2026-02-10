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
 * Helper to get a random interval between min and max milliseconds
 */
function randomInterval(): number {
  return randomInRange(100, 500)
}

/**
 * Chaos engine hook for Destruction Mode.
 * When destruction mode is active, force-enables effects at extreme values
 * and runs randomized modulation to create visual chaos.
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

      // Enable chaos effects with extreme values
      glitchStore.setRGBSplitEnabled(true)
      glitchStore.updateRGBSplit({
        amount: 50,
        angle: Math.random() * 360,
      })

      glitchStore.setBlockDisplaceEnabled(true)
      glitchStore.updateBlockDisplace({
        intensity: 0.8,
        blockSize: 32,
      })

      glitchStore.setFeedbackLoopEnabled(true)
      glitchStore.updateFeedbackLoop({
        decay: 0.95,
        zoom: 1.02,
        rotation: 2,
        hueShift: 15,
      })

      glitchStore.setChromaticAberrationEnabled(true)
      glitchStore.updateChromaticAberration({
        offset: 20,
      })

      glitchStore.setVHSTrackingEnabled(true)
      glitchStore.updateVHSTracking({
        intensity: 0.8,
        noiseIntensity: 0.5,
      })

      glitchStore.setNoiseEnabled(true)
      glitchStore.updateNoise({
        intensity: 0.4,
      })

      glitchStore.setStaticDisplacementEnabled(true)
      glitchStore.updateStaticDisplacement({
        intensity: 0.6,
      })

      // Start randomized modulation interval
      const runModulation = () => {
        const store = useGlitchEngineStore.getState()

        // Randomly tweak RGB split
        store.updateRGBSplit({
          amount: randomInRange(30, 70),
          angle: Math.random() * 360,
        })

        // Randomly tweak block displace
        store.updateBlockDisplace({
          intensity: randomInRange(0.5, 1.0),
          blockSize: Math.floor(randomInRange(8, 56)),
        })

        // Randomly tweak feedback loop
        store.updateFeedbackLoop({
          decay: randomInRange(0.85, 0.99),
          zoom: randomInRange(0.98, 1.04),
          rotation: randomInRange(-5, 5),
        })

        // Randomly tweak noise
        store.updateNoise({
          intensity: randomInRange(0.2, 0.6),
        })

        // Schedule next modulation at random interval
        intervalIdRef.current = setTimeout(runModulation, randomInterval())
      }

      // Start the modulation loop
      intervalIdRef.current = setTimeout(runModulation, randomInterval())
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
