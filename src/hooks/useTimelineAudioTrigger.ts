import { useEffect, useRef } from 'react'
import { useTimelineStore } from '../stores/timelineStore'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'
import { useAudioSourceStore } from '../stores/audioSourceStore'

const MIN_TRIGGER_INTERVAL_MS = 100

export function useTimelineAudioTrigger() {
  const rafRef = useRef<number | null>(null)
  const lastTriggerTimeRef = useRef(0)
  const prevAmplitudeRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    function loop() {
      if (cancelled) return

      const timeline = useTimelineStore.getState()
      if (!timeline.isPlaying || !timeline.isActive) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const clip = timeline.clips[timeline.currentClipIndex]
      if (!clip) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const now = performance.now()
      const elapsed = now - lastTriggerTimeRef.current

      switch (clip.triggerMode) {
        case 'kickDetection': {
          const hit = useAudioReactiveStore.getState().hit
          if (hit > 0.8 && elapsed > MIN_TRIGGER_INTERVAL_MS) {
            lastTriggerTimeRef.current = now
            timeline.advanceToNextClip()
          }
          break
        }

        case 'audioThreshold': {
          const amplitude = useAudioSourceStore.getState().amplitude
          const prev = prevAmplitudeRef.current
          // Rising edge: previous below threshold, current at or above
          if (prev < clip.threshold && amplitude >= clip.threshold && elapsed > MIN_TRIGGER_INTERVAL_MS) {
            lastTriggerTimeRef.current = now
            timeline.advanceToNextClip()
          }
          prevAmplitudeRef.current = amplitude
          break
        }

        case 'timed':
          // Timed mode handled by playback hook elapsed tracking
          break

        case 'manual':
          // No-op — user triggers via UI
          break
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelled = true
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])
}
