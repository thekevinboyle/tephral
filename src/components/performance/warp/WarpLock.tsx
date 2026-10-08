// The padlock icon and a group's lock button (spec §5), beside the lock store in warpLocks.ts.
import { memo } from 'react'
import { statusHover } from '../../../utils/statusHover'
import { useWarpLockStore, type LockGroup } from './warpLocks'

const LOCK_NAMES: Record<LockGroup, string> = {
  amount: 'Amount', profile: 'Profile', graph: 'Graph', settings: 'Length, Quantize and Skew', knobs: 'Knobs', output: 'Output',
}

/** Closed or open padlock, drawn in currentColor. */
export function LockIcon({ open = false }: { open?: boolean }) {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1.5" y="5.5" width="8" height="5.5" rx="1" fill="currentColor" stroke="none" />
      <path d={open ? 'M3.3 5.5V3.6a2.2 2.2 0 0 1 4.3-.6' : 'M3.3 5.5V3.6a2.2 2.2 0 0 1 4.4 0v1.9'} strokeLinecap="round" />
    </svg>
  )
}

/** A group's lock (spec §5): shown only in lock mode. Locked = Dice leaves the group alone. */
export const LockButton = memo(function LockButton({ group }: { group: LockGroup }) {
  const show = useWarpLockStore((s) => s.lockMode)
  const locked = useWarpLockStore((s) => s.locks[group])
  if (!show) return null
  const name = LOCK_NAMES[group]
  return (
    <button
      type="button"
      className="seg-warp-lock"
      data-warp-lock={group}
      aria-pressed={locked}
      aria-label={`Lock ${name}`}
      onClick={() => useWarpLockStore.getState().toggleLock(group)}
      {...statusHover(locked ? `${name} locked: Dice keeps it. Click to unlock` : `${name} unlocked: Dice changes it. Click to lock`)}
    >
      <LockIcon open={!locked} />
    </button>
  )
})

