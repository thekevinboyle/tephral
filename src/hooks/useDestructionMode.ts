import { useEffect, useRef, useCallback } from 'react'
import { useDestructionModeStore } from '../stores/destructionModeStore'
import { useClipStore } from '../stores/clipStore'

const ARROW_SEQUENCE_TIMEOUT = 500
const COMBO_TIMEOUT = 1000

export function useDestructionMode() {
  const { active, activate, deactivate } = useDestructionModeStore()

  const arrowPressesRef = useRef<number[]>([])
  const awaitingComboRef = useRef(false)
  const pressedKeysRef = useRef(new Set<string>())
  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearComboTimeout = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current)
      comboTimeoutRef.current = null
    }
  }, [])

  const checkCombo = useCallback(() => {
    const keys = pressedKeysRef.current
    if (keys.has('shift') && keys.has('d') && keys.has('m')) {
      clearComboTimeout()
      awaitingComboRef.current = false
      activate()
    }
  }, [activate, clearComboTimeout])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase()

    // Handle escape to exit destruction mode immediately
    if (active && e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      // Capture screenshot before deactivating
      const canvas = document.querySelector('[data-video-canvas-container] canvas') as HTMLCanvasElement
      if (canvas) {
        useClipStore.getState().captureDestructionFrame(canvas)
      }
      deactivate()
      return
    }

    // Don't process activation keys if already active
    if (active) return

    // Track arrow down presses for activation sequence
    if (e.key === 'ArrowDown') {
      const now = Date.now()
      // Filter out old presses
      arrowPressesRef.current = arrowPressesRef.current.filter(
        (t) => now - t < ARROW_SEQUENCE_TIMEOUT
      )
      arrowPressesRef.current.push(now)

      // Check for double arrow down
      if (arrowPressesRef.current.length >= 2) {
        awaitingComboRef.current = true
        arrowPressesRef.current = []

        // Set timeout to cancel awaiting state
        clearComboTimeout()
        comboTimeoutRef.current = setTimeout(() => {
          awaitingComboRef.current = false
        }, COMBO_TIMEOUT)
      }
      return
    }

    // Track keys for Shift+D+M combo
    if (awaitingComboRef.current) {
      if (key === 'shift' || e.shiftKey) {
        pressedKeysRef.current.add('shift')
      }
      if (key === 'd') {
        pressedKeysRef.current.add('d')
      }
      if (key === 'm') {
        pressedKeysRef.current.add('m')
      }
      checkCombo()
    }
  }, [active, activate, deactivate, clearComboTimeout, checkCombo])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase()

    // Remove from pressed keys
    if (key === 'shift' || !e.shiftKey) {
      pressedKeysRef.current.delete('shift')
    }
    if (key === 'd') {
      pressedKeysRef.current.delete('d')
    }
    if (key === 'm') {
      pressedKeysRef.current.delete('m')
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      clearComboTimeout()
    }
  }, [handleKeyDown, handleKeyUp, clearComboTimeout])

  return { active }
}
