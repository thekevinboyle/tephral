import { useRef, useCallback, useEffect, useState } from 'react'
import { useRecordingStore } from '../../stores/recordingStore'
import { useUIStore } from '../../stores/uiStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'

const HOLD_THRESHOLD = 200    // ms before hold triggers solo
const DOUBLE_CLICK_GAP = 300  // ms max between clicks for double-click

interface EffectButtonProps {
  id: string
  label: string
  color: string
  active: boolean
  value: number
  min?: number
  max?: number
  onToggle: () => void
  onValueChange: (value: number) => void
  isSoloed?: boolean
  isMuted?: boolean
}

export function EffectButton({
  id,
  label,
  color,
  active,
  value,
  min = 0,
  max = 100,
  onToggle,
  onValueChange,
  isSoloed = false,
  isMuted = false,
}: EffectButtonProps) {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)
  const didDrag = useRef(false)
  const addEvent = useRecordingStore((s) => s.addEvent)
  const isRecording = useRecordingStore((s) => s.isRecording)
  const setSelectedEffect = useUIStore((s) => s.setSelectedEffect)

  // Solo state and actions
  const { soloEffectId, soloLatched, setSolo, clearSolo } = useGlitchEngineStore()

  // Gesture detection refs
  const lastClickTime = useRef<number>(0)
  const holdTimer = useRef<number | null>(null)
  const isHolding = useRef(false)
  const pointerDownTime = useRef<number>(0)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartValue.current = value
    didDrag.current = false
    isHolding.current = false
    pointerDownTime.current = Date.now()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    // Start hold timer for solo
    if (holdTimer.current) clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      if (dragStartY.current !== null && !didDrag.current) {
        isHolding.current = true
        // Start momentary solo (only if effect is active)
        if (active) {
          setSolo(id, false)
        }
      }
    }, HOLD_THRESHOLD)
  }, [value, active, id, setSolo])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return

    const deltaY = dragStartY.current - e.clientY

    // Only count as drag if moved more than 5px
    if (Math.abs(deltaY) > 5) {
      didDrag.current = true
      const range = max - min
      const sensitivity = range / 100
      const newValue = Math.min(max, Math.max(min, dragStartValue.current + deltaY * sensitivity))
      onValueChange(newValue)
    }
  }, [min, max, onValueChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // Ignore
    }

    // Clear hold timer
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }

    const wasDrag = didDrag.current
    const wasHolding = isHolding.current
    const elapsed = Date.now() - pointerDownTime.current
    const now = Date.now()

    // Record parameter change if we dragged
    if (wasDrag && isRecording) {
      addEvent({ effect: id, param: value })
    }

    // Handle solo/latch/toggle logic
    if (!wasDrag) {
      if (wasHolding) {
        // Was holding for momentary solo - end it (unless it got latched)
        if (!soloLatched) {
          clearSolo()
        }
      } else if (elapsed < HOLD_THRESHOLD) {
        // Quick tap - check for double-click
        const timeSinceLastClick = now - lastClickTime.current

        if (timeSinceLastClick < DOUBLE_CLICK_GAP) {
          // Double-click detected
          if (soloEffectId === id && soloLatched) {
            // Already latched on this effect - unlatch
            clearSolo()
          } else if (active) {
            // Latch solo on this effect
            setSolo(id, true)
          }
        } else {
          // Single click
          if (soloEffectId === id && soloLatched) {
            // Clicking the latched solo effect - unlatch
            clearSolo()
          } else {
            // Normal toggle
            onToggle()
            setSelectedEffect(id)
            if (isRecording) {
              addEvent({ effect: id, action: active ? 'off' : 'on', param: value })
            }
          }
        }

        lastClickTime.current = now
      }
    }

    dragStartY.current = null
    didDrag.current = false
    isHolding.current = false
  }, [onToggle, isRecording, addEvent, id, active, value, setSelectedEffect, soloEffectId, soloLatched, setSolo, clearSolo])

  // Value percentage for the progress bar
  const percentage = ((value - min) / (max - min)) * 100

  // Determine display color based on muted state
  const displayColor = isMuted ? '#999999' : color

  // Flashing state for latched solo
  const [flashOn, setFlashOn] = useState(true)
  useEffect(() => {
    if (isSoloed && soloLatched) {
      const interval = setInterval(() => {
        setFlashOn((prev) => !prev)
      }, 400) // Flash every 400ms
      return () => clearInterval(interval)
    } else {
      setFlashOn(true)
    }
  }, [isSoloed, soloLatched])

  // Backlit shadow for solo states
  const getSoloShadow = () => {
    if (!isSoloed) return 'none'
    const shadowOpacity = soloLatched && !flashOn ? 0.2 : 0.6
    return `0 0 20px rgba(${hexToRgb(color)}, ${shadowOpacity}), 0 0 40px rgba(${hexToRgb(color)}, ${shadowOpacity * 0.5})`
  }

  // Helper to convert hex to rgb values
  function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    }
    return '255, 255, 255'
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative rounded-lg flex select-none touch-none cursor-pointer w-full h-full p-2"
      style={{
        backgroundColor: active ? '#f5f5f5' : '#ffffff',
        border: isSoloed ? `2px solid ${color}` : active ? `1px solid ${color}60` : '1px solid #d0d0d0',
        opacity: isMuted ? 0.5 : 1,
        boxShadow: getSoloShadow(),
        transition: 'box-shadow 0.15s ease-out, border 0.15s ease-out, background-color 0.15s ease-out',
      }}
    >
      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-between">
        {/* LED indicator + label */}
        <div className="flex items-center gap-1.5">
          {/* LED - only this gets a glow when active */}
          <div
            className="w-2 h-2 rounded-full transition-all duration-150 shrink-0"
            style={{
              backgroundColor: active ? displayColor : '#d0d0d0',
              boxShadow: active && !isMuted ? `0 0 8px ${color}` : 'none',
            }}
          />
          <span
            className="text-[11px] font-medium truncate"
            style={{ color: active ? '#1a1a1a' : '#666666' }}
          >
            {label}
          </span>
        </div>

        {/* Parameter value */}
        <span
          className="text-[11px] tabular-nums font-medium"
          style={{
            color: active ? '#1a1a1a' : '#999999',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {Math.round(value)}
        </span>
      </div>

      {/* Vertical progress bar on the right - flat style */}
      <div
        className="w-1 rounded-full ml-2 relative overflow-hidden"
        style={{
          backgroundColor: '#e0e0e0',
        }}
      >
        {/* Fill from bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
          style={{
            height: `${percentage}%`,
            backgroundColor: active ? displayColor : '#999999',
          }}
        />
      </div>
    </div>
  )
}
