import { useCallback } from 'react'
import { useEuclideanStore } from '../../stores/euclideanStore'
import { useEuclideanEngine } from '../../hooks/useEuclideanEngine'
import { EuclideanDisplay } from './EuclideanDisplay'

const ACCENT_COLOR = '#FF9F43'

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
        {displayValue ?? value}
      </span>
    </div>
  )
}

export function EuclideanPanel() {
  const store = useEuclideanStore()

  // Initialize the engine
  useEuclideanEngine()

  const handleDoubleClick = useCallback(() => {
    store.setEnabled(!store.enabled)
  }, [store])

  return (
    <div
      className="flex flex-col h-full relative"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: store.enabled ? `2px solid ${ACCENT_COLOR}` : '1px solid var(--border)',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* Bypassed overlay */}
      {!store.enabled && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
          <span
            className="text-sm font-bold uppercase tracking-widest px-3 py-1 rounded"
            style={{
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            BYPASSED
          </span>
        </div>
      )}

      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
        }}
        onDoubleClick={handleDoubleClick}
        title="Double-click to toggle"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: store.enabled ? ACCENT_COLOR : 'var(--text-muted)',
              boxShadow: store.enabled ? `0 0 8px ${ACCENT_COLOR}` : 'none',
            }}
          />
          <span
            className="text-[13px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-primary)' }}
          >
            Euclidean
          </span>
        </div>

        {/* Sync toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => store.setSyncMode('sync')}
            className="px-2 py-0.5 text-[10px] font-medium uppercase rounded transition-colors"
            style={{
              backgroundColor: store.syncMode === 'sync' ? ACCENT_COLOR : 'var(--bg-surface)',
              color: store.syncMode === 'sync' ? 'var(--bg-surface)' : 'var(--text-muted)',
              border: `1px solid ${store.syncMode === 'sync' ? ACCENT_COLOR : 'var(--border)'}`,
            }}
          >
            Sync
          </button>
          <button
            onClick={() => store.setSyncMode('free')}
            className="px-2 py-0.5 text-[10px] font-medium uppercase rounded transition-colors"
            style={{
              backgroundColor: store.syncMode === 'free' ? ACCENT_COLOR : 'var(--bg-surface)',
              color: store.syncMode === 'free' ? 'var(--bg-surface)' : 'var(--text-muted)',
              border: `1px solid ${store.syncMode === 'free' ? ACCENT_COLOR : 'var(--border)'}`,
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
            e.dataTransfer.setData('sequencer-track', 'euclidean')
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
