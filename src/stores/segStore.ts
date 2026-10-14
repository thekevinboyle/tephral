import { create } from 'zustand'

/** Person-segmentation model state, written by SegmentationService. Not part of snapshots. */
export type SegStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface SegVoxelParams {
  size: number      // 4-64 px, base cell size
  depth: number     // 0-4, cell growth with person coverage
  scatter: number   // 0-1, edge cells fly off
  shading: number   // 0-1, cube face shading
  classes: number   // 0 person, 1 skin, 2 hair, 3 clothes
  debugMask: boolean
  mix: number
}
export const DEFAULT_SEG_VOXEL_PARAMS: SegVoxelParams = {
  size: 12, depth: 1.5, scatter: 0.4, shading: 0.6, classes: 0, debugMask: false, mix: 1,
}

export interface SegEchoParams {
  copies: number    // 1-8
  delay: number     // 1-12 frames between captures
  decay: number     // 0-1, opacity multiplier per copy
  offsetX: number   // -0.1..0.1 uv per copy
  offsetY: number   // -0.1..0.1 uv per copy
  zoom: number      // 0.9-1.1 per copy
  mix: number
}
export const DEFAULT_SEG_ECHO_PARAMS: SegEchoParams = {
  copies: 4, delay: 3, decay: 0.75, offsetX: 0.02, offsetY: 0, zoom: 1, mix: 1,
}

export interface SegMatterParams {
  coverage: number        // 0-1, share of regions swapped
  seed: number            // 0-999, manual reshuffle (modulate to trigger)
  autoReshuffle: boolean
  reshuffleBeats: number  // 1-32
  wBlack: number; wSolid: number; wGradient: number; wZebra: number; wRainbow: number; wMosaic: number // 0-1
  mix: number
}
export const DEFAULT_SEG_MATTER_PARAMS: SegMatterParams = {
  coverage: 0.45, seed: 0, autoReshuffle: true, reshuffleBeats: 4,
  wBlack: 1, wSolid: 1, wGradient: 1, wZebra: 0.6, wRainbow: 1, wMosaic: 0.6, mix: 1,
}

export interface SegStaleParams {
  cellSize: number    // 8-96 px
  threshold: number   // 0-1, change needed to refresh a cell
  refresh: number     // 0-1, random refresh chance per frame
  burst: number       // 0-1, shatter amount
  raggedness: number  // 0-1, cell edge warp
  autoBurst: boolean
  burstBeats: number  // 1-32
  mix: number
}
export const DEFAULT_SEG_STALE_PARAMS: SegStaleParams = {
  cellSize: 28, threshold: 0.12, refresh: 0.04, burst: 0, raggedness: 0.5, autoBurst: false, burstBeats: 8, mix: 1,
}

export interface SegTornParams {
  depth: number      // 0-0.2 of the short side
  blockSize: number  // 4-64 px
  speed: number      // 0-4
  fill: number       // 0 black, 1 smear
  mix: number
}
export const DEFAULT_SEG_TORN_PARAMS: SegTornParams = {
  depth: 0.04, blockSize: 16, speed: 1, fill: 0, mix: 1,
}

export interface SegRedactParams {
  coverage: number        // 0-1, share of people treated
  shape: number           // 0 box, 1 body (person mask inside the box), 2 mixed per person
  cell: number            // 6-64 px, mosaic and dot cell
  pad: number             // 0-0.3, grows each box by this share of its size
  wPixel: number; wGradient: number; wDots: number; wSlick: number; wBlack: number // 0-1
  autoReshuffle: boolean
  reshuffleBeats: number  // 1-32
  linger: number          // 0-2 s, a box outlives its person this long
  seed: number            // 0-999
  mix: number
}
export const DEFAULT_SEG_REDACT_PARAMS: SegRedactParams = {
  coverage: 0.75, shape: 2, cell: 16, pad: 0.04,
  wPixel: 1, wGradient: 1, wDots: 0.4, wSlick: 0.4, wBlack: 0.2,
  autoReshuffle: true, reshuffleBeats: 2, linger: 0.4, seed: 0, mix: 1,
}

export interface SegFaceLockParams {
  insetSize: number  // 0.15-0.5 of the short side
  zoom: number       // 1-4, how tight the face crop is
  insetFx: number    // 0-1, chance per beat that an inset glitches (mosaic, block, edges, dark)
  fxBeats: number    // 1-32
  insets: number     // 0-2 face crops
  hud: number        // 0/1 corner readouts
  box: number        // 0/1 bracket, labels and leader line
  opacity: number    // 0-1 lines and text
  mix: number
}
export const DEFAULT_SEG_FACELOCK_PARAMS: SegFaceLockParams = {
  insetSize: 0.28, zoom: 1.9, insetFx: 0.35, fxBeats: 2, insets: 2, hud: 1, box: 1, opacity: 0.9, mix: 1,
}

export interface SegSnapshot {
  voxelEnabled: boolean; echoEnabled: boolean; matterEnabled: boolean; staleEnabled: boolean; tornEnabled: boolean
  voxelParams: SegVoxelParams; echoParams: SegEchoParams; matterParams: SegMatterParams
  staleParams: SegStaleParams; tornParams: SegTornParams
  // Added later: optional so older banks and presets load (missing = off, defaults)
  redactEnabled?: boolean; redactParams?: SegRedactParams
  faceLockEnabled?: boolean; faceLockParams?: SegFaceLockParams
}

interface SegState extends SegSnapshot {
  redactEnabled: boolean; redactParams: SegRedactParams
  setRedactEnabled: (v: boolean) => void
  updateRedactParams: (p: Partial<SegRedactParams>) => void
  faceLockEnabled: boolean; faceLockParams: SegFaceLockParams
  setFaceLockEnabled: (v: boolean) => void
  updateFaceLockParams: (p: Partial<SegFaceLockParams>) => void
  segStatus: SegStatus
  setSegStatus: (s: SegStatus) => void
  setVoxelEnabled: (v: boolean) => void
  setEchoEnabled: (v: boolean) => void
  setMatterEnabled: (v: boolean) => void
  setStaleEnabled: (v: boolean) => void
  setTornEnabled: (v: boolean) => void
  updateVoxelParams: (p: Partial<SegVoxelParams>) => void
  updateEchoParams: (p: Partial<SegEchoParams>) => void
  updateMatterParams: (p: Partial<SegMatterParams>) => void
  updateStaleParams: (p: Partial<SegStaleParams>) => void
  updateTornParams: (p: Partial<SegTornParams>) => void
  getSnapshot: () => SegSnapshot
  applySnapshot: (s: SegSnapshot | undefined) => void
}

const defaults = () => ({
  voxelEnabled: false, echoEnabled: false, matterEnabled: false, staleEnabled: false, tornEnabled: false,
  redactEnabled: false, redactParams: { ...DEFAULT_SEG_REDACT_PARAMS },
  faceLockEnabled: false, faceLockParams: { ...DEFAULT_SEG_FACELOCK_PARAMS },
  voxelParams: { ...DEFAULT_SEG_VOXEL_PARAMS },
  echoParams: { ...DEFAULT_SEG_ECHO_PARAMS },
  matterParams: { ...DEFAULT_SEG_MATTER_PARAMS },
  staleParams: { ...DEFAULT_SEG_STALE_PARAMS },
  tornParams: { ...DEFAULT_SEG_TORN_PARAMS },
})

export const useSegStore = create<SegState>((set, get) => ({
  ...defaults(),
  segStatus: 'idle',
  setSegStatus: (segStatus) => set({ segStatus }),
  setVoxelEnabled: (v) => set({ voxelEnabled: v }),
  setEchoEnabled: (v) => set({ echoEnabled: v }),
  setMatterEnabled: (v) => set({ matterEnabled: v }),
  setStaleEnabled: (v) => set({ staleEnabled: v }),
  setTornEnabled: (v) => set({ tornEnabled: v }),
  setRedactEnabled: (v) => set({ redactEnabled: v }),
  updateRedactParams: (p) => set((s) => ({ redactParams: { ...s.redactParams, ...p } })),
  setFaceLockEnabled: (v) => set({ faceLockEnabled: v }),
  updateFaceLockParams: (p) => set((s) => ({ faceLockParams: { ...s.faceLockParams, ...p } })),
  updateVoxelParams: (p) => set((s) => ({ voxelParams: { ...s.voxelParams, ...p } })),
  updateEchoParams: (p) => set((s) => ({ echoParams: { ...s.echoParams, ...p } })),
  updateMatterParams: (p) => set((s) => ({ matterParams: { ...s.matterParams, ...p } })),
  updateStaleParams: (p) => set((s) => ({ staleParams: { ...s.staleParams, ...p } })),
  updateTornParams: (p) => set((s) => ({ tornParams: { ...s.tornParams, ...p } })),
  getSnapshot: () => {
    const s = get()
    return {
      voxelEnabled: s.voxelEnabled, echoEnabled: s.echoEnabled, matterEnabled: s.matterEnabled,
      staleEnabled: s.staleEnabled, tornEnabled: s.tornEnabled,
      voxelParams: { ...s.voxelParams }, echoParams: { ...s.echoParams }, matterParams: { ...s.matterParams },
      staleParams: { ...s.staleParams }, tornParams: { ...s.tornParams },
      redactEnabled: s.redactEnabled, redactParams: { ...s.redactParams },
      faceLockEnabled: s.faceLockEnabled, faceLockParams: { ...s.faceLockParams },
    }
  },
  // undefined (older banks/presets) resets to defaults = all disabled
  applySnapshot: (snap) => {
    const d = defaults()
    if (!snap) { set(d); return }
    set({
      voxelEnabled: snap.voxelEnabled, echoEnabled: snap.echoEnabled, matterEnabled: snap.matterEnabled,
      staleEnabled: snap.staleEnabled, tornEnabled: snap.tornEnabled,
      voxelParams: { ...d.voxelParams, ...snap.voxelParams },
      echoParams: { ...d.echoParams, ...snap.echoParams },
      matterParams: { ...d.matterParams, ...snap.matterParams },
      staleParams: { ...d.staleParams, ...snap.staleParams },
      tornParams: { ...d.tornParams, ...snap.tornParams },
      redactEnabled: snap.redactEnabled ?? false,
      redactParams: { ...d.redactParams, ...snap.redactParams },
      faceLockEnabled: snap.faceLockEnabled ?? false,
      faceLockParams: { ...d.faceLockParams, ...snap.faceLockParams },
    })
  },
}))
