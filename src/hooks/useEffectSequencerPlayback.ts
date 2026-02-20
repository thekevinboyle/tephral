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

  // ─── Timing ────────────────────────────────────────────────────────────

  const getMsPerStep = useCallback(() => {
    const beatsPerStep = RESOLUTION_BEATS[resolution] || 0.25
    return (60000 / bpm) * beatsPerStep
  }, [bpm, resolution])

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

      const entry = EFFECT_PARAM_REGISTRY[effectId]
      if (!entry) continue

      // Dynamically capture enabled/mix for newly added effects during playback
      if (!(effectId in prePlayEnabled.current)) {
        const ge = useGlitchEngineStore.getState()
        prePlayEnabled.current[effectId] = entry.getEnabled()
        baseMix.current[effectId] = ge.getEffectMix(effectId)
      }

      if (!prePlayEnabled.current[effectId]) continue

      // Mute/solo: bypass the effect
      const isMuted = track.muted || (hasSolo && !track.soloed)
      if (isMuted) {
        if (!muteBypassed.current.has(effectId)) {
          useGlitchEngineStore.getState().setEffectBypassed(effectId, true)
          muteBypassed.current.add(effectId)
        }
        continue
      } else if (muteBypassed.current.has(effectId)) {
        // Was muted, now unmuted — remove bypass
        useGlitchEngineStore.getState().setEffectBypassed(effectId, false)
        muteBypassed.current.delete(effectId)
      }

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
      // Skip if audio gate is active — it controls mix independently
      if (track.mode === 'gate' && !track.audioGate && !track.midiGate) {
        ge.setEffectMix(effectId, shouldFire ? origMix : 0)
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
