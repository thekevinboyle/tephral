// Formatting for Line tracks' header badge and lane span label.
import type { EffectStepResolution } from '../../stores/effectSequencerStore'

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾', '1.5': '1½' }

/** A track's time scale as the header badge and the lane show it: ¼×, ½×, 1×, 1½×, 2× … */
export const fmtScale = (s: number): string => `${FRACTIONS[String(s)] ?? String(s)}×`

const STEP_BEATS: Record<EffectStepResolution, number> = { '1/4': 1, '1/8': 0.5, '1/16': 0.25, '1/32': 0.125 }

/** Bars a track's loop spans: length × beats per step / time scale / 4. */
export function trackBars(length: number, resolution: EffectStepResolution, timeScale: number): number {
  return (length * (STEP_BEATS[resolution] ?? 0.25)) / (timeScale || 1) / 4
}

/** Bars formatted for the lane's span label: whole numbers plain, otherwise up to two decimals. */
export const fmtBars = (b: number): string => (Number.isInteger(b) ? String(b) : String(Math.round(b * 100) / 100))

const BEAT_NAMES: Record<string, string> = { '0.5': '½ beat', '1': '1 beat' }
/** A line's loop length as the bar shows it: ½ beat, 1 beat, 2 beats … 16 beats. */
export const fmtBeats = (b: number): string => BEAT_NAMES[String(b)] ?? `${b} beats`
/** The graph's top-left label: "1 bar loop" for 4 beats, "2 bars loop", "½ beat loop" … */
export const fmtLoop = (b: number): string => (b >= 4 ? `${b / 4} ${b === 4 ? 'bar' : 'bars'} loop` : `${fmtBeats(b)} loop`)
