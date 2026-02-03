import { useEffect, useRef } from 'react'
import { useEuclideanStore } from '../stores/euclideanStore'
import { useSequencerStore } from '../stores/sequencerStore'

export function useEuclideanEngine() {
  const store = useEuclideanStore()
  const { isPlaying, bpm } = useSequencerStore()

  const frameRef = useRef<number>(0)
  const lastStepTimeRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!store.enabled) {
      store.setCurrentValue(0)
      return
    }

    const animate = (timestamp: number) => {
      const deltaTime = lastFrameTimeRef.current ? (timestamp - lastFrameTimeRef.current) / 1000 : 0
      lastFrameTimeRef.current = timestamp

      // Calculate step interval based on mode
      let stepInterval: number
      if (store.syncMode === 'sync') {
        // In sync mode, only advance when playing
        if (!isPlaying) {
          // Still decay the value
          if (store.currentValue > 0.001) {
            const decayRate = 1 + store.decay * 20 // Faster decay = higher multiplier
            const newValue = store.currentValue * Math.exp(-decayRate * deltaTime)
            store.setCurrentValue(newValue)
          } else if (store.currentValue !== 0) {
            store.setCurrentValue(0)
          }
          frameRef.current = requestAnimationFrame(animate)
          return
        }
        // 16th notes at current BPM
        stepInterval = (60 / bpm) / 4 * 1000 // ms per 16th note
      } else {
        // Free mode: use freeRate (Hz)
        stepInterval = 1000 / store.freeRate / store.steps
      }

      // Check if it's time for the next step
      const timeSinceLastStep = timestamp - lastStepTimeRef.current
      if (timeSinceLastStep >= stepInterval) {
        lastStepTimeRef.current = timestamp

        // Advance step
        const nextStep = (store.currentStep + 1) % store.steps
        store.setCurrentStep(nextStep)

        // Check if this step is a hit
        const pattern = store.getPattern()
        if (pattern[nextStep]) {
          store.setCurrentValue(1)
        }
      }

      // Apply decay to current value
      if (store.currentValue > 0.001) {
        const decayRate = 1 + store.decay * 20
        const newValue = store.currentValue * Math.exp(-decayRate * deltaTime)
        store.setCurrentValue(newValue)
      } else if (store.currentValue !== 0) {
        store.setCurrentValue(0)
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [store.enabled, store.syncMode, store.freeRate, store.steps, isPlaying, bpm])

  return null
}
