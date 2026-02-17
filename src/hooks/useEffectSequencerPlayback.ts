import { useEffect, useRef, useCallback } from 'react'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useSequencerStore } from '../stores/sequencerStore'
import { useRoutingStore } from '../stores/routingStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { EFFECT_PARAM_REGISTRY } from '../config/effectParams'

// Resolution to beat fraction
const RESOLUTION_BEATS: Record<string, number> = {
  '1/4': 1,
  '1/8': 0.5,
  '1/16': 0.25,
  '1/32': 0.125,
}

export function useEffectSequencerPlayback() {
  const isPlaying = useEffectSequencerStore((s) => s.isPlaying)
  const bpm = useEffectSequencerStore((s) => s.bpm)
  const resolution = useEffectSequencerStore((s) => s.resolution)

  const lastStepTime = useRef(0)
  const animationFrameId = useRef<number | null>(null)
  // Base values snapshot: { effectId: { paramId: value } }
  const baseValues = useRef<Record<string, Record<string, number | string>>>({})
  // Track which effects were enabled before playback (for gate mode restore)
  const prePlayEnabled = useRef<Record<string, boolean>>({})
  // Base mix values snapshot for gate mode (gate uses mix=0 instead of setEnabled)
  const baseMix = useRef<Record<string, number>>({})

  // ─── Timing ────────────────────────────────────────────────────────────

  const getMsPerStep = useCallback(() => {
    const beatsPerStep = RESOLUTION_BEATS[resolution] || 0.25
    return (60000 / bpm) * beatsPerStep
  }, [bpm, resolution])

  // ─── Base value capture ────────────────────────────────────────────────

  const captureBaseValues = useCallback(() => {
    const snapshot: Record<string, Record<string, number | string>> = {}
    const enabledSnapshot: Record<string, boolean> = {}
    const mixSnapshot: Record<string, number> = {}
    const currentTracks = useEffectSequencerStore.getState().tracks
    const ge = useGlitchEngineStore.getState()

    for (const effectId of Object.keys(currentTracks)) {
      const entry = EFFECT_PARAM_REGISTRY[effectId]
      if (!entry) continue
      enabledSnapshot[effectId] = entry.getEnabled()
      mixSnapshot[effectId] = ge.getEffectMix(effectId)
      snapshot[effectId] = {}
      for (const param of entry.getParams()) {
        snapshot[effectId][param.id] = param.read()
      }
      // Capture select param base values
      if (entry.getSelectParams) {
        for (const param of entry.getSelectParams()) {
          snapshot[effectId][param.id] = param.read()
        }
      }
    }

    baseValues.current = snapshot
    prePlayEnabled.current = enabledSnapshot
    baseMix.current = mixSnapshot
  }, [])

  const restoreBaseValues = useCallback(() => {
    const currentTracks = useEffectSequencerStore.getState().tracks
    const ge = useGlitchEngineStore.getState()

    for (const effectId of Object.keys(currentTracks)) {
      const entry = EFFECT_PARAM_REGISTRY[effectId]
      if (!entry) continue

      // Restore mix for gate mode tracks
      if (effectId in baseMix.current) {
        ge.setEffectMix(effectId, baseMix.current[effectId])
      }

      // Restore parameter values
      const base = baseValues.current[effectId]
      if (!base) continue
      for (const param of entry.getParams()) {
        if (param.id in base) {
          param.apply(base[param.id] as number)
        }
      }
      // Restore select param values
      if (entry.getSelectParams) {
        for (const param of entry.getSelectParams()) {
          if (param.id in base) {
            param.apply(base[param.id] as string)
          }
        }
      }
    }
  }, [])

  // ─── Step execution ────────────────────────────────────────────────────

  const executeStep = useCallback(() => {
    const state = useEffectSequencerStore.getState()
    const { tracks: currentTracks, currentStep, fillModeActive: fill } = state
    const effectOrder = useRoutingStore.getState().effectOrder

    // Check for any soloed tracks
    const trackList = Object.values(currentTracks)
    const hasSolo = trackList.some((t) => t.soloed)

    for (const effectId of effectOrder) {
      const track = currentTracks[effectId]
      if (!track) continue
      if (track.muted) continue
      if (hasSolo && !track.soloed) continue

      const entry = EFFECT_PARAM_REGISTRY[effectId]
      if (!entry) continue

      // Dynamically capture base values for newly added effects during playback
      if (!(effectId in prePlayEnabled.current)) {
        const ge = useGlitchEngineStore.getState()
        prePlayEnabled.current[effectId] = entry.getEnabled()
        baseMix.current[effectId] = ge.getEffectMix(effectId)
        baseValues.current[effectId] = {}
        for (const param of entry.getParams()) {
          baseValues.current[effectId][param.id] = param.read()
        }
        if (entry.getSelectParams) {
          for (const param of entry.getSelectParams()) {
            baseValues.current[effectId][param.id] = param.read()
          }
        }
      }

      if (!prePlayEnabled.current[effectId]) continue

      const stepIndex = currentStep % track.length
      const step = track.steps[stepIndex]

      const ge = useGlitchEngineStore.getState()

      // Condition check
      if (step.condition === 'fill' && !fill) {
        if (track.mode === 'gate') {
          ge.setEffectMix(effectId, 0)
        }
        continue
      }

      // Probability check
      const shouldFire = step.active && Math.random() < step.probability

      const base = baseValues.current[effectId]
      const origMix = baseMix.current[effectId] ?? 1

      // Helper: for each param, apply lock value if it exists, else base (global)
      const applyParamsForStep = () => {
        for (const param of entry.getParams()) {
          if (param.id in step.locks) {
            param.apply(step.locks[param.id] as number)
          } else if (base && param.id in base) {
            param.apply(base[param.id] as number)
          }
        }
        if (entry.getSelectParams) {
          for (const param of entry.getSelectParams()) {
            if (param.id in step.locks) {
              param.apply(step.locks[param.id] as string)
            } else if (base && param.id in base) {
              param.apply(base[param.id] as string)
            }
          }
        }
      }

      const restoreAllToBase = () => {
        if (!base) return
        for (const param of entry.getParams()) {
          if (param.id in base) param.apply(base[param.id] as number)
        }
        if (entry.getSelectParams) {
          for (const param of entry.getSelectParams()) {
            if (param.id in base) param.apply(base[param.id] as string)
          }
        }
      }

      if (track.mode === 'gate') {
        // Gate uses mix=0/1 instead of setEnabled — avoids full pipeline
        // chain rebuild on every step, only changes a shader uniform
        if (shouldFire) {
          ge.setEffectMix(effectId, origMix)
          applyParamsForStep()
        } else {
          ge.setEffectMix(effectId, 0)
          restoreAllToBase()
        }
      } else {
        // param mode: effect stays on, only params change
        if (shouldFire) {
          applyParamsForStep()
        } else {
          restoreAllToBase()
        }
      }
    }

    // Advance playhead
    useEffectSequencerStore.getState().advanceStep()
  }, [])

  // ─── RAF loop ──────────────────────────────────────────────────────────

  const playbackLoop = useCallback(
    (timestamp: number) => {
      if (!isPlaying) return

      const msPerStep = getMsPerStep()

      if (timestamp - lastStepTime.current >= msPerStep) {
        lastStepTime.current = timestamp
        executeStep()
      }

      animationFrameId.current = requestAnimationFrame(playbackLoop)
    },
    [isPlaying, getMsPerStep, executeStep],
  )

  // ─── Start / stop ─────────────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying) {
      // Mutual exclusion: stop the old step sequencer
      const oldSeq = useSequencerStore.getState()
      if (oldSeq.isPlaying) oldSeq.stop()

      captureBaseValues()
      lastStepTime.current = performance.now()
      animationFrameId.current = requestAnimationFrame(playbackLoop)
    } else {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
      // Restore base values on stop
      restoreBaseValues()
    }

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [isPlaying, playbackLoop, captureBaseValues, restoreBaseValues])

  return {
    isPlaying,
    msPerStep: getMsPerStep(),
  }
}
