import { useEffect, useRef, useCallback } from 'react'
import { useEffectSequencerStore, type EffectTrack, type AudioReactiveSource } from '../stores/effectSequencerStore'
import { useSequencerStore } from '../stores/sequencerStore'
import { useRoutingStore } from '../stores/routingStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'
import { useAudioSourceStore } from '../stores/audioSourceStore'
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
  const lastFrameTime = useRef(0)
  const animationFrameId = useRef<number | null>(null)
  // Track which effects were enabled before playback (for gate mode restore)
  const prePlayEnabled = useRef<Record<string, boolean>>({})
  // Base mix values snapshot for gate mode (gate uses mix=0 instead of setEnabled)
  const baseMix = useRef<Record<string, number>>({})
  // Pre-lock values: captured right before a lock is applied, used to restore when lock goes away
  // { effectId: { paramId: value } }
  const preLockValues = useRef<Record<string, Record<string, number | string>>>({})
  // Track which param ids were locked on the previous step (per effect)
  const prevLockedParams = useRef<Record<string, Set<string>>>({})
  // Track which effects were bypassed by mute/solo (to restore on stop/unmute)
  const muteBypassed = useRef<Set<string>>(new Set())

  // Per-track audio-reactive state
  const trackWasAbove = useRef<Record<string, boolean>>({})
  const trackRollingPeak = useRef<Record<string, number>>({})
  const trackRollingAvg = useRef<Record<string, number>>({})
  const trackNoiseFloor = useRef<Record<string, number>>({})

  // Per-track timing for time-scaled BPM tracks
  const trackLastStepTime = useRef<Record<string, number>>({})
  // Retrig timer IDs for cleanup
  const retrigTimers = useRef<number[]>([])

  // ─── Timing ────────────────────────────────────────────────────────────

  const getMsPerStep = useCallback(() => {
    const beatsPerStep = RESOLUTION_BEATS[resolution] || 0.25
    return (60000 / bpm) * beatsPerStep
  }, [bpm, resolution])

  // ─── Audio value reader ──────────────────────────────────────────────

  const getAudioValue = useCallback((source: AudioReactiveSource): number => {
    const ar = useAudioReactiveStore.getState()
    const as = useAudioSourceStore.getState()

    if (ar.autoMode) {
      // Auto mode: values are already well-normalized, no linearization needed
      switch (source) {
        case 'kick':    return ar.sub
        case 'low':     return ar.sub
        case 'mid':     return ar.mid
        case 'high':    return ar.high
        case 'peak':    return Math.min(1, ar.hit)
        case 'rms':     return as.amplitude
        case 'silence': return 1 - as.amplitude
        default:        return 0
      }
    }

    // Manual mode: undo the power curve to get a more linear 0-1 range
    const { curve } = ar
    const invCurve = curve > 0 ? 1 / curve : 1
    const linearize = (v: number) => Math.pow(Math.min(1, Math.max(0, v)), invCurve)

    switch (source) {
      case 'kick':    return linearize(ar.sub)
      case 'low':     return linearize(ar.sub)
      case 'mid':     return linearize(ar.mid)
      case 'high':    return linearize(ar.high)
      case 'peak':    return Math.min(1, ar.hit)
      case 'rms':     return as.amplitude
      case 'silence': return 1 - as.amplitude
      default:        return 0
    }
  }, [])

  // ─── Base value capture ────────────────────────────────────────────────

  const captureBaseValues = useCallback(() => {
    const enabledSnapshot: Record<string, boolean> = {}
    const mixSnapshot: Record<string, number> = {}
    const currentTracks = useEffectSequencerStore.getState().tracks
    const ge = useGlitchEngineStore.getState()

    for (const effectId of Object.keys(currentTracks)) {
      const entry = EFFECT_PARAM_REGISTRY[effectId]
      if (!entry) continue
      enabledSnapshot[effectId] = entry.getEnabled()
      mixSnapshot[effectId] = ge.getEffectMix(effectId)
    }

    prePlayEnabled.current = enabledSnapshot
    baseMix.current = mixSnapshot
    preLockValues.current = {}
    prevLockedParams.current = {}
    muteBypassed.current = new Set()
    trackWasAbove.current = {}
    trackRollingPeak.current = {}
    trackRollingAvg.current = {}
    trackNoiseFloor.current = {}
  }, [])

  const restoreBaseValues = useCallback(() => {
    const currentTracks = useEffectSequencerStore.getState().tracks
    const ge = useGlitchEngineStore.getState()

    for (const effectId of Object.keys(currentTracks)) {
      const entry = EFFECT_PARAM_REGISTRY[effectId]
      if (!entry) continue

      // Restore enabled state for audio-reactive tracks that were off before playback
      if (prePlayEnabled.current[effectId] === false) {
        entry.setEnabled(false)
      }

      // Restore mix for gate mode tracks
      if (effectId in baseMix.current) {
        ge.setEffectMix(effectId, baseMix.current[effectId])
      }

      // Restore any params that were locked back to their pre-lock values
      const saved = preLockValues.current[effectId]
      if (!saved) continue
      for (const param of entry.getParams()) {
        if (param.id in saved) {
          param.apply(saved[param.id] as number)
        }
      }
      if (entry.getSelectParams) {
        for (const param of entry.getSelectParams()) {
          if (param.id in saved) {
            param.apply(saved[param.id] as string)
          }
        }
      }
    }

    // Un-bypass any effects that were bypassed by mute/solo
    for (const effectId of muteBypassed.current) {
      ge.setEffectBypassed(effectId, false)
    }
    muteBypassed.current = new Set()

    preLockValues.current = {}
    prevLockedParams.current = {}
  }, [])

  // ─── Single-track step execution ─────────────────────────────────────
  // Extracted from executeStep so both BPM and audio-reactive paths can use it

  const executeTrackAtStep = useCallback((
    effectId: string,
    track: EffectTrack,
    stepIndex: number,
    fill: boolean,
    hasSolo: boolean,
  ) => {
    const entry = EFFECT_PARAM_REGISTRY[effectId]
    if (!entry) return

    // Dynamically capture enabled/mix for newly added effects during playback
    if (!(effectId in prePlayEnabled.current)) {
      const ge = useGlitchEngineStore.getState()
      prePlayEnabled.current[effectId] = entry.getEnabled()
      baseMix.current[effectId] = ge.getEffectMix(effectId)
    }

    // For audio-reactive tracks, always allow execution (effect may be "off"
    // before playback — the audio trigger IS what turns it on)
    if (!prePlayEnabled.current[effectId] && !track.audioReactive.enabled) return

    // Mute/solo: bypass the effect
    const isMuted = track.muted || (hasSolo && !track.soloed)
    if (isMuted) {
      if (!muteBypassed.current.has(effectId)) {
        useGlitchEngineStore.getState().setEffectBypassed(effectId, true)
        muteBypassed.current.add(effectId)
      }
      return
    } else if (muteBypassed.current.has(effectId)) {
      useGlitchEngineStore.getState().setEffectBypassed(effectId, false)
      muteBypassed.current.delete(effectId)
    }

    const step = track.steps[stepIndex]
    const ge = useGlitchEngineStore.getState()

    // Condition check
    if (step.condition === 'fill' && !fill) {
      if (track.mode === 'gate') {
        ge.setEffectMix(effectId, 0)
      }
      return
    }

    // Probability check
    const shouldFire = step.active && Math.random() < step.probability
    const origMix = baseMix.current[effectId] ?? 1

    // Collect current step's locked param ids
    const currentLockedIds = new Set(Object.keys(step.locks))
    const prevLocked = prevLockedParams.current[effectId] ?? new Set<string>()

    // Ensure preLockValues entry exists for this effect
    if (!preLockValues.current[effectId]) {
      preLockValues.current[effectId] = {}
    }
    const saved = preLockValues.current[effectId]

    // Build a map of all params by id for quick lookup
    const allParams = new Map<string, { apply: (v: any) => void; read: () => any }>()
    for (const p of entry.getParams()) allParams.set(p.id, p)
    if (entry.getSelectParams) {
      for (const p of entry.getSelectParams()) allParams.set(p.id, p)
    }

    if (shouldFire) {
      // 1. Restore params that were locked last step but aren't locked now
      for (const pid of prevLocked) {
        if (!currentLockedIds.has(pid) && pid in saved) {
          const param = allParams.get(pid)
          if (param) param.apply(saved[pid])
          delete saved[pid]
        }
      }

      // 2. For current locks: capture live value before applying if not already saved
      for (const [pid, lockValue] of Object.entries(step.locks)) {
        const param = allParams.get(pid)
        if (!param) continue
        if (!(pid in saved)) {
          saved[pid] = param.read()
        }
        param.apply(lockValue)
      }
    } else {
      // Step not firing — restore all previously locked params
      for (const pid of prevLocked) {
        if (pid in saved) {
          const param = allParams.get(pid)
          if (param) param.apply(saved[pid])
          delete saved[pid]
        }
      }
    }

    // Update prev locked set for next step
    prevLockedParams.current[effectId] = shouldFire ? currentLockedIds : new Set()

    // Gate mode mix handling (independent of param locks)
    if (track.mode === 'gate' && !track.midiGate) {
      ge.setEffectMix(effectId, shouldFire ? origMix : 0)
    }
  }, [])

  // ─── RAF loop ──────────────────────────────────────────────────────────

  const playbackLoop = useCallback(
    (timestamp: number) => {
      if (!isPlaying) return

      const state = useEffectSequencerStore.getState()
      const { tracks: currentTracks, currentStep: _currentStep, fillModeActive: fill } = state
      void _currentStep
      const effectOrder = useRoutingStore.getState().effectOrder
      const trackList = Object.values(currentTracks)
      const hasSolo = trackList.some((t) => t.soloed)

      const dt = (timestamp - lastFrameTime.current) / 1000 // seconds
      lastFrameTime.current = timestamp

      // Auto-enable audio reactive analysis when any track uses it
      const anyAudioReactive = trackList.some((t) => t.audioReactive.enabled)
      if (anyAudioReactive) {
        const arState = useAudioReactiveStore.getState()
        if (!arState.enabled) arState.setEnabled(true)
      }

      // === Audio-reactive tracks: gate effect on/off by kick ===
      if (dt > 0 && dt < 1) { // guard against first frame / tab switch
        for (const effectId of effectOrder) {
          const track = currentTracks[effectId]
          if (!track || !track.audioReactive.enabled) continue

          const config = track.audioReactive
          const raw = getAudioValue(config.source)

          // Rolling peak: instant attack, ~1.5s decay half-life (faster decay = more dynamic range)
          const prevPeak = trackRollingPeak.current[effectId] ?? raw
          const peak = Math.max(raw, prevPeak * Math.pow(0.5, dt / 1.5))
          trackRollingPeak.current[effectId] = Math.max(peak, 0.001)

          // Noise floor: fast drop (~0.5s), very slow rise (~10s)
          const prevFloor = trackNoiseFloor.current[effectId] ?? raw
          let floor: number
          if (raw < prevFloor) {
            floor = prevFloor + (raw - prevFloor) * (1 - Math.pow(0.5, dt / 0.5))
          } else {
            floor = prevFloor + (raw - prevFloor) * (1 - Math.pow(0.5, dt / 10.0))
          }
          floor = Math.min(floor, peak * 0.5)
          trackNoiseFloor.current[effectId] = Math.max(0, floor)

          // Normalize to dynamic range
          const range = peak - floor
          const normalized = range > 0.001 ? Math.min(1, Math.max(0, raw - floor) / range) : 0

          // Rolling average (~3s time constant — slow-moving baseline)
          const prevAvg = trackRollingAvg.current[effectId] ?? normalized
          const avg = prevAvg + (normalized - prevAvg) * (1 - Math.pow(0.5, dt / 3))
          trackRollingAvg.current[effectId] = avg

          // Auto threshold: always above average, sensitivity controls how far above
          // sensitivity 0.1 → threshold near 1.0 (only loudest transients)
          // sensitivity 1.0 → threshold ~60% between avg and peak (clear kicks)
          // sensitivity 2.0 → threshold ~30% above avg (triggers easily)
          const sensNorm = Math.min(1, (config.sensitivity - 0.1) / 1.9)
          const headroom = 1 - avg
          const autoThreshold = avg + headroom * (0.2 + 0.7 * (1 - sensNorm))

          // UI feedback
          state.setTrackAudioLevel(effectId, normalized)
          state.setTrackAutoThreshold(effectId, autoThreshold)

          // Gate: toggle effect on/off based on threshold
          const wasAbove = trackWasAbove.current[effectId] ?? false
          const isAbove = normalized >= autoThreshold

          if (isAbove && !wasAbove) {
            // Kick detected — enable effect and advance step
            const entry = EFFECT_PARAM_REGISTRY[effectId]
            if (entry) entry.setEnabled(true)
            useGlitchEngineStore.getState().setEffectMix(effectId, baseMix.current[effectId] ?? 1)

            const latestTrack = useEffectSequencerStore.getState().tracks[effectId]
            if (latestTrack) {
              const stepIdx = latestTrack.trackStep % latestTrack.length
              executeTrackAtStep(effectId, latestTrack, stepIdx, fill, hasSolo)
              useEffectSequencerStore.getState().advanceTrackStep(effectId)
            }
          } else if (!isAbove && wasAbove) {
            // Kick ended — disable effect
            useGlitchEngineStore.getState().setEffectMix(effectId, 0)
          }

          trackWasAbove.current[effectId] = isAbove
        }
      }

      // === BPM-driven tracks: per-track time-scaled timing ===
      const baseMsPerStep = getMsPerStep()

      // Advance global currentStep at base rate (for UI display)
      if (timestamp - lastStepTime.current >= baseMsPerStep) {
        lastStepTime.current = timestamp
        useEffectSequencerStore.getState().advanceStep()
      }

      // Per-track stepping with individual timeScale
      for (const effectId of effectOrder) {
        const track = currentTracks[effectId]
        if (!track) continue
        if (track.audioReactive.enabled) continue // handled above

        // Initialize per-track timer if missing
        if (!(effectId in trackLastStepTime.current)) {
          trackLastStepTime.current[effectId] = timestamp
        }

        const trackMsPerStep = baseMsPerStep / (track.timeScale ?? 1)
        const elapsed = timestamp - trackLastStepTime.current[effectId]

        if (elapsed >= trackMsPerStep) {
          trackLastStepTime.current[effectId] = timestamp

          const stepIndex = track.trackStep % track.length
          executeTrackAtStep(effectId, track, stepIndex, fill, hasSolo)

          // Schedule retrigs within this step
          const step = track.steps[stepIndex]
          if (step && step.retrig > 0) {
            const subInterval = trackMsPerStep / step.retrig
            for (let r = 1; r < step.retrig; r++) {
              const timerId = window.setTimeout(() => {
                const latestTrack = useEffectSequencerStore.getState().tracks[effectId]
                if (!latestTrack) return
                const ge = useGlitchEngineStore.getState()
                if (latestTrack.mode === 'gate' && !latestTrack.midiGate) {
                  ge.setEffectMix(effectId, baseMix.current[effectId] ?? 1)
                }
                // Re-apply p-locks
                const entry = EFFECT_PARAM_REGISTRY[effectId]
                if (entry) {
                  const allParams = new Map<string, { apply: (v: any) => void }>()
                  for (const p of entry.getParams()) allParams.set(p.id, p)
                  if (entry.getSelectParams) {
                    for (const p of entry.getSelectParams()) allParams.set(p.id, p)
                  }
                  for (const [pid, lockValue] of Object.entries(step.locks)) {
                    allParams.get(pid)?.apply(lockValue)
                  }
                }
              }, subInterval * r)
              retrigTimers.current.push(timerId)
            }
          }

          useEffectSequencerStore.getState().advanceTrackStep(effectId)
        }
      }

      animationFrameId.current = requestAnimationFrame(playbackLoop)
    },
    [isPlaying, getMsPerStep, executeTrackAtStep, getAudioValue],
  )

  // ─── Start / stop ─────────────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying) {
      // Mutual exclusion: stop the old step sequencer
      const oldSeq = useSequencerStore.getState()
      if (oldSeq.isPlaying) oldSeq.stop()

      captureBaseValues()
      lastStepTime.current = performance.now()
      lastFrameTime.current = performance.now()
      trackLastStepTime.current = {}
      retrigTimers.current.forEach(clearTimeout)
      retrigTimers.current = []
      animationFrameId.current = requestAnimationFrame(playbackLoop)
    } else {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
      // Restore base values on stop
      retrigTimers.current.forEach(clearTimeout)
      retrigTimers.current = []
      trackLastStepTime.current = {}
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
