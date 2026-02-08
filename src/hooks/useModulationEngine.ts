import { useEffect, useRef } from 'react'
import { useModulationStore } from '../stores/modulationStore'

/**
 * Runs the modulation value generators (LFO, Random, Step, Envelope) at 60fps.
 * Updates currentValue in each modulator based on its parameters.
 */
export function useModulationEngine() {
  const lastTime = useRef(performance.now())
  const frameId = useRef<number | null>(null)

  useEffect(() => {
    const loop = () => {
      const now = performance.now()
      const delta = (now - lastTime.current) / 1000  // Delta in seconds
      lastTime.current = now

      const store = useModulationStore.getState()

      // Update each enabled modulator
      if (store.lfo.enabled) {
        store.updateLFO(delta)
      }
      if (store.random.enabled) {
        store.updateRandom(delta)
      }
      if (store.step.enabled) {
        store.updateStep(delta)
      }
      if (store.envelope.enabled) {
        store.updateEnvelope(delta)
      }

      frameId.current = requestAnimationFrame(loop)
    }

    frameId.current = requestAnimationFrame(loop)

    return () => {
      if (frameId.current !== null) {
        cancelAnimationFrame(frameId.current)
        frameId.current = null
      }
    }
  }, [])
}
