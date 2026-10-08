// Dice locks (spec §5): which groups Dice leaves alone. A UI preference saved in localStorage under
// `seg.warp.locks`, never in banks or presets. Every access is wrapped in try/catch: with storage unavailable
// (private mode, blocked site data) the defaults are used and changes last for the session only.
import { create } from 'zustand'

export type LockGroup = 'amount' | 'profile' | 'graph' | 'settings' | 'knobs' | 'output'
export type WarpLocks = Record<LockGroup, boolean>

export const LOCK_GROUPS: readonly LockGroup[] = ['amount', 'profile', 'graph', 'settings', 'knobs', 'output']

/** Amount and Profile are locked by default. */
export const DEFAULT_LOCKS: Readonly<WarpLocks> = { amount: true, profile: true, graph: false, settings: false, knobs: false, output: false }

const KEY = 'seg.warp.locks'

/** Saved locks; a missing or unusable value (or storage unavailable) gives the defaults, key by key. */
export function loadLocks(): WarpLocks {
  const out: WarpLocks = { ...DEFAULT_LOCKS }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return out
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return out
    for (const g of LOCK_GROUPS) {
      const v = (parsed as Record<string, unknown>)[g]
      if (typeof v === 'boolean') out[g] = v
    }
    return out
  } catch {
    return out
  }
}

/** False when storage is unavailable. */
export function saveLocks(locks: WarpLocks): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(locks))
    return true
  } catch {
    return false
  }
}

interface LockState {
  /** Lock mode (the 🔒 button): each group shows its lock. Not saved. */
  lockMode: boolean
  locks: WarpLocks
  setLockMode: (v: boolean) => void
  toggleLock: (g: LockGroup) => void
  setLocks: (l: WarpLocks) => void
}

export const useWarpLockStore = create<LockState>((set, get) => ({
  lockMode: false,
  locks: loadLocks(),
  setLockMode: (lockMode) => set({ lockMode }),
  toggleLock: (g) => {
    const locks = { ...get().locks, [g]: !get().locks[g] }
    set({ locks })
    saveLocks(locks)
  },
  setLocks: (l) => {
    const locks = { ...l }
    set({ locks })
    saveLocks(locks)
  },
}))

/** True when `g` is locked and lock mode is on: the group shows the --warp outline. */
export const useLockOutline = (g: LockGroup) => useWarpLockStore((s) => s.lockMode && s.locks[g])
