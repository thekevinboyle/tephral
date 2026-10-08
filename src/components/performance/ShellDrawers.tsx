import { memo, useEffect, useRef } from 'react'
import { useUIStore } from '../../stores/uiStore'

/**
 * Scrim behind an open drawer (narrow widths), Escape-to-close, focus management, and closing a
 * stale drawer when the viewport grows past the narrow breakpoint. Always mounted; CSS shows it.
 */
export const ShellDrawers = memo(function ShellDrawers() {
  const drawer = useUIStore((s) => s.drawer)
  const prev = useRef<typeof drawer>(null)
  const resized = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1099.98px)')
    const onChange = () => {
      if (!mq.matches && useUIStore.getState().drawer) { resized.current = true; useUIStore.getState().closeDrawer() }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) useUIStore.getState().closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  // Focus into the drawer on open; back to its footer toggle on close
  useEffect(() => {
    const before = prev.current
    prev.current = drawer
    if (drawer) {
      const el = document.querySelector<HTMLElement>(`[data-area="${drawer}"]`)
      const first = el?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ;(first ?? el)?.focus()
    } else if (before) {
      if (!resized.current) document.querySelector<HTMLElement>(`[data-toggle="${before}"]`)?.focus()
      resized.current = false
    }
  }, [drawer])

  return <div className="seg-scrim" aria-hidden onClick={() => useUIStore.getState().closeDrawer()} />
})
