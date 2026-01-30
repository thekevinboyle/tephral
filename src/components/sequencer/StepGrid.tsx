import { useCallback, useRef, useState } from 'react'
import { useSequencerStore, type Track } from '../../stores/sequencerStore'
import { useUIStore } from '../../stores/uiStore'

interface StepGridProps {
  track: Track
}

export function StepGrid({ track }: StepGridProps) {
  const { toggleStep, isPlaying } = useSequencerStore()
  const { selectStep } = useUIStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState<boolean | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const visibleSteps = track.steps.slice(0, track.length)

  const handleStepClick = useCallback((stepIndex: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      selectStep(track.id, stepIndex)
    } else {
      toggleStep(track.id, stepIndex)
    }
  }, [track.id, toggleStep, selectStep])

  const handleMouseDown = useCallback((stepIndex: number, e: React.MouseEvent) => {
    if (e.shiftKey) return // Don't start drag on shift+click

    e.preventDefault()
    setIsDragging(true)
    const newValue = !track.steps[stepIndex].active
    setDragValue(newValue)

    // Set first step
    if (track.steps[stepIndex].active !== newValue) {
      toggleStep(track.id, stepIndex)
    }
  }, [track.id, track.steps, toggleStep])

  const handleMouseEnter = useCallback((stepIndex: number) => {
    if (isDragging && dragValue !== null) {
      if (track.steps[stepIndex].active !== dragValue) {
        toggleStep(track.id, stepIndex)
      }
    }
  }, [isDragging, dragValue, track.id, track.steps, toggleStep])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragValue(null)
  }, [])

  // Global mouse up listener for drag end
  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDragValue(null)
    }
  }, [isDragging])

  // Add global listener when dragging
  if (typeof window !== 'undefined') {
    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp, { once: true })
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex gap-px"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {visibleSteps.map((step, index) => {
        const isCurrentStep = isPlaying && track.currentStep === index
        const hasProbability = step.probability < 1
        const hasRatchet = step.ratchetDivision > 1

        return (
          <button
            key={index}
            onMouseDown={(e) => handleMouseDown(index, e)}
            onMouseEnter={() => handleMouseEnter(index)}
            onClick={(e) => {
              if (e.shiftKey) handleStepClick(index, e)
            }}
            className="flex-1 min-w-0 aspect-square rounded-sm relative transition-all"
            style={{
              maxWidth: '12px',
              maxHeight: '12px',
              backgroundColor: step.active ? track.color : 'var(--border)',
              opacity: step.active ? (hasProbability ? 0.6 : 1) : 0.4,
              border: isCurrentStep ? `2px solid ${track.color}` : 'none',
              boxShadow: isCurrentStep ? `0 0 4px ${track.color}` : 'none',
            }}
            title={`Step ${index + 1}${step.active ? ' (active)' : ''}${hasProbability ? ` - ${Math.round(step.probability * 100)}% prob` : ''}${hasRatchet ? ` - ${step.ratchetDivision}x ratchet` : ''}\nShift+click for details`}
          >
            {/* Probability indicator - partial fill */}
            {step.active && hasProbability && (
              <div
                className="absolute bottom-0 left-0 right-0 rounded-sm"
                style={{
                  height: `${step.probability * 100}%`,
                  backgroundColor: track.color,
                  opacity: 0.5,
                }}
              />
            )}

            {/* Ratchet indicator - notches */}
            {step.active && hasRatchet && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="text-white font-bold"
                  style={{ fontSize: '6px', lineHeight: 1 }}
                >
                  {step.ratchetDivision}
                </div>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
