import { useEffect, useRef, useCallback } from 'react'
import { useDestructionModeStore } from '../stores/destructionModeStore'

const ARROW_SEQUENCE_TIMEOUT = 500
const COMBO_TIMEOUT = 1000
const ESCAPE_HOLD_DURATION = 2000

export function useDestructionMode() {
  const { active, activate, deactivate, setEscapeHeldStart } = useDestructionModeStore()

  const arrowPressesRef = useRef<number[]>([])
  const awaitingComboRef = useRef(false)
  const pressedKeysRef = useRef(new Set<string>())
  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const escapeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearComboTimeout = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current)
      comboTimeoutRef.current = null
    }
  }, [])

  const clearEscapeInterval = useCallback(() => {
    if (escapeIntervalRef.current) {
      clearInterval(escapeIntervalRef.current)
      escapeIntervalRef.current = null
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

    // Handle escape hold for exit
    if (active && e.key === 'Escape') {
      if (!escapeIntervalRef.current) {
        setEscapeHeldStart(Date.now())
        escapeIntervalRef.current = setInterval(() => {
          const start = useDestructionModeStore.getState().escapeHeldStart
          if (start && Date.now() - start >= ESCAPE_HOLD_DURATION) {
            clearEscapeInterval()
            deactivate()
          }
        }, 100)
      }
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
  }, [active, activate, deactivate, setEscapeHeldStart, clearComboTimeout, clearEscapeInterval, checkCombo])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase()

    // Clear escape hold timer
    if (e.key === 'Escape') {
      clearEscapeInterval()
      setEscapeHeldStart(null)
      return
    }

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
  }, [clearEscapeInterval, setEscapeHeldStart])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      clearComboTimeout()
      clearEscapeInterval()
    }
  }, [handleKeyDown, handleKeyUp, clearComboTimeout, clearEscapeInterval])

  return { active }
}
