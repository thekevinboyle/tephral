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
  const trackEnvelopes = useRef<Record<string, number>>({})
  const trackWasAbove = useRef<Record<string, boolean>>({})
  const trackStepAccum = useRef<Record<string, number>>({})

  // ─── Timing ────────────────────────────────────────────────────────────

  const getMsPerStep = useCallback(() => {
    const beatsPerStep = RESOLUTION_BEATS[resolution] || 0.25
    return (60000 / bpm) * beatsPerStep
  }, [bpm, resolution])

  // ─── Audio value reader ──────────────────────────────────────────────

  const getAudioValue = useCallback((source: AudioReactiveSource): number => {
    const ar = useAudioReactiveStore.getState()
    const as = useAudioSourceStore.getState()

    // Band values from audioReactiveStore are processed with gain (default 2×)
    // and power curve (default ^2), which makes them run very hot.
    // Undo the power curve to get a more linear 0-1 range for threshold use.
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
    trackEnvelopes.current = {}
    trackWasAbove.current = {}
    trackStepAccum.current = {}
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
      const { tracks: currentTracks, currentStep, fillModeActive: fill } = state
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

      // === Audio-reactive tracks: check every frame ===
      if (dt > 0 && dt < 1) { // guard against first frame / tab switch
        for (const effectId of effectOrder) {
          const track = currentTracks[effectId]
          if (!track || !track.audioReactive.enabled) continue

          const config = track.audioReactive
          const rawValue = Math.min(1, getAudioValue(config.source) * config.gain)

          // Per-track envelope following (for UI meter + release tail on trigger detection)
          // Band sources (kick/low/mid/high) are already envelope-followed in useAudioReactive,
          // so use a fast attack to avoid double-smoothing the rising edge.
          const prev = trackEnvelopes.current[effectId] ?? 0
          const isBandSource = config.source !== 'rms' && config.source !== 'silence' && config.source !== 'peak'
          const effectiveAttackMs = isBandSource ? 1 : config.attackMs
          const attackAlpha = 1 - Math.exp(-(dt) / (effectiveAttackMs / 1000))
          const releaseAlpha = 1 - Math.exp(-(dt) / (config.releaseMs / 1000))
          const alpha = rawValue > prev ? attackAlpha : releaseAlpha
          const smoothed = prev + alpha * (rawValue - prev)
          trackEnvelopes.current[effectId] = smoothed

          // Update per-track audio level for UI meters
          state.setTrackAudioLevel(effectId, smoothed)

          // Rising-edge trigger detection — use raw value for bands (already smoothed upstream)
          const triggerValue = isBandSource ? rawValue : smoothed
          const wasAbove = trackWasAbove.current[effectId] ?? false
          const isAbove = triggerValue >= config.threshold

          if (isAbove && !wasAbove) {
            // Ensure effect is enabled so gate mix actually has a visible result
            const entry = EFFECT_PARAM_REGISTRY[effectId]
            if (entry && !entry.getEnabled()) {
              entry.setEnabled(true)
            }

            // Trigger! Accumulate step advancement
            const accum = (trackStepAccum.current[effectId] ?? 0) + config.speedMultiplier
            const stepsToAdvance = Math.floor(accum)
            trackStepAccum.current[effectId] = accum - stepsToAdvance

            // Re-read track for latest trackStep
            const latestTrack = useEffectSequencerStore.getState().tracks[effectId]
            if (latestTrack) {
              for (let i = 0; i < stepsToAdvance; i++) {
                const currentTrack = useEffectSequencerStore.getState().tracks[effectId]
                if (!currentTrack) break
                const stepIdx = currentTrack.trackStep % currentTrack.length
                executeTrackAtStep(effectId, currentTrack, stepIdx, fill, hasSolo)
                useEffectSequencerStore.getState().advanceTrackStep(effectId)
              }
            }
          }

          trackWasAbove.current[effectId] = isAbove
        }
      }

      // === BPM-driven tracks: original timing logic ===
      const msPerStep = getMsPerStep()

      if (timestamp - lastStepTime.current >= msPerStep) {
        lastStepTime.current = timestamp

        for (const effectId of effectOrder) {
          const track = currentTracks[effectId]
          if (!track) continue
          if (track.audioReactive.enabled) continue // handled above

          const stepIndex = currentStep % track.length
          executeTrackAtStep(effectId, track, stepIndex, fill, hasSolo)
        }

        // Advance global step counter (for non-audio-reactive tracks)
        useEffectSequencerStore.getState().advanceStep()
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
