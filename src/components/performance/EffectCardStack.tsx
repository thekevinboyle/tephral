import { useMemo } from 'react'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { useEffectDisable } from '../../hooks/useEffectDisable'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import { EffectParameters } from './ExpandedParameterPanel'

const PLOCK = '#FF4060'

export function EffectCardStack() {
  const { sortedEffects } = useActiveEffects()
  const { disableEffect } = useEffectDisable()
  const { toggleEffectBypassed, effectBypassed } = useGlitchEngineStore()
  const { selectedEffectId, setSelectedEffect, setStatusText } = useUIStore()

  // Automation state from sequencer
  const automationParam = useEffectSequencerStore((s) => s.automationParam)
  const clearAutomationParam = useEffectSequencerStore((s) => s.clearAutomationParam)

  const activeEffectIds = useMemo(
    () => sortedEffects.map((e) => e.id),
    [sortedEffects],
  )

  const validSelectedId =
    selectedEffectId && activeEffectIds.includes(selectedEffectId)
      ? selectedEffectId
      : null

  const handleRemove = (effectId: string) => {
    disableEffect(effectId)
  }

  // Select handler (for clip effect list rows)
  const handleSelect = (effectId: string) => {
    setSelectedEffect(effectId === selectedEffectId ? null : effectId)
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header: Preset bar */}
      <PresetDropdownBar />

      {/* FX header */}
      <div
        className="flex-shrink-0 flex items-center px-2"
        style={{
          height: 24,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
        >
          FX ({sortedEffects.length})
        </span>
      </div>

      {/* Main content area */}
      {validSelectedId ? (() => {
        const selectedEffect = sortedEffects.find(e => e.id === validSelectedId)
        const effectColor = selectedEffect?.color ?? 'var(--text-muted)'
        const effectLabel = selectedEffect?.label ?? validSelectedId
        const isBypassed = effectBypassed[validSelectedId] || false

        return (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Effect header: name + bypass + remove */}
            <div
              className="flex-shrink-0 flex items-center gap-1.5 px-2"
              style={{
                height: 28,
                borderBottom: `1px solid ${effectColor}20`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: isBypassed ? 'var(--text-ghost)' : effectColor,
                  opacity: isBypassed ? 0.3 : 1,
                  boxShadow: isBypassed ? 'none' : `0 0 4px ${effectColor}`,
                }}
              />
              <span
                className="text-[11px] uppercase tracking-wide font-semibold flex-shrink-0"
                style={{ color: isBypassed ? 'var(--text-ghost)' : 'var(--text-secondary)' }}
              >
                {effectLabel}
              </span>
              <div
                className="flex-1 h-px"
                style={{ backgroundColor: `${effectColor}30` }}
              />

              {/* Automation indicator (inline) */}
              {automationParam && (
                <>
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider flex-shrink-0"
                    style={{ color: PLOCK }}
                  >
                    P-LOCK
                  </span>
                  <span
                    className="text-[9px] tabular-nums flex-shrink-0"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {automationParam.label}
                  </span>
                  <button
                    onClick={clearAutomationParam}
                    className="text-[8px] uppercase tracking-wider px-1 py-0.5 rounded-sm flex-shrink-0"
                    style={{
                      color: 'var(--text-ghost)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    ×
                  </button>
                </>
              )}

              {/* Bypass */}
              <button
                onClick={() => toggleEffectBypassed(validSelectedId)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-sm hover:bg-white/10 transition-all"
                style={{
                  opacity: isBypassed ? 0.8 : 0.4,
                  border: '1px solid var(--border)',
                }}
                title={isBypassed ? 'Enable effect' : 'Bypass effect'}
                onMouseEnter={() => setStatusText('Bypass \u2014 Temporarily disable effect')}
                onMouseLeave={() => setStatusText(null)}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5" stroke={isBypassed ? effectColor : 'var(--text-muted)'} strokeWidth="1.2" />
                  {isBypassed && <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke={effectColor} strokeWidth="1.2" strokeLinecap="round" />}
                </svg>
              </button>
              {/* Remove */}
              <button
                onClick={() => handleRemove(validSelectedId)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-sm opacity-50 hover:opacity-100 hover:bg-white/10 transition-all"
                style={{ border: '1px solid var(--border)' }}
                title="Remove effect"
                onMouseEnter={() => setStatusText('Remove \u2014 Disable and remove effect from chain')}
                onMouseLeave={() => setStatusText(null)}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Scrollable parameters */}
            <div
              className="flex-1 min-h-0 overflow-y-auto"
              style={{
                padding: 'var(--panel-padding-sm) var(--panel-padding)',
                opacity: isBypassed ? 0.4 : 1,
                transition: 'opacity 150ms',
              }}
            >
              <EffectParameters effectId={validSelectedId} />
            </div>
          </div>
        )
      })() : (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
            Enable effects from the grid below
          </span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Scope Toggle Button
// ═══════════════════════════════════════════════════════════════════

function ScopeButton({
  label,
  active,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  label: string
  active: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="h-5 px-1.5 text-[8px] font-semibold uppercase tracking-wider rounded-sm transition-all"
      style={{
        backgroundColor: active ? 'var(--accent)' : 'transparent',
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        color: active ? 'var(--text-primary)' : 'var(--text-ghost)',
        boxShadow: active ? '0 0 4px var(--accent-glow)' : 'none',
      }}
    >
      {label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Clip Effect List (shows clip's assigned effects as selectable rows)
// ═══════════════════════════════════════════════════════════════════

function ClipEffectList({
  effects,
  selectedId,
  onSelect,
  onRemove,
  effectBypassed,
}: {
  effects: ActiveEffect[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  effectBypassed: Record<string, boolean>
}) {
  if (effects.length === 0) {
    return (
      <div className="px-2 py-3 flex items-center justify-center">
        <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
          Add effects from the browser below
        </span>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 max-h-[120px] overflow-y-auto">
      {effects.map((effect) => {
        const isSelected = effect.id === selectedId
        const isBypassed = effectBypassed[effect.id] || false

        return (
          <div
            key={effect.id}
            onClick={() => onSelect(effect.id)}
            className="flex items-center gap-1.5 px-2 cursor-pointer transition-colors"
            style={{
              height: 26,
              backgroundColor: isSelected ? `${effect.color}15` : 'transparent',
              borderLeft: isSelected ? `2px solid ${effect.color}` : '2px solid transparent',
            }}
          >
            {/* LED */}
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: isBypassed ? 'var(--text-ghost)' : effect.color,
                opacity: isBypassed ? 0.3 : 1,
              }}
            />
            {/* Label */}
            <span
              className="text-[10px] uppercase tracking-wide flex-1"
              style={{ color: isBypassed ? 'var(--text-ghost)' : 'var(--text-secondary)' }}
            >
              {effect.label}
            </span>
            {/* Remove */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(effect.id) }}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-sm transition-opacity"
              style={{ opacity: 0.3 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.3' }}
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
