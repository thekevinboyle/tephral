import { useCallback, useState } from 'react'
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

  const visibleSteps = track.steps.slice(0, track.length)

  const handleMouseDown = useCallback((stepIndex: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      selectStep(track.id, stepIndex)
      return
    }

    e.preventDefault()
    setIsDragging(true)
    const newValue = !track.steps[stepIndex].active
    setDragValue(newValue)

    if (track.steps[stepIndex].active !== newValue) {
      toggleStep(track.id, stepIndex)
    }
  }, [track.id, track.steps, toggleStep, selectStep])

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
      className="flex gap-[5px]"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {visibleSteps.map((step, index) => {
        const isCurrentStep = isPlaying && track.currentStep === index
        const hasProbability = step.probability < 1

        return (
          <div
            key={index}
            onMouseDown={(e) => handleMouseDown(index, e)}
            onMouseEnter={() => handleMouseEnter(index)}
            className="w-[14px] h-[14px] cursor-pointer"
            style={{
              backgroundColor: step.active ? 'var(--text-primary)' : 'transparent',
              border: step.active ? 'none' : '2px solid var(--text-primary)',
              opacity: isCurrentStep ? 1 : (step.active ? (hasProbability ? 0.6 : 0.8) : 0.4),
              boxShadow: isCurrentStep && step.active ? '0 0 4px var(--text-primary)' : 'none',
            }}
            title={`Step ${index + 1}`}
          />
        )
      })}
    </div>
  )
}
