import { useRef, useCallback, useEffect } from 'react'
import { useSequencerStore } from '../stores/sequencerStore'

export function useAudioAnalysis() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number>(0)

  const { audioReactive, setAudioLevel } = useSequencerStore()

  // Get audio amplitude (0-1)
  const getAmplitude = useCallback((): number => {
    if (!analyserRef.current || !dataArrayRef.current) return 0

    analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>)

    // Calculate average amplitude
    let sum = 0
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      sum += dataArrayRef.current[i]
    }
    const average = sum / dataArrayRef.current.length

    // Normalize to 0-1
    return average / 255
  }, [])

  // Start audio capture
  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      sourceRef.current = source

      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)

      console.log('Audio analysis started')
    } catch (err) {
      console.error('Failed to start audio capture:', err)
    }
  }, [])

  // Stop audio capture
  const stopAudio = useCallback(() => {
    cancelAnimationFrame(animationFrameRef.current)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    dataArrayRef.current = null
    setAudioLevel(0)

    console.log('Audio analysis stopped')
  }, [setAudioLevel])

  // Analysis loop
  useEffect(() => {
    if (!audioReactive) {
      stopAudio()
      return
    }

    startAudio()

    const analyze = () => {
      const amplitude = getAmplitude()
      setAudioLevel(amplitude)
      animationFrameRef.current = requestAnimationFrame(analyze)
    }

    // Wait for audio to initialize before starting loop
    const timeout = setTimeout(() => {
      analyze()
    }, 100)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [audioReactive, startAudio, stopAudio, getAmplitude, setAudioLevel])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [stopAudio])

  return {
    getAmplitude,
  }
}
