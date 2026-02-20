import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffectSequencerStore } from './effectSequencerStore'

export interface MIDIDeviceInfo {
  id: string
  name: string
  manufacturer: string
}

interface MIDIState {
  // Connection
  isSupported: boolean
  isConnected: boolean
  inputs: MIDIDeviceInfo[]
  selectedInputId: string | null

  // Live state (not persisted)
  noteStates: Record<number, boolean>
  ccValues: Record<number, number>

  // Note-to-track mapping (persisted)
  trackNoteMap: Record<string, number>

  // Clock
  clockSyncEnabled: boolean
  clockTimestamps: number[]
  clockBpm: number | null

  // Actions - connection
  setSupported: (supported: boolean) => void
  setConnected: (connected: boolean) => void
  setInputs: (inputs: MIDIDeviceInfo[]) => void
  setSelectedInput: (id: string | null) => void

  // Actions - live state
  setNoteState: (note: number, on: boolean) => void
  setCCValue: (cc: number, value: number) => void

  // Actions - note mapping
  setNoteForTrack: (effectId: string, note: number) => void
  removeNoteMapping: (effectId: string) => void

  // Actions - clock
  setClockSyncEnabled: (enabled: boolean) => void
  receiveClock: (timestamp: number) => void
  resetClock: () => void
}

const CLOCK_BUFFER_SIZE = 24

export const useMIDIStore = create<MIDIState>()(persist((set, get) => ({
  // Connection
  isSupported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
  isConnected: false,
  inputs: [],
  selectedInputId: null,

  // Live state
  noteStates: {},
  ccValues: {},

  // Note mapping
  trackNoteMap: {},

  // Clock
  clockSyncEnabled: false,
  clockTimestamps: [],
  clockBpm: null,

  // Connection actions
  setSupported: (supported) => set({ isSupported: supported }),
  setConnected: (connected) => set({ isConnected: connected }),
  setInputs: (inputs) => set({ inputs }),
  setSelectedInput: (id) => set({ selectedInputId: id }),

  // Live state actions
  setNoteState: (note, on) =>
    set((state) => ({
      noteStates: { ...state.noteStates, [note]: on },
    })),

  setCCValue: (cc, value) =>
    set((state) => ({
      ccValues: { ...state.ccValues, [cc]: value },
    })),

  // Note mapping actions
  setNoteForTrack: (effectId, note) =>
    set((state) => ({
      trackNoteMap: { ...state.trackNoteMap, [effectId]: note },
    })),

  removeNoteMapping: (effectId) =>
    set((state) => {
      const { [effectId]: _, ...rest } = state.trackNoteMap
      return { trackNoteMap: rest }
    }),

  // Clock actions
  setClockSyncEnabled: (enabled) => set({ clockSyncEnabled: enabled, clockTimestamps: [], clockBpm: null }),

  receiveClock: (timestamp) => {
    const state = get()
    const timestamps = [...state.clockTimestamps, timestamp]

    // Keep ring buffer at CLOCK_BUFFER_SIZE
    if (timestamps.length > CLOCK_BUFFER_SIZE) {
      timestamps.splice(0, timestamps.length - CLOCK_BUFFER_SIZE)
    }

    let bpm: number | null = state.clockBpm
    if (timestamps.length === CLOCK_BUFFER_SIZE) {
      // 24 MIDI clock pulses per quarter note; 24 timestamps = 23 intervals
      const elapsed = timestamps[CLOCK_BUFFER_SIZE - 1] - timestamps[0]
      if (elapsed > 0) {
        bpm = Math.round((60000 * (CLOCK_BUFFER_SIZE - 1)) / elapsed)
      }
    }

    set({ clockTimestamps: timestamps, clockBpm: bpm })

    // Sync BPM to effect sequencer when enabled
    if (bpm !== null && state.clockSyncEnabled) {
      useEffectSequencerStore.getState().setBpm(bpm)
    }
  },

  resetClock: () => set({ clockTimestamps: [], clockBpm: null }),
}), {
  name: 'midi-storage',
  partialize: (state) => ({
    trackNoteMap: state.trackNoteMap,
    clockSyncEnabled: state.clockSyncEnabled,
    selectedInputId: state.selectedInputId,
  }),
}))
