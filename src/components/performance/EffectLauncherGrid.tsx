import { useMemo } from 'react'
import { useEffectLauncherStore, type CycleMode, type TriggerBand } from '../../stores/effectLauncherStore'
import { useEffectLauncher } from '../../hooks/useEffectLauncher'
import { getEffectInfo } from '../../hooks/useActiveEffects'
import { PAGE_NAMES, getEffectsForPage } from '../../config/effects'
import { Knob } from './Knob'
import { CompactEffectParams } from './CompactEffectParams'
import { getEffectParams } from '../../utils/effectControl'

// Build a flat list of non-reserved effects grouped by page, for the picker dropdown
function useEffectOptions() {
  return useMemo(() => {
    const groups: { pageName: string; effects: { id: string; label: string }[] }[] = []
    for (let i = 0; i < PAGE_NAMES.length; i++) {
      const pageEffects = getEffectsForPage(i)
        .filter(e => e.row !== 'reserved')
        .map(e => ({ id: e.id, label: e.label }))
      if (pageEffects.length > 0) {
        groups.push({ pageName: PAGE_NAMES[i], effects: pageEffects })
      }
    }
    return groups
  }, [])
}

const CYCLE_MODES: { key: CycleMode; label: string }[] = [
  { key: 'speed', label: 'SPD' },
  { key: 'selection', label: 'SEL' },
  { key: 'combined', label: 'MIX' },
]

const TRIGGER_BANDS: { key: TriggerBand; label: string }[] = [
  { key: 'sub', label: 'SUB' },
  { key: 'kick', label: 'KICK' },
  { key: 'mid', label: 'MID' },
  { key: 'high', label: 'HIGH' },
  { key: 'all', label: 'ALL' },
]

const toggleBtnBase: React.CSSProperties = {
  fontSize: 8,
  fontFamily: 'var(--font-sans)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  border: '1px solid var(--border)',
  borderRadius: 3,
  padding: '2px 5px',
  cursor: 'pointer',
  lineHeight: 1,
  transition: 'background var(--transition-fast), color var(--transition-fast)',
}

export function EffectLauncherGrid() {
  // Start the cycling engine
  useEffectLauncher()

  // Store state
  const cells = useEffectLauncherStore(s => s.cells)
  const activeIndex = useEffectLauncherStore(s => s.activeIndex)
  const selectedIndex = useEffectLauncherStore(s => s.selectedIndex)
  const isPlaying = useEffectLauncherStore(s => s.isPlaying)
  const cycleMode = useEffectLauncherStore(s => s.cycleMode)
  const triggerBand = useEffectLauncherStore(s => s.triggerBand)
  const threshold = useEffectLauncherStore(s => s.threshold)
  const holdTime = useEffectLauncherStore(s => s.holdTime)
  const fallbackRate = useEffectLauncherStore(s => s.fallbackRate)

  const play = useEffectLauncherStore(s => s.play)
  const stop = useEffectLauncherStore(s => s.stop)
  const selectCell = useEffectLauncherStore(s => s.selectCell)
  const clearCell = useEffectLauncherStore(s => s.clearCell)
  const setCell = useEffectLauncherStore(s => s.setCell)
  const setCycleMode = useEffectLauncherStore(s => s.setCycleMode)
  const setTriggerBand = useEffectLauncherStore(s => s.setTriggerBand)
  const setThreshold = useEffectLauncherStore(s => s.setThreshold)
  const setHoldTime = useEffectLauncherStore(s => s.setHoldTime)
  const setFallbackRate = useEffectLauncherStore(s => s.setFallbackRate)

  const effectOptions = useEffectOptions()

  const selectedCell = selectedIndex !== null ? cells[selectedIndex] : null
  const selectedInfo = selectedCell ? getEffectInfo(selectedCell.effectId) : null

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* ── Transport bar ── */}
      <div
        className="flex items-center flex-shrink-0 px-2"
        style={{
          height: 32,
          borderBottom: '1px solid var(--border)',
          gap: 6,
        }}
      >
        {/* Play / Stop */}
        <button
          onClick={() => isPlaying ? stop() : play()}
          style={{
            ...toggleBtnBase,
            width: 24,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            padding: 0,
            backgroundColor: isPlaying ? 'var(--accent)' : 'transparent',
            color: isPlaying ? 'var(--bg-primary)' : 'var(--text-muted)',
          }}
          title={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? '\u25A0' : '\u25B6'}
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 14, backgroundColor: 'var(--border)' }} />

        {/* Cycle mode buttons */}
        {CYCLE_MODES.map(m => (
          <button
            key={m.key}
            onClick={() => setCycleMode(m.key)}
            style={{
              ...toggleBtnBase,
              backgroundColor: cycleMode === m.key ? 'var(--accent)' : 'transparent',
              color: cycleMode === m.key ? 'var(--bg-primary)' : 'var(--text-ghost)',
            }}
          >
            {m.label}
          </button>
        ))}

        {/* Separator */}
        <div style={{ width: 1, height: 14, backgroundColor: 'var(--border)' }} />

        {/* Band trigger buttons */}
        {TRIGGER_BANDS.map(b => (
          <button
            key={b.key}
            onClick={() => setTriggerBand(b.key)}
            style={{
              ...toggleBtnBase,
              backgroundColor: triggerBand === b.key ? 'var(--accent)' : 'transparent',
              color: triggerBand === b.key ? 'var(--bg-primary)' : 'var(--text-ghost)',
            }}
          >
            {b.label}
          </button>
        ))}

        {/* Separator */}
        <div style={{ width: 1, height: 14, backgroundColor: 'var(--border)' }} />

        {/* Knobs */}
        <Knob
          label="THRESH"
          value={threshold}
          min={0}
          max={1}
          step={0.01}
          size="xs"
          onChange={setThreshold}
          formatValue={v => v.toFixed(2)}
        />
        <Knob
          label="HOLD"
          value={holdTime}
          min={50}
          max={2000}
          step={10}
          size="xs"
          onChange={setHoldTime}
          formatValue={v => `${Math.round(v)}`}
        />
        <Knob
          label="RATE"
          value={fallbackRate}
          min={30}
          max={300}
          step={1}
          size="xs"
          onChange={setFallbackRate}
          formatValue={v => `${Math.round(v)}`}
        />
      </div>

      {/* ── 4x4 Grid ── */}
      <div
        className="flex-1 min-h-0 p-2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: 3,
        }}
      >
        {cells.map((cell, i) => {
          const info = cell ? getEffectInfo(cell.effectId) : null
          const isActive = activeIndex === i
          const isSelected = selectedIndex === i
          const effectColor = info?.color ?? 'var(--accent)'

          return (
            <button
              key={i}
              onClick={() => selectCell(i)}
              onDoubleClick={() => { if (cell) clearCell(i) }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 48,
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                transition: 'background var(--transition-fast), border-color var(--transition-fast)',
                // Border styling
                border: isActive && cell
                  ? `1px solid ${effectColor}`
                  : isSelected
                    ? '1px dashed var(--accent)'
                    : '1px solid var(--border)',
                // Left accent stripe for populated cells
                borderLeft: cell
                  ? `3px solid ${isActive ? effectColor : info?.color ?? 'var(--border)'}`
                  : undefined,
                // Background
                backgroundColor: isActive && cell
                  ? `${effectColor}18`
                  : cell
                    ? 'var(--bg-elevated)'
                    : 'transparent',
                // Text color
                color: cell
                  ? (isActive ? effectColor : 'var(--text-secondary)')
                  : 'var(--text-ghost)',
                // Glow for active
                boxShadow: isActive && cell
                  ? `0 0 8px ${effectColor}30, inset 0 0 12px ${effectColor}10`
                  : 'none',
              }}
            >
              {cell ? (info?.label ?? cell.effectId) : ''}
            </button>
          )
        })}
      </div>

      {/* ── Cell editor ── */}
      {selectedIndex !== null && (
        <div
          className="flex-shrink-0 flex items-center px-2"
          style={{
            height: 48,
            borderTop: '1px solid var(--border)',
            gap: 8,
          }}
        >
          {/* Effect picker */}
          <select
            value={selectedCell?.effectId ?? ''}
            onChange={e => {
              const effectId = e.target.value
              if (effectId && selectedIndex !== null) {
                setCell(selectedIndex, effectId, {})
              }
            }}
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-sans)',
              textTransform: 'uppercase',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: '3px 4px',
              outline: 'none',
              maxWidth: 100,
              cursor: 'pointer',
            }}
          >
            <option value="">-- FX --</option>
            {effectOptions.map(group => (
              <optgroup key={group.pageName} label={group.pageName}>
                {group.effects.map(fx => (
                  <option key={fx.id} value={fx.id}>
                    {fx.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Compact effect params (when cell is populated) */}
          {selectedCell && selectedInfo && (
            <div className="flex-1 min-w-0 flex items-center overflow-x-auto" style={{ gap: 4 }}>
              <CompactEffectParams effectId={selectedCell.effectId} color={selectedInfo.color} />
            </div>
          )}

          {/* Snap button */}
          {selectedCell && (
            <button
              onClick={() => {
                if (selectedIndex !== null && selectedCell) {
                  const params = getEffectParams(selectedCell.effectId)
                  setCell(selectedIndex, selectedCell.effectId, params)
                }
              }}
              style={{
                ...toggleBtnBase,
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
              title="Snapshot current params into this cell"
            >
              SNAP
            </button>
          )}

          {/* Clear button */}
          {selectedCell && (
            <button
              onClick={() => { if (selectedIndex !== null) clearCell(selectedIndex) }}
              style={{
                ...toggleBtnBase,
                backgroundColor: 'transparent',
                color: 'var(--text-ghost)',
                flexShrink: 0,
              }}
              title="Clear this cell"
            >
              CLR
            </button>
          )}
        </div>
      )}
    </div>
  )
}
