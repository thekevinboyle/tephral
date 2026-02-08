import { useEffect, useState, useRef } from 'react'

const SOURCE_COLORS: Record<string, string> = {
  lfo: '#00D4FF',
  random: '#FF6B6B',
  step: '#4ECDC4',
  envelope: '#22c55e',
  euclidean: '#FF0055',
  ricochet: '#FF0055',
}

interface DragLine {
  sourceId: string
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
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
        opacity={0.8}
        filter="url(#modulation-glow)"
      />
    </svg>
  )
}
