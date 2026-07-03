import { useEffect, useState, useRef } from 'react'
import { useModulationStore } from '../../stores/modulationStore'

const SOURCE_COLORS: Record<string, string> = {
  lfo: '#707070',
  random: '#FF6B6B',
  step: '#4ECDC4',
  envelope: '#AA55FF',
  sampleHold: '#AAFF00',
  euclidean: '#FF0055',
  ricochet: '#FF0055',
}

// Live output of the dragged source (0-1) — drives the pulsing source node
function getSourceValue(sourceId: string): number {
  const s = useModulationStore.getState()
  switch (sourceId) {
    case 'lfo': return s.lfos[s.selectedLFOIndex].currentValue
    case 'random': return s.random.currentValue
    case 'step': return s.step.currentValue
    case 'envelope': return s.envelope.currentValue
    case 'sampleHold': return s.sampleHold.currentValue
    default: return 0.5
  }
}

interface DragLine {
  sourceId: string
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
  dashOffset: number
  value: number
}

export function ModulationLines() {
  const [dragLine, setDragLine] = useState<DragLine | null>(null)
  const dragSourceRef = useRef<string | null>(null)
  const frameRef = useRef<number | null>(null)
  const mousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement
      const modSource = target.closest('[data-mod-source]')?.getAttribute('data-mod-source')

      if (modSource && e.dataTransfer?.types.includes('modulation-source')) {
        dragSourceRef.current = modSource

        // Get source element position
        const sourceEl = document.querySelector(`[data-mod-source="${modSource}"]`)
        if (sourceEl) {
          mousePos.current = { x: e.clientX, y: e.clientY }

          // Start animation loop for smooth line updates
          const updateLine = () => {
            if (!dragSourceRef.current) return

            const sourceEl = document.querySelector(`[data-mod-source="${dragSourceRef.current}"]`)
            if (sourceEl) {
              const rect = sourceEl.getBoundingClientRect()
              setDragLine({
                sourceId: dragSourceRef.current,
                startX: rect.right,
                startY: rect.top + rect.height / 2,
                endX: mousePos.current.x,
                endY: mousePos.current.y,
                color: SOURCE_COLORS[dragSourceRef.current] || '#888',
                // Dashes march from source toward target — signal flow direction
                dashOffset: -((performance.now() / 30) % 10),
                value: getSourceValue(dragSourceRef.current),
              })
            }
            frameRef.current = requestAnimationFrame(updateLine)
          }
          frameRef.current = requestAnimationFrame(updateLine)
        }
      }
    }

    const handleDrag = (e: DragEvent) => {
      if (dragSourceRef.current && e.clientX !== 0 && e.clientY !== 0) {
        mousePos.current = { x: e.clientX, y: e.clientY }
      }
    }

    const handleDragEnd = () => {
      dragSourceRef.current = null
      setDragLine(null)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }

    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('drag', handleDrag)
    document.addEventListener('dragend', handleDragEnd)
    document.addEventListener('drop', handleDragEnd)

    return () => {
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('drag', handleDrag)
      document.removeEventListener('dragend', handleDragEnd)
      document.removeEventListener('drop', handleDragEnd)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  if (!dragLine) return null

  return (
    <svg
      className="fixed inset-0 pointer-events-none"
      style={{ overflow: 'visible', zIndex: 50 }}
    >
      <defs>
        <filter id="modulation-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={`M ${dragLine.startX} ${dragLine.startY} C ${dragLine.startX + 50} ${dragLine.startY}, ${dragLine.endX - 50} ${dragLine.endY}, ${dragLine.endX} ${dragLine.endY}`}
        fill="none"
        stroke={dragLine.color}
        strokeWidth="2"
        strokeDasharray="6 4"
        strokeDashoffset={dragLine.dashOffset}
        opacity={0.55 + dragLine.value * 0.35}
        filter="url(#modulation-glow)"
      />
      {/* Source node — pulses with the live modulation value */}
      <circle
        cx={dragLine.startX}
        cy={dragLine.startY}
        r={2 + dragLine.value * 2.5}
        fill={dragLine.color}
        opacity={0.9}
        filter="url(#modulation-glow)"
      />
    </svg>
  )
}
