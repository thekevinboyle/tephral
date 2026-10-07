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
