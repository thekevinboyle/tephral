import { useCallback, useState } from 'react'
import { useSequencerStore, type Track } from '../../stores/sequencerStore'
import { useUIStore } from '../../stores/uiStore'

interface StepGridProps {
  track: Track
}

export function StepGrid({ track }: StepGridProps) {
  const { toggleStep, isPlaying } = useSequencerStore()
  const { selectStep, selectTrack } = useUIStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState<boolean | null>(null)
  const [currentPage, setCurrentPage] = useState(0)

  // Page-based display (16 steps per page, like Elektron)
  const stepsPerPage = 16
  const totalPages = Math.ceil(track.length / stepsPerPage)
  const pageStart = currentPage * stepsPerPage
  const pageEnd = Math.min(pageStart + stepsPerPage, track.length)
  const visibleSteps = track.steps.slice(pageStart, pageEnd)

  // Reset page if track length changes and current page is invalid
  if (currentPage >= totalPages && totalPages > 0) {
    setCurrentPage(totalPages - 1)
  }

  const handleMouseDown = useCallback((stepIndex: number, e: React.MouseEvent) => {
    // Stop propagation to prevent parent track row from toggling selection
    e.stopPropagation()

    // Always select this track on interaction
    selectTrack(track.id)

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
  }, [track.id, track.steps, toggleStep, selectStep, selectTrack])

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
    <div className="flex items-center gap-3">
      {/* Step grid */}
      <div
        className="flex gap-[5px]"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {visibleSteps.map((step, index) => {
          const actualIndex = pageStart + index
          const isCurrentStep = isPlaying && track.currentStep === actualIndex
          const hasProbability = step.probability < 1

          return (
            <div
              key={actualIndex}
              onMouseDown={(e) => handleMouseDown(actualIndex, e)}
              onMouseEnter={() => handleMouseEnter(actualIndex)}
              onClick={(e) => e.stopPropagation()}
              className="w-[14px] h-[14px] cursor-pointer"
              style={{
                backgroundColor: step.active ? 'var(--text-primary)' : 'transparent',
                border: step.active ? 'none' : '2px solid var(--text-primary)',
                opacity: isCurrentStep ? 1 : (step.active ? (hasProbability ? 0.6 : 0.8) : 0.4),
                boxShadow: isCurrentStep && step.active ? '0 0 4px var(--text-primary)' : 'none',
              }}
              title={`Step ${actualIndex + 1}`}
            />
          )
        })}
      </div>

      {/* Page dots (Elektron-style) - always show 4 */}
      <div className="flex gap-1">
        {Array.from({ length: 4 }, (_, pageIndex) => {
          const isActivePage = pageIndex === currentPage
          const pageExists = pageIndex < totalPages
          const pageHasPlayhead = isPlaying &&
            track.currentStep >= pageIndex * stepsPerPage &&
            track.currentStep < (pageIndex + 1) * stepsPerPage
          return (
            <button
              key={pageIndex}
              onClick={(e) => {
                e.stopPropagation()
                if (pageExists) setCurrentPage(pageIndex)
              }}
              className="w-3 h-3 rounded-full transition-all"
              style={{
                backgroundColor: isActivePage
                  ? 'var(--text-primary)'
                  : pageHasPlayhead
                    ? 'var(--text-muted)'
                    : 'transparent',
                border: `2px solid ${pageExists ? (isActivePage ? 'var(--text-primary)' : 'var(--text-muted)') : 'var(--text-ghost)'}`,
                opacity: pageExists ? (isActivePage ? 1 : 0.5) : 0.2,
                cursor: pageExists ? 'pointer' : 'default',
              }}
              title={pageExists ? `Page ${pageIndex + 1}` : 'Not available'}
            />
          )
        })}
      </div>
    </div>
  )
}
