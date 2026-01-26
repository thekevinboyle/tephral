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
      className="relative rounded-lg transition-colors duration-150 flex select-none touch-none cursor-pointer w-full h-full p-2"
      style={{
        backgroundColor: active ? '#2a2a2a' : '#242424',
        border: active ? `1px solid ${color}40` : '1px solid #333333',
      }}
    >
      {/* Main content area */}
      <div className="flex-1 flex flex-col justify-between">
        {/* LED indicator + label */}
        <div className="flex items-center gap-1.5">
          {/* LED - only this gets a glow when active */}
          <div
            className="w-2 h-2 rounded-full transition-all duration-150 shrink-0"
            style={{
              backgroundColor: active ? color : '#333333',
              boxShadow: active ? `0 0 8px ${color}` : 'none',
            }}
          />
          <span
            className="text-[11px] font-medium truncate"
            style={{ color: active ? '#ffffff' : '#888888' }}
          >
            {label}
          </span>
        </div>

        {/* Parameter value */}
        <span
          className="text-[11px] tabular-nums font-medium"
          style={{
            color: active ? '#ffffff' : '#555555',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {Math.round(value)}
        </span>
      </div>

      {/* Vertical progress bar on the right - flat style */}
      <div
        className="w-1 rounded-full ml-2 relative overflow-hidden"
        style={{
          backgroundColor: '#333333',
        }}
      >
        {/* Fill from bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-150"
          style={{
            height: `${percentage}%`,
            backgroundColor: active ? color : '#555555',
          }}
        />
      </div>
    </div>
  )
}
