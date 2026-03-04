import { useEffect, useRef } from 'react'
import { useMediaStore } from '../stores/mediaStore'
import { useAudioSourceStore, type AudioSourceType } from '../stores/audioSourceStore'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { detectBpmFromUrl } from '../utils/detectBpm'

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
      : activeSource === 'system'
        ? 'system'
        : 'mic'

  // Check if source is valid (can we connect?)
  const hasValidSource =
    (activeSource === 'video' && !!videoElement) ||
    (activeSource === 'file' && !!audioFileUrl) ||
    activeSource === 'mic' ||
    activeSource === 'system'

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

    // Mute video when another source is active so only one plays at a time
    if (videoElement) {
      (videoElement as HTMLVideoElement).muted = activeSource !== 'video'
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

          // Detect BPM from audio file (async, non-blocking)
          if (audioFileUrl) {
            detectBpmFromUrl(audioFileUrl).then((bpm) => {
              if (cancelled) return
              const store = useAudioSourceStore.getState()
              store.setAudioBpm(bpm)
              console.log('[UnifiedAudio] detected BPM:', bpm)
              if (bpm !== null && store.audioBpmSyncEnabled) {
                useEffectSequencerStore.getState().setBpm(bpm)
              }
            })
          }

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
        } else if (activeSource === 'system') {
          try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
              audio: true,
              video: true, // required by spec, discarded immediately
            })
            if (cancelled) {
              displayStream.getTracks().forEach((t) => t.stop())
              return
            }
            // Discard video tracks — we only need audio
            displayStream.getVideoTracks().forEach((t) => t.stop())
            const audioTracks = displayStream.getAudioTracks()
            if (audioTracks.length === 0) {
              console.warn('[UnifiedAudio] System capture has no audio tracks')
              displayStream.getTracks().forEach((t) => t.stop())
              return
            }
            // Store stream for cleanup
            useAudioSourceStore.getState().setSystemStream(displayStream)
            // Auto-revert when user clicks "Stop sharing" in browser UI
            audioTracks[0].addEventListener('ended', () => {
              console.log('[UnifiedAudio] System audio track ended (user stopped sharing)')
              useAudioSourceStore.getState().setActiveSource('video')
            })
            stream = displayStream
            console.log('[UnifiedAudio] System audio capture started')
          } catch (err) {
            console.warn('[UnifiedAudio] System audio capture denied:', err)
            // Revert to video on cancel
            useAudioSourceStore.getState().setActiveSource('video')
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
      // Unmute video on cleanup so it's ready when switching back
      if (videoElement) {
        (videoElement as HTMLVideoElement).muted = false
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
    useAudioSourceStore.getState().setAudioBpm(null)
    // Clean up system audio capture stream
    const systemStream = useAudioSourceStore.getState().systemStream
    if (systemStream) {
      systemStream.getTracks().forEach((t) => t.stop())
      useAudioSourceStore.getState().setSystemStream(null)
    }
    if (fileElementRef.current) {
      fileElementRef.current.pause()
      fileElementRef.current.src = ''
      fileElementRef.current = null
      useAudioSourceStore.getState().setAudioFileElement(null)
    }
    currentSourceRef.current = null
  }
}
