import { create } from 'zustand'

export interface LauncherCell {
  effectId: string
  params: Record<string, number | string | boolean>
}

export type CycleMode = 'speed' | 'selection' | 'combined'
export type TriggerBand = 'sub' | 'kick' | 'mid' | 'high' | 'all'

interface EffectLauncherState {
  cells: (LauncherCell | null)[]
  activeIndex: number | null
  selectedIndex: number | null
  isPlaying: boolean
  cycleMode: CycleMode
  triggerBand: TriggerBand
  threshold: number
  holdTime: number
  fallbackRate: number

  setCell: (index: number, effectId: string, params: Record<string, number | string | boolean>) => void
  clearCell: (index: number) => void
  selectCell: (index: number | null) => void
  play: () => void
  stop: () => void
  advance: () => void
  jumpTo: (index: number) => void
  setCycleMode: (mode: CycleMode) => void
  setTriggerBand: (band: TriggerBand) => void
  setThreshold: (v: number) => void
  setHoldTime: (v: number) => void
  setFallbackRate: (v: number) => void
}

export const useEffectLauncherStore = create<EffectLauncherState>((set, get) => ({
  cells: Array(16).fill(null),
  activeIndex: null,
  selectedIndex: null,
  isPlaying: false,
  cycleMode: 'speed',
  triggerBand: 'sub',
  threshold: 0.3,
  holdTime: 200,
  fallbackRate: 120,

  setCell: (index, effectId, params) => set((s) => {
    const cells = [...s.cells]
    cells[index] = { effectId, params }
    return { cells }
  }),

  clearCell: (index) => set((s) => {
    const cells = [...s.cells]
    cells[index] = null
    return { cells, selectedIndex: s.selectedIndex === index ? null : s.selectedIndex }
  }),

  selectCell: (index) => set({ selectedIndex: index }),

  play: () => {
    const { cells } = get()
    const firstNonEmpty = cells.findIndex(c => c !== null)
    if (firstNonEmpty === -1) return
    set({ isPlaying: true, activeIndex: firstNonEmpty })
  },

  stop: () => set({ isPlaying: false, activeIndex: null }),

  advance: () => {
    const { cells, activeIndex } = get()
    const nonEmptyIndices = cells
      .map((c, i) => c !== null ? i : -1)
      .filter(i => i !== -1)
    if (nonEmptyIndices.length === 0) return
    if (nonEmptyIndices.length === 1) return
    const currentPos = activeIndex !== null ? nonEmptyIndices.indexOf(activeIndex) : -1
    const nextPos = (currentPos + 1) % nonEmptyIndices.length
    set({ activeIndex: nonEmptyIndices[nextPos] })
  },

  jumpTo: (index) => {
    const { cells } = get()
    if (cells[index] !== null) set({ activeIndex: index })
  },

  setCycleMode: (mode) => set({ cycleMode: mode }),
  setTriggerBand: (band) => set({ triggerBand: band }),
  setThreshold: (v) => set({ threshold: Math.max(0, Math.min(1, v)) }),
  setHoldTime: (v) => set({ holdTime: Math.max(50, Math.min(2000, v)) }),
  setFallbackRate: (v) => set({ fallbackRate: Math.max(30, Math.min(300, v)) }),
}))
