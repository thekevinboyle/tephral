import { create } from 'zustand'

export type LFOShape = 'sine' | 'triangle' | 'square' | 'saw' | 'random'

export interface LFOState {
  enabled: boolean
  rate: number       // Hz (0.1 - 20)
  shape: LFOShape
  phase: number      // Internal phase accumulator (0-1)
  currentValue: number  // 0-1 output
  holdValue: number  // For sample-and-hold random
}

export interface RandomState {
  enabled: boolean
  rate: number       // Changes per second (0.1 - 30)
  smoothing: number  // 0-1 (0 = stepped, 1 = smoothed)
  currentValue: number
  targetValue: number
  timeSinceChange: number
}

export interface StepState {
  enabled: boolean
  steps: number[]    // Array of 8 values (0-1)
  currentStep: number
  rate: number       // Steps per second
  currentValue: number
  timeSinceStep: number
}

export interface EnvelopeState {
  enabled: boolean
  attack: number     // 0-2s
  decay: number      // 0-2s
  sustain: number    // 0-1
  release: number    // 0-2s
  phase: 'idle' | 'attack' | 'decay' | 'sustain' | 'release'
  currentValue: number
  phaseStartTime: number
  phaseStartValue: number
}

export type SampleHoldRateMode = 'metronomic' | 'free' | 'hold'
export type SampleHoldClockMode = 'free' | 'gate' | 'sync'

export interface SampleHoldState {
  enabled: boolean
  input: number           // 0-1, the signal being sampled (modulated by other modulators)
  smoothing: number       // 0-1, transition time between samples
  rateMode: SampleHoldRateMode
  rateDivision: number    // For metronomic mode (1 = 1/4 note, 0.5 = 1/8, etc.)
  rateHz: number          // For free mode (Hz)
  rateScale: number       // 0.02 to 50 multiplier
  clockMode: SampleHoldClockMode
  currentValue: number    // Output value
  targetValue: number     // Sampled target
  phase: number           // Clock phase accumulator
  timeSinceSample: number
}

export type ModulatorType = 'lfo' | 'random' | 'step' | 'envelope' | 'sampleHold'

interface ModulationState {
  lfo: LFOState
  random: RandomState
  step: StepState
  envelope: EnvelopeState
  sampleHold: SampleHoldState

  // Assignment mode - which modulator is being assigned to params
  assigningModulator: ModulatorType | null
  setAssigningModulator: (type: ModulatorType | null) => void
  toggleAssignmentMode: (type: ModulatorType) => void

  // Selected modulator - which modulator's params are shown
  selectedModulator: ModulatorType | null
  setSelectedModulator: (type: ModulatorType | null) => void

  // LFO actions
  toggleLFO: () => void
  setLFOEnabled: (enabled: boolean) => void
  setLFORate: (rate: number) => void
  setLFOShape: (shape: LFOShape) => void
  updateLFO: (delta: number) => void

  // Random actions
  toggleRandom: () => void
  setRandomEnabled: (enabled: boolean) => void
  setRandomRate: (rate: number) => void
  setRandomSmoothing: (smoothing: number) => void
  updateRandom: (delta: number) => void

  // Step actions
  toggleStep: () => void
  setStepEnabled: (enabled: boolean) => void
  setStepValue: (index: number, value: number) => void
  setStepRate: (rate: number) => void
  updateStep: (delta: number) => void

  // Envelope actions
  toggleEnvelope: () => void
  setEnvelopeEnabled: (enabled: boolean) => void
  setEnvelopeParams: (params: Partial<Pick<EnvelopeState, 'attack' | 'decay' | 'sustain' | 'release'>>) => void
  triggerEnvelope: () => void
  releaseEnvelope: () => void
  updateEnvelope: (delta: number) => void

  // Sample & Hold actions
  toggleSampleHold: () => void
  setSampleHoldEnabled: (enabled: boolean) => void
  setSampleHoldInput: (input: number) => void
  setSampleHoldSmoothing: (smoothing: number) => void
  setSampleHoldRateMode: (mode: SampleHoldRateMode) => void
  setSampleHoldRateDivision: (division: number) => void
  setSampleHoldRateHz: (hz: number) => void
  setSampleHoldRateScale: (scale: number) => void
  setSampleHoldClockMode: (mode: SampleHoldClockMode) => void
  restartSampleHoldClock: () => void
  updateSampleHold: (delta: number, bpm: number) => void
}

const DEFAULT_STEPS = [0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25]

export const useModulationStore = create<ModulationState>((set, get) => ({
  // LFO State
  lfo: {
    enabled: false,
    rate: 1,
    shape: 'sine',
    phase: 0,
    currentValue: 0.5,
    holdValue: Math.random(),
  },

  // Random State
  random: {
    enabled: false,
    rate: 4,
    smoothing: 0.5,
    currentValue: 0.5,
    targetValue: Math.random(),
    timeSinceChange: 0,
  },

  // Step State
  step: {
    enabled: false,
    steps: [...DEFAULT_STEPS],
    currentStep: 0,
    rate: 2,
    currentValue: DEFAULT_STEPS[0],
    timeSinceStep: 0,
  },

  // Envelope State
  envelope: {
    enabled: false,
    attack: 0.1,
    decay: 0.2,
    sustain: 0.7,
    release: 0.3,
    phase: 'idle',
    currentValue: 0,
    phaseStartTime: 0,
    phaseStartValue: 0,
  },

  // Sample & Hold State
  sampleHold: {
    enabled: false,
    input: 0.5,
    smoothing: 0,
    rateMode: 'metronomic',
    rateDivision: 1,      // 1/4 notes
    rateHz: 4,
    rateScale: 1,
    clockMode: 'free',
    currentValue: 0.5,
    targetValue: 0.5,
    phase: 0,
    timeSinceSample: 0,
  },

  // Assignment mode
  assigningModulator: null,
  setAssigningModulator: (type) => set({ assigningModulator: type }),
  toggleAssignmentMode: (type) => set((state) => ({
    assigningModulator: state.assigningModulator === type ? null : type
  })),

  // Selected modulator
  selectedModulator: null,
  setSelectedModulator: (type) => set({ selectedModulator: type }),

  // LFO Actions
  toggleLFO: () => set((state) => ({ lfo: { ...state.lfo, enabled: !state.lfo.enabled } })),
  setLFOEnabled: (enabled) => set((state) => ({ lfo: { ...state.lfo, enabled } })),
  setLFORate: (rate) => set((state) => ({ lfo: { ...state.lfo, rate: Math.max(0.1, Math.min(20, rate)) } })),
  setLFOShape: (shape) => set((state) => ({ lfo: { ...state.lfo, shape } })),

  updateLFO: (delta) => {
    const { lfo } = get()
    if (!lfo.enabled) return

    // Advance phase
    let newPhase = (lfo.phase + delta * lfo.rate) % 1
    let newValue: number
    let newHoldValue = lfo.holdValue

    // Calculate value based on shape
    switch (lfo.shape) {
      case 'sine':
        newValue = Math.sin(newPhase * Math.PI * 2) * 0.5 + 0.5
        break
      case 'triangle':
        newValue = 1 - Math.abs(newPhase * 2 - 1)
        break
      case 'square':
        newValue = newPhase < 0.5 ? 1 : 0
        break
      case 'saw':
        newValue = newPhase
        break
      case 'random':
        // Sample and hold - new random value at each cycle
        if (newPhase < lfo.phase) {
          // Phase wrapped - new cycle
          newHoldValue = Math.random()
        }
        newValue = newHoldValue
        break
      default:
        newValue = 0.5
    }

    set({ lfo: { ...lfo, phase: newPhase, currentValue: newValue, holdValue: newHoldValue } })
  },

  // Random Actions
  toggleRandom: () => set((state) => ({ random: { ...state.random, enabled: !state.random.enabled } })),
  setRandomEnabled: (enabled) => set((state) => ({ random: { ...state.random, enabled } })),
  setRandomRate: (rate) => set((state) => ({ random: { ...state.random, rate: Math.max(0.1, Math.min(30, rate)) } })),
  setRandomSmoothing: (smoothing) => set((state) => ({ random: { ...state.random, smoothing: Math.max(0, Math.min(1, smoothing)) } })),

  updateRandom: (delta) => {
    const { random } = get()
    if (!random.enabled) return

    const interval = 1 / random.rate
    let newTimeSince = random.timeSinceChange + delta
    let newTarget = random.targetValue
    let newCurrent = random.currentValue

    // Check if it's time for a new target
    if (newTimeSince >= interval) {
      newTarget = Math.random()
      newTimeSince = 0
    }

    // Smoothing: interpolate toward target
    if (random.smoothing > 0) {
      const smoothFactor = 1 - Math.pow(1 - random.smoothing, delta * 60)
      newCurrent = newCurrent + (newTarget - newCurrent) * smoothFactor
    } else {
      // No smoothing - step immediately
      newCurrent = newTarget
    }

    set({ random: { ...random, currentValue: newCurrent, targetValue: newTarget, timeSinceChange: newTimeSince } })
  },

  // Step Actions
  toggleStep: () => set((state) => ({ step: { ...state.step, enabled: !state.step.enabled } })),
  setStepEnabled: (enabled) => set((state) => ({ step: { ...state.step, enabled } })),
  setStepValue: (index, value) => set((state) => {
    const newSteps = [...state.step.steps]
    newSteps[index] = Math.max(0, Math.min(1, value))
    return { step: { ...state.step, steps: newSteps } }
  }),
  setStepRate: (rate) => set((state) => ({ step: { ...state.step, rate: Math.max(0.1, Math.min(20, rate)) } })),

  updateStep: (delta) => {
    const { step } = get()
    if (!step.enabled) return

    const interval = 1 / step.rate
    let newTimeSince = step.timeSinceStep + delta
    let newStep = step.currentStep
    let newValue = step.currentValue

    // Check if it's time to advance
    if (newTimeSince >= interval) {
      newStep = (newStep + 1) % step.steps.length
      newValue = step.steps[newStep]
      newTimeSince = 0
    }

    set({ step: { ...step, currentStep: newStep, currentValue: newValue, timeSinceStep: newTimeSince } })
  },

  // Envelope Actions
  toggleEnvelope: () => set((state) => ({ envelope: { ...state.envelope, enabled: !state.envelope.enabled } })),
  setEnvelopeEnabled: (enabled) => set((state) => ({ envelope: { ...state.envelope, enabled } })),
  setEnvelopeParams: (params) => set((state) => ({ envelope: { ...state.envelope, ...params } })),

  triggerEnvelope: () => set((state) => ({
    envelope: {
      ...state.envelope,
      phase: 'attack',
      phaseStartTime: 0,
      phaseStartValue: state.envelope.currentValue,
    }
  })),

  releaseEnvelope: () => set((state) => ({
    envelope: {
      ...state.envelope,
      phase: state.envelope.phase !== 'idle' ? 'release' : 'idle',
      phaseStartTime: 0,
      phaseStartValue: state.envelope.currentValue,
    }
  })),

  updateEnvelope: (delta) => {
    const { envelope } = get()
    if (!envelope.enabled || envelope.phase === 'idle') return

    let newValue = envelope.currentValue
    let newPhase: EnvelopeState['phase'] = envelope.phase
    let newStartTime = envelope.phaseStartTime + delta
    let newStartValue = envelope.phaseStartValue

    switch (envelope.phase) {
      case 'attack': {
        if (envelope.attack <= 0) {
          newValue = 1
          newPhase = 'decay'
          newStartTime = 0
          newStartValue = 1
        } else {
          const progress = newStartTime / envelope.attack
          newValue = envelope.phaseStartValue + (1 - envelope.phaseStartValue) * Math.min(1, progress)
          if (progress >= 1) {
            newPhase = 'decay'
            newStartTime = 0
            newStartValue = 1
          }
        }
        break
      }
      case 'decay': {
        if (envelope.decay <= 0) {
          newValue = envelope.sustain
          newPhase = 'sustain'
          newStartTime = 0
          newStartValue = envelope.sustain
        } else {
          const progress = newStartTime / envelope.decay
          newValue = 1 - (1 - envelope.sustain) * Math.min(1, progress)
          if (progress >= 1) {
            newPhase = 'sustain'
            newStartTime = 0
            newStartValue = envelope.sustain
          }
        }
        break
      }
      case 'sustain': {
        newValue = envelope.sustain
        break
      }
      case 'release': {
        if (envelope.release <= 0) {
          newValue = 0
          newPhase = 'idle'
          newStartTime = 0
          newStartValue = 0
        } else {
          const progress = newStartTime / envelope.release
          newValue = envelope.phaseStartValue * (1 - Math.min(1, progress))
          if (progress >= 1) {
            newPhase = 'idle'
            newStartTime = 0
            newStartValue = 0
            newValue = 0
          }
        }
        break
      }
    }

    set({
      envelope: {
        ...envelope,
        currentValue: newValue,
        phase: newPhase,
        phaseStartTime: newStartTime,
        phaseStartValue: newStartValue,
      }
    })
  },

  // Sample & Hold Actions
  toggleSampleHold: () => set((state) => ({ sampleHold: { ...state.sampleHold, enabled: !state.sampleHold.enabled } })),
  setSampleHoldEnabled: (enabled) => set((state) => ({ sampleHold: { ...state.sampleHold, enabled } })),
  setSampleHoldInput: (input) => set((state) => ({ sampleHold: { ...state.sampleHold, input: Math.max(0, Math.min(1, input)) } })),
  setSampleHoldSmoothing: (smoothing) => set((state) => ({ sampleHold: { ...state.sampleHold, smoothing: Math.max(0, Math.min(1, smoothing)) } })),
  setSampleHoldRateMode: (rateMode) => set((state) => ({ sampleHold: { ...state.sampleHold, rateMode } })),
  setSampleHoldRateDivision: (rateDivision) => set((state) => ({ sampleHold: { ...state.sampleHold, rateDivision: Math.max(0.0625, Math.min(16, rateDivision)) } })),
  setSampleHoldRateHz: (rateHz) => set((state) => ({ sampleHold: { ...state.sampleHold, rateHz: Math.max(0.1, Math.min(100, rateHz)) } })),
  setSampleHoldRateScale: (rateScale) => set((state) => ({ sampleHold: { ...state.sampleHold, rateScale: Math.max(0.02, Math.min(50, rateScale)) } })),
  setSampleHoldClockMode: (clockMode) => set((state) => ({ sampleHold: { ...state.sampleHold, clockMode } })),
  restartSampleHoldClock: () => set((state) => ({ sampleHold: { ...state.sampleHold, phase: 0, timeSinceSample: 0 } })),

  updateSampleHold: (delta, bpm) => {
    const { sampleHold } = get()
    if (!sampleHold.enabled) return

    // If hold mode, just apply smoothing to current value but don't sample
    if (sampleHold.rateMode === 'hold') {
      // Only smooth toward target, no new samples
      if (sampleHold.smoothing > 0 && sampleHold.currentValue !== sampleHold.targetValue) {
        const smoothFactor = 1 - Math.pow(1 - sampleHold.smoothing, delta * 60)
        const newCurrent = sampleHold.currentValue + (sampleHold.targetValue - sampleHold.currentValue) * smoothFactor
        set({ sampleHold: { ...sampleHold, currentValue: newCurrent } })
      }
      return
    }

    // Calculate effective rate in Hz
    let effectiveHz: number
    if (sampleHold.rateMode === 'metronomic') {
      // Convert BPM and division to Hz
      // rateDivision: 1 = quarter note, 0.5 = eighth note, 2 = half note, etc.
      const beatsPerSecond = bpm / 60
      effectiveHz = beatsPerSecond * sampleHold.rateDivision
    } else {
      // Free mode - use Hz directly
      effectiveHz = sampleHold.rateHz
    }

    // Apply rate scale
    effectiveHz *= sampleHold.rateScale

    const interval = 1 / effectiveHz
    let newTimeSince = sampleHold.timeSinceSample + delta
    let newTarget = sampleHold.targetValue
    let newCurrent = sampleHold.currentValue

    // Check if it's time to sample
    if (newTimeSince >= interval) {
      // Sample the input signal
      newTarget = sampleHold.input
      newTimeSince = newTimeSince % interval // Keep remainder for accuracy
    }

    // Apply smoothing
    if (sampleHold.smoothing > 0) {
      const smoothFactor = 1 - Math.pow(1 - sampleHold.smoothing, delta * 60)
      newCurrent = newCurrent + (newTarget - newCurrent) * smoothFactor
    } else {
      newCurrent = newTarget
    }

    set({
      sampleHold: {
        ...sampleHold,
        currentValue: newCurrent,
        targetValue: newTarget,
        timeSinceSample: newTimeSince,
      }
    })
  },
}))
