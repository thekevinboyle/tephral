import { create } from 'zustand'

/** Loop lengths in beats: ½, 1, 2, 4 and 8 bars of 4/4. */
export const PAD_BEATS = [2, 4, 8, 16, 32] as const
export type PadBeats = (typeof PAD_BEATS)[number]
export type PadMode = 'replace' | 'overdub'

/**
 * What an axis drives: `<effectId>.<paramId>` (a registry param), `<effectId>.effectMix` (its Dry/wet), or a
 * master target: `master.allMix` (every effect's Dry/wet at once), `warp.amount`, `warp.skew`. null = nothing.
 */
export type PadTarget = string | null

export interface PadSettings {
  x: PadTarget
  y: PadTarget
  beats: PadBeats
  mode: PadMode
  /** Bumped when the recorded path changes (the path itself lives in padRuntime, outside React). */
  version: number
}

/** The master pad's id; every other pad is keyed by its effect id. */
export const MASTER_PAD = 'master'

const defaults = (id: string): PadSettings => ({
  x: id === MASTER_PAD ? 'master.allMix' : null,
  y: id === MASTER_PAD ? 'warp.amount' : null,
  beats: 8,
  mode: 'replace',
  version: 0,
})

interface PadState {
  pads: Record<string, PadSettings>
  /** The pad's settings, created with defaults on first use (an effect pad's axes are filled in by the view). */
  ensure: (id: string, init?: Partial<PadSettings>) => void
  update: (id: string, p: Partial<PadSettings>) => void
  bump: (id: string) => void
}

/** X/Y pads (master + one per effect): settings only; recorded paths are in `effects/pads/padRuntime`. Not saved in banks or presets. */
export const usePadStore = create<PadState>((set, get) => ({
  pads: {},
  ensure: (id, init) => {
    if (get().pads[id]) return
    set((s) => ({ pads: { ...s.pads, [id]: { ...defaults(id), ...init } } }))
  },
  update: (id, p) => set((s) => ({ pads: { ...s.pads, [id]: { ...(s.pads[id] ?? defaults(id)), ...p } } })),
  bump: (id) => set((s) => (s.pads[id] ? { pads: { ...s.pads, [id]: { ...s.pads[id], version: s.pads[id].version + 1 } } } : s)),
}))
