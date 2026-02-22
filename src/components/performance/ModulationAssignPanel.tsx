import { useCallback, useEffect, useState } from 'react'
import { useModulationStore, type LFOShape, LFO_COUNT } from '../../stores/modulationStore'
import { WaveformDisplay, ShapeThumbnail, SHAPES } from './LFOEditorPanel'
import { Knob } from './Knob'

export function ModulationAssignPanel() {
  const lfos = useModulationStore((s) => s.lfos)
  const selectedLFOIndex = useModulationStore((s) => s.selectedLFOIndex)
  const setSelectedLFOIndex = useModulationStore((s) => s.setSelectedLFOIndex)
  const toggleLFO = useModulationStore((s) => s.toggleLFO)
  const setLFORate = useModulationStore((s) => s.setLFORate)
  const setLFOShape = useModulationStore((s) => s.setLFOShape)
  const setLFOPhaseOffset = useModulationStore((s) => s.setLFOPhaseOffset)
  const toggleAssignmentMode = useModulationStore((s) => s.toggleAssignmentMode)
  const assigningModulator = useModulationStore((s) => s.assigningModulator)
  const setAssigningModulator = useModulationStore((s) => s.setAssigningModulator)

  const lfo = lfos[selectedLFOIndex]
  const idx = selectedLFOIndex
  const isAssigning = assigningModulator === `lfo-${idx}`
  const isAnyAssigning = assigningModulator !== null

  // Animate phase display
  const [displayPhase, setDisplayPhase] = useState(0)
  useEffect(() => {
    if (!lfo.enabled) return
    let raf: number
    const loop = () => {
      setDisplayPhase(useModulationStore.getState().lfos[idx].phase)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [lfo.enabled, idx])

  const handleShapeChange = useCallback(
    (shape: LFOShape) => setLFOShape(idx, shape),
    [setLFOShape, idx],
  )

  const handleLFOSelect = useCallback((i: number) => {
    setSelectedLFOIndex(i)
    // When in assign mode, also switch the assignment source
    if (assigningModulator !== null) {
      setAssigningModulator(`lfo-${i}`)
    }
  }, [setSelectedLFOIndex, assigningModulator, setAssigningModulator])

  return (
    <div className="h-full flex flex-col" style={{ gap: 0 }}>
      {/* Top section: waveform + controls */}
      <div className="flex flex-1 min-h-0" style={{ gap: 12 }}>
        {/* Left: Waveform display */}
        <div className="flex flex-col" style={{ width: 180, flexShrink: 0, gap: 6 }}>
          {/* LED + label */}
          <button
            onClick={() => toggleLFO(idx)}
            className="flex items-center gap-2"
            style={{ cursor: 'pointer' }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: lfo.enabled ? 'var(--accent)' : 'var(--text-ghost)',
                boxShadow: lfo.enabled ? '0 0 6px var(--accent-glow)' : 'none',
              }}
            />
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: lfo.enabled ? 'var(--text-primary)' : 'var(--text-ghost)' }}
            >
              LFO {idx + 1}
            </span>
          </button>

          {/* Waveform */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <WaveformDisplay shape={lfo.shape} phase={lfo.enabled ? displayPhase : 0} />
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex-1 flex flex-col" style={{ gap: 10, minWidth: 0 }}>
          {/* Row 1: Shape dropdown + Sync toggle */}
          <div className="flex items-center" style={{ gap: 12 }}>
            {/* Shape dropdown */}
            <div className="flex flex-col" style={{ gap: 3 }}>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
                Shape
              </span>
              <select
                value={lfo.shape}
                onChange={(e) => setLFOShape(idx, e.target.value as LFOShape)}
                className="text-[10px] rounded-sm px-1.5 py-0.5"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {SHAPES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Sync toggle */}
            <div className="flex flex-col" style={{ gap: 3 }}>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
                Sync
              </span>
              <div className="flex rounded-sm overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <button
                  className="text-[9px] px-2 py-1 uppercase tracking-wider"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    borderRight: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Free
                </button>
                <button
                  className="text-[9px] px-2 py-1 uppercase tracking-wider"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-ghost)',
                    cursor: 'pointer',
                  }}
                >
                  Sync
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Rate + Phase knobs */}
          <div className="flex items-start" style={{ gap: 12 }}>
            <Knob
              label="Rate"
              value={lfo.rate}
              min={0.1}
              max={20}
              step={0.1}
              size="sm"
              showArc
              showValue
              color="var(--accent)"
              onChange={(v) => setLFORate(idx, v)}
              formatValue={(v) => `${v.toFixed(1)} Hz`}
            />
            <Knob
              label="Phase"
              value={lfo.phaseOffset}
              min={0}
              max={360}
              step={1}
              size="sm"
              showArc
              showValue
              color="var(--accent)"
              onChange={(v) => setLFOPhaseOffset(idx, v)}
              formatValue={(v) => `${v.toFixed(0)}\u00B0`}
            />
          </div>

          {/* Row 3: Shape thumbnails */}
          <div className="flex" style={{ gap: 3 }}>
            {SHAPES.map((s) => (
              <ShapeThumbnail
                key={s.id}
                shape={s.id}
                selected={lfo.shape === s.id}
                onClick={() => handleShapeChange(s.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar: LFO slots + Assign button */}
      <div className="flex items-center" style={{ height: 36, gap: 8, flexShrink: 0 }}>
        {/* 8 LFO slot buttons */}
        <div className="flex" style={{ gap: 3 }}>
          {Array.from({ length: LFO_COUNT }, (_, i) => {
            const isSelected = i === idx
            const isThisAssigning = assigningModulator === `lfo-${i}`
            return (
              <button
                key={i}
                onClick={() => handleLFOSelect(i)}
                className="flex items-center justify-center rounded-sm transition-all"
                style={{
                  width: 28,
                  height: 24,
                  backgroundColor: isSelected ? 'var(--accent-subtle)' : isThisAssigning ? 'var(--accent-subtle)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--accent)' : isThisAssigning ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  gap: 2,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: lfos[i].enabled ? 'var(--accent)' : 'var(--text-ghost)',
                    boxShadow: lfos[i].enabled ? '0 0 4px var(--accent-glow)' : 'none',
                  }}
                />
                <span
                  className="text-[9px] font-semibold"
                  style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  {i + 1}
                </span>
              </button>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Assign button */}
        <button
          onClick={() => toggleAssignmentMode(`lfo-${idx}`)}
          className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-sm transition-all"
          style={{
            backgroundColor: isAssigning ? 'var(--accent)' : isAnyAssigning ? 'var(--accent-subtle)' : 'var(--bg-primary)',
            color: isAssigning ? 'var(--bg-primary)' : isAnyAssigning ? 'var(--accent)' : 'var(--text-secondary)',
            border: `1px solid ${isAssigning || isAnyAssigning ? 'var(--accent)' : 'var(--border)'}`,
            boxShadow: isAssigning ? '0 0 12px var(--accent-glow)' : 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isAssigning ? 'Click a param\u2026' : isAnyAssigning ? `Assigning LFO ${parseInt(assigningModulator!.split('-')[1]) + 1}` : 'Assign [M]'}
        </button>
      </div>
    </div>
  )
}
