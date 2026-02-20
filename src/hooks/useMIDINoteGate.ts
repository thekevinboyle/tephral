import { useEffect, useRef } from 'react'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useMIDIStore } from '../stores/midiStore'

export function useMIDINoteGate() {
  const tracks = useEffectSequencerStore((s) => s.tracks)

  const rafRef = useRef<number | null>(null)
  const baseMixRef = useRef<Record<string, number>>({})
  const prevGatedRef = useRef<Set<string>>(new Set())

  const hasAnyMidiGated = Object.values(tracks).some((t) => t.midiGate)

  useEffect(() => {
    if (!hasAnyMidiGated) {
      // Restore mix values for previously gated effects
      const ge = useGlitchEngineStore.getState()
      for (const effectId of prevGatedRef.current) {
        if (effectId in baseMixRef.current) {
          ge.setEffectMix(effectId, baseMixRef.current[effectId])
        }
      }
      baseMixRef.current = {}
      prevGatedRef.current = new Set()

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    // Capture base mix values
    const ge = useGlitchEngineStore.getState()
    const currentTracks = useEffectSequencerStore.getState().tracks
    for (const effectId of Object.keys(currentTracks)) {
      const track = currentTracks[effectId]
      if (track.midiGate && !(effectId in baseMixRef.current)) {
        baseMixRef.current[effectId] = ge.getEffectMix(effectId)
      }
    }

    function loop() {
      const midiState = useMIDIStore.getState()
      const ge = useGlitchEngineStore.getState()
      const currentTracks = useEffectSequencerStore.getState().tracks

      for (const effectId of Object.keys(currentTracks)) {
        const track = currentTracks[effectId]
        if (!track.midiGate) continue

        // Capture base if not yet captured
        if (!(effectId in baseMixRef.current)) {
          baseMixRef.current[effectId] = ge.getEffectMix(effectId)
        }

        const mappedNote = midiState.trackNoteMap[effectId]
        const noteIsOn = mappedNote !== undefined && midiState.noteStates[mappedNote]

        const base = baseMixRef.current[effectId] ?? 1
        ge.setEffectMix(effectId, noteIsOn ? base : 0)
        prevGatedRef.current.add(effectId)
      }

      // Restore mix for effects no longer gated
      for (const effectId of prevGatedRef.current) {
        const track = currentTracks[effectId]
        if (!track || !track.midiGate) {
          if (effectId in baseMixRef.current) {
            ge.setEffectMix(effectId, baseMixRef.current[effectId])
            delete baseMixRef.current[effectId]
          }
          prevGatedRef.current.delete(effectId)
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      // Restore mix values on cleanup
      const ge = useGlitchEngineStore.getState()
      for (const effectId of prevGatedRef.current) {
        if (effectId in baseMixRef.current) {
          ge.setEffectMix(effectId, baseMixRef.current[effectId])
        }
      }
      baseMixRef.current = {}
      prevGatedRef.current = new Set()
    }
  }, [hasAnyMidiGated])
}
