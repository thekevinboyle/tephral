import { useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'

export function useDrawerShortcuts() {
  const { toggleLeftDrawer, toggleRightDrawer } = useUIStore()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        toggleLeftDrawer()
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        toggleRightDrawer()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleLeftDrawer, toggleRightDrawer])
}
