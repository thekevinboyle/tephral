// Modulation source colors (same as SliderRow)
export const SPECIAL_SOURCES: Record<string, { name: string; color: string }> = {
  euclidean: { name: 'Euclidean', color: '#FF0055' },
  ricochet: { name: 'Ricochet', color: '#FF0055' },
  random: { name: 'Random', color: '#FF6B6B' },
  step: { name: 'Step', color: '#4ECDC4' },
  envelope: { name: 'Envelope', color: '#AA55FF' },
  sampleHold: { name: 'S&H', color: '#AAFF00' },
}

export function getSourceInfo(trackId: string): { name: string; color: string } | null {
  if (trackId.startsWith('lfo-')) {
    const idx = parseInt(trackId.split('-')[1])
    return { name: `LFO ${idx + 1}`, color: '#707070' }
  }
  if (trackId.startsWith('audio-')) {
    const AUDIO_SOURCES: Record<string, { name: string; color: string }> = {
      'audio-sub': { name: 'Sub', color: '#FF3333' },
      'audio-mid': { name: 'Mid', color: '#FF8800' },
      'audio-high': { name: 'High', color: '#33CCFF' },
      'audio-hit': { name: 'Hit', color: '#FF00FF' },
      'audio-rms': { name: 'RMS', color: '#FFFFFF' },
    }
    return AUDIO_SOURCES[trackId] || null
  }
  return SPECIAL_SOURCES[trackId] || null
}
export const POLY_EUCLID_COLOR = '#FF0055'
export const STEP_SEQ_COLOR = '#FF9500'

/**
 * Name and colour for any routing source id: poly-Euclid tracks ("Euclid T2"), step-sequencer tracks
 * ("Step T1"), then the modulators and audio bands (getSourceInfo). Pass the current track id lists.
 */
export function resolveRoutingSource(
  trackId: string,
  seqTrackIds: readonly string[],
  polyTrackIds: readonly string[],
): { name: string; color: string } | null {
  if (trackId.startsWith('polyEuclid-')) {
    const idx = polyTrackIds.indexOf(trackId.replace('polyEuclid-', ''))
    if (idx >= 0) return { name: `Euclid T${idx + 1}`, color: POLY_EUCLID_COLOR }
  }
  const sIdx = seqTrackIds.indexOf(trackId)
  if (sIdx >= 0) return { name: `Step T${sIdx + 1}`, color: STEP_SEQ_COLOR }
  return getSourceInfo(trackId)
}
