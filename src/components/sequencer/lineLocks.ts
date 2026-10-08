// Line track locks (spec §5): one flag per effect id in localStorage `seg.lines.locks`. A UI preference: never in
// banks or presets. Every access is wrapped, so a blocked page still works for the session.
import { create } from 'zustand'

const KEY = 'seg.lines.locks'

export function loadLineLocks(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(KEY)
    const v: unknown = raw ? JSON.parse(raw) : {}
    const out: Record<string, boolean> = {}
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k, b] of Object.entries(v)) if (b === true) out[k] = true
    return out
  } catch { return {} }
}

export function saveLineLocks(l: Record<string, boolean>): boolean {
  try { window.localStorage.setItem(KEY, JSON.stringify(l)); return true } catch { return false }
}

interface LineLockState {
  lockMode: boolean
  locks: Record<string, boolean>
  setLockMode: (on: boolean) => void
  toggleLock: (effectId: string) => void
}

export const useLineLockStore = create<LineLockState>((set, get) => ({
  lockMode: false,
  locks: loadLineLocks(),
  setLockMode: (lockMode) => set({ lockMode }),
  toggleLock: (id) => {
    const locks = { ...get().locks }
    if (locks[id]) delete locks[id]
    else locks[id] = true
    saveLineLocks(locks)
    set({ locks })
  },
}))
