import { useEffect, useRef, useCallback } from 'react'
import { useSequencerStore } from '../../../stores/sequencerStore'
import { useModulationStore, LFO_COUNT } from '../../../stores/modulationStore'
import { useAudioReactiveStore } from '../../../stores/audioReactiveStore'

const LFO_SOURCES = Array.from({ length: LFO_COUNT }, (_, i) => ({
  id: `lfo-${i}`,
  label: `LFO ${i + 1}`,
  color: '#707070',
}))

const OTHER_SOURCES = [
  { id: 'random', label: 'Random', color: '#FF6B6B' },
  { id: 'step', label: 'Step', color: '#4ECDC4' },
  { id: 'envelope', label: 'Envelope', color: '#AA55FF' },
  { id: 'sampleHold', label: 'S&H', color: '#AAFF00' },
]

const AUDIO_SOURCES = [
  { id: 'audio-sub', label: 'Sub', color: '#FF3333' },
  { id: 'audio-mid', label: 'Mid', color: '#FF8800' },
  { id: 'audio-high', label: 'High', color: '#33CCFF' },
  { id: 'audio-hit', label: 'Hit', color: '#FF00FF' },
]

const SOURCES = [...LFO_SOURCES, ...OTHER_SOURCES]

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
        if (sourceId.startsWith('lfo-')) {
          const lfoIndex = parseInt(sourceId.split('-')[1])
          if (!state.lfos[lfoIndex].enabled) state.setLFOEnabled(lfoIndex, true)
        } else if (sourceId.startsWith('audio-')) {
          const arState = useAudioReactiveStore.getState()
          if (!arState.enabled) arState.setEnabled(true)
        } else {
          const enablers: Record<string, () => void> = {
            random: () => { if (!state.random.enabled) state.setRandomEnabled(true) },
            step: () => { if (!state.step.enabled) state.setStepEnabled(true) },
            envelope: () => { if (!state.envelope.enabled) state.setEnvelopeEnabled(true) },
            sampleHold: () => { if (!state.sampleHold.enabled) state.setSampleHoldEnabled(true) },
          }
          enablers[sourceId]?.()
        }
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

  const renderSourceRow = (source: { id: string; label: string; color: string }) => {
    const isRouted = paramRoutings.some((r) => r.trackId === source.id)
    return (
      <div
        key={source.id}
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/5"
        onClick={() => handleToggleSource(source.id)}
      >
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
        maxHeight: '320px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-1 text-[9px] uppercase tracking-wider font-semibold"
        style={{ color: 'var(--text-muted)' }}
      >
        Modulation
      </div>

      {/* LFO sources */}
      {LFO_SOURCES.map(renderSourceRow)}

      {/* Separator */}
      <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />

      {/* Other sources */}
      {OTHER_SOURCES.map(renderSourceRow)}

      {/* Separator */}
      <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />

      {/* Audio reactive label */}
      <div
        className="px-3 py-0.5 text-[8px] uppercase tracking-wider"
        style={{ color: 'var(--text-ghost)' }}
      >
        Audio React
      </div>

      {/* Audio sources */}
      {AUDIO_SOURCES.map(renderSourceRow)}

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
