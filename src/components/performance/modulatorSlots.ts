import { getSourceInfo } from '../../utils/modulationSources'

export interface ModulatorSlot {
  /** Routing id (sequencerStore routing trackId) and uiStore.selectedModulator value */
  id: string
  name: string
  shape: 'sine' | 'random' | 'step' | 'envelope' | 'sh' | 'midi' | 'audio' | 'warp'
  /** MIDI and Audio route from their own editors (MIDI learn, audio bands) */
  routable: boolean
}

export const MODULATOR_SLOTS: ModulatorSlot[] = [
  { id: 'lfo-0', name: 'LFO 1', shape: 'sine', routable: true },
  { id: 'lfo-1', name: 'LFO 2', shape: 'sine', routable: true },
  { id: 'lfo-2', name: 'LFO 3', shape: 'sine', routable: true },
  { id: 'lfo-3', name: 'LFO 4', shape: 'sine', routable: true },
  { id: 'random', name: 'Random', shape: 'random', routable: true },
  { id: 'step', name: 'Step', shape: 'step', routable: true },
  { id: 'envelope', name: 'Envelope', shape: 'envelope', routable: true },
  { id: 'sampleHold', name: 'S&H', shape: 'sh', routable: true },
  { id: 'midi', name: 'MIDI', shape: 'midi', routable: false },
  { id: 'audio', name: 'Audio', shape: 'audio', routable: false },
  /** The time warp line: its height at the heard playhead (spec §6) */
  { id: 'warp', name: 'Warp', shape: 'warp', routable: true },
]

/** Display name for a routing source id while assigning ("LFO 1", "Envelope", ...) */
export function modulatorName(id: string): string {
  return MODULATOR_SLOTS.find((s) => s.id === id)?.name ?? getSourceInfo(id)?.name ?? id
}
