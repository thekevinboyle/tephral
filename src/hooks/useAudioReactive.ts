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

  // Auto-gain normalization state (per-band)
  const rollingPeakSubRef = useRef(0.01)
  const rollingPeakMidRef = useRef(0.01)
  const rollingPeakHighRef = useRef(0.01)
  const noiseFloorSubRef = useRef(0)
  const noiseFloorMidRef = useRef(0)
  const noiseFloorHighRef = useRef(0)

  // Auto transient detection state
  const rollingFluxAvgRef = useRef(0)
  const rollingFluxPeakRef = useRef(0.01)

  useEffect(() => {
    if (!enabled) {
      // Reset band values when disabled
      useAudioReactiveStore.getState().updateBands(0, 0, 0, 0, 0)
      // Reset auto-gain refs
      rollingPeakSubRef.current = 0.01
      rollingPeakMidRef.current = 0.01
      rollingPeakHighRef.current = 0.01
      noiseFloorSubRef.current = 0
      noiseFloorMidRef.current = 0
      noiseFloorHighRef.current = 0
      rollingFluxAvgRef.current = 0
      rollingFluxPeakRef.current = 0.01
      return
    }

    let cancelled = false

    // Auto-normalize a raw band value using rolling peak + noise floor
    function autoNormalize(
      raw: number,
      peakRef: React.MutableRefObject<number>,
      floorRef: React.MutableRefObject<number>,
      dt: number,
      sensitivity: number,
    ): number {
      // Rolling peak: instant attack, 5-second half-life decay
      const peakDecay = Math.pow(0.5, dt / 5.0)
      if (raw > peakRef.current) {
        peakRef.current = raw
      } else {
        peakRef.current *= peakDecay
      }
      peakRef.current = Math.max(peakRef.current, 0.001)

      // Noise floor: slow rise (10s), faster drop (2s)
      if (raw < floorRef.current) {
        const noiseDrop = Math.pow(0.5, dt / 2.0)
        floorRef.current += (1 - noiseDrop) * (raw - floorRef.current)
      } else {
        const noiseRise = Math.pow(0.5, dt / 10.0)
        floorRef.current += (1 - noiseRise) * (raw - floorRef.current)
      }
      // Cap noise floor at 80% of rolling peak
      floorRef.current = Math.min(floorRef.current, peakRef.current * 0.8)

      // Normalize: subtract floor, scale by peak range
      const range = peakRef.current - floorRef.current
      const cleaned = Math.max(0, raw - floorRef.current)
      const normalized = range > 0.001 ? cleaned / range : 0
      const autoGain = 0.5 + sensitivity * 1.5 // 0-1 → 0.5x-2.0x
      return Math.min(1, normalized * autoGain)
    }

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
      const { autoMode, sensitivity, gain, attackMs, releaseMs, curve, transientThreshold, transientDecay } = config

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

      // Sum magnitudes per band
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

      // Raw unnormalized band averages (0-1 from byte data)
      const rawSubUnnorm = subCount > 0 ? subSum / subCount / 255 : 0
      const rawMidUnnorm = midCount > 0 ? midSum / midCount / 255 : 0
      const rawHighUnnorm = highCount > 0 ? highSum / highCount / 255 : 0

      let rawSub: number, rawMid: number, rawHigh: number

      if (autoMode) {
        // Auto mode: adaptive normalization per band
        rawSub = autoNormalize(rawSubUnnorm, rollingPeakSubRef, noiseFloorSubRef, dt, sensitivity)
        rawMid = autoNormalize(rawMidUnnorm, rollingPeakMidRef, noiseFloorMidRef, dt, sensitivity)
        rawHigh = autoNormalize(rawHighUnnorm, rollingPeakHighRef, noiseFloorHighRef, dt, sensitivity)
      } else {
        // Manual mode: fixed gain multiplier (legacy behavior)
        rawSub = Math.min(1, rawSubUnnorm * gain)
        rawMid = Math.min(1, rawMidUnnorm * gain)
        rawHigh = Math.min(1, rawHighUnnorm * gain)
      }

      // Envelope follow with asymmetric attack/release (both modes)
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
      let sub: number, mid: number, high: number
      if (autoMode) {
        const autoCurve = 3.0 - sensitivity * 2.2 // 0-1 → 3.0-0.8
        sub = Math.pow(smoothedSubRef.current, autoCurve)
        mid = Math.pow(smoothedMidRef.current, autoCurve)
        high = Math.pow(smoothedHighRef.current, autoCurve)
      } else {
        sub = Math.pow(smoothedSubRef.current, curve)
        mid = Math.pow(smoothedMidRef.current, curve)
        high = Math.pow(smoothedHighRef.current, curve)
      }

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

      if (autoMode) {
        // Adaptive transient threshold
        const fluxDecay = Math.pow(0.5, dt / 3.0) // 3s half-life
        rollingFluxAvgRef.current = rollingFluxAvgRef.current * fluxDecay + flux * (1 - fluxDecay)

        if (flux > rollingFluxPeakRef.current) {
          rollingFluxPeakRef.current = flux
        } else {
          rollingFluxPeakRef.current *= Math.pow(0.5, dt / 5.0) // 5s half-life
        }
        rollingFluxPeakRef.current = Math.max(rollingFluxPeakRef.current, 0.001)

        const fluxRange = rollingFluxPeakRef.current - rollingFluxAvgRef.current
        const autoThreshold = rollingFluxAvgRef.current + fluxRange * (1.0 - sensitivity * 0.7)

        if (flux > autoThreshold) {
          currentHitRef.current = 1
        }
      } else {
        // Fixed threshold (legacy)
        if (flux > transientThreshold) {
          currentHitRef.current = 1
        }
      }

      currentHitRef.current *= (1 - transientDecay)
      const hit = Math.min(1, currentHitRef.current)

      // Single batched store write
      const rms = (sub + mid + high) / 3
      useAudioReactiveStore.getState().updateBands(sub, mid, high, hit, rms)

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
