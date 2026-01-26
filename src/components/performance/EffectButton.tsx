import { useRef, useCallback } from 'react'
import { useRecordingStore } from '../../stores/recordingStore'
import { useUIStore } from '../../stores/uiStore'

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
}: EffectButtonProps) {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)
  const didDrag = useRef(false)
  const addEvent = useRecordingStore((s) => s.addEvent)
  const isRecording = useRecordingStore((s) => s.isRecording)
  const setSelectedEffect = useUIStore((s) => s.setSelectedEffect)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartValue.current = value
    didDrag.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [value])

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

    const wasDrag = didDrag.current

    // Record parameter change if we dragged
    if (wasDrag && isRecording) {
      addEvent({ effect: id, param: value })
    }

    // Toggle if we didn't drag
    if (!wasDrag) {
      onToggle()
      // Set this effect as selected in the graphic panel
      // If turning on, select it. If turning off, still select it to show its params
      setSelectedEffect(id)
      if (isRecording) {
        addEvent({ effect: id, action: active ? 'off' : 'on', param: value })
      }
    }

    dragStartY.current = null
    didDrag.current = false
  }, [onToggle, isRecording, addEvent, id, active, value, setSelectedEffect])

  // Value percentage for the progress bar
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative rounded-lg transition-all duration-150 flex select-none touch-none cursor-pointer w-full h-full p-2"
      style={{
        background: active
          ? `linear-gradient(180deg, ${color}15 0%, ${color}08 100%)`
          : 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
        boxShadow: active
          ? `
            inset 0 1px 1px rgba(255,255,255,0.05),
            inset 0 -1px 2px rgba(0,0,0,0.3),
            0 0 20px -4px ${color},
            0 0 40px -8px ${color}40
          `
          : `
            inset 0 1px 1px rgba(255,255,255,0.03),
            inset 0 -1px 2px rgba(0,0,0,0.4),
            0 2px 4px rgba(0,0,0,0.2)
          `,
        border: active ? `1px solid ${color}40` : '1px solid #2a2d35',
      }}
    >
      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-between">
        {/* LED indicator + label */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full transition-all duration-150 shrink-0"
            style={{
              backgroundColor: active ? color : '#2a2d35',
              boxShadow: active ? `0 0 8px 2px ${color}` : 'inset 0 1px 2px rgba(0,0,0,0.5)',
            }}
          />
          <span
            className="text-[8px] uppercase tracking-wider truncate font-medium"
            style={{ color: active ? color : '#6b7280' }}
          >
            {label}
          </span>
        </div>

        {/* Parameter value */}
        <span
          className="text-[10px] tabular-nums font-medium"
          style={{ color: active ? color : '#4b5563' }}
        >
          {Math.round(value)}
        </span>
      </div>

      {/* Vertical progress bar on the right */}
      <div
        className="w-1.5 rounded-full ml-2 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0d0f12 0%, #1a1d24 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {/* Fill from bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
          style={{
            height: `${percentage}%`,
            background: active
              ? `linear-gradient(0deg, ${color} 0%, ${color}80 100%)`
              : 'linear-gradient(0deg, #3a3d45 0%, #2a2d35 100%)',
            boxShadow: active ? `0 0 6px ${color}` : 'none',
          }}
        />
      </div>
    </div>
  )
}
