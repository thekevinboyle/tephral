import { create } from 'zustand'
import { EFFECTS } from '../config/effects'

export interface RoutingPreset {
  name: string
  effectOrder: string[]
  effectStates: Record<string, boolean>
  effectParams: Record<string, Record<string, number>>
}

interface RoutingState {
  // Current effect order (determines processing sequence)
  effectOrder: string[]

  // Preset banks: 4 banks × 4 presets
  banks: (RoutingPreset | null)[][]
  activeBank: number
  activePreset: number | null
  isModified: boolean

  // Clipboard for copy/paste
  clipboard: RoutingPreset | null

  // Actions
  reorderEffect: (fromIndex: number, toIndex: number) => void
  setEffectOrder: (order: string[]) => void

  setActiveBank: (bankIndex: number) => void
  savePreset: (presetIndex: number, name?: string) => void
  loadPreset: (presetIndex: number) => void
  renamePreset: (presetIndex: number, name: string) => void
  deletePreset: (presetIndex: number) => void

  copyPreset: () => void
  pastePreset: (presetIndex: number) => void

  setModified: (modified: boolean) => void

  // For saving/loading full state (to be called by effect stores)
  getCurrentState: () => Omit<RoutingPreset, 'name'>
  applyPreset: (preset: RoutingPreset) => void
}

// Default effect order based on EFFECTS config
const defaultEffectOrder = EFFECTS.map(e => e.id)

// Initialize empty banks (4 banks × 4 presets)
const createEmptyBanks = (): (RoutingPreset | null)[][] => {
  return Array(4).fill(null).map(() => Array(4).fill(null))
}

export const useRoutingStore = create<RoutingState>((set, get) => ({
  effectOrder: [...defaultEffectOrder],
  banks: createEmptyBanks(),
  activeBank: 0,
  activePreset: null,
  isModified: false,
  clipboard: null,

  reorderEffect: (fromIndex, toIndex) => {
    set((state) => {
      const newOrder = [...state.effectOrder]
      const [moved] = newOrder.splice(fromIndex, 1)
      newOrder.splice(toIndex, 0, moved)
      return { effectOrder: newOrder, isModified: true }
    })
  },

  setEffectOrder: (order) => {
    set({ effectOrder: order, isModified: true })
  },

  setActiveBank: (bankIndex) => {
    set({ activeBank: bankIndex })
  },

  savePreset: (presetIndex, name) => {
    const state = get()
    const currentState = state.getCurrentState()

    const preset: RoutingPreset = {
      name: name || state.banks[state.activeBank][presetIndex]?.name || `Preset ${presetIndex + 1}`,
      ...currentState,
    }

    set((s) => {
      const newBanks = s.banks.map((bank, bi) =>
        bi === s.activeBank
          ? bank.map((p, pi) => pi === presetIndex ? preset : p)
          : bank
      )
      return {
        banks: newBanks,
        activePreset: presetIndex,
        isModified: false,
      }
    })
  },

  loadPreset: (presetIndex) => {
    const state = get()
    const preset = state.banks[state.activeBank][presetIndex]

    if (preset) {
      state.applyPreset(preset)
      set({ activePreset: presetIndex, isModified: false })
    }
  },

  renamePreset: (presetIndex, name) => {
    set((state) => {
      const newBanks = state.banks.map((bank, bi) =>
        bi === state.activeBank
          ? bank.map((p, pi) => pi === presetIndex && p ? { ...p, name } : p)
          : bank
      )
      return { banks: newBanks }
    })
  },

  deletePreset: (presetIndex) => {
    set((state) => {
      const newBanks = state.banks.map((bank, bi) =>
        bi === state.activeBank
          ? bank.map((p, pi) => pi === presetIndex ? null : p)
          : bank
      )
      return {
        banks: newBanks,
        activePreset: state.activePreset === presetIndex ? null : state.activePreset,
      }
    })
  },

  copyPreset: () => {
    const state = get()
    if (state.activePreset !== null) {
      const preset = state.banks[state.activeBank][state.activePreset]
      if (preset) {
        set({ clipboard: { ...preset } })
      }
    }
  },

  pastePreset: (presetIndex) => {
    const state = get()
    if (state.clipboard) {
      set((s) => {
        const newBanks = s.banks.map((bank, bi) =>
          bi === s.activeBank
            ? bank.map((p, pi) => pi === presetIndex ? { ...s.clipboard! } : p)
            : bank
        )
        return { banks: newBanks }
      })
    }
  },

  setModified: (modified) => {
    set({ isModified: modified })
  },

  // This will be enhanced to gather state from all effect stores
  getCurrentState: () => {
    const state = get()
    return {
      effectOrder: [...state.effectOrder],
      effectStates: {},  // Will be populated by effect stores
      effectParams: {},  // Will be populated by effect stores
    }
  },

  // This will be enhanced to apply state to all effect stores
  applyPreset: (preset) => {
    set({
      effectOrder: [...preset.effectOrder],
    })
    // Effect states and params will be applied by individual stores
  },
}))
