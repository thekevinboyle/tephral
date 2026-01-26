import { create } from 'zustand'
import { EFFECTS } from '../config/effects'
import { useGlitchEngineStore, type GlitchSnapshot } from './glitchEngineStore'
import { useAsciiRenderStore, type AsciiSnapshot } from './asciiRenderStore'
import { useStippleStore, type StippleSnapshot } from './stippleStore'
import { useLandmarksStore, type LandmarksSnapshot } from './landmarksStore'
import { usePointNetworkStore, type PointNetworkSnapshot } from './pointNetworkStore'
import { useDetectionOverlayStore, type DetectionOverlaySnapshot } from './detectionOverlayStore'

export interface RoutingPreset {
  name: string
  effectOrder: string[]
  glitch: GlitchSnapshot
  ascii: AsciiSnapshot
  stipple: StippleSnapshot
  landmarks: LandmarksSnapshot
  pointNetwork: PointNetworkSnapshot
  detectionOverlay: DetectionOverlaySnapshot
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

  // Previous state for undo randomize
  previousState: RoutingPreset | null

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

  // Full state management
  captureFullState: () => Omit<RoutingPreset, 'name'>
  applyFullState: (preset: RoutingPreset) => void

  // Randomization
  randomize: () => void
  undoRandomize: () => void
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
  previousState: null,

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
    const fullState = state.captureFullState()

    const preset: RoutingPreset = {
      name: name || state.banks[state.activeBank][presetIndex]?.name || `Preset ${presetIndex + 1}`,
      ...fullState,
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
      state.applyFullState(preset)
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

  captureFullState: () => {
    const glitch = useGlitchEngineStore.getState().getSnapshot()
    const ascii = useAsciiRenderStore.getState().getSnapshot()
    const stipple = useStippleStore.getState().getSnapshot()
    const landmarks = useLandmarksStore.getState().getSnapshot()
    const pointNetwork = usePointNetworkStore.getState().getSnapshot()
    const detectionOverlay = useDetectionOverlayStore.getState().getSnapshot()

    return {
      effectOrder: [...get().effectOrder],
      glitch,
      ascii,
      stipple,
      landmarks,
      pointNetwork,
      detectionOverlay,
    }
  },

  applyFullState: (preset) => {
    useGlitchEngineStore.getState().applySnapshot(preset.glitch)
    useAsciiRenderStore.getState().applySnapshot(preset.ascii)
    useStippleStore.getState().applySnapshot(preset.stipple)
    useLandmarksStore.getState().applySnapshot(preset.landmarks)
    usePointNetworkStore.getState().applySnapshot(preset.pointNetwork)
    useDetectionOverlayStore.getState().applySnapshot(preset.detectionOverlay)
    set({ effectOrder: [...preset.effectOrder] })
  },

  randomize: () => {
    const current = get().captureFullState()
    set({ previousState: { name: '_previous', ...current } })

    // Helper functions
    const rand = (min: number, max: number) => min + Math.random() * (max - min)
    const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1))
    const randBool = () => Math.random() > 0.5

    // Shuffle effect order
    const shuffled = [...current.effectOrder].sort(() => Math.random() - 0.5)

    const randomized: RoutingPreset = {
      name: '_random',
      effectOrder: shuffled,
      glitch: {
        rgbSplitEnabled: randBool(),
        rgbSplit: {
          amount: rand(0, 2),
          redOffsetX: rand(-0.05, 0.05),
          redOffsetY: rand(-0.05, 0.05),
          greenOffsetX: 0,
          greenOffsetY: 0,
          blueOffsetX: rand(-0.05, 0.05),
          blueOffsetY: rand(-0.05, 0.05),
        },
        blockDisplaceEnabled: randBool(),
        blockDisplace: {
          blockSize: rand(0.02, 0.15),
          displaceChance: rand(0.05, 0.3),
          displaceDistance: rand(0, 0.1),
          seed: randInt(0, 1000),
          animated: randBool(),
        },
        scanLinesEnabled: randBool(),
        scanLines: {
          lineCount: randInt(50, 400),
          lineOpacity: rand(0.1, 0.8),
          lineFlicker: rand(0, 0.3),
        },
        noiseEnabled: randBool(),
        noise: {
          amount: rand(0, 0.5),
          speed: rand(1, 30),
        },
        pixelateEnabled: randBool(),
        pixelate: {
          pixelSize: randInt(2, 24),
        },
        edgeDetectionEnabled: randBool(),
        edgeDetection: {
          threshold: rand(0.1, 0.9),
          edgeColor: ['#00ff00', '#ff0066', '#00ffff', '#ffff00', '#ff00ff'][randInt(0, 4)],
          mixAmount: rand(0.3, 1),
        },
        wetMix: rand(0.5, 1),
      },
      ascii: {
        enabled: randBool(),
        params: {
          ...current.ascii.params,
          fontSize: randInt(6, 16),
          contrast: rand(0.8, 1.5),
          mode: ['standard', 'matrix', 'blocks', 'braille'][randInt(0, 3)] as 'standard' | 'matrix' | 'blocks' | 'braille',
        },
      },
      stipple: {
        enabled: randBool(),
        params: {
          ...current.stipple.params,
          particleSize: rand(1, 6),
          density: rand(0.5, 2),
          brightnessThreshold: rand(0.2, 0.8),
        },
      },
      landmarks: {
        ...current.landmarks,
        enabled: randBool(),
        currentMode: randBool() ? ['face', 'hands', 'pose', 'holistic'][randInt(0, 3)] as 'face' | 'hands' | 'pose' | 'holistic' : 'off',
        minDetectionConfidence: rand(0.3, 0.8),
      },
      pointNetwork: {
        enabled: randBool(),
        params: {
          ...current.pointNetwork.params,
          pointRadius: rand(1, 8),
          maxDistance: rand(0.05, 0.3),
          lineWidth: rand(0.5, 3),
        },
      },
      detectionOverlay: {
        enabled: randBool(),
        params: {
          ...current.detectionOverlay.params,
          boxLineWidth: randInt(1, 4),
          boxStyle: ['solid', 'dashed', 'corners'][randInt(0, 2)] as 'solid' | 'dashed' | 'corners',
        },
      },
    }

    get().applyFullState(randomized)
    set({ isModified: true })
  },

  undoRandomize: () => {
    const prev = get().previousState
    if (prev) {
      get().applyFullState(prev)
      set({ previousState: null, isModified: true })
    }
  },
}))
