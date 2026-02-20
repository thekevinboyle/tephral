import { create } from 'zustand'

export type AudioSourceType = 'video' | 'file' | 'mic'
export type AudioGateMode = 'gate' | 'envelope'

interface AudioSourceState {
  activeSource: AudioSourceType
  audioFileUrl: string | null
  audioFileName: string | null
  audioFileElement: HTMLAudioElement | null
  amplitude: number
  waveformData: number[]

  // Audio gate parameters
  gateThreshold: number     // 0-1: amplitude level that opens the gate
  gateSensitivity: number   // 0.1-10: gain multiplier on raw amplitude
  gateMode: AudioGateMode   // 'gate' = binary on/off, 'envelope' = amplitude scales mix
  gateAttack: number        // 0-1: how fast gate opens (0=instant, 1=slow)
  gateRelease: number       // 0-1: how fast gate closes (0=instant, 1=slow)

  // Audio reactive FFT analyser
  reactiveAnalyser: AnalyserNode | null
  audioContext: AudioContext | null

  setActiveSource: (source: AudioSourceType) => void
  setAudioFile: (url: string, name: string) => void
  setAudioFileElement: (el: HTMLAudioElement | null) => void
  clearAudioFile: () => void
  setAmplitude: (amplitude: number) => void
  setWaveformData: (data: number[]) => void
  setGateThreshold: (v: number) => void
  setGateSensitivity: (v: number) => void
  setGateMode: (mode: AudioGateMode) => void
  setGateAttack: (v: number) => void
  setGateRelease: (v: number) => void
  setReactiveAnalyser: (node: AnalyserNode | null) => void
  setAudioContext: (ctx: AudioContext | null) => void
}

export const useAudioSourceStore = create<AudioSourceState>((set, get) => ({
  activeSource: 'video',
  audioFileUrl: null,
  audioFileName: null,
  audioFileElement: null,
  amplitude: 0,
  waveformData: Array(128).fill(128),

  gateThreshold: 0.05,
  gateSensitivity: 1.0,
  gateMode: 'gate',
  gateAttack: 0.1,
  gateRelease: 0.2,

  reactiveAnalyser: null,
  audioContext: null,

  setActiveSource: (source) => {
    const state = get()
    // If switching away from file, stop the file element
    if (state.activeSource === 'file' && state.audioFileElement) {
      state.audioFileElement.pause()
    }
    set({ activeSource: source, amplitude: 0, waveformData: Array(128).fill(128) })
  },

  setAudioFile: (url, name) => {
    const state = get()
    // Revoke old blob URL
    if (state.audioFileUrl) {
      URL.revokeObjectURL(state.audioFileUrl)
    }
    set({ audioFileUrl: url, audioFileName: name })
  },

  setAudioFileElement: (el) => set({ audioFileElement: el }),

  clearAudioFile: () => {
    const state = get()
    if (state.audioFileUrl) {
      URL.revokeObjectURL(state.audioFileUrl)
    }
    if (state.audioFileElement) {
      state.audioFileElement.pause()
      state.audioFileElement.src = ''
    }
    set({ audioFileUrl: null, audioFileName: null, audioFileElement: null })
  },

  setAmplitude: (amplitude) => set({ amplitude }),
  setWaveformData: (data) => set({ waveformData: data }),
  setGateThreshold: (v) => set({ gateThreshold: Math.max(0.01, Math.min(1, v)) }),
  setGateSensitivity: (v) => set({ gateSensitivity: Math.max(0.1, Math.min(10, v)) }),
  setGateMode: (mode) => set({ gateMode: mode }),
  setGateAttack: (v) => set({ gateAttack: Math.max(0, Math.min(1, v)) }),
  setGateRelease: (v) => set({ gateRelease: Math.max(0, Math.min(1, v)) }),
  setReactiveAnalyser: (node) => set({ reactiveAnalyser: node }),
  setAudioContext: (ctx) => set({ audioContext: ctx }),
}))
