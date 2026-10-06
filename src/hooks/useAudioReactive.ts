import { useEffect, useRef } from 'react'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'
import { useAudioSourceStore } from '../stores/audioSourceStore'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { bandToBins, bandAverage } from '../utils/audioBands'

// Per-track band gating (R17): raw byte-average below this is treated as silence.
// R17 named 0.02 (≈5/255), but measured −50 dBFS broadband noise reads ~0.035 mean
// and up to ~0.095 peak in the 6-bin KICK window of the 4096-point band analyser
// (byte scale spans −100…−30 dB per bin), so 0.02 gates nothing. 0.15 (≈38/255,
// ≈ −89.5 dB per bin) clears that floor with margin; real hits read 0.5–1.0.
const TRACK_BAND_FLOOR = 0.15
// Per-track rolling-peak minimum (globals use 0.001)
const TRACK_MIN_PEAK = 0.05

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

  // Per-track band normaliser + envelope state, keyed by effectId
  const trackStateRef = useRef<Record<string, { peak: { current: number }; floor: { current: number }; smoothed: number }>>({})

  // True while an analyser+context were present last frame (clears stale levels once on removal)
  const hadSourceRef = useRef(false)

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
      trackStateRef.current = {}
      hadSourceRef.current = false
      return
    }

    let cancelled = false
    // Per-track band data from the 4096-point band analyser, reallocated on size change
    let bandData: Uint8Array<ArrayBuffer> | null = null

    // Auto-normalize a raw band value using rolling peak + noise floor
    function autoNormalize(
      raw: number,
      peakRef: { current: number },
      floorRef: { current: number },
      dt: number,
      sensitivity: number,
      minPeak = 0.001,
    ): number {
      // Rolling peak: instant attack, 5-second half-life decay
      const peakDecay = Math.pow(0.5, dt / 5.0)
      if (raw > peakRef.current) {
        peakRef.current = raw
      } else {
        peakRef.current *= peakDecay
      }
      peakRef.current = Math.max(peakRef.current, minPeak)

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
        // Source went away: zero everything once so gates can't fire on stale levels
        if (hadSourceRef.current) {
          hadSourceRef.current = false
          useAudioReactiveStore.getState().updateBands(0, 0, 0, 0, 0)
          trackStateRef.current = {}
        }
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      hadSourceRef.current = true
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

      const rms = (sub + mid + high) / 3

      // Per-track bands: same normalise → envelope → curve chain as the globals,
      // over each audio-reactive track's own frequency window.
      const tracks = useEffectSequencerStore.getState().tracks
      const trackBands: Record<string, number> = {}
      // Per-track bands read the higher-resolution band analyser when present (R18),
      // else the reactive analyser's data. Read lazily, once per frame.
      const bandAn = audioSource.bandAnalyser
      let tbData: Uint8Array | null = null
      let tbFft = fftSize
      const trackBandData = () => {
        if (tbData) return tbData
        if (!bandAn) return (tbData = frequencyData)
        if (!bandData || bandData.length !== bandAn.frequencyBinCount) bandData = new Uint8Array(bandAn.frequencyBinCount)
        bandAn.getByteFrequencyData(bandData)
        tbFft = bandAn.fftSize
        return (tbData = bandData)
      }
      const live = trackStateRef.current
      const seen = new Set<string>()
      for (const id in tracks) {
        const ar = tracks[id].audioReactive
        if (!ar.enabled || !ar.band) continue
        seen.add(id)
        const st = live[id] ?? (live[id] = { peak: { current: 0.01 }, floor: { current: 0 }, smoothed: 0 })
        const data = trackBandData()
        const [first, last] = bandToBins(ar.band, sampleRate, tbFft)
        const rawUnnorm = bandAverage(data, first, last)
        // Absolute floor (R17): narrow windows sit near silence most of the time, and
        // auto-normalise would scale that noise up to full scale. Below the floor the
        // track reads 0; the envelope still releases toward it. The rolling peak's
        // minimum is also raised (0.05 vs the globals' 0.001) for the same reason.
        const raw = rawUnnorm < TRACK_BAND_FLOOR
          ? 0
          : autoMode
            ? autoNormalize(rawUnnorm, st.peak, st.floor, dt, sensitivity, TRACK_MIN_PEAK)
            : Math.min(1, rawUnnorm * gain)
        st.smoothed = envelopeFollow(raw, st.smoothed)
        trackBands[id] = Math.pow(st.smoothed, autoMode ? 3.0 - sensitivity * 2.2 : curve)
      }
      // Forget state for tracks that were disabled/removed so a re-enable starts fresh
      for (const id in live) if (!seen.has(id)) delete live[id]

      // Single batched store write
      useAudioReactiveStore.getState().updateBands(sub, mid, high, hit, rms, trackBands)

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
