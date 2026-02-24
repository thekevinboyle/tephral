import { useEffect, useRef } from 'react'
import { useEffectLauncherStore } from '../stores/effectLauncherStore'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'
import { useAudioSourceStore } from '../stores/audioSourceStore'
import { setEffectEnabled, applyEffectParams } from '../utils/effectControl'

export function useEffectLauncher() {
  const rafRef = useRef<number>(0)
  const lastAdvanceRef = useRef(0)
  const lastBPMTickRef = useRef(0)
  const prevActiveRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = (now: number) => {
      const store = useEffectLauncherStore.getState()
      if (!store.isPlaying) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const { activeIndex, cells, cycleMode, triggerBand, threshold, holdTime, fallbackRate } = store
      const holdOk = now - lastAdvanceRef.current > holdTime

      // Activate/deactivate effects on cell change
      if (activeIndex !== prevActiveRef.current) {
        if (prevActiveRef.current !== null) {
          const prevCell = cells[prevActiveRef.current]
          if (prevCell) setEffectEnabled(prevCell.effectId, false)
        }
        if (activeIndex !== null) {
          const cell = cells[activeIndex]
          if (cell) {
            applyEffectParams(cell.effectId, cell.params)
            setEffectEnabled(cell.effectId, true)
          }
        }
        prevActiveRef.current = activeIndex
      }

      const audioCtx = useAudioSourceStore.getState().audioContext
      const hasAudio = audioCtx !== null

      if (hasAudio && holdOk) {
        const audio = useAudioReactiveStore.getState()
        let energy: number
        if (triggerBand === 'all') {
          energy = useAudioSourceStore.getState().amplitude
        } else if (triggerBand === 'kick') {
          energy = audio.hit
        } else {
          energy = audio[triggerBand]
        }

        if (energy > threshold) {
          if (cycleMode === 'speed') {
            store.advance()
          } else if (cycleMode === 'selection') {
            const nonEmpty = cells
              .map((c, i) => (c !== null ? i : -1))
              .filter((i) => i !== -1)
            if (nonEmpty.length > 0) {
              const idx = Math.min(nonEmpty.length - 1, Math.floor(energy * nonEmpty.length))
              store.jumpTo(nonEmpty[idx])
            }
          } else {
            // combined mode
            const nonEmpty = cells
              .map((c, i) => (c !== null ? i : -1))
              .filter((i) => i !== -1)
            if (nonEmpty.length > 1) {
              const skip = Math.floor(energy * (nonEmpty.length - 1))
              const currentPos = activeIndex !== null ? nonEmpty.indexOf(activeIndex) : 0
              const nextPos = (currentPos + 1 + skip) % nonEmpty.length
              store.jumpTo(nonEmpty[nextPos])
            } else {
              store.advance()
            }
          }
          lastAdvanceRef.current = now
        }
      } else if (!hasAudio && holdOk) {
        // Fallback: BPM-based timer when no audio context is available
        const interval = 60000 / fallbackRate
        if (now - lastBPMTickRef.current >= interval) {
          store.advance()
          lastAdvanceRef.current = now
          lastBPMTickRef.current = now
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Cleanup: disable active cell's effect when playback stops
  const isPlaying = useEffectLauncherStore((s) => s.isPlaying)
  const prevPlayingRef = useRef(isPlaying)
  useEffect(() => {
    if (prevPlayingRef.current && !isPlaying) {
      const idx = prevActiveRef.current
      if (idx !== null) {
        const cell = useEffectLauncherStore.getState().cells[idx]
        if (cell) setEffectEnabled(cell.effectId, false)
      }
      prevActiveRef.current = null
    }
    prevPlayingRef.current = isPlaying
  }, [isPlaying])
}
