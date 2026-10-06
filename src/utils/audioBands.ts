// Pure helpers for per-track audio-reactive frequency bands.

export interface AudioBand { lowHz: number; highHz: number }
export type BandPresetName = 'KICK' | 'BASS' | 'SNARE' | 'HATS' | 'VOX' | 'FULL'

export const BAND_PRESETS: Record<BandPresetName, AudioBand> = {
  KICK: { lowHz: 40, highHz: 100 },
  BASS: { lowHz: 60, highHz: 250 },
  SNARE: { lowHz: 150, highHz: 2500 },
  HATS: { lowHz: 6000, highHz: 14000 },
  VOX: { lowHz: 300, highHz: 3000 },
  FULL: { lowHz: 20, highHz: 20000 },
}

export const MIN_BAND_OCTAVES = 1 / 3
const MIN_HZ = 20
const MAX_HZ = 20000
const MIN_RATIO = Math.pow(2, MIN_BAND_OCTAVES)

/**
 * Keep a band inside [20 Hz, min(nyquist, 20 kHz)] with low < high and a
 * width of at least 1/3 octave. When the window would collapse, it widens
 * around its geometric centre, then shifts to stay in range.
 */
export function clampBand(band: AudioBand, nyquist: number): AudioBand {
  const top = Math.max(MIN_HZ * MIN_RATIO, Math.min(MAX_HZ, nyquist))
  let lo = Math.max(MIN_HZ, Math.min(band.lowHz, band.highHz))
  let hi = Math.min(top, Math.max(band.lowHz, band.highHz))
  if (hi / lo < MIN_RATIO) {
    const centre = Math.sqrt(Math.max(lo, MIN_HZ) * Math.max(hi, MIN_HZ))
    lo = centre / Math.sqrt(MIN_RATIO)
    hi = centre * Math.sqrt(MIN_RATIO)
  }
  if (hi > top) { lo = top / (hi / lo); hi = top }
  if (lo < MIN_HZ) { hi = MIN_HZ * (hi / lo); lo = MIN_HZ }
  return { lowHz: lo, highHz: Math.min(hi, top) }
}

/** Inclusive FFT bin range for a band; always at least one bin, never past the last bin. */
export function bandToBins(band: AudioBand, sampleRate: number, fftSize: number): [number, number] {
  const binHz = sampleRate / fftSize
  const lastBin = fftSize / 2 - 1
  const first = Math.min(lastBin, Math.max(0, Math.floor(band.lowHz / binHz)))
  const last = Math.min(lastBin, Math.max(first, Math.floor(band.highHz / binHz)))
  return [first, last]
}

/** Mean of byte FFT magnitudes over [first, last], scaled to 0–1. */
export function bandAverage(data: Uint8Array, first: number, last: number): number {
  let sum = 0
  for (let i = first; i <= last; i++) sum += data[i]
  return last >= first ? sum / (last - first + 1) / 255 : 0
}

const LOG_MIN = Math.log10(MIN_HZ)
const LOG_SPAN = Math.log10(MAX_HZ) - LOG_MIN

/** 20 Hz → 0, 20 kHz → 1 on a log axis (for the spectrum strip). */
export function hzToLogX(hz: number): number {
  return (Math.log10(Math.max(MIN_HZ, Math.min(MAX_HZ, hz))) - LOG_MIN) / LOG_SPAN
}

export function logXToHz(x: number): number {
  return Math.pow(10, LOG_MIN + Math.max(0, Math.min(1, x)) * LOG_SPAN)
}

/** The window an old fixed `source` corresponds to; null for non-band sources. */
export function legacySourceToBand(source: string): AudioBand | null {
  switch (source) {
    case 'kick':
    case 'low': return { lowHz: 20, highHz: 200 }
    case 'mid': return { lowHz: 200, highHz: 2000 }
    case 'high': return { lowHz: 2000, highHz: 16000 }
    default: return null
  }
}
