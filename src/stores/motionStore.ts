import { create } from 'zustand'

// ============================================================================
// Motion Extract - Isolates only moving pixels
// ============================================================================
export interface MotionExtractParams {
  threshold: number      // 0-1, sensitivity to motion
  frameCount: number     // 2-8, number of frames to compare
  amplify: number        // 1-10, boost small motion
  showOriginal: boolean  // Blend with original or show only motion
  originalMix: number    // 0-1, how much original to show
}

export const DEFAULT_MOTION_EXTRACT_PARAMS: MotionExtractParams = {
  threshold: 0.05,
  frameCount: 3,
  amplify: 2,
  showOriginal: false,
  originalMix: 0,
}

// ============================================================================
// Echo Trail - Ghost trails with decay
// ============================================================================
export interface EchoTrailParams {
  trailCount: number     // 2-16, number of echo frames
  decay: number          // 0-1, how fast trails fade
  offset: number         // 0-0.1, position offset per frame
  colorShift: boolean    // Shift hue over trail
  hueAmount: number      // 0-60, degrees of hue shift
}

export const DEFAULT_ECHO_TRAIL_PARAMS: EchoTrailParams = {
  trailCount: 6,
  decay: 0.85,
  offset: 0,
  colorShift: false,
  hueAmount: 15,
}

// ============================================================================
// Time Smear - Accumulative motion blur
// ============================================================================
export interface TimeSmearParams {
  accumulation: number   // 0-1, how much history to keep
  direction: 'forward' | 'backward' | 'both'
  motionOnly: boolean    // Only smear moving areas
  threshold: number      // Motion detection threshold
}

export const DEFAULT_TIME_SMEAR_PARAMS: TimeSmearParams = {
  accumulation: 0.9,
  direction: 'both',
  motionOnly: false,
  threshold: 0.1,
}

// ============================================================================
// Freeze Mask - Freeze static, show only motion
// ============================================================================
export interface FreezeMaskParams {
  freezeThreshold: number  // 0-1, what counts as static
  updateSpeed: number      // 0-1, how fast static reference updates
  showFreeze: boolean      // Show frozen areas or black
  invertMask: boolean      // Show static instead of motion
}

export const DEFAULT_FREEZE_MASK_PARAMS: FreezeMaskParams = {
  freezeThreshold: 0.03,
  updateSpeed: 0.01,
  showFreeze: true,
  invertMask: false,
}

// ============================================================================
// Store
// ============================================================================
interface MotionState {
  // Enable states
  motionExtractEnabled: boolean
  echoTrailEnabled: boolean
  timeSmearEnabled: boolean
  freezeMaskEnabled: boolean

  // Parameters
  motionExtract: MotionExtractParams
  echoTrail: EchoTrailParams
  timeSmear: TimeSmearParams
  freezeMask: FreezeMaskParams

  // Actions
  setMotionExtractEnabled: (enabled: boolean) => void
  setEchoTrailEnabled: (enabled: boolean) => void
  setTimeSmearEnabled: (enabled: boolean) => void
  setFreezeMaskEnabled: (enabled: boolean) => void

  updateMotionExtract: (params: Partial<MotionExtractParams>) => void
  updateEchoTrail: (params: Partial<EchoTrailParams>) => void
  updateTimeSmear: (params: Partial<TimeSmearParams>) => void
  updateFreezeMask: (params: Partial<FreezeMaskParams>) => void

  // Snapshot for presets
  getSnapshot: () => MotionSnapshot
  applySnapshot: (snapshot: MotionSnapshot) => void
}

export interface MotionSnapshot {
  motionExtractEnabled: boolean
  echoTrailEnabled: boolean
  timeSmearEnabled: boolean
  freezeMaskEnabled: boolean
  motionExtract: MotionExtractParams
  echoTrail: EchoTrailParams
  timeSmear: TimeSmearParams
  freezeMask: FreezeMaskParams
}

export const useMotionStore = create<MotionState>((set, get) => ({
  motionExtractEnabled: false,
  echoTrailEnabled: false,
  timeSmearEnabled: false,
  freezeMaskEnabled: false,

  motionExtract: { ...DEFAULT_MOTION_EXTRACT_PARAMS },
  echoTrail: { ...DEFAULT_ECHO_TRAIL_PARAMS },
  timeSmear: { ...DEFAULT_TIME_SMEAR_PARAMS },
  freezeMask: { ...DEFAULT_FREEZE_MASK_PARAMS },

  setMotionExtractEnabled: (enabled) => set({ motionExtractEnabled: enabled }),
  setEchoTrailEnabled: (enabled) => set({ echoTrailEnabled: enabled }),
  setTimeSmearEnabled: (enabled) => set({ timeSmearEnabled: enabled }),
  setFreezeMaskEnabled: (enabled) => set({ freezeMaskEnabled: enabled }),

  updateMotionExtract: (params) => set((state) => ({
    motionExtract: { ...state.motionExtract, ...params },
  })),

  updateEchoTrail: (params) => set((state) => ({
    echoTrail: { ...state.echoTrail, ...params },
  })),

  updateTimeSmear: (params) => set((state) => ({
    timeSmear: { ...state.timeSmear, ...params },
  })),

  updateFreezeMask: (params) => set((state) => ({
    freezeMask: { ...state.freezeMask, ...params },
  })),

  getSnapshot: () => {
    const state = get()
    return {
      motionExtractEnabled: state.motionExtractEnabled,
      echoTrailEnabled: state.echoTrailEnabled,
      timeSmearEnabled: state.timeSmearEnabled,
      freezeMaskEnabled: state.freezeMaskEnabled,
      motionExtract: { ...state.motionExtract },
      echoTrail: { ...state.echoTrail },
      timeSmear: { ...state.timeSmear },
      freezeMask: { ...state.freezeMask },
    }
  },

  applySnapshot: (snapshot) => set({
    motionExtractEnabled: snapshot.motionExtractEnabled,
    echoTrailEnabled: snapshot.echoTrailEnabled,
    timeSmearEnabled: snapshot.timeSmearEnabled,
    freezeMaskEnabled: snapshot.freezeMaskEnabled,
    motionExtract: { ...snapshot.motionExtract },
    echoTrail: { ...snapshot.echoTrail },
    timeSmear: { ...snapshot.timeSmear },
    freezeMask: { ...snapshot.freezeMask },
  }),
}))
