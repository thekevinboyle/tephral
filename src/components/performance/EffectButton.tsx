import { useRef, useCallback } from 'react'
import { useRecordingStore } from '../../stores/recordingStore'

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
      if (isRecording) {
        addEvent({ effect: id, action: active ? 'off' : 'on', param: value })
      }
    }

    dragStartY.current = null
    didDrag.current = false
  }, [onToggle, isRecording, addEvent, id, active, value])

  // Encoder rotation based on value
  const rotation = ((value - min) / (max - min)) * 270 - 135

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`
        relative p-1 rounded-md transition-all duration-150
        flex flex-col items-center justify-between
        select-none touch-none cursor-pointer
        w-full h-full min-h-0
        ${active
          ? 'bg-base-darker'
          : 'bg-base-darker hover:bg-[#222]'
        }
        border border-border
      `}
      style={{
        boxShadow: active ? `0 0 12px -4px ${color}` : 'none',
      }}
    >
      {/* LED indicator + label */}
      <div className="w-full flex items-center gap-1 py-0.5">
        <div
          className="w-1.5 h-1.5 rounded-full transition-all duration-150 shrink-0"
          style={{
            backgroundColor: active ? color : '#333',
            boxShadow: active ? `0 0 6px 1px ${color}` : 'none',
          }}
        />
        <span className={`text-[7px] uppercase tracking-wider truncate ${active ? 'text-base-light' : 'text-muted'}`}>
          {label}
        </span>
      </div>

      {/* Encoder graphic */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="relative w-6 h-6">
          {/* Encoder ring */}
          <div
            className="absolute inset-0 rounded-full border transition-colors"
            style={{ borderColor: active ? color : '#444' }}
          />
          {/* Encoder notch */}
          <div
            className="absolute w-0.5 h-1.5 left-1/2 transition-colors"
            style={{
              backgroundColor: active ? color : '#666',
              transformOrigin: 'center 12px',
              transform: `translateX(-50%) rotate(${rotation}deg)`,
              top: '2px',
            }}
          />
          {/* Center dot */}
          <div
            className="absolute w-1 h-1 rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ backgroundColor: active ? color : '#444' }}
          />
        </div>
      </div>

      {/* Parameter value */}
      <span
        className={`text-[8px] tabular-nums font-mono ${active ? 'text-base-light' : 'text-muted'}`}
      >
        {Math.round(value)}
      </span>
    </div>
  )
}
