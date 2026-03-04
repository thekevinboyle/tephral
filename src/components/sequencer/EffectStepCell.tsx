import { memo, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EffectStep } from '../../stores/effectSequencerStore'

const PLOCK = '#FF4060'
const PROB = '#CCDD00'

interface EffectStepCellProps {
  stepIndex: number
  step: EffectStep
  isCurrentStep: boolean
  isSelected: boolean
  retrig?: number
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
  onSetProbability: (stepIndex: number, value: number) => void
  // Generic lock fill (0-1) when no specific automation param is targeted
  genericLockFill?: number
}

export const EffectStepCell = memo(function EffectStepCell({
  stepIndex,
  step,
  isCurrentStep,
  isSelected: _isSelected,
  retrig = 0,
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
  onSetProbability,
  genericLockFill,
}: EffectStepCellProps) {
  void _isSelected
  const hasLocks = Object.keys(step.locks).length > 0
  const hasProbability = step.probability < 1
  const isPlayheadHit = isCurrentStep && step.active

  // Right-click drag state (p-lock automation)
  const isRightDragging = useRef(false)
  const rightDragStartY = useRef(0)
  const rightDragStartValue = useRef(0)
  const [dragTooltip, setDragTooltip] = useState<{ percent: number; x: number; y: number } | null>(null)

  // Cmd/Ctrl+click drag state (probability)
  const isProbDragging = useRef(false)
  const probDragStartY = useRef(0)
  const probDragStartValue = useRef(0)
  const [probTooltip, setProbTooltip] = useState<{ percent: number; x: number; y: number } | null>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Cmd/Ctrl + left-click: probability drag
    if (e.button === 0 && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      e.stopPropagation()
      isProbDragging.current = true
      probDragStartY.current = e.clientY

      // Set initial probability from click position within cell (bottom=0, top=1)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const relY = 1 - (e.clientY - rect.top) / rect.height
      const initProb = Math.round(Math.max(0, Math.min(1, relY)) * 20) / 20
      probDragStartValue.current = initProb
      onSetProbability(stepIndex, initProb)
      setProbTooltip({ percent: Math.round(initProb * 100), x: e.clientX, y: e.clientY })

      // Activate the step if not already active
      if (!step.active) {
        onActivateStep(stepIndex)
      }

      const onMove = (ev: PointerEvent) => {
        const deltaY = probDragStartY.current - ev.clientY
        const raw = probDragStartValue.current + deltaY * (1 / 80)
        let newProb = Math.max(0, Math.min(1, raw))
        if (newProb <= 0.1 || newProb >= 0.9) {
          newProb = Math.round(newProb * 100) / 100
        } else {
          newProb = Math.round(newProb * 20) / 20
        }
        setProbTooltip({ percent: Math.round(newProb * 100), x: ev.clientX, y: ev.clientY })
        onSetProbability(stepIndex, newProb)
      }
      const onUp = () => {
        isProbDragging.current = false
        setProbTooltip(null)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      return
    }

    // Right-click: p-lock automation drag
    if (e.button === 2 && automationParamId != null) {
      e.preventDefault()
      e.stopPropagation()
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

      const onMove = (ev: PointerEvent) => {
        const deltaY = rightDragStartY.current - ev.clientY
        const sensitivity = (automationMax - automationMin) / 150
        let newValue = rightDragStartValue.current + deltaY * sensitivity
        newValue = Math.max(automationMin, Math.min(automationMax, newValue))
        if (automationStep) {
          newValue = Math.round(newValue / automationStep) * automationStep
        }
        const p = Math.round(((newValue - automationMin) / (automationMax - automationMin || 1)) * 100)
        setDragTooltip({ percent: p, x: ev.clientX, y: ev.clientY })
        onSetLock(stepIndex, newValue)
      }
      const onUp = () => {
        isRightDragging.current = false
        setDragTooltip(null)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }
  }, [automationParamId, lockValue, automationMin, automationMax, automationStep, step.active, step.probability, stepIndex, onActivateStep, onSetProbability, onSetLock])

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
        if (e.button === 0 && !e.altKey && !e.metaKey && !e.ctrlKey) onMouseDown(stepIndex, e)
      }}
      onMouseEnter={() => onMouseEnter(stepIndex)}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu(e)
      }}
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      className="relative cursor-pointer select-none touch-none flex flex-col justify-end"
      style={{
        height: '100%',
        minHeight: 56,
        backgroundColor: '#000000',
        border: isPlayheadHit
          ? '1px solid #FFFFFF'
          : step.active && hasProbability
            ? `1px solid ${PROB}80`
            : step.active && hasLocks
              ? `1px solid ${PLOCK}`
              : '1px solid var(--border)',
        animation: step.active && hasLocks && !hasProbability
          ? 'hud-blink 0.5s step-end infinite'
          : undefined,
        transition: 'background-color 0.06s, border-color 0.06s',
      }}
      title={`Step ${stepIndex + 1}${hasProbability ? ` ${Math.round(step.probability * 100)}%` : ''}${hasLocks ? ` (${Object.keys(step.locks).length} lock${Object.keys(step.locks).length > 1 ? 's' : ''})` : ''}${lockValue != null ? ` [${automationParamId}: ${lockValue.toFixed(2)}]` : ''} — Cmd+drag to set probability`}
    >
      {/* P-lock fill — full cell, from bottom */}
      {showLockBar && (
        <div
          className="absolute left-0 right-0 bottom-0"
          style={{
            height: `${lockBarHeight * 100}%`,
            backgroundColor: `${PLOCK}35`,
            transition: 'height 0.04s',
          }}
        />
      )}

      {/* Probability fill — full cell, from bottom */}
      {hasProbability && step.active && (
        <div
          className="absolute left-0 right-0 bottom-0"
          style={{
            height: `${step.probability * 100}%`,
            backgroundColor: `${PROB}45`,
            transition: 'height 0.04s',
          }}
        />
      )}

      {/* Probability label */}
      {hasProbability && step.active && (
        <span
          className="absolute text-[7px] font-bold leading-none"
          style={{
            top: 2,
            left: 3,
            color: PROB,
          }}
        >
          {Math.round(step.probability * 100)}%
        </span>
      )}

      {/* P-lock label */}
      {showLockBar && step.active && (
        <span
          className="absolute text-[7px] font-bold leading-none"
          style={{
            top: hasProbability ? 12 : 2,
            left: 3,
            color: PLOCK,
          }}
        >
          {Math.round(lockBarHeight * 100)}%
        </span>
      )}

      {/* Retrig indicator */}
      {retrig > 0 && (
        <span
          className="absolute text-[7px] font-bold leading-none"
          style={{
            top: 2,
            right: 2,
            color: '#9580FF',
            opacity: 0.8,
          }}
        >
          {retrig}×
        </span>
      )}

      {/* Trig bar at bottom */}
      {step.active && (
        <div
          style={{
            height: 3,
            margin: '0 2px 2px',
            backgroundColor: hasProbability
              ? PROB
              : hasLocks ? PLOCK : '#FFFFFF',
            opacity: 0.7,
          }}
        />
      )}
      {/* P-lock drag tooltip */}
      {dragTooltip && createPortal(
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            left: dragTooltip.x,
            top: dragTooltip.y - 32,
            transform: 'translateX(-50%)',
            backgroundColor: PLOCK,
            color: '#000',
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-mono)',
            zIndex: 9999,
          }}
        >
          {dragTooltip.percent}%
        </div>,
        document.body,
      )}
      {/* Probability drag tooltip */}
      {probTooltip && createPortal(
        <div
          className="pointer-events-none"
          style={{
            position: 'fixed',
            left: probTooltip.x,
            top: probTooltip.y - 32,
            transform: 'translateX(-50%)',
            backgroundColor: PROB,
            color: '#000',
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-mono)',
            zIndex: 9999,
          }}
        >
          {probTooltip.percent}%
        </div>,
        document.body,
      )}
    </div>
  )
})
