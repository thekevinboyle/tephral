import { create } from 'zustand'

// ============================================================================
// Effect Parameter Types
// ============================================================================

export interface HandprintsParams {
  density: number
  fadeSpeed: number
  size: number
}

export interface TarSpreadParams {
  spreadSpeed: number
  threshold: number
  coverage: number
}

export interface TimefallParams {
  intensity: number
  streakCount: number
  ageAmount: number
}

export interface VoidOutParams {
  speed: number
  distortAmount: number
  ringWidth: number
}

export interface StrandWebParams {
  threshold: number
  maxConnections: number
  glowIntensity: number
}

export interface BridgeLinkParams {
  gridSize: number
  edgeSensitivity: number
  opacity: number
}

export interface ChiralPathParams {
  particleCount: number
  trailLength: number
  flowSpeed: number
}

export interface UmbilicalParams {
  tendrilCount: number
  reachDistance: number
  pulseSpeed: number
}

export interface OdradekParams {
  sweepSpeed: number
  revealDuration: number
  pingIntensity: number
}

export interface ChiraliumParams {
  threshold: number
  density: number
  shimmer: number
}

export interface BeachStaticParams {
  grainAmount: number
  invertProbability: number
  flickerSpeed: number
}

export interface DoomsParams {
  haloSize: number
  pulseSpeed: number
  sensitivity: number
}

export interface ChiralCloudParams {
  density: number
  responsiveness: number
  tint: number
}

export interface BBPodParams {
  vignetteSize: number
  tintStrength: number
  causticAmount: number
}

export interface SeamParams {
  riftWidth: number
  parallaxAmount: number
  edgeDistort: number
}

export interface ExtinctionParams {
  erosionSpeed: number
  decayStages: number
  coverage: number
}

// ============================================================================
// Default Parameters
// ============================================================================

export const DEFAULT_HANDPRINTS_PARAMS: HandprintsParams = {
  density: 8,
  fadeSpeed: 0.5,
  size: 1,
}

export const DEFAULT_TAR_SPREAD_PARAMS: TarSpreadParams = {
  spreadSpeed: 0.5,
  threshold: 0.3,
  coverage: 0.5,
}

export const DEFAULT_TIMEFALL_PARAMS: TimefallParams = {
  intensity: 0.5,
  streakCount: 100,
  ageAmount: 0.3,
}

export const DEFAULT_VOID_OUT_PARAMS: VoidOutParams = {
  speed: 0.5,
  distortAmount: 0.5,
  ringWidth: 0.1,
}

export const DEFAULT_STRAND_WEB_PARAMS: StrandWebParams = {
  threshold: 0.6,
  maxConnections: 5,
  glowIntensity: 0.8,
}

export const DEFAULT_BRIDGE_LINK_PARAMS: BridgeLinkParams = {
  gridSize: 32,
  edgeSensitivity: 0.5,
  opacity: 0.6,
}

export const DEFAULT_CHIRAL_PATH_PARAMS: ChiralPathParams = {
  particleCount: 100,
  trailLength: 20,
  flowSpeed: 1,
}

export const DEFAULT_UMBILICAL_PARAMS: UmbilicalParams = {
  tendrilCount: 6,
  reachDistance: 0.7,
  pulseSpeed: 1,
}

export const DEFAULT_ODRADEK_PARAMS: OdradekParams = {
  sweepSpeed: 1,
  revealDuration: 0.3,
  pingIntensity: 0.8,
}

export const DEFAULT_CHIRALIUM_PARAMS: ChiraliumParams = {
  threshold: 0.7,
  density: 0.5,
  shimmer: 0.5,
}

export const DEFAULT_BEACH_STATIC_PARAMS: BeachStaticParams = {
  grainAmount: 0.3,
  invertProbability: 0.1,
  flickerSpeed: 1,
}

export const DEFAULT_DOOMS_PARAMS: DoomsParams = {
  haloSize: 0.5,
  pulseSpeed: 0.5,
  sensitivity: 0.5,
}

export const DEFAULT_CHIRAL_CLOUD_PARAMS: ChiralCloudParams = {
  density: 0.5,
  responsiveness: 0.5,
  tint: 0.5,
}

export const DEFAULT_BB_POD_PARAMS: BBPodParams = {
  vignetteSize: 0.8,
  tintStrength: 0.5,
  causticAmount: 0.3,
}

export const DEFAULT_SEAM_PARAMS: SeamParams = {
  riftWidth: 0.05,
  parallaxAmount: 0.1,
  edgeDistort: 0.5,
}

export const DEFAULT_EXTINCTION_PARAMS: ExtinctionParams = {
  erosionSpeed: 0.3,
  decayStages: 3,
  coverage: 0.5,
}

// ============================================================================
// Snapshot Type
// ============================================================================

export interface StrandSnapshot {
  handprintsEnabled: boolean
  handprintsParams: HandprintsParams
  tarSpreadEnabled: boolean
  tarSpreadParams: TarSpreadParams
  timefallEnabled: boolean
  timefallParams: TimefallParams
  voidOutEnabled: boolean
  voidOutParams: VoidOutParams
  strandWebEnabled: boolean
  strandWebParams: StrandWebParams
  bridgeLinkEnabled: boolean
  bridgeLinkParams: BridgeLinkParams
  chiralPathEnabled: boolean
  chiralPathParams: ChiralPathParams
  umbilicalEnabled: boolean
  umbilicalParams: UmbilicalParams
  odradekEnabled: boolean
  odradekParams: OdradekParams
  chiraliumEnabled: boolean
  chiraliumParams: ChiraliumParams
  beachStaticEnabled: boolean
  beachStaticParams: BeachStaticParams
  doomsEnabled: boolean
  doomsParams: DoomsParams
  chiralCloudEnabled: boolean
  chiralCloudParams: ChiralCloudParams
  bbPodEnabled: boolean
  bbPodParams: BBPodParams
  seamEnabled: boolean
  seamParams: SeamParams
  extinctionEnabled: boolean
  extinctionParams: ExtinctionParams
}

// ============================================================================
// Store Interface
// ============================================================================

interface StrandState {
  // Chiral/BT
  handprintsEnabled: boolean
  handprintsParams: HandprintsParams
  setHandprintsEnabled: (v: boolean) => void
  updateHandprintsParams: (p: Partial<HandprintsParams>) => void

  tarSpreadEnabled: boolean
  tarSpreadParams: TarSpreadParams
  setTarSpreadEnabled: (v: boolean) => void
  updateTarSpreadParams: (p: Partial<TarSpreadParams>) => void

  timefallEnabled: boolean
  timefallParams: TimefallParams
  setTimefallEnabled: (v: boolean) => void
  updateTimefallParams: (p: Partial<TimefallParams>) => void

  voidOutEnabled: boolean
  voidOutParams: VoidOutParams
  setVoidOutEnabled: (v: boolean) => void
  updateVoidOutParams: (p: Partial<VoidOutParams>) => void

  // Strand/Connection
  strandWebEnabled: boolean
  strandWebParams: StrandWebParams
  setStrandWebEnabled: (v: boolean) => void
  updateStrandWebParams: (p: Partial<StrandWebParams>) => void

  bridgeLinkEnabled: boolean
  bridgeLinkParams: BridgeLinkParams
  setBridgeLinkEnabled: (v: boolean) => void
  updateBridgeLinkParams: (p: Partial<BridgeLinkParams>) => void

  chiralPathEnabled: boolean
  chiralPathParams: ChiralPathParams
  setChiralPathEnabled: (v: boolean) => void
  updateChiralPathParams: (p: Partial<ChiralPathParams>) => void

  umbilicalEnabled: boolean
  umbilicalParams: UmbilicalParams
  setUmbilicalEnabled: (v: boolean) => void
  updateUmbilicalParams: (p: Partial<UmbilicalParams>) => void

  // Chiralium/Tech
  odradekEnabled: boolean
  odradekParams: OdradekParams
  setOdradekEnabled: (v: boolean) => void
  updateOdradekParams: (p: Partial<OdradekParams>) => void

  chiraliumEnabled: boolean
  chiraliumParams: ChiraliumParams
  setChiraliumEnabled: (v: boolean) => void
  updateChiraliumParams: (p: Partial<ChiraliumParams>) => void

  beachStaticEnabled: boolean
  beachStaticParams: BeachStaticParams
  setBeachStaticEnabled: (v: boolean) => void
  updateBeachStaticParams: (p: Partial<BeachStaticParams>) => void

  doomsEnabled: boolean
  doomsParams: DoomsParams
  setDoomsEnabled: (v: boolean) => void
  updateDoomsParams: (p: Partial<DoomsParams>) => void

  // Atmosphere
  chiralCloudEnabled: boolean
  chiralCloudParams: ChiralCloudParams
  setChiralCloudEnabled: (v: boolean) => void
  updateChiralCloudParams: (p: Partial<ChiralCloudParams>) => void

  bbPodEnabled: boolean
  bbPodParams: BBPodParams
  setBBPodEnabled: (v: boolean) => void
  updateBBPodParams: (p: Partial<BBPodParams>) => void

  seamEnabled: boolean
  seamParams: SeamParams
  setSeamEnabled: (v: boolean) => void
  updateSeamParams: (p: Partial<SeamParams>) => void

  extinctionEnabled: boolean
  extinctionParams: ExtinctionParams
  setExtinctionEnabled: (v: boolean) => void
  updateExtinctionParams: (p: Partial<ExtinctionParams>) => void

  // Utility methods
  reset: () => void
  getSnapshot: () => StrandSnapshot
  applySnapshot: (snapshot: StrandSnapshot) => void
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useStrandStore = create<StrandState>((set, get) => ({
  // Chiral/BT
  handprintsEnabled: false,
  handprintsParams: { ...DEFAULT_HANDPRINTS_PARAMS },
  setHandprintsEnabled: (v) => set({ handprintsEnabled: v }),
  updateHandprintsParams: (p) => set((s) => ({ handprintsParams: { ...s.handprintsParams, ...p } })),

  tarSpreadEnabled: false,
  tarSpreadParams: { ...DEFAULT_TAR_SPREAD_PARAMS },
  setTarSpreadEnabled: (v) => set({ tarSpreadEnabled: v }),
  updateTarSpreadParams: (p) => set((s) => ({ tarSpreadParams: { ...s.tarSpreadParams, ...p } })),

  timefallEnabled: false,
  timefallParams: { ...DEFAULT_TIMEFALL_PARAMS },
  setTimefallEnabled: (v) => set({ timefallEnabled: v }),
  updateTimefallParams: (p) => set((s) => ({ timefallParams: { ...s.timefallParams, ...p } })),

  voidOutEnabled: false,
  voidOutParams: { ...DEFAULT_VOID_OUT_PARAMS },
  setVoidOutEnabled: (v) => set({ voidOutEnabled: v }),
  updateVoidOutParams: (p) => set((s) => ({ voidOutParams: { ...s.voidOutParams, ...p } })),

  // Strand/Connection
  strandWebEnabled: false,
  strandWebParams: { ...DEFAULT_STRAND_WEB_PARAMS },
  setStrandWebEnabled: (v) => set({ strandWebEnabled: v }),
  updateStrandWebParams: (p) => set((s) => ({ strandWebParams: { ...s.strandWebParams, ...p } })),

  bridgeLinkEnabled: false,
  bridgeLinkParams: { ...DEFAULT_BRIDGE_LINK_PARAMS },
  setBridgeLinkEnabled: (v) => set({ bridgeLinkEnabled: v }),
  updateBridgeLinkParams: (p) => set((s) => ({ bridgeLinkParams: { ...s.bridgeLinkParams, ...p } })),

  chiralPathEnabled: false,
  chiralPathParams: { ...DEFAULT_CHIRAL_PATH_PARAMS },
  setChiralPathEnabled: (v) => set({ chiralPathEnabled: v }),
  updateChiralPathParams: (p) => set((s) => ({ chiralPathParams: { ...s.chiralPathParams, ...p } })),

  umbilicalEnabled: false,
  umbilicalParams: { ...DEFAULT_UMBILICAL_PARAMS },
  setUmbilicalEnabled: (v) => set({ umbilicalEnabled: v }),
  updateUmbilicalParams: (p) => set((s) => ({ umbilicalParams: { ...s.umbilicalParams, ...p } })),

  // Chiralium/Tech
  odradekEnabled: false,
  odradekParams: { ...DEFAULT_ODRADEK_PARAMS },
  setOdradekEnabled: (v) => set({ odradekEnabled: v }),
  updateOdradekParams: (p) => set((s) => ({ odradekParams: { ...s.odradekParams, ...p } })),

  chiraliumEnabled: false,
  chiraliumParams: { ...DEFAULT_CHIRALIUM_PARAMS },
  setChiraliumEnabled: (v) => set({ chiraliumEnabled: v }),
  updateChiraliumParams: (p) => set((s) => ({ chiraliumParams: { ...s.chiraliumParams, ...p } })),

  beachStaticEnabled: false,
  beachStaticParams: { ...DEFAULT_BEACH_STATIC_PARAMS },
  setBeachStaticEnabled: (v) => set({ beachStaticEnabled: v }),
  updateBeachStaticParams: (p) => set((s) => ({ beachStaticParams: { ...s.beachStaticParams, ...p } })),

  doomsEnabled: false,
  doomsParams: { ...DEFAULT_DOOMS_PARAMS },
  setDoomsEnabled: (v) => set({ doomsEnabled: v }),
  updateDoomsParams: (p) => set((s) => ({ doomsParams: { ...s.doomsParams, ...p } })),

  // Atmosphere
  chiralCloudEnabled: false,
  chiralCloudParams: { ...DEFAULT_CHIRAL_CLOUD_PARAMS },
  setChiralCloudEnabled: (v) => set({ chiralCloudEnabled: v }),
  updateChiralCloudParams: (p) => set((s) => ({ chiralCloudParams: { ...s.chiralCloudParams, ...p } })),

  bbPodEnabled: false,
  bbPodParams: { ...DEFAULT_BB_POD_PARAMS },
  setBBPodEnabled: (v) => set({ bbPodEnabled: v }),
  updateBBPodParams: (p) => set((s) => ({ bbPodParams: { ...s.bbPodParams, ...p } })),

  seamEnabled: false,
  seamParams: { ...DEFAULT_SEAM_PARAMS },
  setSeamEnabled: (v) => set({ seamEnabled: v }),
  updateSeamParams: (p) => set((s) => ({ seamParams: { ...s.seamParams, ...p } })),

  extinctionEnabled: false,
  extinctionParams: { ...DEFAULT_EXTINCTION_PARAMS },
  setExtinctionEnabled: (v) => set({ extinctionEnabled: v }),
  updateExtinctionParams: (p) => set((s) => ({ extinctionParams: { ...s.extinctionParams, ...p } })),

  // Utility methods
  reset: () => set({
    handprintsEnabled: false,
    handprintsParams: { ...DEFAULT_HANDPRINTS_PARAMS },
    tarSpreadEnabled: false,
    tarSpreadParams: { ...DEFAULT_TAR_SPREAD_PARAMS },
    timefallEnabled: false,
    timefallParams: { ...DEFAULT_TIMEFALL_PARAMS },
    voidOutEnabled: false,
    voidOutParams: { ...DEFAULT_VOID_OUT_PARAMS },
    strandWebEnabled: false,
    strandWebParams: { ...DEFAULT_STRAND_WEB_PARAMS },
    bridgeLinkEnabled: false,
    bridgeLinkParams: { ...DEFAULT_BRIDGE_LINK_PARAMS },
    chiralPathEnabled: false,
    chiralPathParams: { ...DEFAULT_CHIRAL_PATH_PARAMS },
    umbilicalEnabled: false,
    umbilicalParams: { ...DEFAULT_UMBILICAL_PARAMS },
    odradekEnabled: false,
    odradekParams: { ...DEFAULT_ODRADEK_PARAMS },
    chiraliumEnabled: false,
    chiraliumParams: { ...DEFAULT_CHIRALIUM_PARAMS },
    beachStaticEnabled: false,
    beachStaticParams: { ...DEFAULT_BEACH_STATIC_PARAMS },
    doomsEnabled: false,
    doomsParams: { ...DEFAULT_DOOMS_PARAMS },
    chiralCloudEnabled: false,
    chiralCloudParams: { ...DEFAULT_CHIRAL_CLOUD_PARAMS },
    bbPodEnabled: false,
    bbPodParams: { ...DEFAULT_BB_POD_PARAMS },
    seamEnabled: false,
    seamParams: { ...DEFAULT_SEAM_PARAMS },
    extinctionEnabled: false,
    extinctionParams: { ...DEFAULT_EXTINCTION_PARAMS },
  }),

  getSnapshot: () => {
    const s = get()
    return {
      handprintsEnabled: s.handprintsEnabled,
      handprintsParams: { ...s.handprintsParams },
      tarSpreadEnabled: s.tarSpreadEnabled,
      tarSpreadParams: { ...s.tarSpreadParams },
      timefallEnabled: s.timefallEnabled,
      timefallParams: { ...s.timefallParams },
      voidOutEnabled: s.voidOutEnabled,
      voidOutParams: { ...s.voidOutParams },
      strandWebEnabled: s.strandWebEnabled,
      strandWebParams: { ...s.strandWebParams },
      bridgeLinkEnabled: s.bridgeLinkEnabled,
      bridgeLinkParams: { ...s.bridgeLinkParams },
      chiralPathEnabled: s.chiralPathEnabled,
      chiralPathParams: { ...s.chiralPathParams },
      umbilicalEnabled: s.umbilicalEnabled,
      umbilicalParams: { ...s.umbilicalParams },
      odradekEnabled: s.odradekEnabled,
      odradekParams: { ...s.odradekParams },
      chiraliumEnabled: s.chiraliumEnabled,
      chiraliumParams: { ...s.chiraliumParams },
      beachStaticEnabled: s.beachStaticEnabled,
      beachStaticParams: { ...s.beachStaticParams },
      doomsEnabled: s.doomsEnabled,
      doomsParams: { ...s.doomsParams },
      chiralCloudEnabled: s.chiralCloudEnabled,
      chiralCloudParams: { ...s.chiralCloudParams },
      bbPodEnabled: s.bbPodEnabled,
      bbPodParams: { ...s.bbPodParams },
      seamEnabled: s.seamEnabled,
      seamParams: { ...s.seamParams },
      extinctionEnabled: s.extinctionEnabled,
      extinctionParams: { ...s.extinctionParams },
    }
  },

  applySnapshot: (snapshot) => set({
    handprintsEnabled: snapshot.handprintsEnabled ?? false,
    handprintsParams: snapshot.handprintsParams ? { ...snapshot.handprintsParams } : { ...DEFAULT_HANDPRINTS_PARAMS },
    tarSpreadEnabled: snapshot.tarSpreadEnabled ?? false,
    tarSpreadParams: snapshot.tarSpreadParams ? { ...snapshot.tarSpreadParams } : { ...DEFAULT_TAR_SPREAD_PARAMS },
    timefallEnabled: snapshot.timefallEnabled ?? false,
    timefallParams: snapshot.timefallParams ? { ...snapshot.timefallParams } : { ...DEFAULT_TIMEFALL_PARAMS },
    voidOutEnabled: snapshot.voidOutEnabled ?? false,
    voidOutParams: snapshot.voidOutParams ? { ...snapshot.voidOutParams } : { ...DEFAULT_VOID_OUT_PARAMS },
    strandWebEnabled: snapshot.strandWebEnabled ?? false,
    strandWebParams: snapshot.strandWebParams ? { ...snapshot.strandWebParams } : { ...DEFAULT_STRAND_WEB_PARAMS },
    bridgeLinkEnabled: snapshot.bridgeLinkEnabled ?? false,
    bridgeLinkParams: snapshot.bridgeLinkParams ? { ...snapshot.bridgeLinkParams } : { ...DEFAULT_BRIDGE_LINK_PARAMS },
    chiralPathEnabled: snapshot.chiralPathEnabled ?? false,
    chiralPathParams: snapshot.chiralPathParams ? { ...snapshot.chiralPathParams } : { ...DEFAULT_CHIRAL_PATH_PARAMS },
    umbilicalEnabled: snapshot.umbilicalEnabled ?? false,
    umbilicalParams: snapshot.umbilicalParams ? { ...snapshot.umbilicalParams } : { ...DEFAULT_UMBILICAL_PARAMS },
    odradekEnabled: snapshot.odradekEnabled ?? false,
    odradekParams: snapshot.odradekParams ? { ...snapshot.odradekParams } : { ...DEFAULT_ODRADEK_PARAMS },
    chiraliumEnabled: snapshot.chiraliumEnabled ?? false,
    chiraliumParams: snapshot.chiraliumParams ? { ...snapshot.chiraliumParams } : { ...DEFAULT_CHIRALIUM_PARAMS },
    beachStaticEnabled: snapshot.beachStaticEnabled ?? false,
    beachStaticParams: snapshot.beachStaticParams ? { ...snapshot.beachStaticParams } : { ...DEFAULT_BEACH_STATIC_PARAMS },
    doomsEnabled: snapshot.doomsEnabled ?? false,
    doomsParams: snapshot.doomsParams ? { ...snapshot.doomsParams } : { ...DEFAULT_DOOMS_PARAMS },
    chiralCloudEnabled: snapshot.chiralCloudEnabled ?? false,
    chiralCloudParams: snapshot.chiralCloudParams ? { ...snapshot.chiralCloudParams } : { ...DEFAULT_CHIRAL_CLOUD_PARAMS },
    bbPodEnabled: snapshot.bbPodEnabled ?? false,
    bbPodParams: snapshot.bbPodParams ? { ...snapshot.bbPodParams } : { ...DEFAULT_BB_POD_PARAMS },
    seamEnabled: snapshot.seamEnabled ?? false,
    seamParams: snapshot.seamParams ? { ...snapshot.seamParams } : { ...DEFAULT_SEAM_PARAMS },
    extinctionEnabled: snapshot.extinctionEnabled ?? false,
    extinctionParams: snapshot.extinctionParams ? { ...snapshot.extinctionParams } : { ...DEFAULT_EXTINCTION_PARAMS },
  }),
}))
