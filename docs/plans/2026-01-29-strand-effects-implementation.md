# Strand Effects Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Death Stranding-inspired "Strand" effects page (Page 4) to the effects grid with 16 new visual effects.

**Architecture:** New Zustand store (`strandStore.ts`) manages effect state. Effects render via `StrandOverlay.tsx` component using Canvas 2D and WebGL layers. Grid integration follows existing patterns from Acid effects.

**Tech Stack:** React, Zustand, Canvas 2D API, WebGL shaders, TypeScript

---

## Task 1: Add Strand Effects to Config

**Files:**
- Modify: `src/config/effects.ts`

**Step 1: Add STRAND_EFFECTS array and update PAGE_NAMES**

Add after the existing EFFECTS array (around line 124):

```typescript
// ═══════════════════════════════════════════════════════════════
// PAGE 4: STRAND (Death Stranding-inspired)
// ═══════════════════════════════════════════════════════════════

export const STRAND_EFFECTS: EffectDefinition[] = [
  // Row 1: Chiral/BT (black/orange)
  { id: 'strand_handprints', label: 'HANDPRINTS', color: '#1a1a1a', row: 'render', page: 4, min: 1, max: 20 },
  { id: 'strand_tar', label: 'TAR', color: '#ff6b35', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'strand_timefall', label: 'TIMEFALL', color: '#4a5568', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'strand_voidout', label: 'VOID OUT', color: '#ff6b35', row: 'render', page: 4, min: 0, max: 100 },

  // Row 2: Strand/Connection (cyan)
  { id: 'strand_web', label: 'STRAND WEB', color: '#00d4ff', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'strand_bridge', label: 'BRIDGE', color: '#00d4ff', row: 'render', page: 4, min: 8, max: 64 },
  { id: 'strand_path', label: 'CHIRAL PATH', color: '#00d4ff', row: 'render', page: 4, min: 10, max: 200 },
  { id: 'strand_umbilical', label: 'UMBILICAL', color: '#00d4ff', row: 'render', page: 4, min: 2, max: 12 },

  // Row 3: Chiralium/Tech (gold)
  { id: 'strand_odradek', label: 'ODRADEK', color: '#ffd700', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'strand_chiralium', label: 'CHIRALIUM', color: '#ffd700', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'strand_beach', label: 'BEACH', color: '#ffd700', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'strand_dooms', label: 'DOOMS', color: '#ffd700', row: 'render', page: 4, min: 0, max: 100 },

  // Row 4: Atmosphere (purple)
  { id: 'strand_cloud', label: 'CHIRAL CLOUD', color: '#7b68ee', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'strand_bbpod', label: 'BB POD', color: '#7b68ee', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'strand_seam', label: 'SEAM', color: '#7b68ee', row: 'render', page: 4, min: 0, max: 100 },
  { id: 'strand_extinction', label: 'EXTINCTION', color: '#7b68ee', row: 'render', page: 4, min: 0, max: 100 },
]
```

**Step 2: Update PAGE_NAMES**

Change line 12 from:
```typescript
export const PAGE_NAMES = ['VISION', 'ACID', 'GLITCH', 'OVERLAY']
```

To:
```typescript
export const PAGE_NAMES = ['VISION', 'ACID', 'GLITCH', 'OVERLAY', 'STRAND']
```

**Step 3: Update getEffectsForPage**

Change line 127-129 from:
```typescript
export const getEffectsForPage = (page: number): EffectDefinition[] => {
  return EFFECTS.filter(e => e.page === page)
}
```

To:
```typescript
export const getEffectsForPage = (page: number): EffectDefinition[] => {
  if (page === 4) return STRAND_EFFECTS
  return EFFECTS.filter(e => e.page === page)
}
```

**Step 4: Verify the build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/config/effects.ts
git commit -m "feat(strand): add strand effects config and page navigation"
```

---

## Task 2: Create Strand Store

**Files:**
- Create: `src/stores/strandStore.ts`

**Step 1: Create the store file with all effect types and defaults**

```typescript
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
```

**Step 2: Verify the build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/stores/strandStore.ts
git commit -m "feat(strand): add strand store with all effect state"
```

---

## Task 3: Wire Up PerformanceGrid

**Files:**
- Modify: `src/components/performance/PerformanceGrid.tsx`

**Step 1: Add import for strandStore**

Add after line 11 (after dataOverlayStore import):

```typescript
import { useStrandStore } from '../../stores/strandStore'
```

**Step 2: Add store hook in component**

Add after line 31 (after dataOverlay):

```typescript
  // Strand store
  const strand = useStrandStore()
```

**Step 3: Update grid page navigation max**

Change line 563 from:
```typescript
disabled={gridPage === 3}
```

To:
```typescript
disabled={gridPage === 4}
```

**Step 4: Add all 16 strand effect cases to getEffectState**

Add these cases after the overlay effects section (around line 501, before the default case):

```typescript
      // ═══════════════════════════════════════════════════════════════
      // PAGE 4: STRAND EFFECTS
      // ═══════════════════════════════════════════════════════════════

      case 'strand_handprints':
        return {
          active: strand.handprintsEnabled,
          value: strand.handprintsParams.density,
          onToggle: () => strand.setHandprintsEnabled(!strand.handprintsEnabled),
          onValueChange: (v: number) => strand.updateHandprintsParams({ density: v }),
        }
      case 'strand_tar':
        return {
          active: strand.tarSpreadEnabled,
          value: strand.tarSpreadParams.coverage * 100,
          onToggle: () => strand.setTarSpreadEnabled(!strand.tarSpreadEnabled),
          onValueChange: (v: number) => strand.updateTarSpreadParams({ coverage: v / 100 }),
        }
      case 'strand_timefall':
        return {
          active: strand.timefallEnabled,
          value: strand.timefallParams.intensity * 100,
          onToggle: () => strand.setTimefallEnabled(!strand.timefallEnabled),
          onValueChange: (v: number) => strand.updateTimefallParams({ intensity: v / 100 }),
        }
      case 'strand_voidout':
        return {
          active: strand.voidOutEnabled,
          value: strand.voidOutParams.distortAmount * 100,
          onToggle: () => strand.setVoidOutEnabled(!strand.voidOutEnabled),
          onValueChange: (v: number) => strand.updateVoidOutParams({ distortAmount: v / 100 }),
        }
      case 'strand_web':
        return {
          active: strand.strandWebEnabled,
          value: strand.strandWebParams.glowIntensity * 100,
          onToggle: () => strand.setStrandWebEnabled(!strand.strandWebEnabled),
          onValueChange: (v: number) => strand.updateStrandWebParams({ glowIntensity: v / 100 }),
        }
      case 'strand_bridge':
        return {
          active: strand.bridgeLinkEnabled,
          value: strand.bridgeLinkParams.gridSize,
          onToggle: () => strand.setBridgeLinkEnabled(!strand.bridgeLinkEnabled),
          onValueChange: (v: number) => strand.updateBridgeLinkParams({ gridSize: v }),
        }
      case 'strand_path':
        return {
          active: strand.chiralPathEnabled,
          value: strand.chiralPathParams.particleCount,
          onToggle: () => strand.setChiralPathEnabled(!strand.chiralPathEnabled),
          onValueChange: (v: number) => strand.updateChiralPathParams({ particleCount: v }),
        }
      case 'strand_umbilical':
        return {
          active: strand.umbilicalEnabled,
          value: strand.umbilicalParams.tendrilCount,
          onToggle: () => strand.setUmbilicalEnabled(!strand.umbilicalEnabled),
          onValueChange: (v: number) => strand.updateUmbilicalParams({ tendrilCount: v }),
        }
      case 'strand_odradek':
        return {
          active: strand.odradekEnabled,
          value: strand.odradekParams.sweepSpeed * 100,
          onToggle: () => strand.setOdradekEnabled(!strand.odradekEnabled),
          onValueChange: (v: number) => strand.updateOdradekParams({ sweepSpeed: v / 100 }),
        }
      case 'strand_chiralium':
        return {
          active: strand.chiraliumEnabled,
          value: strand.chiraliumParams.density * 100,
          onToggle: () => strand.setChiraliumEnabled(!strand.chiraliumEnabled),
          onValueChange: (v: number) => strand.updateChiraliumParams({ density: v / 100 }),
        }
      case 'strand_beach':
        return {
          active: strand.beachStaticEnabled,
          value: strand.beachStaticParams.grainAmount * 100,
          onToggle: () => strand.setBeachStaticEnabled(!strand.beachStaticEnabled),
          onValueChange: (v: number) => strand.updateBeachStaticParams({ grainAmount: v / 100 }),
        }
      case 'strand_dooms':
        return {
          active: strand.doomsEnabled,
          value: strand.doomsParams.haloSize * 100,
          onToggle: () => strand.setDoomsEnabled(!strand.doomsEnabled),
          onValueChange: (v: number) => strand.updateDoomsParams({ haloSize: v / 100 }),
        }
      case 'strand_cloud':
        return {
          active: strand.chiralCloudEnabled,
          value: strand.chiralCloudParams.density * 100,
          onToggle: () => strand.setChiralCloudEnabled(!strand.chiralCloudEnabled),
          onValueChange: (v: number) => strand.updateChiralCloudParams({ density: v / 100 }),
        }
      case 'strand_bbpod':
        return {
          active: strand.bbPodEnabled,
          value: strand.bbPodParams.vignetteSize * 100,
          onToggle: () => strand.setBBPodEnabled(!strand.bbPodEnabled),
          onValueChange: (v: number) => strand.updateBBPodParams({ vignetteSize: v / 100 }),
        }
      case 'strand_seam':
        return {
          active: strand.seamEnabled,
          value: strand.seamParams.riftWidth * 100,
          onToggle: () => strand.setSeamEnabled(!strand.seamEnabled),
          onValueChange: (v: number) => strand.updateSeamParams({ riftWidth: v / 100 }),
        }
      case 'strand_extinction':
        return {
          active: strand.extinctionEnabled,
          value: strand.extinctionParams.coverage * 100,
          onToggle: () => strand.setExtinctionEnabled(!strand.extinctionEnabled),
          onValueChange: (v: number) => strand.updateExtinctionParams({ coverage: v / 100 }),
        }
```

**Step 5: Verify the build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 6: Test in browser**

Run: `npm run dev`
Expected: Can navigate to page 5 (STRAND), see 16 effect buttons, toggle them on/off

**Step 7: Commit**

```bash
git add src/components/performance/PerformanceGrid.tsx
git commit -m "feat(strand): wire up strand effects to performance grid"
```

---

## Task 4: Create StrandOverlay Component Skeleton

**Files:**
- Create: `src/components/overlays/StrandOverlay.tsx`

**Step 1: Create the overlay component with basic structure**

```typescript
/**
 * StrandOverlay.tsx
 * Main orchestrator component for Death Stranding-inspired visual effects
 * Reads from source canvas and renders effects on top
 */

import { useRef, useEffect, useCallback } from 'react'
import { useStrandStore } from '../../stores/strandStore'

interface StrandOverlayProps {
  sourceCanvas: HTMLCanvasElement | null
  width: number
  height: number
}

export function StrandOverlay({ sourceCanvas, width, height }: StrandOverlayProps) {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Animation state
  const frameIdRef = useRef<number>(0)
  const isRunningRef = useRef<boolean>(false)

  // Store refs for animation loop
  const storeRef = useRef(useStrandStore.getState())
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef({ width, height })

  // Sync refs
  const store = useStrandStore()
  storeRef.current = store
  sourceCanvasRef.current = sourceCanvas
  sizeRef.current = { width, height }

  // Check if any effect is enabled
  const anyEnabled =
    store.handprintsEnabled ||
    store.tarSpreadEnabled ||
    store.timefallEnabled ||
    store.voidOutEnabled ||
    store.strandWebEnabled ||
    store.bridgeLinkEnabled ||
    store.chiralPathEnabled ||
    store.umbilicalEnabled ||
    store.odradekEnabled ||
    store.chiraliumEnabled ||
    store.beachStaticEnabled ||
    store.doomsEnabled ||
    store.chiralCloudEnabled ||
    store.bbPodEnabled ||
    store.seamEnabled ||
    store.extinctionEnabled

  // Render frame callback
  const renderFrame = useCallback((time: number) => {
    if (!isRunningRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const source = sourceCanvasRef.current

    if (!canvas || !ctx || !source) {
      frameIdRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const currentStore = storeRef.current
    const { width: w, height: h } = sizeRef.current
    const timeSeconds = time * 0.001

    // Clear canvas
    ctx.clearRect(0, 0, w, h)

    // TODO: Render effects here based on currentStore enabled flags
    // Each effect will be implemented in separate files under ./strand/

    // Placeholder: Draw a simple indicator when any effect is enabled
    if (currentStore.handprintsEnabled) {
      ctx.fillStyle = 'rgba(26, 26, 26, 0.3)'
      ctx.font = '20px monospace'
      ctx.fillText('HANDPRINTS', 20, 40)
    }

    if (currentStore.beachStaticEnabled) {
      // Simple static noise placeholder
      const imageData = ctx.getImageData(0, 0, w, h)
      const data = imageData.data
      const grainAmount = currentStore.beachStaticParams.grainAmount
      for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < grainAmount * 0.1) {
          const noise = Math.random() * 50
          data[i] = data[i + 1] = data[i + 2] = noise
          data[i + 3] = 100
        }
      }
      ctx.putImageData(imageData, 0, 0)
    }

    frameIdRef.current = requestAnimationFrame(renderFrame)
  }, [])

  // Animation loop
  useEffect(() => {
    if (!anyEnabled) {
      isRunningRef.current = false
      return
    }

    isRunningRef.current = true
    frameIdRef.current = requestAnimationFrame(renderFrame)

    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [anyEnabled, renderFrame])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [])

  // Don't render if no effects are enabled
  if (!anyEnabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
    />
  )
}
```

**Step 2: Add StrandOverlay to OverlayContainer**

Modify `src/components/overlays/OverlayContainer.tsx`:

Add import at top:
```typescript
import { StrandOverlay } from './StrandOverlay'
```

Add component at end of return (after DataOverlay, around line 61):
```typescript
      {/* Strand effects overlay */}
      <StrandOverlay sourceCanvas={glCanvas} width={dimensions.width} height={dimensions.height} />
```

**Step 3: Verify the build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 4: Test in browser**

Run: `npm run dev`
Expected: Navigate to STRAND page, enable HANDPRINTS or BEACH effect, see placeholder text/static

**Step 5: Commit**

```bash
git add src/components/overlays/StrandOverlay.tsx src/components/overlays/OverlayContainer.tsx
git commit -m "feat(strand): add StrandOverlay component skeleton"
```

---

## Task 5: Implement Beach Static Effect (First Real Effect)

**Files:**
- Create: `src/components/overlays/strand/beachStaticEffect.ts`
- Modify: `src/components/overlays/StrandOverlay.tsx`

**Step 1: Create the beach static effect**

```typescript
/**
 * beachStaticEffect.ts
 * Grainy otherworldly static with inverted luminance zones
 * Creates the "between worlds" feeling from Beach scenes
 */

import type { BeachStaticParams } from '../../../stores/strandStore'

// State for animation
let lastFlickerTime = 0
let invertBlocks: { x: number; y: number; w: number; h: number }[] = []

export function renderBeachStatic(
  sourceCtx: CanvasRenderingContext2D,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: BeachStaticParams,
  time: number
): void {
  const { grainAmount, invertProbability, flickerSpeed } = params

  // Update invert blocks periodically based on flicker speed
  if (time - lastFlickerTime > (1 / flickerSpeed)) {
    lastFlickerTime = time
    invertBlocks = []

    // Generate random blocks to invert
    const blockCount = Math.floor(invertProbability * 20)
    for (let i = 0; i < blockCount; i++) {
      const blockW = 20 + Math.random() * 100
      const blockH = 10 + Math.random() * 50
      invertBlocks.push({
        x: Math.random() * (width - blockW),
        y: Math.random() * (height - blockH),
        w: blockW,
        h: blockH,
      })
    }
  }

  // Get source image data
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const outputData = ctx.createImageData(width, height)
  const src = sourceData.data
  const out = outputData.data

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4

      let r = src[i]
      let g = src[i + 1]
      let b = src[i + 2]

      // Check if pixel is in an invert block
      let invert = false
      for (const block of invertBlocks) {
        if (x >= block.x && x < block.x + block.w &&
            y >= block.y && y < block.y + block.h) {
          invert = true
          break
        }
      }

      // Invert colors if in block
      if (invert) {
        r = 255 - r
        g = 255 - g
        b = 255 - b
      }

      // Add grain noise
      if (Math.random() < grainAmount) {
        const noise = (Math.random() - 0.5) * 100
        r = Math.max(0, Math.min(255, r + noise))
        g = Math.max(0, Math.min(255, g + noise))
        b = Math.max(0, Math.min(255, b + noise))
      }

      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      out[i + 3] = 255
    }
  }

  ctx.putImageData(outputData, 0, 0)
}
```

**Step 2: Update StrandOverlay to use the effect**

Add import at top of StrandOverlay.tsx:
```typescript
import { renderBeachStatic } from './strand/beachStaticEffect'
```

Add offscreen canvas refs after canvasRef:
```typescript
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
```

Replace the placeholder beach static code in renderFrame with:
```typescript
    // Create offscreen canvas for reading source
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas')
      offscreenCtxRef.current = offscreenCanvasRef.current.getContext('2d')
    }
    const offscreen = offscreenCanvasRef.current
    const sourceCtx = offscreenCtxRef.current

    if (offscreen && sourceCtx) {
      if (offscreen.width !== w || offscreen.height !== h) {
        offscreen.width = w
        offscreen.height = h
      }
      sourceCtx.drawImage(source, 0, 0, w, h)

      if (currentStore.beachStaticEnabled) {
        renderBeachStatic(sourceCtx, ctx, w, h, currentStore.beachStaticParams, timeSeconds)
      }
    }
```

**Step 3: Verify the build compiles**

Run: `npm run build 2>&1 | head -20`
Expected: No TypeScript errors

**Step 4: Test in browser**

Run: `npm run dev`
Expected: Enable BEACH effect, see grainy static with occasional inverted blocks

**Step 5: Commit**

```bash
git add src/components/overlays/strand/beachStaticEffect.ts src/components/overlays/StrandOverlay.tsx
git commit -m "feat(strand): implement beach static effect"
```

---

## Task 6-20: Implement Remaining Effects

Follow the same pattern as Task 5 for each remaining effect. Create individual effect files in `src/components/overlays/strand/`:

- **Task 6:** `handprintsEffect.ts` - Sprite-based handprints
- **Task 7:** `tarSpreadEffect.ts` - Spreading dark liquid
- **Task 8:** `timefallEffect.ts` - Rain streaks with aging
- **Task 9:** `voidOutEffect.ts` - Circular distortion shockwave
- **Task 10:** `strandWebEffect.ts` - Bright point connections
- **Task 11:** `bridgeLinkEffect.ts` - Hexagonal grid overlay
- **Task 12:** `chiralPathEffect.ts` - Motion-following particles
- **Task 13:** `umbilicalEffect.ts` - Pulsing tendrils
- **Task 14:** `odradekEffect.ts` - Radar sweep scanner
- **Task 15:** `chiraliumEffect.ts` - Golden crystal overlay
- **Task 16:** `doomsEffect.ts` - Luminous halos
- **Task 17:** `chiralCloudEffect.ts` - Responsive fog
- **Task 18:** `bbPodEffect.ts` - Amber vignette with caustics
- **Task 19:** `seamEffect.ts` - Vertical rift effect
- **Task 20:** `extinctionEffect.ts` - Edge erosion decay

Each task follows the pattern:
1. Create effect file with render function
2. Import in StrandOverlay
3. Add render call in animation loop
4. Verify build
5. Test in browser
6. Commit

---

## Final Task: Integration Test and Cleanup

**Step 1: Test all effects work together**

Run dev server, navigate to STRAND page, enable multiple effects simultaneously.

**Step 2: Verify recording captures strand effects**

Record a clip with strand effects enabled, export, verify effects appear in output.

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(strand): complete strand effects page implementation"
```
