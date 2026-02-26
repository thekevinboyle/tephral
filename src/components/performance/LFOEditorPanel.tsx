import { useEffect, useState, useRef, useCallback } from 'react'
import { useModulationStore, computeMorphedWave, LFO_COUNT, LFO_SHAPES, SYNC_DIVISIONS, type LFOShape } from '../../stores/modulationStore'
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
        borderRadius: 4,
        border: '1px solid var(--border)',
        display: 'block',
        background: 'linear-gradient(to bottom, #0A0A0A, #111111)',
        boxShadow: 'var(--shadow-inset), inset 0 0 20px rgba(0,0,0,0.3)',
      }}
    >
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--accent-dim)" />
          <stop offset="50%" stopColor="var(--text-secondary)" />
          <stop offset="100%" stopColor="var(--accent-dim)" />
        </linearGradient>
        <filter id="waveGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={gridLines} stroke="var(--border)" strokeWidth="0.4" opacity={0.1} fill="none" />
      <line x1={VB_PAD} y1={centerY} x2={VB_W - VB_PAD} y2={centerY} stroke="var(--border)" strokeWidth="0.5" opacity={0.2} />
      {/* Wave glow layer */}
      <path d={wavePath} fill="none" stroke="var(--text-muted)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={0.08} />
      {/* Main wave */}
      <path d={wavePath} fill="none" stroke="url(#waveGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1={phaseX} y1={VB_PAD} x2={phaseX} y2={VB_H - VB_PAD} stroke="var(--accent-dim)" strokeWidth="0.5" opacity={0.25} strokeDasharray="2 2" />
      <circle cx={phaseX} cy={dotY} r="3" fill="var(--text-secondary)" filter="url(#waveGlow)" />
      <circle cx={phaseX} cy={dotY} r="1.5" fill="var(--text-primary)" />
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
// DROPDOWN — Minimal styled dropdown for shape/sync selection
// ════════════════════════════════════════════════════════════════════════════

export function LFODropdown<T extends string>({
  value,
  options,
  onChange,
  width = 80,
}: {
  value: T
  options: T[]
  onChange: (v: T) => void
  width?: number
}) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
  }, [])

  useEffect(() => {
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  return (
    <div ref={ref} className="relative" style={{ width }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-full flex items-center justify-between text-[10px] font-medium"
        style={{
          height: 22,
          padding: '0 8px 0 7px',
          borderRadius: 3,
          background: open
            ? 'linear-gradient(to bottom, #2A2A2A, #222222)'
            : hovered
              ? 'linear-gradient(to bottom, #252525, #1E1E1E)'
              : 'linear-gradient(to bottom, #202020, #181818)',
          border: open
            ? '1px solid rgba(255,255,255,0.15)'
            : '1px solid rgba(255,255,255,0.10)',
          color: '#F5F0EB',
          cursor: 'pointer',
          boxShadow: open
            ? '0 0 0 1px rgba(255,255,255,0.04), var(--shadow-button)'
            : 'var(--shadow-button)',
          fontFamily: 'var(--font-sans)',
          transition: 'all 80ms ease',
        }}
      >
        <span style={{ letterSpacing: '0.02em' }}>{value}</span>
        <svg
          width="8" height="5" viewBox="0 0 8 5"
          style={{
            marginLeft: 4,
            opacity: 0.6,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 120ms ease',
          }}
        >
          <path d="M0.5 0.5L4 4.5L7.5 0.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          className="absolute left-0 z-50"
          style={{
            top: 25,
            minWidth: Math.max(width, 100),
            background: '#0C0C0C',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 5,
            boxShadow: '0 8px 30px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
            overflow: 'hidden',
            maxHeight: 240,
            overflowY: 'auto',
            padding: '3px 0',
          }}
        >
          {options.map((opt) => {
            const isActive = opt === value
            return (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className="w-full text-left text-[10px]"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px 5px 8px',
                  color: isActive ? '#FFFFFF' : '#B0AAA4',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.02em',
                  borderLeft: isActive ? '2px solid #D5D0CB' : '2px solid transparent',
                  transition: 'background-color 60ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.color = '#E0DBD6'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive ? 'rgba(255,255,255,0.08)' : 'transparent'
                  e.currentTarget.style.color = isActive ? '#FFFFFF' : '#B0AAA4'
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}
    </div>
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
  const setLFOShape = useModulationStore((s) => s.setLFOShape)
  const setLFOSyncMode = useModulationStore((s) => s.setLFOSyncMode)
  const setLFOSyncDivision = useModulationStore((s) => s.setLFOSyncDivision)
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
        background: 'linear-gradient(to bottom, #1C1C1C, #151515)',
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
              boxShadow: lfo.enabled ? '0 0 6px var(--accent-glow), 0 0 12px var(--accent-glow)' : 'none',
              transition: 'all var(--transition-normal)',
            }}
          />
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{
              color: lfo.enabled ? 'var(--text-primary)' : 'var(--text-ghost)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            LFO {idx + 1}
          </span>
        </button>
      </div>

      {/* LFO Selector — 4x2 mini waveform grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 2,
          padding: 3,
          borderRadius: 4,
          background: 'linear-gradient(to bottom, #0E0E0E, #121212)',
          boxShadow: 'var(--shadow-inset)',
        }}
      >
        {Array.from({ length: LFO_COUNT }, (_, i) => {
          const isSelected = i === idx
          const l = lfos[i]
          return (
            <button
              key={i}
              onClick={() => setSelectedLFOIndex(i)}
              className="flex flex-col items-center justify-center"
              style={{
                height: 28,
                backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 3,
                cursor: 'pointer',
                padding: '2px 2px 0',
                position: 'relative',
                boxShadow: isSelected ? '0 0 8px var(--accent-glow)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={() => setStatusText(`LFO ${i + 1} \u2014 Select modulator`)}
              onMouseLeave={() => setStatusText(null)}
            >
              <SidebarMiniWaveform tilt={l.tilt} curve={l.curve} active={isSelected} enabled={l.enabled} />
              <span
                className="text-[6px] font-medium leading-none tabular-nums"
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

      {/* Shape dropdown + Sync toggle */}
      <div className="flex items-center" style={{ gap: 6 }}>
        <LFODropdown
          value={lfo.shape}
          options={LFO_SHAPES as unknown as LFOShape[]}
          onChange={(v) => setLFOShape(idx, v)}
          width={90}
        />
        <div className="flex-1" />
        {/* Free / Sync toggle */}
        <div
          className="flex overflow-hidden"
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 3,
            boxShadow: 'var(--shadow-button)',
            background: '#111111',
          }}
        >
          {(['free', 'sync'] as const).map((mode) => {
            const active = lfo.syncMode === mode
            return (
              <button
                key={mode}
                onClick={() => setLFOSyncMode(idx, mode)}
                className="text-[9px] font-medium uppercase tracking-wider"
                style={{
                  height: 20,
                  padding: '0 8px',
                  backgroundColor: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                  color: active ? '#F5F0EB' : '#5A5450',
                  borderRight: mode === 'free' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 80ms ease',
                }}
              >
                {mode === 'free' ? 'Free' : 'Sync'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Waveform Display */}
      <div style={{ height: 80, flexShrink: 0 }}>
        <WaveformDisplay tilt={lfo.tilt} curve={lfo.curve} phase={lfo.enabled ? displayPhase : 0} />
      </div>

      {/* Rate/Sync + Tilt + Curve */}
      <div className="flex items-start justify-between" style={{ gap: 8 }}>
        {lfo.syncMode === 'sync' ? (
          <div className="flex flex-col items-center" style={{ gap: 3, minWidth: 48 }}>
            <span className="text-[9px] uppercase tracking-wide leading-none font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
              Div
            </span>
            <LFODropdown
              value={lfo.syncDivision}
              options={SYNC_DIVISIONS.map(d => d.label)}
              onChange={(v) => setLFOSyncDivision(idx, v)}
              width={64}
            />
          </div>
        ) : (
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
        )}
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
        className="w-full text-[10px] font-semibold uppercase tracking-wider py-1.5 rounded-sm"
        style={{
          backgroundColor: isAssigning ? 'var(--accent)' : 'var(--bg-primary)',
          color: isAssigning ? 'var(--bg-primary)' : 'var(--text-secondary)',
          border: `1px solid ${isAssigning ? 'var(--accent)' : 'var(--border)'}`,
          borderTop: isAssigning ? undefined : 'var(--border-top-highlight)',
          boxShadow: isAssigning ? '0 0 12px var(--accent-glow)' : 'var(--shadow-button)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          transition: 'all var(--transition-normal)',
        }}
        onMouseEnter={() => setStatusText('Assign \u2014 Map LFO to effect parameters')}
        onMouseLeave={() => setStatusText(null)}
      >
        {isAssigning ? 'Click a param\u2026' : 'Assign [M]'}
      </button>
    </div>
  )
}
