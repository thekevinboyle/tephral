import { memo, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EffectStep } from '../../stores/effectSequencerStore'

const PLOCK = '#FF4060'

interface EffectStepCellProps {
  stepIndex: number
  step: EffectStep
  isCurrentStep: boolean
  isSelected: boolean
  onMouseDown: (stepIndex: number, e: React.MouseEvent) => void
  onMouseEnter: (stepIndex: number) => void
  onContextMenu: (e: React.MouseEvent) => void
  // Automation right-click drag
  automationParamId: string | null
  automationMin: number
  automationMax: number
  automationStep: number
  lockValue: number | undefined
  onSetLock: (stepIndex: number, value: number) => void
  onActivateStep: (stepIndex: number) => void
  // Generic lock fill (0-1) when no specific automation param is targeted
  genericLockFill?: number
}

export const EffectStepCell = memo(function EffectStepCell({
  stepIndex,
  step,
  isCurrentStep,
  isSelected,
  onMouseDown,
  onMouseEnter,
  onContextMenu,
  automationParamId,
  automationMin,
  automationMax,
  automationStep,
  lockValue,
  onSetLock,
  onActivateStep,
  genericLockFill,
}: EffectStepCellProps) {
  const hasLocks = Object.keys(step.locks).length > 0
  const hasProbability = step.probability < 1
  const isPlayheadHit = isCurrentStep && step.active

  // Right-click drag state
  const isRightDragging = useRef(false)
  const rightDragStartY = useRef(0)
  const rightDragStartValue = useRef(0)
  const [dragTooltip, setDragTooltip] = useState<{ percent: number; x: number; y: number } | null>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2 && automationParamId != null) {
      e.preventDefault()
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      isRightDragging.current = true
      rightDragStartY.current = e.clientY
      const startVal = lockValue ?? (automationMin + automationMax) / 2
      rightDragStartValue.current = startVal
      const pct = Math.round(((startVal - automationMin) / (automationMax - automationMin || 1)) * 100)
      setDragTooltip({ percent: pct, x: e.clientX, y: e.clientY })

      // Activate the step if not already active
      if (!step.active) {
        onActivateStep(stepIndex)
      }
    }
  }, [automationParamId, lockValue, automationMin, automationMax, step.active, stepIndex, onActivateStep])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isRightDragging.current) return
    e.stopPropagation()
    const deltaY = rightDragStartY.current - e.clientY // up = increase
    const sensitivity = (automationMax - automationMin) / 150
    let newValue = rightDragStartValue.current + deltaY * sensitivity
    newValue = Math.max(automationMin, Math.min(automationMax, newValue))
    if (automationStep) {
      newValue = Math.round(newValue / automationStep) * automationStep
    }
    const pct = Math.round(((newValue - automationMin) / (automationMax - automationMin || 1)) * 100)
    setDragTooltip({ percent: pct, x: e.clientX, y: e.clientY })
    onSetLock(stepIndex, newValue)
  }, [stepIndex, automationMin, automationMax, automationStep, onSetLock])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isRightDragging.current) {
      isRightDragging.current = false
      setDragTooltip(null)
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
    }
  }, [])

  // Lock value bar height (0-1 normalized)
  const lockNormalized = lockValue != null
    ? (lockValue - automationMin) / (automationMax - automationMin || 1)
    : 0

  // Show fill: either specific automation lock or generic lock fill
  const showLockBar = (lockValue != null && automationParamId != null) || (genericLockFill != null && genericLockFill > 0)
  const lockBarHeight = lockValue != null && automationParamId != null
    ? lockNormalized
    : (genericLockFill ?? 0)

  return (
    <div
      onMouseDown={(e) => {
        if (e.button === 0) onMouseDown(stepIndex, e)
      }}
      onMouseEnter={() => onMouseEnter(stepIndex)}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu(e)
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => e.stopPropagation()}
      className="relative cursor-pointer select-none touch-none flex flex-col justify-end"
      style={{
        height: '100%',
        minHeight: 56,
        borderRadius: 3,
        backgroundColor: isPlayheadHit
          ? 'var(--bg-hover)'
          : 'var(--bg-elevated)',
        border: step.active && hasLocks
          ? `1.5px solid ${PLOCK}80`
          : '1px solid var(--border)',
        boxShadow: step.active && hasLocks
          ? `0 0 5px ${PLOCK}30, 0 0 10px ${PLOCK}15`
          : isPlayheadHit
            ? 'inset 0 0 8px rgba(149,128,255,0.07)'
            : 'none',
        opacity: hasProbability && step.active ? 0.7 : 1,
        transition: 'background-color 0.06s, border-color 0.06s, box-shadow 0.1s',
      }}
      title={`Step ${stepIndex + 1}${hasLocks ? ` (${Object.keys(step.locks).length} lock${Object.keys(step.locks).length > 1 ? 's' : ''})` : ''}${lockValue != null ? ` [${automationParamId}: ${lockValue.toFixed(2)}]` : ''}`}
    >
      {/* Lock value bar — proportional fill above trig bar */}
      {showLockBar && (
        <div
          className="absolute left-0 right-0"
          style={{
            bottom: step.active ? 10 : 3,
            height: `${Math.max(2, lockBarHeight * 36)}px`,
            margin: '0 3px',
            borderRadius: 1,
            backgroundColor: `${PLOCK}60`,
            transition: 'height 0.05s',
          }}
        />
      )}

      {/* Trig bar — solid bar at bottom for active steps */}
      {step.active && (
        <div
          style={{
            height: 4,
            margin: '0 3px 3px',
            borderRadius: 1,
            backgroundColor: hasLocks ? PLOCK : '#9580FF',
            opacity: isPlayheadHit ? 1 : 0.85,
            transition: 'opacity 0.06s',
          }}
        />
      )}
      {/* Drag tooltip — portal to body so it's never clipped */}
      {dragTooltip && createPortal(
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            left: dragTooltip.x,
            top: dragTooltip.y - 32,
            transform: 'translateX(-50%)',
            backgroundColor: PLOCK,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            boxShadow: `0 2px 8px ${PLOCK}80`,
            zIndex: 9999,
          }}
        >
          {dragTooltip.percent}%
        </div>,
        document.body,
      )}
    </div>
  )
})
