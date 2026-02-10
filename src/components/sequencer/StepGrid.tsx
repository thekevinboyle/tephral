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

  // Scale cell size based on track length
  const cellSize = track.length <= 16 ? 14 : track.length <= 32 ? 10 : track.length <= 48 ? 7 : 5
  const gapSize = track.length <= 16 ? 5 : track.length <= 32 ? 3 : track.length <= 48 ? 2 : 1
  const borderWidth = track.length <= 32 ? 2 : 1

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
      className="flex"
      style={{ gap: `${gapSize}px` }}
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
            className="cursor-pointer"
            style={{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              backgroundColor: step.active ? 'var(--text-primary)' : 'transparent',
              border: step.active ? 'none' : `${borderWidth}px solid var(--text-primary)`,
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
