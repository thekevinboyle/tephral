import { useCallback } from 'react'
import { useRicochetStore, type PolygonSides } from '../../stores/ricochetStore'
import { RicochetDisplay } from './RicochetDisplay'

const ACCENT_COLOR = '#00D9FF'

interface ParamRowProps {
  label: string
  value: number
  displayValue?: string
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

function ParamRow({ label, value, displayValue, min, max, step = 0.01, onChange }: ParamRowProps) {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startValue = value

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = (startY - moveEvent.clientY) / 100
      const newValue = Math.round((startValue + delta * (max - min)) / step) * step
      onChange(Math.max(min, Math.min(max, newValue)))
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [value, min, max, step, onChange])

  return (
    <div
      className="flex items-center justify-between py-1.5 cursor-ns-resize select-none"
      onPointerDown={handlePointerDown}
    >
      <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className="text-[14px] font-medium tabular-nums"
        style={{ color: ACCENT_COLOR }}
      >
        {displayValue ?? value.toFixed(2)}
      </span>
    </div>
  )
}

const SIDES_OPTIONS: PolygonSides[] = [3, 4, 5, 6, 8]

export function RicochetPanel() {
  const store = useRicochetStore()

  const handleReset = useCallback(() => {
    store.resetBall()
  }, [store])

  return (
    <div
      className="flex flex-col h-full relative"
      style={{
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: ACCENT_COLOR,
              boxShadow: `0 0 8px ${ACCENT_COLOR}`,
            }}
          />
          <span
            className="text-[13px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            Ricochet
          </span>
        </div>

        {/* Reset button */}
        <button
          onClick={handleReset}
          className="px-2 py-0.5 text-[10px] font-medium uppercase rounded transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          Reset
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center px-4 py-3 gap-6">
        {/* Polygon display */}
        <div className="flex-shrink-0">
          <RicochetDisplay size={140} />
        </div>

        {/* Parameters */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Sides selector */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Sides
            </span>
            <div className="flex gap-1">
              {SIDES_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => store.setSides(n)}
                  className="w-6 h-6 text-[11px] font-medium rounded transition-colors"
                  style={{
                    backgroundColor: store.sides === n ? ACCENT_COLOR : 'var(--bg-surface)',
                    color: store.sides === n ? 'var(--bg-surface)' : 'var(--text-muted)',
                    border: `1px solid ${store.sides === n ? ACCENT_COLOR : 'var(--border)'}`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <ParamRow
            label="Gravity"
            value={store.gravity}
            displayValue={`${Math.round(store.gravity * 100)}%`}
            min={0}
            max={1}
            step={0.05}
            onChange={store.setGravity}
          />
          <ParamRow
            label="Bounce"
            value={store.bounciness}
            displayValue={`${Math.round(store.bounciness * 100)}%`}
            min={0.1}
            max={1}
            step={0.05}
            onChange={store.setBounciness}
          />
          <ParamRow
            label="Friction"
            value={store.friction}
            displayValue={`${Math.round(store.friction * 100)}%`}
            min={0}
            max={0.5}
            step={0.01}
            onChange={store.setFriction}
          />
          <ParamRow
            label="Decay"
            value={store.decay}
            displayValue={`${Math.round(store.decay * 100)}%`}
            min={0.1}
            max={1}
            step={0.05}
            onChange={store.setDecay}
          />
          <ParamRow
            label="Speed"
            value={store.freeSpeed}
            displayValue={`${store.freeSpeed.toFixed(1)}x`}
            min={0.2}
            max={3}
            step={0.1}
            onChange={store.setFreeSpeed}
          />
        </div>
      </div>

      {/* Output indicator */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        <div
          className="w-3 h-3 rounded-full cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: ACCENT_COLOR,
            boxShadow: store.currentValue > 0.1
              ? `0 0 ${8 + store.currentValue * 12}px ${ACCENT_COLOR}`
              : 'none',
            opacity: 0.5 + store.currentValue * 0.5,
            transition: 'box-shadow 0.05s ease-out, opacity 0.05s ease-out',
          }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('sequencer-track', 'ricochet')
            e.dataTransfer.effectAllowed = 'link'
          }}
          title="Drag to parameter"
        />
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Output
        </span>
        <span
          className="text-[11px] tabular-nums ml-auto"
          style={{ color: ACCENT_COLOR }}
        >
          {(store.currentValue * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  )
}
