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
  const { selectedEffectId } = useUIStore()

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

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header: Preset bar */}
      <PresetDropdownBar />

      {/* FX count header */}
      <div
        className="flex-shrink-0 flex items-center px-2"
        style={{
          height: 24,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          FX ({sortedEffects.length})
        </span>
      </div>

      {/* Full parameters panel */}
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
              {/* LED */}
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: isBypassed ? 'var(--text-ghost)' : effectColor,
                  opacity: isBypassed ? 0.3 : 1,
                  boxShadow: isBypassed ? 'none' : `0 0 4px ${effectColor}`,
                }}
              />
              {/* Effect name */}
              <span
                className="text-[11px] uppercase tracking-wide font-semibold flex-shrink-0"
                style={{ color: isBypassed ? 'var(--text-ghost)' : effectColor }}
              >
                {effectLabel}
              </span>
              {/* Horizontal rule */}
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
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5" stroke={isBypassed ? effectColor : 'var(--text-muted)'} strokeWidth="1.2" />
                  {isBypassed && <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke={effectColor} strokeWidth="1.2" strokeLinecap="round" />}
                </svg>
              </button>
              {/* Remove */}
              <button
                onClick={() => disableEffect(validSelectedId)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-sm opacity-50 hover:opacity-100 hover:bg-white/10 transition-all"
                style={{ border: '1px solid var(--border)' }}
                title="Remove effect"
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
