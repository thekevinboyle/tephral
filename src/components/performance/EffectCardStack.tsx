import { useMemo } from 'react'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { useUIStore } from '../../stores/uiStore'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import { EffectParameters_v2 } from './ExpandedParameterPanel_v2'
import { TechReadout } from '../ui/MicroVisuals'

export function EffectCardStack() {
  const { sortedEffects } = useActiveEffects()
  const { selectedEffectId } = useUIStore()

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
      {validSelectedId ? (
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ padding: 12 }}
        >
          <EffectParameters_v2 effectId={validSelectedId} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3">
          <TechReadout value={0} size={64} color="var(--text-ghost)" className="opacity-40" />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
            Enable effects from the grid below
          </span>
        </div>
      )}
    </div>
  )
}
