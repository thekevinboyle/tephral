import { create } from 'zustand'

// ============================================================================
// Halation - VISION
// ============================================================================
export interface HalationParams {
  threshold: number  // 0-1
  radius: number      // 4-64
  redBias: number     // 0-1
  amount: number       // 0-1
  mix: number          // 0-1, dry/wet
}

export const DEFAULT_HALATION_PARAMS: HalationParams = {
  threshold: 0.75,
  radius: 24,
  redBias: 0.6,
  amount: 0.6,
  mix: 1,
}

// ============================================================================
// Y2K Digicam - VISION
// ============================================================================
export interface Y2kParams {
  flash: number     // 0-1
  vignette: number  // 0-1
  grain: number      // 0-1
  resDown: number    // 1-8
  mix: number         // 0-1, dry/wet
}

export const DEFAULT_Y2K_PARAMS: Y2kParams = {
  flash: 0.7,
  vignette: 0.6,
  grain: 0.4,
  resDown: 2,
  mix: 1,
}

// ============================================================================
// Thermal - VISION
// ============================================================================
export interface ThermalParams {
  palette: number   // 0-2, 0 thermal / 1 nightvision / 2 amber
  gain: number       // 0.5-2
  grain: number      // 0-1
  vignette: number   // 0-1
  mix: number         // 0-1, dry/wet
}

export const DEFAULT_THERMAL_PARAMS: ThermalParams = {
  palette: 0,
  gain: 1,
  grain: 0.3,
  vignette: 0.5,
  mix: 1,
}

// ============================================================================
// Dreamcore - VISION
// ============================================================================
export interface DreamcoreParams {
  bloom: number   // 0-1
  radius: number   // 4-64
  pastel: number   // 0-1
  haze: number      // 0-1
  drift: number     // 0-2
  mix: number        // 0-1, dry/wet
}

export const DEFAULT_DREAMCORE_PARAMS: DreamcoreParams = {
  bloom: 0.6,
  radius: 32,
  pastel: 0.5,
  haze: 0.3,
  drift: 0.5,
  mix: 1,
}

// ============================================================================
// Anamorphic - VISION
// ============================================================================
export interface AnamorphicParams {
  threshold: number  // 0-1
  streak: number       // 0-1
  tint: number          // 0-1
  squeeze: number       // 0-0.3
  mix: number            // 0-1, dry/wet
}

export const DEFAULT_ANAMORPHIC_PARAMS: AnamorphicParams = {
  threshold: 0.8,
  streak: 0.7,
  tint: 0.7,
  squeeze: 0.1,
  mix: 1,
}

// ============================================================================
// Flow Smear - MOTION
// ============================================================================
export interface FlowSmearParams {
  strength: number  // 0-100
  decay: number       // 0-1
  blur: number         // 0-1
  structure: number     // 0-1, resting painterly push from image contrast
  mix: number           // 0-1, dry/wet
}

export const DEFAULT_FLOW_SMEAR_PARAMS: FlowSmearParams = {
  strength: 40,
  decay: 0.9,
  blur: 0.3,
  structure: 0.15,
  mix: 1,
}

// ============================================================================
// Feedback Tunnel - MOTION
// ============================================================================
export interface FeedbackTunnelParams {
  zoom: number       // 0.9-1.1
  rotate: number      // -5 to 5
  decay: number        // 0-1
  hueShift: number     // 0-30
  mix: number            // 0-1, dry/wet
}

export const DEFAULT_FEEDBACK_TUNNEL_PARAMS: FeedbackTunnelParams = {
  zoom: 1.02,
  rotate: 0.8,
  decay: 0.92,
  hueShift: 6,
  mix: 1,
}

// ============================================================================
// Opium Trails - MOTION
// ============================================================================
export interface OpiumTrailsParams {
  decay: number  // 0-1
  crush: number    // 0-1
  desat: number     // 0-1
  mix: number         // 0-1, dry/wet
}

export const DEFAULT_OPIUM_TRAILS_PARAMS: OpiumTrailsParams = {
  decay: 0.9,
  crush: 0.5,
  desat: 0.4,
  mix: 1,
}

// ============================================================================
// Rutt-Etra - MOTION
// ============================================================================
export interface RuttEtraParams {
  lines: number  // 16-128
  depth: number    // 0-100
  tilt: number      // 0-60
  glow: number       // 0-1
  mix: number          // 0-1, dry/wet
}

export const DEFAULT_RUTT_ETRA_PARAMS: RuttEtraParams = {
  lines: 64,
  depth: 40,
  tilt: 30,
  glow: 0.4,
  mix: 1,
}

// ============================================================================
// Reaction Diffusion - MOTION
// ============================================================================
export interface ReactionDiffusionParams {
  feed: number       // 0.01-0.1
  kill: number         // 0.04-0.07
  speed: number         // 1-8
  seedAmt: number       // 0-1
  colorize: number      // 0-1
  mix: number             // 0-1, dry/wet
}

export const DEFAULT_REACTION_DIFFUSION_PARAMS: ReactionDiffusionParams = {
  feed: 0.037,
  kill: 0.06,
  speed: 4,
  seedAmt: 0.4,
  colorize: 0.6,
  mix: 1,
}

// ============================================================================
// Physarum - MOTION
// ============================================================================
export interface PhysarumParams {
  agents: number        // 10000-300000
  sensorAngle: number     // 10-60
  sensorDist: number       // 4-32
  decay: number             // 0.8-0.99
  deposit: number           // 0-1
  lumaBias: number          // 0-1
  mix: number                 // 0-1, dry/wet
}

export const DEFAULT_PHYSARUM_PARAMS: PhysarumParams = {
  agents: 100000,
  sensorAngle: 30,
  sensorDist: 12,
  decay: 0.95,
  deposit: 0.6,
  lumaBias: 0.5,
  mix: 1,
}

// ============================================================================
// Kaleidoscope - DESTROY
// ============================================================================
export interface KaleidoscopeParams {
  segments: number  // 2-16
  spin: number         // -2 to 2
  offset: number        // 0-1
  mix: number              // 0-1, dry/wet
}

export const DEFAULT_KALEIDOSCOPE_PARAMS: KaleidoscopeParams = {
  segments: 6,
  spin: 0.3,
  offset: 0,
  mix: 1,
}

// ============================================================================
// Liquid Morph - DESTROY
// ============================================================================
export interface LiquidMorphParams {
  speed: number          // 0.1-3
  scale: number            // 1-20
  intensity: number         // 0-1
  chromeAmount: number      // 0-1
  mix: number                  // 0-1, dry/wet
}

export const DEFAULT_LIQUID_MORPH_PARAMS: LiquidMorphParams = {
  speed: 0.8,
  scale: 6,
  intensity: 0.5,
  chromeAmount: 0.7,
  mix: 1,
}

// ============================================================================
// Crystallize - DESTROY
// ============================================================================
export interface CrystallizeParams {
  cellCount: number  // 8-128
  shatter: number       // 0-1
  edgeGlow: number       // 0-1
  mix: number               // 0-1, dry/wet
}

export const DEFAULT_CRYSTALLIZE_PARAMS: CrystallizeParams = {
  cellCount: 32,
  shatter: 0.3,
  edgeGlow: 0.4,
  mix: 1,
}

// ============================================================================
// Ripple Warp - DESTROY
// ============================================================================
export interface RippleWarpParams {
  frequency: number  // 1-40
  speed: number         // 0.1-5
  amplitude: number      // 0-1
  decay: number            // 0-1
  mix: number                // 0-1, dry/wet
}

export const DEFAULT_RIPPLE_WARP_PARAMS: RippleWarpParams = {
  frequency: 12,
  speed: 1.5,
  amplitude: 0.3,
  decay: 0.6,
  mix: 1,
}

// ============================================================================
// Fractal Domain - DESTROY
// ============================================================================
export interface FractalDomainParams {
  iterations: number  // 1-8
  zoom: number           // 1-3
  spin: number            // -2 to 2
  mix: number                // 0-1, dry/wet
}

export const DEFAULT_FRACTAL_DOMAIN_PARAMS: FractalDomainParams = {
  iterations: 4,
  zoom: 1.6,
  spin: 0.4,
  mix: 1,
}

// ============================================================================
// Store
// ============================================================================
interface TrendState {
  // Enable states
  halationEnabled: boolean
  y2kEnabled: boolean
  thermalEnabled: boolean
  dreamcoreEnabled: boolean
  anamorphicEnabled: boolean
  flowSmearEnabled: boolean
  feedbackTunnelEnabled: boolean
  opiumTrailsEnabled: boolean
  ruttEtraEnabled: boolean
  reactionDiffusionEnabled: boolean
  physarumEnabled: boolean
  kaleidoscopeEnabled: boolean
  liquidMorphEnabled: boolean
  crystallizeEnabled: boolean
  rippleWarpEnabled: boolean
  fractalDomainEnabled: boolean

  // Parameters
  halationParams: HalationParams
  y2kParams: Y2kParams
  thermalParams: ThermalParams
  dreamcoreParams: DreamcoreParams
  anamorphicParams: AnamorphicParams
  flowSmearParams: FlowSmearParams
  feedbackTunnelParams: FeedbackTunnelParams
  opiumTrailsParams: OpiumTrailsParams
  ruttEtraParams: RuttEtraParams
  reactionDiffusionParams: ReactionDiffusionParams
  physarumParams: PhysarumParams
  kaleidoscopeParams: KaleidoscopeParams
  liquidMorphParams: LiquidMorphParams
  crystallizeParams: CrystallizeParams
  rippleWarpParams: RippleWarpParams
  fractalDomainParams: FractalDomainParams

  // Enable actions
  setHalationEnabled: (enabled: boolean) => void
  setY2kEnabled: (enabled: boolean) => void
  setThermalEnabled: (enabled: boolean) => void
  setDreamcoreEnabled: (enabled: boolean) => void
  setAnamorphicEnabled: (enabled: boolean) => void
  setFlowSmearEnabled: (enabled: boolean) => void
  setFeedbackTunnelEnabled: (enabled: boolean) => void
  setOpiumTrailsEnabled: (enabled: boolean) => void
  setRuttEtraEnabled: (enabled: boolean) => void
  setReactionDiffusionEnabled: (enabled: boolean) => void
  setPhysarumEnabled: (enabled: boolean) => void
  setKaleidoscopeEnabled: (enabled: boolean) => void
  setLiquidMorphEnabled: (enabled: boolean) => void
  setCrystallizeEnabled: (enabled: boolean) => void
  setRippleWarpEnabled: (enabled: boolean) => void
  setFractalDomainEnabled: (enabled: boolean) => void

  // Update actions
  updateHalationParams: (params: Partial<HalationParams>) => void
  updateY2kParams: (params: Partial<Y2kParams>) => void
  updateThermalParams: (params: Partial<ThermalParams>) => void
  updateDreamcoreParams: (params: Partial<DreamcoreParams>) => void
  updateAnamorphicParams: (params: Partial<AnamorphicParams>) => void
  updateFlowSmearParams: (params: Partial<FlowSmearParams>) => void
  updateFeedbackTunnelParams: (params: Partial<FeedbackTunnelParams>) => void
  updateOpiumTrailsParams: (params: Partial<OpiumTrailsParams>) => void
  updateRuttEtraParams: (params: Partial<RuttEtraParams>) => void
  updateReactionDiffusionParams: (params: Partial<ReactionDiffusionParams>) => void
  updatePhysarumParams: (params: Partial<PhysarumParams>) => void
  updateKaleidoscopeParams: (params: Partial<KaleidoscopeParams>) => void
  updateLiquidMorphParams: (params: Partial<LiquidMorphParams>) => void
  updateCrystallizeParams: (params: Partial<CrystallizeParams>) => void
  updateRippleWarpParams: (params: Partial<RippleWarpParams>) => void
  updateFractalDomainParams: (params: Partial<FractalDomainParams>) => void

  // Snapshot for presets
  getSnapshot: () => TrendSnapshot
  applySnapshot: (snapshot: TrendSnapshot) => void
}

export interface TrendSnapshot {
  halationEnabled: boolean
  y2kEnabled: boolean
  thermalEnabled: boolean
  dreamcoreEnabled: boolean
  anamorphicEnabled: boolean
  flowSmearEnabled: boolean
  feedbackTunnelEnabled: boolean
  opiumTrailsEnabled: boolean
  ruttEtraEnabled: boolean
  reactionDiffusionEnabled: boolean
  physarumEnabled: boolean
  kaleidoscopeEnabled: boolean
  liquidMorphEnabled: boolean
  crystallizeEnabled: boolean
  rippleWarpEnabled: boolean
  fractalDomainEnabled: boolean
  halationParams: HalationParams
  y2kParams: Y2kParams
  thermalParams: ThermalParams
  dreamcoreParams: DreamcoreParams
  anamorphicParams: AnamorphicParams
  flowSmearParams: FlowSmearParams
  feedbackTunnelParams: FeedbackTunnelParams
  opiumTrailsParams: OpiumTrailsParams
  ruttEtraParams: RuttEtraParams
  reactionDiffusionParams: ReactionDiffusionParams
  physarumParams: PhysarumParams
  kaleidoscopeParams: KaleidoscopeParams
  liquidMorphParams: LiquidMorphParams
  crystallizeParams: CrystallizeParams
  rippleWarpParams: RippleWarpParams
  fractalDomainParams: FractalDomainParams
}

export const useTrendStore = create<TrendState>()((set, get) => ({
  halationEnabled: false,
  y2kEnabled: false,
  thermalEnabled: false,
  dreamcoreEnabled: false,
  anamorphicEnabled: false,
  flowSmearEnabled: false,
  feedbackTunnelEnabled: false,
  opiumTrailsEnabled: false,
  ruttEtraEnabled: false,
  reactionDiffusionEnabled: false,
  physarumEnabled: false,
  kaleidoscopeEnabled: false,
  liquidMorphEnabled: false,
  crystallizeEnabled: false,
  rippleWarpEnabled: false,
  fractalDomainEnabled: false,

  halationParams: { ...DEFAULT_HALATION_PARAMS },
  y2kParams: { ...DEFAULT_Y2K_PARAMS },
  thermalParams: { ...DEFAULT_THERMAL_PARAMS },
  dreamcoreParams: { ...DEFAULT_DREAMCORE_PARAMS },
  anamorphicParams: { ...DEFAULT_ANAMORPHIC_PARAMS },
  flowSmearParams: { ...DEFAULT_FLOW_SMEAR_PARAMS },
  feedbackTunnelParams: { ...DEFAULT_FEEDBACK_TUNNEL_PARAMS },
  opiumTrailsParams: { ...DEFAULT_OPIUM_TRAILS_PARAMS },
  ruttEtraParams: { ...DEFAULT_RUTT_ETRA_PARAMS },
  reactionDiffusionParams: { ...DEFAULT_REACTION_DIFFUSION_PARAMS },
  physarumParams: { ...DEFAULT_PHYSARUM_PARAMS },
  kaleidoscopeParams: { ...DEFAULT_KALEIDOSCOPE_PARAMS },
  liquidMorphParams: { ...DEFAULT_LIQUID_MORPH_PARAMS },
  crystallizeParams: { ...DEFAULT_CRYSTALLIZE_PARAMS },
  rippleWarpParams: { ...DEFAULT_RIPPLE_WARP_PARAMS },
  fractalDomainParams: { ...DEFAULT_FRACTAL_DOMAIN_PARAMS },

  setHalationEnabled: (enabled) => set({ halationEnabled: enabled }),
  setY2kEnabled: (enabled) => set({ y2kEnabled: enabled }),
  setThermalEnabled: (enabled) => set({ thermalEnabled: enabled }),
  setDreamcoreEnabled: (enabled) => set({ dreamcoreEnabled: enabled }),
  setAnamorphicEnabled: (enabled) => set({ anamorphicEnabled: enabled }),
  setFlowSmearEnabled: (enabled) => set({ flowSmearEnabled: enabled }),
  setFeedbackTunnelEnabled: (enabled) => set({ feedbackTunnelEnabled: enabled }),
  setOpiumTrailsEnabled: (enabled) => set({ opiumTrailsEnabled: enabled }),
  setRuttEtraEnabled: (enabled) => set({ ruttEtraEnabled: enabled }),
  setReactionDiffusionEnabled: (enabled) => set({ reactionDiffusionEnabled: enabled }),
  setPhysarumEnabled: (enabled) => set({ physarumEnabled: enabled }),
  setKaleidoscopeEnabled: (enabled) => set({ kaleidoscopeEnabled: enabled }),
  setLiquidMorphEnabled: (enabled) => set({ liquidMorphEnabled: enabled }),
  setCrystallizeEnabled: (enabled) => set({ crystallizeEnabled: enabled }),
  setRippleWarpEnabled: (enabled) => set({ rippleWarpEnabled: enabled }),
  setFractalDomainEnabled: (enabled) => set({ fractalDomainEnabled: enabled }),

  updateHalationParams: (params) => set((state) => ({
    halationParams: { ...state.halationParams, ...params },
  })),

  updateY2kParams: (params) => set((state) => ({
    y2kParams: { ...state.y2kParams, ...params },
  })),

  updateThermalParams: (params) => set((state) => ({
    thermalParams: { ...state.thermalParams, ...params },
  })),

  updateDreamcoreParams: (params) => set((state) => ({
    dreamcoreParams: { ...state.dreamcoreParams, ...params },
  })),

  updateAnamorphicParams: (params) => set((state) => ({
    anamorphicParams: { ...state.anamorphicParams, ...params },
  })),

  updateFlowSmearParams: (params) => set((state) => ({
    flowSmearParams: { ...state.flowSmearParams, ...params },
  })),

  updateFeedbackTunnelParams: (params) => set((state) => ({
    feedbackTunnelParams: { ...state.feedbackTunnelParams, ...params },
  })),

  updateOpiumTrailsParams: (params) => set((state) => ({
    opiumTrailsParams: { ...state.opiumTrailsParams, ...params },
  })),

  updateRuttEtraParams: (params) => set((state) => ({
    ruttEtraParams: { ...state.ruttEtraParams, ...params },
  })),

  updateReactionDiffusionParams: (params) => set((state) => ({
    reactionDiffusionParams: { ...state.reactionDiffusionParams, ...params },
  })),

  updatePhysarumParams: (params) => set((state) => ({
    physarumParams: { ...state.physarumParams, ...params },
  })),

  updateKaleidoscopeParams: (params) => set((state) => ({
    kaleidoscopeParams: { ...state.kaleidoscopeParams, ...params },
  })),

  updateLiquidMorphParams: (params) => set((state) => ({
    liquidMorphParams: { ...state.liquidMorphParams, ...params },
  })),

  updateCrystallizeParams: (params) => set((state) => ({
    crystallizeParams: { ...state.crystallizeParams, ...params },
  })),

  updateRippleWarpParams: (params) => set((state) => ({
    rippleWarpParams: { ...state.rippleWarpParams, ...params },
  })),

  updateFractalDomainParams: (params) => set((state) => ({
    fractalDomainParams: { ...state.fractalDomainParams, ...params },
  })),

  getSnapshot: () => {
    const state = get()
    return {
      halationEnabled: state.halationEnabled,
      y2kEnabled: state.y2kEnabled,
      thermalEnabled: state.thermalEnabled,
      dreamcoreEnabled: state.dreamcoreEnabled,
      anamorphicEnabled: state.anamorphicEnabled,
      flowSmearEnabled: state.flowSmearEnabled,
      feedbackTunnelEnabled: state.feedbackTunnelEnabled,
      opiumTrailsEnabled: state.opiumTrailsEnabled,
      ruttEtraEnabled: state.ruttEtraEnabled,
      reactionDiffusionEnabled: state.reactionDiffusionEnabled,
      physarumEnabled: state.physarumEnabled,
      kaleidoscopeEnabled: state.kaleidoscopeEnabled,
      liquidMorphEnabled: state.liquidMorphEnabled,
      crystallizeEnabled: state.crystallizeEnabled,
      rippleWarpEnabled: state.rippleWarpEnabled,
      fractalDomainEnabled: state.fractalDomainEnabled,
      halationParams: { ...state.halationParams },
      y2kParams: { ...state.y2kParams },
      thermalParams: { ...state.thermalParams },
      dreamcoreParams: { ...state.dreamcoreParams },
      anamorphicParams: { ...state.anamorphicParams },
      flowSmearParams: { ...state.flowSmearParams },
      feedbackTunnelParams: { ...state.feedbackTunnelParams },
      opiumTrailsParams: { ...state.opiumTrailsParams },
      ruttEtraParams: { ...state.ruttEtraParams },
      reactionDiffusionParams: { ...state.reactionDiffusionParams },
      physarumParams: { ...state.physarumParams },
      kaleidoscopeParams: { ...state.kaleidoscopeParams },
      liquidMorphParams: { ...state.liquidMorphParams },
      crystallizeParams: { ...state.crystallizeParams },
      rippleWarpParams: { ...state.rippleWarpParams },
      fractalDomainParams: { ...state.fractalDomainParams },
    }
  },

  applySnapshot: (snapshot) => set({
    halationEnabled: snapshot.halationEnabled,
    y2kEnabled: snapshot.y2kEnabled,
    thermalEnabled: snapshot.thermalEnabled,
    dreamcoreEnabled: snapshot.dreamcoreEnabled,
    anamorphicEnabled: snapshot.anamorphicEnabled,
    flowSmearEnabled: snapshot.flowSmearEnabled,
    feedbackTunnelEnabled: snapshot.feedbackTunnelEnabled,
    opiumTrailsEnabled: snapshot.opiumTrailsEnabled,
    ruttEtraEnabled: snapshot.ruttEtraEnabled,
    reactionDiffusionEnabled: snapshot.reactionDiffusionEnabled,
    physarumEnabled: snapshot.physarumEnabled,
    kaleidoscopeEnabled: snapshot.kaleidoscopeEnabled,
    liquidMorphEnabled: snapshot.liquidMorphEnabled,
    crystallizeEnabled: snapshot.crystallizeEnabled,
    rippleWarpEnabled: snapshot.rippleWarpEnabled,
    fractalDomainEnabled: snapshot.fractalDomainEnabled,
    halationParams: { ...snapshot.halationParams },
    y2kParams: { ...snapshot.y2kParams },
    thermalParams: { ...snapshot.thermalParams },
    dreamcoreParams: { ...snapshot.dreamcoreParams },
    anamorphicParams: { ...snapshot.anamorphicParams },
    flowSmearParams: { ...snapshot.flowSmearParams },
    feedbackTunnelParams: { ...snapshot.feedbackTunnelParams },
    opiumTrailsParams: { ...snapshot.opiumTrailsParams },
    ruttEtraParams: { ...snapshot.ruttEtraParams },
    reactionDiffusionParams: { ...snapshot.reactionDiffusionParams },
    physarumParams: { ...snapshot.physarumParams },
    kaleidoscopeParams: { ...snapshot.kaleidoscopeParams },
    liquidMorphParams: { ...snapshot.liquidMorphParams },
    crystallizeParams: { ...snapshot.crystallizeParams },
    rippleWarpParams: { ...snapshot.rippleWarpParams },
    fractalDomainParams: { ...snapshot.fractalDomainParams },
  }),
}))
