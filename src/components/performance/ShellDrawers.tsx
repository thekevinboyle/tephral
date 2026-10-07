import { memo, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'

/** Scrim behind an open drawer (narrow widths) plus Escape-to-close. Always mounted; CSS shows it. */
export const ShellDrawers = memo(function ShellDrawers() {
  const open = useUIStore((s) => s.drawer != null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') useUIStore.getState().closeDrawer() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return <div className="seg-scrim" aria-hidden onClick={() => useUIStore.getState().closeDrawer()} />
})
