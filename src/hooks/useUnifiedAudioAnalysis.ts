import { useEffect, useRef } from 'react'
import { useMediaStore } from '../stores/mediaStore'
import { useAudioSourceStore, type AudioSourceType } from '../stores/audioSourceStore'

const WAVEFORM_SIZE = 128

export function useUnifiedAudioAnalysis() {
  const videoElement = useMediaStore((s) => s.videoElement)
  const activeSource = useAudioSourceStore((s) => s.activeSource)
  const audioFileUrl = useAudioSourceStore((s) => s.audioFileUrl)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceNodeRef = useRef<AudioNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const currentSourceRef = useRef<{ type: AudioSourceType; key: string } | null>(null)
  const fileElementRef = useRef<HTMLAudioElement | null>(null)

  // Build a key that changes when we need to reconnect
  const sourceKey = activeSource === 'video'
    ? `video-${videoElement ? 'ok' : 'none'}`
    : activeSource === 'file'
      ? `file-${audioFileUrl ?? 'none'}`
      : 'mic'

  // Check if source is valid (can we connect?)
  const hasValidSource =
    (activeSource === 'video' && !!videoElement) ||
    (activeSource === 'file' && !!audioFileUrl) ||
    activeSource === 'mic'

  useEffect(() => {
    if (!hasValidSource) {
      // No valid source — reset display and tear down
      useAudioSourceStore.getState().setAmplitude(0)
      useAudioSourceStore.getState().setWaveformData(Array(WAVEFORM_SIZE).fill(128))
      // (no audio gate cleanup needed)

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      teardown()
      return
    }

    let cancelled = false

    async function setup() {
      console.log('[UnifiedAudio] setup() called', { activeSource, sourceKey, hasValidSource })

      const needsReconnect =
        !currentSourceRef.current ||
        currentSourceRef.current.type !== activeSource ||
        currentSourceRef.current.key !== sourceKey

      if (needsReconnect) {
        console.log('[UnifiedAudio] needs reconnect, tearing down old source')
        teardown()

        let stream: MediaStream | null = null

        if (activeSource === 'video') {
          if (!videoElement) return
          stream = (videoElement as HTMLVideoElement & { captureStream(): MediaStream }).captureStream()
          const audioTracks = stream.getAudioTracks()
          if (audioTracks.length === 0) {
            console.warn('[UnifiedAudio] Video has no audio tracks')
            return
          }
        } else if (activeSource === 'file') {
          if (!audioFileUrl) return
          const audio = new Audio(audioFileUrl)
          audio.loop = true
          try {
            await audio.play()
            console.log('[UnifiedAudio] audio.play() succeeded')
          } catch (err) {
            console.warn('[UnifiedAudio] Failed to play audio file:', err)
            return
          }
          if (cancelled) {
            audio.pause()
            audio.src = ''
            return
          }
          fileElementRef.current = audio
          useAudioSourceStore.getState().setAudioFileElement(audio)

          // Use createMediaElementSource for file — more reliable than captureStream
          const ctx = new AudioContext()
          if (ctx.state === 'suspended') await ctx.resume()
          if (cancelled) { ctx.close(); audio.pause(); audio.src = ''; return }

          const analyser = ctx.createAnalyser()
          analyser.fftSize = 256
          analyser.smoothingTimeConstant = 0.8

          const source = ctx.createMediaElementSource(audio)
          source.connect(analyser)
          source.connect(ctx.destination) // so audio still plays through speakers

          // Reactive analyser for FFT band splitting
          const reactiveAnalyser = ctx.createAnalyser()
          reactiveAnalyser.fftSize = 2048
          reactiveAnalyser.smoothingTimeConstant = 0.4
          source.connect(reactiveAnalyser)
          useAudioSourceStore.getState().setReactiveAnalyser(reactiveAnalyser)
          useAudioSourceStore.getState().setAudioContext(ctx)

          console.log('[UnifiedAudio] file pipeline connected: source → analyser + destination')

          audioCtxRef.current = ctx
          analyserRef.current = analyser
          sourceNodeRef.current = source
          currentSourceRef.current = { type: activeSource, key: sourceKey }
          // Skip the shared stream→source path below
          stream = null
        } else if (activeSource === 'mic') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          } catch (err) {
            console.warn('[UnifiedAudio] Mic access denied:', err)
            return
          }
        }

        if (cancelled) return

        // For video/mic: create AudioContext + analyser from the stream
        // (file source already set up its own pipeline above)
        if (stream) {
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

          // Reactive analyser for FFT band splitting
          const reactiveAnalyser = ctx.createAnalyser()
          reactiveAnalyser.fftSize = 2048
          reactiveAnalyser.smoothingTimeConstant = 0.4
          source.connect(reactiveAnalyser)
          useAudioSourceStore.getState().setReactiveAnalyser(reactiveAnalyser)
          useAudioSourceStore.getState().setAudioContext(ctx)

          audioCtxRef.current = ctx
          analyserRef.current = analyser
          sourceNodeRef.current = source
          streamRef.current = stream
          currentSourceRef.current = { type: activeSource, key: sourceKey }
        }
      } else if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume()
      }

      if (cancelled) return

      const analyser = analyserRef.current
      if (!analyser) return

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      function loop() {
        if (cancelled) return

        analyser!.getByteTimeDomainData(dataArray)

        // Compute RMS amplitude (0-1)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128
          sum += v * v
        }
        const rawAmplitude = Math.sqrt(sum / dataArray.length)

        // Apply sensitivity (gain multiplier)
        const { gateSensitivity } = useAudioSourceStore.getState()
        const amplitude = Math.min(1, rawAmplitude * gateSensitivity)

        // Always write amplitude + waveform for visualization
        useAudioSourceStore.getState().setAmplitude(amplitude)

        const waveform: number[] = new Array(WAVEFORM_SIZE)
        const ratio = dataArray.length / WAVEFORM_SIZE
        for (let i = 0; i < WAVEFORM_SIZE; i++) {
          waveform[i] = dataArray[Math.floor(i * ratio)]
        }
        useAudioSourceStore.getState().setWaveformData(waveform)

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
      teardown()
    }
  }, [hasValidSource, activeSource, sourceKey, videoElement, audioFileUrl])

  function teardown() {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
      analyserRef.current = null
    }
    useAudioSourceStore.getState().setReactiveAnalyser(null)
    useAudioSourceStore.getState().setAudioContext(null)
    if (fileElementRef.current) {
      fileElementRef.current.pause()
      fileElementRef.current.src = ''
      fileElementRef.current = null
      useAudioSourceStore.getState().setAudioFileElement(null)
    }
    currentSourceRef.current = null
  }
}
