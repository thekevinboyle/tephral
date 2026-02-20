import { useEffect, useRef } from 'react'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useMediaStore } from '../stores/mediaStore'

const THRESHOLD = 0.05

export function useAudioGate() {
  const tracks = useEffectSequencerStore((s) => s.tracks)
  const videoElement = useMediaStore((s) => s.videoElement)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const connectedElementRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const baseMixRef = useRef<Record<string, number>>({})
  const prevGatedRef = useRef<Set<string>>(new Set())

  const hasAnyGated = Object.values(tracks).some((t) => t.audioGate)

  useEffect(() => {
    if (!hasAnyGated || !videoElement) {
      // Restore mix values for any previously gated effects
      const ge = useGlitchEngineStore.getState()
      for (const effectId of prevGatedRef.current) {
        if (effectId in baseMixRef.current) {
          ge.setEffectMix(effectId, baseMixRef.current[effectId])
        }
      }
      baseMixRef.current = {}
      prevGatedRef.current = new Set()

      // Reset level display
      useEffectSequencerStore.getState().setAudioGateLevel(0)

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      // Tear down audio context if video element changed or removed
      if (!videoElement || connectedElementRef.current !== videoElement) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close()
          audioCtxRef.current = null
          analyserRef.current = null
          connectedElementRef.current = null
        }
      }
      return
    }

    let cancelled = false

    async function setup() {
      // Set up audio pipeline if needed (new video element or first time)
      if (connectedElementRef.current !== videoElement) {
        // Tear down old
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop())
          streamRef.current = null
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close()
          audioCtxRef.current = null
          analyserRef.current = null
          connectedElementRef.current = null
        }

        // Use captureStream to get audio from the video element
        // This doesn't interfere with the element's own audio output
        const stream = (videoElement as HTMLVideoElement & { captureStream(): MediaStream }).captureStream()
        const audioTracks = stream.getAudioTracks()
        if (audioTracks.length === 0) {
          console.warn('[AudioGate] Video has no audio tracks')
          return
        }

        const ctx = new AudioContext()
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }
        if (cancelled) {
          ctx.close()
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8

        const source = ctx.createMediaStreamSource(stream)
        source.connect(analyser)
        // Don't connect to destination — the video element itself handles playback

        audioCtxRef.current = ctx
        analyserRef.current = analyser
        streamRef.current = stream
        connectedElementRef.current = videoElement
      } else if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume()
      }

      if (cancelled) return

      const analyser = analyserRef.current
      if (!analyser) return

      // Capture base mix values for all currently gated effects
      const ge = useGlitchEngineStore.getState()
      const currentTracks = useEffectSequencerStore.getState().tracks
      for (const effectId of Object.keys(currentTracks)) {
        const track = currentTracks[effectId]
        if (track.audioGate && !(effectId in baseMixRef.current)) {
          baseMixRef.current[effectId] = ge.getEffectMix(effectId)
        }
      }

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      function loop() {
        if (cancelled) return

        analyser!.getByteTimeDomainData(dataArray)

        // Compute RMS amplitude (0-1) from waveform data
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128
          sum += v * v
        }
        const amplitude = Math.sqrt(sum / dataArray.length)

        // Write level to store for UI display
        useEffectSequencerStore.getState().setAudioGateLevel(amplitude)

        const ge = useGlitchEngineStore.getState()
        const currentTracks = useEffectSequencerStore.getState().tracks
        const gateOpen = amplitude > THRESHOLD

        for (const effectId of Object.keys(currentTracks)) {
          const track = currentTracks[effectId]
          if (!track.audioGate) continue

          // Capture base mix if not yet captured (track toggled on mid-stream)
          if (!(effectId in baseMixRef.current)) {
            baseMixRef.current[effectId] = ge.getEffectMix(effectId)
          }

          const base = baseMixRef.current[effectId] ?? 1
          ge.setEffectMix(effectId, gateOpen ? base : 0)
          prevGatedRef.current.add(effectId)
        }

        // Restore mix for effects that were gated but no longer are
        for (const effectId of prevGatedRef.current) {
          const track = currentTracks[effectId]
          if (!track || !track.audioGate) {
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
    }

    setup()

    return () => {
      cancelled = true
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [hasAnyGated, videoElement])
}
