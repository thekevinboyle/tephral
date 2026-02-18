import { useEffect, useRef, useCallback } from 'react'
import { useSequencerStore } from '../../../stores/sequencerStore'
import { useModulationStore } from '../../../stores/modulationStore'

const SOURCES = [
  { id: 'lfo', label: 'LFO', color: '#707070' },
  { id: 'random', label: 'Random', color: '#FF6B6B' },
  { id: 'step', label: 'Step', color: '#4ECDC4' },
  { id: 'envelope', label: 'Envelope', color: '#AA55FF' },
  { id: 'sampleHold', label: 'S&H', color: '#AAFF00' },
] as const

interface ModulationContextMenuProps {
  paramId: string
  position: { x: number; y: number }
  onClose: () => void
}

export function ModulationContextMenu({ paramId, position, onClose }: ModulationContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const { routings, addRouting, removeRouting } = useSequencerStore()

  const paramRoutings = routings.filter((r) => r.targetParam === paramId)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleToggleSource = useCallback(
    (sourceId: string) => {
      const existing = paramRoutings.find((r) => r.trackId === sourceId)
      if (existing) {
        removeRouting(existing.id)
      } else {
        addRouting(sourceId, paramId, 0.5)
        // Auto-enable the modulator if disabled
        const state = useModulationStore.getState()
        const enablers: Record<string, () => void> = {
          lfo: () => { if (!state.lfo.enabled) state.setLFOEnabled(true) },
          random: () => { if (!state.random.enabled) state.setRandomEnabled(true) },
          step: () => { if (!state.step.enabled) state.setStepEnabled(true) },
          envelope: () => { if (!state.envelope.enabled) state.setEnvelopeEnabled(true) },
          sampleHold: () => { if (!state.sampleHold.enabled) state.setSampleHoldEnabled(true) },
        }
        enablers[sourceId]?.()
      }
      onClose()
    },
    [paramId, paramRoutings, addRouting, removeRouting, onClose]
  )

  const handleClearAll = useCallback(() => {
    for (const r of paramRoutings) {
      removeRouting(r.id)
    }
    onClose()
  }, [paramRoutings, removeRouting, onClose])

  const adjustedStyle = {
    left: Math.min(position.x, window.innerWidth - 160),
    top: Math.min(position.y, window.innerHeight - 220),
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 py-1 rounded-sm shadow-lg"
      style={{
        ...adjustedStyle,
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        minWidth: '140px',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-1 text-[9px] uppercase tracking-wider font-semibold"
        style={{ color: 'var(--text-muted)' }}
      >
        Modulation
      </div>

      {/* Source rows */}
      {SOURCES.map((source) => {
        const isRouted = paramRoutings.some((r) => r.trackId === source.id)
        return (
          <div
            key={source.id}
            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/5"
            onClick={() => handleToggleSource(source.id)}
          >
            {/* LED dot */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: isRouted ? source.color : 'transparent',
                border: isRouted ? 'none' : `1px solid ${source.color}60`,
                boxShadow: isRouted ? `0 0 4px ${source.color}` : 'none',
              }}
            />
            <span
              className="text-[11px] flex-1"
              style={{ color: isRouted ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {source.label}
            </span>
            {isRouted && (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2 5l2 2 4-4" stroke={source.color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )
      })}

      {/* Clear All — only when 2+ routings */}
      {paramRoutings.length >= 2 && (
        <>
          <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
          <div
            className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-white/5"
            style={{ color: 'var(--accent)' }}
            onClick={handleClearAll}
          >
            <span className="text-[11px]">Clear All</span>
          </div>
        </>
      )}
    </div>
  )
}
