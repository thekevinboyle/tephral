import { useRef, useCallback, useEffect, useState } from 'react'
import { useRecordingStore } from '../../stores/recordingStore'
import { useUIStore } from '../../stores/uiStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useModulationStore } from '../../stores/modulationStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { Crosshair } from '../ui/MicroVisuals'

const HOLD_THRESHOLD = 200    // ms before hold triggers solo
const DOUBLE_CLICK_GAP = 300  // ms max between clicks for double-click

interface EffectButtonProps {
  id: string
  label: string
  color: string
  active: boolean
  mix: number  // 0-1 dry/wet mix
  onToggle: () => void
  onMixChange: (value: number) => void
  isSoloed?: boolean
  isMuted?: boolean
  statusText?: string
  disabled?: boolean
}

export function EffectButton({
  id,
  label,
  color,
  active,
  mix,
  onToggle,
  onMixChange,
  isSoloed = false,
  isMuted = false,
  statusText,
  disabled = false,
}: EffectButtonProps) {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)
  const didDrag = useRef(false)
  const addEvent = useRecordingStore((s) => s.addEvent)
  const isRecording = useRecordingStore((s) => s.isRecording)
  const setSelectedEffect = useUIStore((s) => s.setSelectedEffect)
  const selectEffectForInfoPanel = useUIStore((s) => s.selectEffect)
  const setStatusText = useUIStore((s) => s.setStatusText)
  const setSelectedModulator = useModulationStore((s) => s.setSelectedModulator)

  // Solo state and actions
  const { soloEffectId, soloLatched, setSolo, clearSolo } = useGlitchEngineStore()

  // Shared transport clock — active cells breathe on the beat while playing,
  // fall back to the slow ambient breathe (class default) when paused
  const bpm = useEffectSequencerStore((s) => s.bpm)
  const seqPlaying = useEffectSequencerStore((s) => s.isPlaying)
  const beatDuration = seqPlaying ? `${60 / bpm}s` : undefined

  // Activation pop — fires only on off→on transitions, not initial mount
  const [popping, setPopping] = useState(false)
  const prevActive = useRef(active)
  useEffect(() => {
    if (active && !prevActive.current) setPopping(true)
    prevActive.current = active
  }, [active])

  // Gesture detection refs
  const lastClickTime = useRef<number>(0)
  const holdTimer = useRef<number | null>(null)
  const isHolding = useRef(false)
  const pointerDownTime = useRef<number>(0)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartValue.current = mix
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
  }, [mix, active, id, setSolo, disabled])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return

    const deltaY = dragStartY.current - e.clientY

    // Only count as drag if moved more than 5px
    if (Math.abs(deltaY) > 5) {
      didDrag.current = true
      // Mix is 0-1, sensitivity of 0.01 per pixel
      const sensitivity = 0.01
      const newMix = Math.min(1, Math.max(0, dragStartValue.current + deltaY * sensitivity))
      onMixChange(newMix)
    }
  }, [onMixChange])

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

    // Record mix change if we dragged
    if (wasDrag && isRecording) {
      addEvent({ effect: id, mix })
    }

    // Shift+click = select for info panel only (no toggle)
    if (!wasDrag && e.shiftKey && elapsed < HOLD_THRESHOLD) {
      selectEffectForInfoPanel(id)
      dragStartY.current = null
      didDrag.current = false
      isHolding.current = false
      return
    }

    // Regular click also shows effect info (along with toggling)
    if (!wasDrag && elapsed < HOLD_THRESHOLD) {
      selectEffectForInfoPanel(id)
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
            setSelectedModulator(null) // Clear modulator selection
            if (isRecording) {
              addEvent({ effect: id, action: active ? 'off' : 'on', mix })
            }
          }
        }

        lastClickTime.current = now
      }
    }

    dragStartY.current = null
    didDrag.current = false
    isHolding.current = false
  }, [onToggle, isRecording, addEvent, id, active, mix, setSelectedEffect, setSelectedModulator, selectEffectForInfoPanel, soloEffectId, soloLatched, setSolo, clearSolo])

  // Handle pointer leave - clear momentary solo if not latched
  const handlePointerLeave = useCallback(() => {
    // Clear hold timer
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    // If we're in momentary solo (not latched), clear it
    if (soloEffectId === id && !soloLatched) {
      clearSolo()
    }
    // Reset state
    dragStartY.current = null
    didDrag.current = false
    isHolding.current = false
    // Clear status text
    if (statusText) setStatusText(null)
  }, [id, soloEffectId, soloLatched, clearSolo, statusText, setStatusText])

  // Mix percentage for the progress bar (0-100%)
  const mixPercent = Math.round(mix * 100)

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={(e) => {
        handlePointerLeave()
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'var(--bg-surface)'
          e.currentTarget.style.borderColor = isSoloed ? 'var(--text-primary)' : active ? color : 'var(--border)'
        }
      }}
      onPointerCancel={handlePointerLeave}
      onMouseEnter={(e) => {
        if (statusText) setStatusText(statusText)
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
          e.currentTarget.style.borderColor = isSoloed ? 'var(--text-primary)' : active ? color : 'var(--border-emphasis)'
        }
      }}
      onAnimationEnd={(e) => {
        if (e.animationName === 'cell-pop') setPopping(false)
      }}
      className={`relative rounded-sm flex select-none touch-none w-full h-full p-1.5 overflow-hidden press-physical ${popping ? 'cell-pop' : ''}`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: isSoloed ? '1px solid var(--text-primary)' : active ? `1px solid ${color}` : '1px solid var(--border)',
        opacity: disabled ? 0.25 : isMuted ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
        pointerEvents: disabled ? 'none' : 'auto',
        boxShadow: isSoloed
          ? '0 0 8px var(--accent-glow)'
          : active
            ? `inset 3px 0 0 ${color}, var(--shadow-button)`
            : 'var(--shadow-button)',
        transition:
          'background-color 0.12s, box-shadow var(--dur-settle) var(--ease-out-expo), border-color var(--dur-settle) var(--ease-out-expo), opacity var(--dur-settle) var(--ease-out-expo), transform var(--dur-instant) var(--ease-snap)',
      }}
    >
      {/* Live glow overlay — breathes on the beat while running, fades (not cuts) on toggle off */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none rounded-sm"
        style={{
          opacity: active && !isMuted && !disabled ? 1 : 0,
          transition: 'opacity var(--dur-settle) var(--ease-out-expo)',
        }}
      >
        <div
          className="absolute inset-0 alive-idle"
          style={{
            boxShadow: `inset 0 0 14px ${color}26`,
            animationDuration: beatDuration,
          }}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-center relative">
        {/* Label */}
        <span
          className="text-[11px] font-semibold truncate uppercase tracking-wide"
          style={{
            color: active ? color : 'var(--text-secondary)',
            transition: 'color var(--dur-settle) var(--ease-out-expo)',
          }}
        >
          {label}
        </span>
        {/* Running LED — pulses with the transport */}
        <span
          aria-hidden
          className="absolute top-0 right-0 w-1 h-1 pointer-events-none"
          style={{
            opacity: active && !isMuted ? 1 : 0,
            transition: 'opacity var(--dur-settle) var(--ease-out-expo)',
          }}
        >
          <span
            className="absolute inset-0 rounded-full alive-idle"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 4px ${color}`,
              animationDuration: beatDuration,
            }}
          />
        </span>
        {/* Active indicator */}
        {active && (
          <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none">
            <Crosshair value={mix} size={22} color={color} />
          </div>
        )}
      </div>

      {/* Vertical progress bar on the right - shows mix level */}
      <div
        className="rounded-sm ml-1.5 relative overflow-hidden"
        style={{
          width: 4,
          backgroundColor: 'var(--border)',
          boxShadow: 'var(--shadow-inset)',
        }}
      >
        {/* Fill from bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-sm transition-all duration-150"
          style={{
            height: `${mixPercent}%`,
            backgroundColor: active ? color : 'var(--text-ghost)',
          }}
        />
      </div>
    </div>
  )
}
