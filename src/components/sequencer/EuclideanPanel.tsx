import { useCallback } from 'react'
import { useEuclideanStore } from '../../stores/euclideanStore'
import { EuclideanDisplay } from './EuclideanDisplay'

const ACCENT_COLOR = '#FF0055' // var(--accent)

interface ParamRowProps {
  label: string
  value: number
  displayValue?: string
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

function ParamRow({ label, value, displayValue, min, max, step = 1, onChange }: ParamRowProps) {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startValue = value

    const handleMove = (moveEvent: PointerEvent) => {
      const delta = (startY - moveEvent.clientY) / 2
      const newValue = Math.round((startValue + delta * step) / step) * step
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
      className="flex items-center justify-between py-1 cursor-ns-resize select-none"
      onPointerDown={handlePointerDown}
    >
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className="text-[11px] font-medium tabular-nums"
        style={{ color: ACCENT_COLOR }}
      >
        {displayValue ?? value}
      </span>
    </div>
  )
}

export function EuclideanPanel() {
  const store = useEuclideanStore()

  return (
    <div
      className="flex flex-col h-full relative"
      style={{
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: ACCENT_COLOR,
              boxShadow: `0 0 6px ${ACCENT_COLOR}`,
            }}
          />
          <span
            className="text-[9px] font-medium uppercase tracking-widest"
            style={{ color: 'var(--text-ghost)' }}
          >
            Euclidean
          </span>
        </div>

        {/* Sync toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => store.setSyncMode('sync')}
            className="px-1.5 py-0.5 text-[9px] font-medium uppercase rounded-sm transition-colors"
            style={{
              backgroundColor: store.syncMode === 'sync' ? ACCENT_COLOR : 'var(--bg-surface)',
              color: store.syncMode === 'sync' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${store.syncMode === 'sync' ? ACCENT_COLOR : 'var(--border)'}`,
              boxShadow: store.syncMode === 'sync' ? '0 0 4px rgba(255,0,85,0.3)' : 'none',
            }}
          >
            Sync
          </button>
          <button
            onClick={() => store.setSyncMode('free')}
            className="px-1.5 py-0.5 text-[9px] font-medium uppercase rounded-sm transition-colors"
            style={{
              backgroundColor: store.syncMode === 'free' ? ACCENT_COLOR : 'var(--bg-surface)',
              color: store.syncMode === 'free' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${store.syncMode === 'free' ? ACCENT_COLOR : 'var(--border)'}`,
              boxShadow: store.syncMode === 'free' ? '0 0 4px rgba(255,0,85,0.3)' : 'none',
            }}
          >
            Free
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center px-4 py-3 gap-6">
        {/* Circular display */}
        <div className="flex-shrink-0">
          <EuclideanDisplay size={140} />
        </div>

        {/* Parameters */}
        <div className="flex-1 flex flex-col justify-center">
          <ParamRow
            label="Steps"
            value={store.steps}
            min={4}
            max={32}
            onChange={store.setSteps}
          />
          <ParamRow
            label="Hits"
            value={store.hits}
            displayValue={`${store.hits} / ${store.steps}`}
            min={0}
            max={store.steps}
            onChange={store.setHits}
          />
          <ParamRow
            label="Rotate"
            value={store.rotation}
            min={0}
            max={store.steps - 1}
            onChange={store.setRotation}
          />
          <ParamRow
            label="Decay"
            value={Math.round(store.decay * 100)}
            displayValue={`${Math.round(store.decay * 100)}%`}
            min={0}
            max={100}
            step={5}
            onChange={(v) => store.setDecay(v / 100)}
          />
          {store.syncMode === 'free' && (
            <ParamRow
              label="Rate"
              value={store.freeRate}
              displayValue={`${store.freeRate.toFixed(1)} Hz`}
              min={0.1}
              max={20}
              step={0.1}
              onChange={store.setFreeRate}
            />
          )}
        </div>
      </div>

      {/* Output indicator */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: ACCENT_COLOR,
            boxShadow: store.currentValue > 0.1
              ? `0 0 ${6 + store.currentValue * 10}px ${ACCENT_COLOR}`
              : 'none',
            opacity: 0.5 + store.currentValue * 0.5,
            transition: 'box-shadow 0.05s ease-out, opacity 0.05s ease-out',
          }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('sequencer-track', 'euclidean')
            e.dataTransfer.effectAllowed = 'link'
          }}
          title="Drag to parameter"
        />
        <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
          Out
        </span>
        <span
          className="text-[10px] tabular-nums ml-auto"
          style={{ color: ACCENT_COLOR }}
        >
          {(store.currentValue * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  )
}
