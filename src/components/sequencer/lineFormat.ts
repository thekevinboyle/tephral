// Formatting for a track's time-scale badge and the Lines view's bar and graph labels.

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾', '1.5': '1½' }

/** A track's time scale as the track header's badge shows it: ¼×, ½×, 1×, 1½×, 2× … */
export const fmtScale = (s: number): string => `${FRACTIONS[String(s)] ?? String(s)}×`

const BEAT_NAMES: Record<string, string> = { '0.5': '½ beat', '1': '1 beat' }
/** A line's loop length as the bar shows it: ½ beat, 1 beat, 2 beats … 16 beats. */
export const fmtBeats = (b: number): string => BEAT_NAMES[String(b)] ?? `${b} beats`
/** The graph's top-left label: "1 bar loop" for 4 beats, "2 bars loop", "½ beat loop" … */
export const fmtLoop = (b: number): string => (b >= 4 ? `${b / 4} ${b === 4 ? 'bar' : 'bars'} loop` : `${fmtBeats(b)} loop`)
