import { useEffect, useState } from 'react'
import { useModulationStore, computeMorphedWave, LFO_COUNT } from '../../stores/modulationStore'
import { useUIStore } from '../../stores/uiStore'
import { Knob } from './Knob'

// ════════════════════════════════════════════════════════════════════════════
// WAVEFORM DISPLAY — SVG-based, uses tilt/curve morphing
// ════════════════════════════════════════════════════════════════════════════

const VB_W = 200
const VB_H = 80
const VB_PAD = 6
const WAVE_CYCLES = 2
const WAVE_STEPS = 128

export function buildWavePath(tilt: number, curve: number): string {
  const pts: string[] = []
  for (let i = 0; i <= WAVE_STEPS; i++) {
    const t = (i / WAVE_STEPS) * WAVE_CYCLES
    const val = computeMorphedWave(t % 1, tilt, curve)
    const x = VB_PAD + (i / WAVE_STEPS) * (VB_W - VB_PAD * 2)
    const y = VB_PAD + (1 - val) * (VB_H - VB_PAD * 2)
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

export function WaveformDisplay({ tilt, curve, phase }: { tilt: number; curve: number; phase: number }) {
  const wavePath = buildWavePath(tilt, curve)

  const phaseX = VB_PAD + (phase % 1) * (VB_W - VB_PAD * 2)
  const phaseVal = computeMorphedWave(((phase % 1) * WAVE_CYCLES) % 1, tilt, curve)
  const dotY = VB_PAD + (1 - phaseVal) * (VB_H - VB_PAD * 2)

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
        borderRadius: 3,
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-primary)',
        display: 'block',
      }}
    >
      <path d={gridLines} stroke="var(--border)" strokeWidth="0.4" opacity={0.15} fill="none" />
      <line x1={VB_PAD} y1={centerY} x2={VB_W - VB_PAD} y2={centerY} stroke="var(--border)" strokeWidth="0.4" opacity={0.3} />
      <path d={wavePath} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={phaseX} y1={VB_PAD} x2={phaseX} y2={VB_H - VB_PAD} stroke="var(--text-muted)" strokeWidth="0.5" opacity={0.3} strokeDasharray="2 2" />
      <circle cx={phaseX} cy={dotY} r="2.5" fill="var(--text-secondary)" />
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MINI WAVEFORM — small thumbnail for LFO selector cells
// ════════════════════════════════════════════════════════════════════════════

const MINI_W = 28
const MINI_H = 18
const MINI_PAD = 2
const MINI_STEPS = 32

function SidebarMiniWaveform({ tilt, curve, active, enabled }: { tilt: number; curve: number; active: boolean; enabled: boolean }) {
  const pts: string[] = []
  for (let i = 0; i <= MINI_STEPS; i++) {
    const t = i / MINI_STEPS
    const val = computeMorphedWave(t, tilt, curve)
    const x = MINI_PAD + t * (MINI_W - MINI_PAD * 2)
    const y = MINI_PAD + (1 - val) * (MINI_H - MINI_PAD * 2)
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  const path = pts.join(' ')
  const strokeColor = active
    ? 'var(--accent)'
    : enabled
      ? 'var(--text-muted)'
      : 'var(--text-ghost)'

  return (
    <svg
      viewBox={`0 0 ${MINI_W} ${MINI_H}`}
      preserveAspectRatio="none"
      style={{ width: MINI_W, height: MINI_H, display: 'block' }}
    >
      <path d={path} fill="none" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LFO EDITOR PANEL (sidebar version)
// ════════════════════════════════════════════════════════════════════════════

export function LFOEditorPanel() {
  const lfos = useModulationStore((s) => s.lfos)
  const selectedLFOIndex = useModulationStore((s) => s.selectedLFOIndex)
  const setSelectedLFOIndex = useModulationStore((s) => s.setSelectedLFOIndex)
  const toggleLFO = useModulationStore((s) => s.toggleLFO)
  const setLFORate = useModulationStore((s) => s.setLFORate)
  const setLFOTilt = useModulationStore((s) => s.setLFOTilt)
  const setLFOCurve = useModulationStore((s) => s.setLFOCurve)
  const toggleAssignmentMode = useModulationStore((s) => s.toggleAssignmentMode)
  const assigningModulator = useModulationStore((s) => s.assigningModulator)

  const setStatusText = useUIStore((s) => s.setStatusText)

  const lfo = lfos[selectedLFOIndex]
  const idx = selectedLFOIndex

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

      {/* LFO Selector — 4x2 mini waveform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        {Array.from({ length: LFO_COUNT }, (_, i) => {
          const isSelected = i === idx
          const l = lfos[i]
          return (
            <button
              key={i}
              onClick={() => setSelectedLFOIndex(i)}
              className="flex flex-col items-center justify-center rounded-sm"
              style={{
                height: 28,
                backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
                padding: '2px 2px 0',
                position: 'relative',
              }}
              onMouseEnter={() => setStatusText(`LFO ${i + 1} \u2014 Select modulator`)}
              onMouseLeave={() => setStatusText(null)}
            >
              <SidebarMiniWaveform tilt={l.tilt} curve={l.curve} active={isSelected} enabled={l.enabled} />
              <span
                className="text-[6px] font-medium leading-none"
                style={{
                  color: isSelected ? 'var(--accent)' : 'var(--text-ghost)',
                  position: 'absolute',
                  bottom: 1,
                  right: 2,
                }}
              >
                {i + 1}
              </span>
              {l.enabled && (
                <span
                  className="rounded-full"
                  style={{
                    width: 3,
                    height: 3,
                    backgroundColor: 'var(--accent)',
                    boxShadow: '0 0 4px var(--accent-glow)',
                    position: 'absolute',
                    top: 2,
                    left: 2,
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Waveform Display */}
      <div style={{ height: 80, flexShrink: 0 }}>
        <WaveformDisplay tilt={lfo.tilt} curve={lfo.curve} phase={lfo.enabled ? displayPhase : 0} />
      </div>

      {/* Knobs: Rate, Tilt, Curve */}
      <div className="flex items-start justify-between" style={{ gap: 8 }}>
        <Knob
          label="Rate"
          value={lfo.rate}
          min={0.1}
          max={20}
          step={0.1}
          size="sm"
          showValue
          color="var(--accent)"
          onChange={(v) => setLFORate(idx, v)}
          formatValue={(v) => `${v.toFixed(1)} Hz`}
          statusText="LFO Rate \u2014 Modulation speed in Hz"
        />
        <Knob
          label="Tilt"
          value={lfo.tilt}
          min={-1}
          max={1}
          step={0.01}
          size="sm"
          showValue
          color="var(--accent)"
          onChange={(v) => setLFOTilt(idx, v)}
          formatValue={(v) => v.toFixed(2)}
          statusText="Tilt \u2014 Wave asymmetry"
        />
        <Knob
          label="Curve"
          value={lfo.curve}
          min={-1}
          max={1}
          step={0.01}
          size="sm"
          showValue
          color="var(--accent)"
          onChange={(v) => setLFOCurve(idx, v)}
          formatValue={(v) => v.toFixed(2)}
          statusText="Curve \u2014 Wave curvature"
        />
      </div>

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
        onMouseEnter={() => setStatusText('Assign \u2014 Map LFO to effect parameters')}
        onMouseLeave={() => setStatusText(null)}
      >
        {isAssigning ? 'Click a param\u2026' : 'Assign [M]'}
      </button>
    </div>
  )
}
