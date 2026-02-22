import { useCallback, useEffect, useState } from 'react'
import { useModulationStore, type LFOShape, LFO_COUNT } from '../../stores/modulationStore'
import { Knob } from './Knob'

// ════════════════════════════════════════════════════════════════════════════
// WAVEFORM SHAPES — mini thumbnails and display waveform
// ════════════════════════════════════════════════════════════════════════════

export const SHAPES: { id: LFOShape; label: string }[] = [
  { id: 'sine', label: 'Sine' },
  { id: 'triangle', label: 'Tri' },
  { id: 'square', label: 'Sqr' },
  { id: 'saw', label: 'Saw' },
  { id: 'random', label: 'Rnd' },
]

export function getWaveY(shape: LFOShape, t: number): number {
  switch (shape) {
    case 'sine':
      return Math.sin(t * Math.PI * 2) * 0.5 + 0.5
    case 'triangle':
      return 1 - Math.abs(((t % 1) * 2) - 1)
    case 'square':
      return (t % 1) < 0.5 ? 1 : 0
    case 'saw':
      return t % 1
    case 'random': {
      const seg = Math.floor(t * 8) % 8
      const seed = [0.2, 0.8, 0.4, 0.9, 0.1, 0.6, 0.3, 0.7]
      return seed[seg]
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// WAVEFORM DISPLAY — SVG-based, resolution-independent
// ════════════════════════════════════════════════════════════════════════════

const VB_W = 200
const VB_H = 80
const VB_PAD = 6
const WAVE_CYCLES = 2
const WAVE_STEPS = 128

export function buildWavePath(shape: LFOShape): string {
  const pts: string[] = []
  for (let i = 0; i <= WAVE_STEPS; i++) {
    const t = (i / WAVE_STEPS) * WAVE_CYCLES
    const val = getWaveY(shape, t)
    const x = VB_PAD + (i / WAVE_STEPS) * (VB_W - VB_PAD * 2)
    const y = VB_PAD + (1 - val) * (VB_H - VB_PAD * 2)
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

export function WaveformDisplay({ shape, phase }: { shape: LFOShape; phase: number }) {
  const wavePath = buildWavePath(shape)

  // Phase maps 0-1 across the full display width
  const phaseX = VB_PAD + (phase % 1) * (VB_W - VB_PAD * 2)
  const phaseVal = getWaveY(shape, (phase % 1) * WAVE_CYCLES)
  const dotY = VB_PAD + (1 - phaseVal) * (VB_H - VB_PAD * 2)

  // Grid lines at 25/50/75%
  const gridLines = [1, 2, 3].map(i => {
    const y = VB_PAD + (i / 4) * (VB_H - VB_PAD * 2)
    return `M${VB_PAD} ${y}H${VB_W - VB_PAD}`
  }).join(' ')

  const centerY = VB_H / 2

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 4,
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-primary)',
        display: 'block',
      }}
    >
      {/* Grid */}
      <path d={gridLines} stroke="var(--border)" strokeWidth="0.5" opacity={0.25} fill="none" />
      {/* Center line */}
      <line x1={VB_PAD} y1={centerY} x2={VB_W - VB_PAD} y2={centerY} stroke="var(--border)" strokeWidth="0.5" opacity={0.5} />

      {/* Waveform glow */}
      <path d={wavePath} fill="none" stroke="var(--accent)" strokeWidth="3" opacity={0.15} strokeLinecap="round" strokeLinejoin="round" />
      {/* Waveform */}
      <path d={wavePath} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Phase indicator line */}
      <line x1={phaseX} y1={VB_PAD} x2={phaseX} y2={VB_H - VB_PAD} stroke="var(--accent)" strokeWidth="0.75" opacity={0.4} strokeDasharray="2 2" />

      {/* Phase dot — glow + core */}
      <circle cx={phaseX} cy={dotY} r="5" fill="var(--accent)" opacity={0.2} />
      <circle cx={phaseX} cy={dotY} r="2.5" fill="var(--accent)" />
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHAPE THUMBNAILS — small waveform previews
// ════════════════════════════════════════════════════════════════════════════

export function ShapeThumbnail({
  shape,
  selected,
  onClick,
}: {
  shape: LFOShape
  selected: boolean
  onClick: () => void
}) {
  const w = 28
  const h = 18
  const pad = 3

  const points: string[] = []
  const steps = shape === 'square' || shape === 'random' ? 64 : 28
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const val = getWaveY(shape, t)
    const px = pad + t * (w - pad * 2)
    const py = pad + (1 - val) * (h - pad * 2)
    points.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`)
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-sm transition-all"
      style={{
        width: 36,
        height: 28,
        backgroundColor: selected ? 'var(--accent-subtle)' : 'transparent',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        cursor: 'pointer',
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path
          d={points.join(' ')}
          fill="none"
          stroke={selected ? 'var(--accent)' : 'var(--text-ghost)'}
          strokeWidth={1.5}
        />
      </svg>
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LFO EDITOR PANEL
// ════════════════════════════════════════════════════════════════════════════

export function LFOEditorPanel() {
  const lfos = useModulationStore((s) => s.lfos)
  const selectedLFOIndex = useModulationStore((s) => s.selectedLFOIndex)
  const setSelectedLFOIndex = useModulationStore((s) => s.setSelectedLFOIndex)
  const toggleLFO = useModulationStore((s) => s.toggleLFO)
  const setLFORate = useModulationStore((s) => s.setLFORate)
  const setLFOShape = useModulationStore((s) => s.setLFOShape)
  const toggleAssignmentMode = useModulationStore((s) => s.toggleAssignmentMode)
  const assigningModulator = useModulationStore((s) => s.assigningModulator)

  const lfo = lfos[selectedLFOIndex]
  const idx = selectedLFOIndex

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

  const isAssigning = assigningModulator === `lfo-${idx}`

  const handleShapeChange = useCallback(
    (shape: LFOShape) => setLFOShape(idx, shape),
    [setLFOShape, idx],
  )

  return (
    <div
      className="h-full flex flex-col"
      style={{
        backgroundColor: 'var(--bg-surface)',
        padding: 12,
        gap: 10,
      }}
    >
      {/* Header: LED + Label */}
      <div className="flex items-center gap-2">
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
      </div>

      {/* LFO Selector Row — 8 numbered buttons */}
      <div className="flex gap-1">
        {Array.from({ length: LFO_COUNT }, (_, i) => (
          <button
            key={i}
            onClick={() => setSelectedLFOIndex(i)}
            className="flex-1 flex items-center justify-center gap-1 rounded-sm transition-all"
            style={{
              height: 22,
              backgroundColor: i === idx ? 'var(--accent-subtle)' : 'transparent',
              border: `1px solid ${i === idx ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer',
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
              style={{ color: i === idx ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {i + 1}
            </span>
          </button>
        ))}
      </div>

      {/* Waveform Display */}
      <div style={{ height: 80, flexShrink: 0 }}>
        <WaveformDisplay shape={lfo.shape} phase={lfo.enabled ? displayPhase : 0} />
      </div>

      {/* Shape thumbnails row */}
      <div className="flex gap-1">
        {SHAPES.map((s) => (
          <ShapeThumbnail
            key={s.id}
            shape={s.id}
            selected={lfo.shape === s.id}
            onClick={() => handleShapeChange(s.id)}
          />
        ))}
      </div>

      {/* Knobs row: Shape label, Rate, Sync */}
      <div className="flex items-start justify-between" style={{ gap: 8 }}>
        {/* Shape dropdown */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-[9px] uppercase tracking-wider"
            style={{ color: 'var(--text-ghost)' }}
          >
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
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Rate knob */}
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

        {/* Sync toggle */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-[9px] uppercase tracking-wider"
            style={{ color: 'var(--text-ghost)' }}
          >
            Sync
          </span>
          <div className="flex rounded-sm overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              className="text-[9px] px-2 py-1 uppercase tracking-wider"
              style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                borderRight: '1px solid var(--border)',
              }}
            >
              Free
            </button>
            <button
              className="text-[9px] px-2 py-1 uppercase tracking-wider"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-ghost)',
              }}
            >
              Sync
            </button>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Assign button */}
      <button
        onClick={() => toggleAssignmentMode(`lfo-${idx}`)}
        className="w-full text-[10px] font-semibold uppercase tracking-wider py-1.5 rounded-sm transition-all"
        style={{
          backgroundColor: isAssigning ? 'var(--accent)' : 'var(--bg-primary)',
          color: isAssigning ? 'var(--bg-primary)' : 'var(--text-secondary)',
          border: `1px solid ${isAssigning ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: isAssigning ? '0 0 12px var(--accent-glow)' : 'none',
          cursor: 'pointer',
        }}
      >
        {isAssigning ? 'Click a param…' : 'Assign [M]'}
      </button>
    </div>
  )
}
