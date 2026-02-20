import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type EffectStepResolution = '1/4' | '1/8' | '1/16' | '1/32'

export interface EffectStep {
  active: boolean
  locks: Record<string, number | string>  // paramId -> raw value
  probability: number                      // 0-1
  condition: 'always' | 'fill'
}

export interface EffectTrack {
  effectId: string
  mode: 'gate' | 'param'
  steps: EffectStep[]            // always 64 entries
  length: number                 // active step count (default 16)
  muted: boolean
  soloed: boolean
  audioGate: boolean             // live mic amplitude gates effect on/off
  midiGate: boolean              // MIDI note gates effect on/off
}

export interface AutomationParam {
  effectId: string
  paramId: string      // short name: "amount"
  fullParamId: string  // full: "rgb_split.amount"
  label: string
  min: number
  max: number
  step: number
}

interface EffectSequencerState {
  // State
  tracks: Record<string, EffectTrack>
  bpm: number
  resolution: EffectStepResolution
  isPlaying: boolean
  currentStep: number
  stepPage: number
  selectedStep: { effectId: string; stepIndex: number } | null
  selectedSteps: { effectId: string; stepIndex: number }[]
  swing: number
  fillModeActive: boolean
  automationParam: AutomationParam | null
  audioGateLevel: number             // 0-1 amplitude from video audio (for UI display)

  // Automation
  setAutomationParam: (param: AutomationParam) => void
  clearAutomationParam: () => void

  // Transport
  play: () => void
  stop: () => void
  setBpm: (bpm: number) => void
  setResolution: (res: EffectStepResolution) => void
  setSwing: (swing: number) => void
  setStepPage: (page: number) => void
  setFillModeActive: (active: boolean) => void

  // Track management
  ensureTrack: (effectId: string) => void
  removeTrack: (effectId: string) => void
  setTrackMode: (effectId: string, mode: 'gate' | 'param') => void
  setTrackMuted: (effectId: string, muted: boolean) => void
  setTrackSoloed: (effectId: string, soloed: boolean) => void
  setTrackAudioGate: (effectId: string, enabled: boolean) => void
  setTrackMidiGate: (effectId: string, enabled: boolean) => void
  setAudioGateLevel: (level: number) => void
  setTrackLength: (effectId: string, length: number) => void

  // Step editing
  toggleStep: (effectId: string, stepIndex: number) => void
  setStepActive: (effectId: string, stepIndex: number, active: boolean) => void
  selectStep: (effectId: string, stepIndex: number) => void
  addToSelection: (effectId: string, stepIndex: number) => void
  clearSelection: () => void
  setStepLock: (effectId: string, stepIndex: number, paramId: string, value: number | string) => void
  clearStepLock: (effectId: string, stepIndex: number, paramId: string) => void
  clearAllStepLocks: (effectId: string, stepIndex: number) => void
  setStepProbability: (effectId: string, stepIndex: number, prob: number) => void

  // Utilities
  randomizeTrack: (effectId: string, density?: number) => void
  randomizeLocks: (effectId: string, params: { id: string; min: number; max: number; step: number }[]) => void
  clearTrack: (effectId: string) => void

  // Playback engine
  advanceStep: () => void
  resetPlayhead: () => void
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const createDefaultStep = (): EffectStep => ({
  active: false,
  locks: {},
  probability: 1,
  condition: 'always',
})

const createDefaultTrack = (effectId: string): EffectTrack => ({
  effectId,
  mode: 'gate',
  steps: Array.from({ length: 32 }, createDefaultStep),
  length: 8,
  muted: false,
  soloed: false,
  audioGate: false,
  midiGate: false,
})

// Immutable step update helper
const updateStep = (
  tracks: Record<string, EffectTrack>,
  effectId: string,
  stepIndex: number,
  updater: (step: EffectStep) => EffectStep,
): Record<string, EffectTrack> => {
  const track = tracks[effectId]
  if (!track || stepIndex < 0 || stepIndex >= track.steps.length) return tracks
  const newSteps = [...track.steps]
  newSteps[stepIndex] = updater(newSteps[stepIndex])
  return { ...tracks, [effectId]: { ...track, steps: newSteps } }
}

// ═══════════════════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════════════════

export const useEffectSequencerStore = create<EffectSequencerState>()(persist((set, get) => ({
  // Initial state
  tracks: {},
  bpm: 120,
  resolution: '1/16',
  isPlaying: false,
  currentStep: 0,
  stepPage: 0,
  selectedStep: null,
  selectedSteps: [],
  swing: 0,
  fillModeActive: false,
  automationParam: null,
  audioGateLevel: 0,

  // ─── Transport ─────────────────────────────────────────────────────────

  play: () => set({ isPlaying: true }),

  stop: () => set({ isPlaying: false, currentStep: 0 }),

  setBpm: (bpm) => set({ bpm: Math.max(20, Math.min(300, bpm)) }),

  setResolution: (resolution) => set({ resolution }),

  setSwing: (swing) => set({ swing: Math.max(0, Math.min(100, swing)) }),

  setStepPage: (page) => set({ stepPage: Math.max(0, Math.min(3, page)) }),

  setFillModeActive: (active) => set({ fillModeActive: active }),

  // ─── Automation Target ──────────────────────────────────────────────────

  setAutomationParam: (param) => set({ automationParam: param }),

  clearAutomationParam: () => set({ automationParam: null }),

  // ─── Track Management ──────────────────────────────────────────────────

  ensureTrack: (effectId) => {
    if (get().tracks[effectId]) return
    set((state) => ({
      tracks: { ...state.tracks, [effectId]: createDefaultTrack(effectId) },
    }))
  },

  removeTrack: (effectId) => {
    set((state) => {
      const { [effectId]: _, ...rest } = state.tracks
      return { tracks: rest }
    })
  },

  setTrackMode: (effectId, mode) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, mode } } }
    })
  },

  setTrackMuted: (effectId, muted) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, muted } } }
    })
  },

  setTrackSoloed: (effectId, soloed) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, soloed } } }
    })
  },

  setTrackAudioGate: (effectId, enabled) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, audioGate: enabled } } }
    })
  },

  setTrackMidiGate: (effectId, enabled) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return { tracks: { ...state.tracks, [effectId]: { ...track, midiGate: enabled } } }
    })
  },

  setAudioGateLevel: (level) => set({ audioGateLevel: level }),

  setTrackLength: (effectId, length) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      return {
        tracks: {
          ...state.tracks,
          [effectId]: { ...track, length: Math.max(1, Math.min(32, length)) },
        },
      }
    })
  },

  // ─── Step Editing ──────────────────────────────────────────────────────

  toggleStep: (effectId, stepIndex) => {
    set((state) => ({
      tracks: updateStep(state.tracks, effectId, stepIndex, (step) => ({
        ...step,
        active: !step.active,
      })),
    }))
  },

  setStepActive: (effectId, stepIndex, active) => {
    set((state) => ({
      tracks: updateStep(state.tracks, effectId, stepIndex, (step) => ({
        ...step,
        active,
      })),
    }))
  },

  selectStep: (effectId, stepIndex) => {
    set({
      selectedStep: { effectId, stepIndex },
      selectedSteps: [{ effectId, stepIndex }],
    })
  },

  addToSelection: (effectId, stepIndex) => {
    set((state) => {
      const entry = { effectId, stepIndex }
      const already = state.selectedSteps.some(
        (s) => s.effectId === effectId && s.stepIndex === stepIndex,
      )
      if (already) {
        // Deselect
        const filtered = state.selectedSteps.filter(
          (s) => !(s.effectId === effectId && s.stepIndex === stepIndex),
        )
        return {
          selectedSteps: filtered,
          selectedStep: filtered.length > 0 ? filtered[filtered.length - 1] : null,
        }
      }
      const newSelection = [...state.selectedSteps, entry]
      return {
        selectedSteps: newSelection,
        selectedStep: entry,
      }
    })
  },

  clearSelection: () => set({ selectedStep: null, selectedSteps: [] }),

  setStepLock: (effectId, stepIndex, paramId, value) => {
    const state = get()
    // Apply to all selected steps if multi-selecting on same effect
    const targets = state.selectedSteps.length > 1
      ? state.selectedSteps.filter((s) => s.effectId === effectId)
      : [{ effectId, stepIndex }]

    set((state) => {
      let tracks = state.tracks
      for (const target of targets) {
        tracks = updateStep(tracks, target.effectId, target.stepIndex, (step) => ({
          ...step,
          locks: { ...step.locks, [paramId]: value },
        }))
      }
      return { tracks }
    })
  },

  clearStepLock: (effectId, stepIndex, paramId) => {
    set((state) => ({
      tracks: updateStep(state.tracks, effectId, stepIndex, (step) => {
        const { [paramId]: _, ...rest } = step.locks
        return { ...step, locks: rest }
      }),
    }))
  },

  clearAllStepLocks: (effectId, stepIndex) => {
    set((state) => ({
      tracks: updateStep(state.tracks, effectId, stepIndex, (step) => ({
        ...step,
        locks: {},
      })),
    }))
  },

  setStepProbability: (effectId, stepIndex, prob) => {
    set((state) => ({
      tracks: updateStep(state.tracks, effectId, stepIndex, (step) => ({
        ...step,
        probability: Math.max(0, Math.min(1, prob)),
      })),
    }))
  },

  // ─── Utilities ────────────────────────────────────────────────────────

  randomizeTrack: (effectId, density = 0.4) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      const newSteps = track.steps.map((step, i) => ({
        ...step,
        active: i < track.length ? Math.random() < density : step.active,
      }))
      return { tracks: { ...state.tracks, [effectId]: { ...track, steps: newSteps } } }
    })
  },

  randomizeLocks: (effectId, params) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track || params.length === 0) return state
      // Pick a random subset of parameters (1 to half, at least 1)
      const count = Math.max(1, Math.floor(Math.random() * Math.ceil(params.length / 2)) + 1)
      const shuffled = [...params].sort(() => Math.random() - 0.5)
      const chosen = shuffled.slice(0, count)
      const newSteps = track.steps.map((step, i) => {
        if (i >= track.length || !step.active) return step
        const locks = { ...step.locks }
        for (const p of chosen) {
          const range = p.max - p.min
          const raw = p.min + Math.random() * range
          locks[p.id] = Math.round(raw / p.step) * p.step
        }
        return { ...step, locks }
      })
      return { tracks: { ...state.tracks, [effectId]: { ...track, steps: newSteps } } }
    })
  },

  clearTrack: (effectId) => {
    set((state) => {
      const track = state.tracks[effectId]
      if (!track) return state
      const newSteps = track.steps.map((step) => ({
        ...step,
        active: false,
        locks: {},
      }))
      return { tracks: { ...state.tracks, [effectId]: { ...track, steps: newSteps } } }
    })
  },

  // ─── Playback Engine ───────────────────────────────────────────────────

  advanceStep: () => {
    set((state) => ({
      currentStep: (state.currentStep + 1) % 32,
    }))
  },

  resetPlayhead: () => set({ currentStep: 0 }),
}), {
  name: 'effect-sequencer-storage',
  partialize: (state) => ({
    bpm: state.bpm,
    resolution: state.resolution,
    swing: state.swing,
  }),
}))
