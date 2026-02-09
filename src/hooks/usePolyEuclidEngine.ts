import { useEffect, useRef } from 'react'
import { usePolyEuclidStore } from '../stores/polyEuclidStore'
import { useSequencerStore } from '../stores/sequencerStore'

export function usePolyEuclidEngine() {
  const { isPlaying, bpm } = useSequencerStore()
  const frameRef = useRef<number>(0)
  const lastFrameTimeRef = useRef<number>(0)
  const trackTimersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const animate = (timestamp: number) => {
      const deltaTime = lastFrameTimeRef.current
        ? (timestamp - lastFrameTimeRef.current) / 1000
        : 0
      lastFrameTimeRef.current = timestamp

      const store = usePolyEuclidStore.getState()

      for (const track of store.tracks) {
        // Calculate step interval: 16th note base, modified by clock divider
        // Higher divider = faster, lower divider = slower
        const baseInterval = (60 / bpm) / 4 * 1000 // ms per 16th note
        const stepInterval = baseInterval / track.clockDivider

        // Get or init timer for this track
        let lastStepTime = trackTimersRef.current.get(track.id) ?? timestamp
        const timeSinceLastStep = timestamp - lastStepTime

        // Advance step if playing and interval elapsed
        if (isPlaying && timeSinceLastStep >= stepInterval) {
          trackTimersRef.current.set(track.id, timestamp)

          const nextStep = (track.currentStep + 1) % track.steps
          store.setCurrentStep(track.id, nextStep)

          // Check if this step is a hit
          if (!track.muted) {
            const pattern = store.getPattern(track.id)
            if (pattern[nextStep]) {
              store.setCurrentValue(track.id, 1)
            }
          }
        }

        // Apply decay to current value (even when not playing, for smooth fadeout)
        if (track.currentValue > 0.001) {
          const decayRate = 1 + track.decay * 20
          const newValue = track.currentValue * Math.exp(-decayRate * deltaTime)
          store.setCurrentValue(track.id, newValue)
        } else if (track.currentValue !== 0) {
          store.setCurrentValue(track.id, 0)
        }
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isPlaying, bpm])

  return null
}
