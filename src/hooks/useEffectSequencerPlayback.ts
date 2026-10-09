import { useEffect, useRef, useCallback } from 'react'
import { useEffectSequencerStore, defaultTrackLine, type EffectTrack, type TrackAudioReactiveConfig, type TrackLine } from '../stores/effectSequencerStore'
import { useSequencerStore } from '../stores/sequencerStore'
import { useRoutingStore } from '../stores/routingStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'
import { useAudioSourceStore } from '../stores/audioSourceStore'
import { EFFECT_PARAM_REGISTRY } from '../config/effectParams'
import { readModBase } from '../effects/trackBandModulation'
import { captureUserMix, clearGates, clearLines, clearMaster, gateOpenLevel, getMasterLevel, isGateOpen, isLineActive, releaseGate, releaseLine, setGateOpen, setLineLevel, setMasterLevel } from '../effects/mixModulation'
import { lineLevel } from '../effects/lines/lineLevel'
import { clearLinePhases, deleteLinePhase, noteLinePass, setLinePhase, setMasterPhase } from '../effects/lines/linePhase'

// A line with every field (an older line lacks amount, beats and gridY); the phase of a `len`-beat loop at beat `b`
const lineOf = (l: TrackLine | undefined): TrackLine => (l && l.amount !== undefined && l.beats !== undefined && l.gridY !== undefined ? l : { ...defaultTrackLine(), ...l })
const phaseOf = (b: number, len: number) => (((b % len) + len) % len) / len

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
  // Base mix values snapshot for gate mode (gate uses mix=0 instead of setEnabled): the user's own value, never a
  // modulated one (mixModulation.ts), so Stop restores what the user set
  const baseMix = useRef<Record<string, number>>({})
  // Pre-lock values: captured right before a lock is applied, used to restore when lock goes away
  // { effectId: { paramId: value } }
  const preLockValues = useRef<Record<string, Record<string, number | string>>>({})
  // Track which param ids were locked on the previous step (per effect)
  const prevLockedParams = useRef<Record<string, Set<string>>>({})
  // Track which effects were bypassed by mute/solo (to restore on stop/unmute)
  const muteBypassed = useRef<Set<string>>(new Set())
  const lineIds = useRef<Set<string>>(new Set()) // tracks the line pass drove last frame
  const lineIdsNext = useRef<Set<string>>(new Set()) // reused each frame and swapped with lineIds (no per-frame allocation)
  const beats = useRef(0) // transport beats since Play: every line's (and the master's) phase comes from it
  const masterWasActive = useRef(false) // the master scaled the open Steps tracks last frame
  const started = useRef(false) // Play's start work ran (a BPM change re-runs the effect below mid-play)

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

  const getAudioValue = useCallback((effectId: string, config: TrackAudioReactiveConfig): number => {
    const ar = useAudioReactiveStore.getState()
    const as = useAudioSourceStore.getState()

    // Per-track frequency window (normal case): already normalised + enveloped.
    if (config.band) {
      const v = ar.trackBands[effectId] ?? 0
      if (ar.autoMode) return v
      const invCurve = ar.curve > 0 ? 1 / ar.curve : 1
      return Math.pow(Math.min(1, Math.max(0, v)), invCurve)
    }

    // Legacy path (band: null): fixed source selector
    const source = config.source

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
      mixSnapshot[effectId] = captureUserMix(effectId, ge.getEffectMix(effectId))
    }

    clearGates()
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
    // No gate drives a mix any more: Dry/wet modulation writes effectMix directly again
    clearGates()

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
      baseMix.current[effectId] = captureUserMix(effectId, ge.getEffectMix(effectId))
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

    // Line mode (spec §2): the step data (locks, gates, probability, fill) does not run; the line pass owns the mix
    if (track.mode === 'line') { releaseGate(effectId); return }

    const step = track.steps[stepIndex]
    const ge = useGlitchEngineStore.getState()

    // Condition check
    if (step.condition === 'fill' && !fill) {
      if (track.mode === 'gate') {
        ge.setEffectMix(effectId, 0)
        setGateOpen(effectId, false)
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
          // Save the band-mod base, not the modulated value (R16)
          saved[pid] = readModBase(effectId, pid) ?? param.read()
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
    // An open step plays at the modulated Dry/wet when a route drives it, else at the user's base
    if (track.mode === 'gate' && !track.midiGate) {
      ge.setEffectMix(effectId, shouldFire ? gateOpenLevel(effectId, origMix) * getMasterLevel() : 0)
      setGateOpen(effectId, shouldFire)
    } else {
      releaseGate(effectId)
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
      // The store's bpm (not the closure's), so a mid-play BPM change bends the beat count without a jump
      beats.current += (Math.max(0, dt) * 1000 * useEffectSequencerStore.getState().bpm) / 60000 // first frame can be < 0

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
          const raw = getAudioValue(effectId, config)

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
            useGlitchEngineStore.getState().setEffectMix(effectId, gateOpenLevel(effectId, baseMix.current[effectId] ?? 1)) // audio gates ignore the master
            setGateOpen(effectId, true)

            const latestTrack = useEffectSequencerStore.getState().tracks[effectId]
            if (latestTrack) {
              const stepIdx = latestTrack.trackStep % latestTrack.length
              executeTrackAtStep(effectId, latestTrack, stepIdx, fill, hasSolo)
              useEffectSequencerStore.getState().advanceTrackStep(effectId)
            }
          } else if (!isAbove && wasAbove) {
            // Kick ended — disable effect
            useGlitchEngineStore.getState().setEffectMix(effectId, 0)
            setGateOpen(effectId, false)
          }

          trackWasAbove.current[effectId] = isAbove
        }
      }

      // === BPM-driven tracks: per-track time-scaled timing ===
      const baseMsPerStep = getMsPerStep()

      // Advance global currentStep at base rate (for UI display)
      // Accumulate (no rounding up to whole frames, so step 0 stays on the warp loop's x = 0);
      // resync if more than 4 steps behind (e.g. the tab was in the background).
      if (timestamp - lastStepTime.current >= baseMsPerStep) {
        lastStepTime.current = timestamp - lastStepTime.current > 4 * baseMsPerStep ? timestamp : lastStepTime.current + baseMsPerStep
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
          trackLastStepTime.current[effectId] = elapsed > 4 * trackMsPerStep ? timestamp : trackLastStepTime.current[effectId] + trackMsPerStep

          const stepIndex = track.trackStep % track.length
          executeTrackAtStep(effectId, track, stepIndex, fill, hasSolo)

          // Schedule retrigs within this step
          const step = track.steps[stepIndex]
          if (track.mode !== 'line' && step && step.retrig > 0) {
            const subInterval = trackMsPerStep / step.retrig
            for (let r = 1; r < step.retrig; r++) {
              const timerId = window.setTimeout(() => {
                const latestTrack = useEffectSequencerStore.getState().tracks[effectId]
                if (!latestTrack) return
                const ge = useGlitchEngineStore.getState()
                if (latestTrack.mode === 'gate' && !latestTrack.midiGate) {
                  ge.setEffectMix(effectId, gateOpenLevel(effectId, baseMix.current[effectId] ?? 1) * getMasterLevel())
                  setGateOpen(effectId, true)
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

      // === Lines (lines editor spec §2–§3): every line's phase comes from the beat counter; Dry/wet = ceiling × line × master ===
      {
        const { tracks: latest, master } = useEffectSequencerStore.getState() // trackStep advanced above
        const ge = useGlitchEngineStore.getState()
        const ml = lineOf(master.line)
        const mPhase = phaseOf(beats.current, ml.beats)
        setMasterPhase(mPhase)
        const mLevel = master.enabled ? lineLevel(ml.points, mPhase, ml.skew, ml.amount) : 1
        setMasterLevel(mLevel)
        const seen = lineIdsNext.current
        seen.clear()
        for (const effectId of effectOrder) {
          const track = latest[effectId]
          if (!track || track.mode !== 'line') continue
          if (import.meta.env.DEV) noteLinePass()
          const entry = EFFECT_PARAM_REGISTRY[effectId]
          if (!entry) continue
          if (!(effectId in prePlayEnabled.current)) {
            prePlayEnabled.current[effectId] = entry.getEnabled()
            baseMix.current[effectId] = captureUserMix(effectId, ge.getEffectMix(effectId))
          }
          if (!prePlayEnabled.current[effectId]) continue
          if (track.muted || (hasSolo && !track.soloed)) continue // executeTrackAtStep bypasses it
          if (track.midiGate || track.audioGate || track.audioReactive.enabled) continue // those gates own the mix
          seen.add(effectId)
          const line = lineOf(track.line)
          const phase = phaseOf(beats.current, line.beats)
          const level = lineLevel(line.points, phase, line.skew, line.amount)
          setLinePhase(effectId, phase)
          setLineLevel(effectId, level)
          const mix = gateOpenLevel(effectId, baseMix.current[effectId] ?? 1) * level * mLevel
          if (Math.abs((ge.effectMix[effectId] ?? 1) - mix) > 1e-4) ge.setEffectMix(effectId, mix)
        }
        // Tracks the line drove last frame but not now: left Line mode, removed, muted or gated. Hand the mix back.
        for (const id of lineIds.current) {
          if (seen.has(id)) continue
          deleteLinePhase(id)
          if (!isLineActive(id)) continue
          releaseLine(id)
          const t = latest[id]
          const gatedElsewhere = !!t && (t.mode === 'gate' || t.midiGate || t.audioGate || t.audioReactive.enabled)
          if (!gatedElsewhere && id in baseMix.current) ge.setEffectMix(id, gateOpenLevel(id, baseMix.current[id]))
        }
        lineIdsNext.current = lineIds.current
        lineIds.current = seen
        // Open Steps tracks follow the master every frame while it is active, plus one frame after it returns to 1
        const masterActive = mLevel !== 1
        if (masterActive || masterWasActive.current) {
          for (const effectId of effectOrder) {
            const track = latest[effectId]
            if (!track || track.mode !== 'gate' || !isGateOpen(effectId)) continue
            if (track.muted || (hasSolo && !track.soloed)) continue
            if (track.midiGate || track.audioGate || track.audioReactive.enabled) continue
            const mix = gateOpenLevel(effectId, baseMix.current[effectId] ?? 1) * mLevel
            if (Math.abs((ge.effectMix[effectId] ?? 1) - mix) > 1e-4) ge.setEffectMix(effectId, mix)
          }
        }
        masterWasActive.current = masterActive
      }

      animationFrameId.current = requestAnimationFrame(playbackLoop)
    },
    [isPlaying, getMsPerStep, executeTrackAtStep, getAudioValue],
  )

  // ─── Start / stop ─────────────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying) {
      // Start work only on Play: a BPM change mid-play re-runs this effect (new playbackLoop) and must keep the
      // beat count, the step timers and the pre-play mix snapshot
      if (!started.current) {
        started.current = true
        // Mutual exclusion: stop the old step sequencer
        const oldSeq = useSequencerStore.getState()
        if (oldSeq.isPlaying) oldSeq.stop()

        captureBaseValues()
        lastStepTime.current = performance.now()
        lastFrameTime.current = performance.now()
        trackLastStepTime.current = {}
        retrigTimers.current.forEach(clearTimeout)
        retrigTimers.current = []
        beats.current = 0
      }
      animationFrameId.current = requestAnimationFrame(playbackLoop)
    } else {
      started.current = false
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
      // Restore base values on stop
      retrigTimers.current.forEach(clearTimeout)
      retrigTimers.current = []
      trackLastStepTime.current = {}
      restoreBaseValues()
      clearLines()
      clearLinePhases() // also nulls the master phase
      clearMaster()
      masterWasActive.current = false
      lineIds.current.clear()
      lineIdsNext.current.clear()
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
