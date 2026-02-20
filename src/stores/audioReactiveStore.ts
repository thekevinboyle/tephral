import { create } from 'zustand'

interface AudioReactiveState {
  enabled: boolean
  // Per-band envelope-followed values (0-1), updated every frame
  sub: number    // 20-200 Hz
  mid: number    // 200-2000 Hz
  high: number   // 2000 Hz+
  hit: number    // transient detector (1 on hit, decays to 0)

  // Config
  gain: number           // 0.1-10, master input gain
  attackMs: number       // 1-50ms
  releaseMs: number      // 50-2000ms
  curve: number          // 0.5-4.0, power curve exponent
  transientThreshold: number  // 0-1
  transientDecay: number      // 0.01-0.5

  // Actions
  setEnabled: (v: boolean) => void
  toggleEnabled: () => void
  setGain: (v: number) => void
  setAttackMs: (v: number) => void
  setReleaseMs: (v: number) => void
  setCurve: (v: number) => void
  setTransientThreshold: (v: number) => void
  setTransientDecay: (v: number) => void
  updateBands: (sub: number, mid: number, high: number, hit: number) => void
}

export const useAudioReactiveStore = create<AudioReactiveState>((set) => ({
  enabled: false,
  sub: 0,
  mid: 0,
  high: 0,
  hit: 0,

  gain: 2,
  attackMs: 5,
  releaseMs: 300,
  curve: 2,
  transientThreshold: 0.3,
  transientDecay: 0.15,

  setEnabled: (v) => set({ enabled: v }),
  toggleEnabled: () => set((s) => ({ enabled: !s.enabled })),
  setGain: (v) => set({ gain: Math.max(0.1, Math.min(10, v)) }),
  setAttackMs: (v) => set({ attackMs: Math.max(1, Math.min(50, v)) }),
  setReleaseMs: (v) => set({ releaseMs: Math.max(50, Math.min(2000, v)) }),
  setCurve: (v) => set({ curve: Math.max(0.5, Math.min(4, v)) }),
  setTransientThreshold: (v) => set({ transientThreshold: Math.max(0, Math.min(1, v)) }),
  setTransientDecay: (v) => set({ transientDecay: Math.max(0.01, Math.min(0.5, v)) }),
  updateBands: (sub, mid, high, hit) => set({ sub, mid, high, hit }),
}))
