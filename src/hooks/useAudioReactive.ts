import { useEffect, useRef } from 'react'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'
import { useAudioSourceStore } from '../stores/audioSourceStore'

export function useAudioReactive() {
  const enabled = useAudioReactiveStore((s) => s.enabled)
  const rafRef = useRef<number | null>(null)

  // Persistent state across frames
  const prevFreqDataRef = useRef<Float32Array | null>(null)
  const smoothedSubRef = useRef(0)
  const smoothedMidRef = useRef(0)
  const smoothedHighRef = useRef(0)
  const currentHitRef = useRef(0)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      // Reset band values when disabled
      useAudioReactiveStore.getState().updateBands(0, 0, 0, 0)
      return
    }

    let cancelled = false

    function loop() {
      if (cancelled) return

      const audioSource = useAudioSourceStore.getState()
      const analyser = audioSource.reactiveAnalyser
      const ctx = audioSource.audioContext

      if (!analyser || !ctx) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const now = performance.now()
      const dt = lastTimeRef.current > 0 ? (now - lastTimeRef.current) / 1000 : 1 / 60
      lastTimeRef.current = now

      const config = useAudioReactiveStore.getState()
      const { gain, attackMs, releaseMs, curve, transientThreshold, transientDecay } = config

      const fftSize = analyser.fftSize
      const sampleRate = ctx.sampleRate
      const binCount = analyser.frequencyBinCount // fftSize / 2

      // Read frequency data
      const frequencyData = new Uint8Array(binCount)
      analyser.getByteFrequencyData(frequencyData)

      // Compute bin boundaries
      const binHz = sampleRate / fftSize
      const subLow = Math.floor(20 / binHz)
      const subHigh = Math.floor(200 / binHz)
      const midLow = subHigh
      const midHigh = Math.floor(2000 / binHz)
      const highLow = midHigh
      const highHigh = binCount - 1

      // Sum magnitudes per band and normalize to 0-1
      let subSum = 0, subCount = 0
      for (let i = subLow; i <= Math.min(subHigh, highHigh); i++) {
        subSum += frequencyData[i]
        subCount++
      }
      let midSum = 0, midCount = 0
      for (let i = midLow; i <= Math.min(midHigh, highHigh); i++) {
        midSum += frequencyData[i]
        midCount++
      }
      let highSum = 0, highCount = 0
      for (let i = highLow; i <= highHigh; i++) {
        highSum += frequencyData[i]
        highCount++
      }

      const rawSub = subCount > 0 ? Math.min(1, (subSum / subCount / 255) * gain) : 0
      const rawMid = midCount > 0 ? Math.min(1, (midSum / midCount / 255) * gain) : 0
      const rawHigh = highCount > 0 ? Math.min(1, (highSum / highCount / 255) * gain) : 0

      // Envelope follow with asymmetric attack/release
      const alphaAttack = 1 - Math.exp(-dt / (attackMs / 1000))
      const alphaRelease = 1 - Math.exp(-dt / (releaseMs / 1000))

      function envelopeFollow(raw: number, smoothed: number): number {
        const alpha = raw > smoothed ? alphaAttack : alphaRelease
        return smoothed + alpha * (raw - smoothed)
      }

      smoothedSubRef.current = envelopeFollow(rawSub, smoothedSubRef.current)
      smoothedMidRef.current = envelopeFollow(rawMid, smoothedMidRef.current)
      smoothedHighRef.current = envelopeFollow(rawHigh, smoothedHighRef.current)

      // Apply power curve
      const sub = Math.pow(smoothedSubRef.current, curve)
      const mid = Math.pow(smoothedMidRef.current, curve)
      const high = Math.pow(smoothedHighRef.current, curve)

      // Transient detection via spectral flux
      const currentFreqFloat = new Float32Array(binCount)
      for (let i = 0; i < binCount; i++) {
        currentFreqFloat[i] = frequencyData[i] / 255
      }

      let flux = 0
      if (prevFreqDataRef.current) {
        for (let i = 0; i < binCount; i++) {
          const diff = currentFreqFloat[i] - prevFreqDataRef.current[i]
          if (diff > 0) flux += diff
        }
        flux /= binCount // normalize
      }
      prevFreqDataRef.current = currentFreqFloat

      if (flux > transientThreshold) {
        currentHitRef.current = 1
      }
      currentHitRef.current *= (1 - transientDecay)
      const hit = Math.min(1, currentHitRef.current)

      // Single batched store write
      useAudioReactiveStore.getState().updateBands(sub, mid, high, hit)

      rafRef.current = requestAnimationFrame(loop)
    }

    lastTimeRef.current = 0
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelled = true
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [enabled])
}
