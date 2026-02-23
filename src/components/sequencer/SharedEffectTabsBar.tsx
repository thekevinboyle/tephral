import { useCallback, useEffect, useMemo } from 'react'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { useEffectDisable } from '../../hooks/useEffectDisable'
import { EffectTabsBar } from './EffectTabsBar'
import { ClearIcon, BypassIcon } from '../ui/DotMatrixIcons'

export function SharedEffectTabsBar() {
  const { selectedEffectId, setSelectedEffect } = useUIStore()
  const setStatusText = useUIStore((s) => s.setStatusText)
  const { sortedEffects } = useActiveEffects()
  const ensureTrack = useEffectSequencerStore((s) => s.ensureTrack)
  const bypassActive = useGlitchEngineStore((s) => s.bypassActive)
  const { disableEffect } = useEffectDisable()

  const activeEffectIds = useMemo(
    () => sortedEffects.map((e) => e.id),
    [sortedEffects],
  )

  useEffect(() => {
    for (const id of activeEffectIds) {
      ensureTrack(id)
    }
  }, [activeEffectIds, ensureTrack])

  useEffect(() => {
    if (selectedEffectId && !activeEffectIds.includes(selectedEffectId)) {
      setSelectedEffect(activeEffectIds.length > 0 ? activeEffectIds[0] : null)
    } else if (!selectedEffectId && activeEffectIds.length > 0) {
      setSelectedEffect(activeEffectIds[0])
    }
  }, [activeEffectIds, selectedEffectId, setSelectedEffect])

  const handleSelect = useCallback(
    (effectId: string) => {
      setSelectedEffect(effectId)
    },
    [setSelectedEffect],
  )

  return (
    <div className="flex items-stretch" style={{ backgroundColor: 'var(--bg-surface)' }}>
      <div className="flex-1 min-w-0 overflow-hidden">
        <EffectTabsBar
          activeEffectIds={activeEffectIds}
          selectedEffectId={selectedEffectId}
          onSelect={handleSelect}
        />
      </div>
      {/* Clear + Bypass buttons */}
      <div
        className="flex-shrink-0 flex items-center gap-1.5 px-2"
        style={{ borderLeft: '1px solid var(--border)' }}
      >
        {/* Clear all */}
        <button
          onClick={() => {
            for (const id of activeEffectIds) {
              disableEffect(id)
            }
          }}
          title="Clear all effects"
          className="w-6 h-6 flex items-center justify-center rounded-sm transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--warning)',
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('clearAll'))}
          onMouseLeave={() => setStatusText(null)}
        >
          <ClearIcon size={14} />
        </button>
        {/* Bypass all */}
        <button
          onClick={() => {
            useGlitchEngineStore.getState().setBypassActive(!bypassActive)
          }}
          title="Bypass all effects"
          className="w-6 h-6 flex items-center justify-center rounded-sm transition-all hover:scale-105"
          style={{
            backgroundColor: bypassActive ? 'var(--danger)' : 'var(--bg-elevated)',
            border: `1px solid ${bypassActive ? 'var(--danger)' : 'var(--border)'}`,
            color: bypassActive ? 'white' : 'var(--danger)',
            boxShadow: bypassActive ? '0 0 8px var(--danger)' : 'none',
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('bypassAll'))}
          onMouseLeave={() => setStatusText(null)}
        >
          <BypassIcon size={14} />
        </button>
      </div>
    </div>
  )
}
