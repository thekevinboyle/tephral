import { useUIStore } from '../stores/uiStore'

/**
 * Spread onto a control to show `text` in the footer status bar while it is hovered.
 * Uses getState(), so the caller does not subscribe to the UI store.
 */
export function statusHover(text: string) {
  return {
    onMouseEnter: () => useUIStore.getState().setStatusText(text),
    onMouseLeave: () => useUIStore.getState().setStatusText(null),
  }
}
