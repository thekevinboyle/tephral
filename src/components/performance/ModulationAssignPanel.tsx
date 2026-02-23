import { useCallback, useEffect, useRef, useState } from 'react'
import { useModulationStore, computeMorphedWave, LFO_COUNT } from '../../stores/modulationStore'
import { useUIStore } from '../../stores/uiStore'
import { WaveformDisplay } from './LFOEditorPanel'
import { Knob } from './Knob'

// Editable value pill — drag to adjust, double-click to type
function EditableValuePill({
  value,
  min,
  max,
  step,
  onChange,
  format,
  parse,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format: (v: number) => string
  parse?: (s: string) => number
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dragStartY = useRef<number | null>(null)
  const dragStartVal = useRef(0)
  const didDrag = useRef(false)

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commitEdit = useCallback(() => {
    setEditing(false)
    const parseFn = parse ?? ((s: string) => parseFloat(s))
    const parsed = parseFn(editText)
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed))
      const stepped = Math.round(clamped / step) * step
      onChange(stepped)
    }
  }, [editText, min, max, step, onChange, parse])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    didDrag.current = false
    dragStartY.current = e.clientY
    dragStartVal.current = value
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [value])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    const dy = dragStartY.current - e.clientY
    if (Math.abs(dy) > 3) didDrag.current = true
    const range = max - min
    const sensitivity = range / 200
    let newVal = dragStartVal.current + dy * sensitivity
    newVal = Math.min(max, Math.max(min, newVal))
    newVal = Math.round(newVal / step) * step
    onChange(newVal)
  }, [min, max, step, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
    dragStartY.current = null
  }, [])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditText(format(value))
    setEditing(true)
  }, [value, format])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitEdit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="text-[9px] font-medium tabular-nums text-center outline-none"
        style={{
          color: 'var(--text-primary)',
          border: '1px solid var(--text-muted)',
          borderRadius: 2,
          padding: '1px 3px',
          backgroundColor: 'var(--bg-primary)',
          minWidth: 42,
          width: 48,
        }}
      />
    )
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      className="text-[9px] font-medium tabular-nums text-center select-none"
      style={{
        color: 'var(--text-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 2,
        padding: '1px 5px',
        backgroundColor: 'var(--bg-primary)',
        minWidth: 42,
        cursor: 'ns-resize',
      }}
    >
      {format(value)}
    </div>
  )
}

// Mini waveform thumbnail — ~28x18 SVG showing a single cycle
const MINI_W = 28
const MINI_H = 18
const MINI_PAD = 2
const MINI_STEPS = 32

function MiniWaveform({ tilt, curve, active, enabled }: { tilt: number; curve: number; active: boolean; enabled: boolean }) {
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
    ? 'var(--text-secondary)'
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

export function ModulationAssignPanel() {
  const lfos = useModulationStore((s) => s.lfos)
  const selectedLFOIndex = useModulationStore((s) => s.selectedLFOIndex)
  const setSelectedLFOIndex = useModulationStore((s) => s.setSelectedLFOIndex)
  const toggleLFO = useModulationStore((s) => s.toggleLFO)
  const setLFORate = useModulationStore((s) => s.setLFORate)
  const setLFOTilt = useModulationStore((s) => s.setLFOTilt)
  const setLFOCurve = useModulationStore((s) => s.setLFOCurve)
  const setLFOPhaseOffset = useModulationStore((s) => s.setLFOPhaseOffset)
  const toggleAssignmentMode = useModulationStore((s) => s.toggleAssignmentMode)
  const assigningModulator = useModulationStore((s) => s.assigningModulator)
  const setAssigningModulator = useModulationStore((s) => s.setAssigningModulator)

  const setStatusText = useUIStore((s) => s.setStatusText)

  const lfo = lfos[selectedLFOIndex]
  const idx = selectedLFOIndex
  const isAssigning = assigningModulator === `lfo-${idx}`
  const isAnyAssigning = assigningModulator !== null

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

  const handleLFOSelect = useCallback((i: number) => {
    setSelectedLFOIndex(i)
    if (assigningModulator !== null) {
      setAssigningModulator(`lfo-${i}`)
    }
  }, [setSelectedLFOIndex, assigningModulator, setAssigningModulator])

  return (
    <div className="h-full flex flex-col" style={{ gap: 6 }}>
      {/* Row 1: Waveform + knobs + assign */}
      <div className="flex items-start" style={{ gap: 10 }}>
        {/* Waveform block */}
        <div className="flex flex-col" style={{ gap: 2, flexShrink: 0 }}>
          <div className="flex items-center" style={{ gap: 4 }}>
            <button
              onClick={() => toggleLFO(idx)}
              className="flex items-center gap-1"
              style={{ cursor: 'pointer' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: lfo.enabled ? 'var(--text-secondary)' : 'var(--text-ghost)' }}
              />
              <span
                className="text-[9px] font-medium uppercase tracking-wider"
                style={{ color: lfo.enabled ? 'var(--text-secondary)' : 'var(--text-ghost)' }}
              >
                LFO {idx + 1}
              </span>
            </button>
          </div>
          <div style={{ width: 160, height: 68 }}>
            <WaveformDisplay tilt={lfo.tilt} curve={lfo.curve} phase={lfo.enabled ? displayPhase : 0} />
          </div>
        </div>

        {/* Rate column — larger, first */}
        <div className="flex flex-col items-center" style={{ gap: 3 }}>
          <Knob
            label="Rate"
            value={lfo.rate}
            min={0.1}
            max={20}
            step={0.1}
            size="md"
            color="var(--text-muted)"
            onChange={(v) => setLFORate(idx, v)}
            statusText="LFO Rate \u2014 Modulation speed in Hz"
          />
          <EditableValuePill
            value={lfo.rate}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(v) => setLFORate(idx, v)}
            format={(v) => `${v.toFixed(2)} Hz`}
            parse={(s) => parseFloat(s.replace(/\s*hz\s*/i, ''))}
          />
        </div>

        {/* Tilt column */}
        <div className="flex flex-col items-center" style={{ gap: 3 }}>
          <Knob
            label="Tilt"
            value={lfo.tilt}
            min={-1}
            max={1}
            step={0.01}
            size="sm"
            color="var(--text-muted)"
            onChange={(v) => setLFOTilt(idx, v)}
            statusText="Tilt \u2014 Wave asymmetry"
          />
          <EditableValuePill
            value={lfo.tilt}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => setLFOTilt(idx, v)}
            format={(v) => v.toFixed(2)}
          />
        </div>

        {/* Curve column */}
        <div className="flex flex-col items-center" style={{ gap: 3 }}>
          <Knob
            label="Curve"
            value={lfo.curve}
            min={-1}
            max={1}
            step={0.01}
            size="sm"
            color="var(--text-muted)"
            onChange={(v) => setLFOCurve(idx, v)}
            statusText="Curve \u2014 Wave curvature"
          />
          <EditableValuePill
            value={lfo.curve}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => setLFOCurve(idx, v)}
            format={(v) => v.toFixed(2)}
          />
        </div>

        {/* Phase column */}
        <div className="flex flex-col items-center" style={{ gap: 3 }}>
          <Knob
            label="Phase"
            value={lfo.phaseOffset}
            min={0}
            max={360}
            step={1}
            size="sm"
            color="var(--text-muted)"
            onChange={(v) => setLFOPhaseOffset(idx, v)}
            statusText="Phase \u2014 Cycle offset in degrees"
          />
          <EditableValuePill
            value={lfo.phaseOffset}
            min={0}
            max={360}
            step={1}
            onChange={(v) => setLFOPhaseOffset(idx, v)}
            format={(v) => `${v.toFixed(0)}\u00B0`}
            parse={(s) => parseFloat(s.replace(/[°\s]/g, ''))}
          />
        </div>

        <div className="flex-1" />

        {/* Assign button — vertically centered with knobs */}
        <div className="flex items-center" style={{ height: 68 }}>
          <button
            onClick={() => toggleAssignmentMode(`lfo-${idx}`)}
            className="text-[8px] font-medium uppercase tracking-wider px-2.5 rounded-sm"
            style={{
              height: 18,
              backgroundColor: isAssigning ? 'var(--text-secondary)' : 'transparent',
              color: isAssigning ? 'var(--bg-primary)' : 'var(--text-ghost)',
              border: `1px solid ${isAssigning || isAnyAssigning ? 'var(--text-muted)' : 'var(--border)'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={() => setStatusText('Assign \u2014 Map LFO to effect parameters')}
            onMouseLeave={() => setStatusText(null)}
          >
            {isAssigning ? 'Assign\u2026' : isAnyAssigning ? `LFO ${parseInt(assigningModulator!.split('-')[1]) + 1}` : 'Assign'}
          </button>
        </div>
      </div>

      {/* Row 2: 4x2 LFO selector grid + Sync */}
      <div className="flex items-center" style={{ gap: 6 }}>
        {/* 4x2 mini waveform grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gridTemplateRows: 'repeat(2, auto)', gap: 2 }}>
          {Array.from({ length: LFO_COUNT }, (_, i) => {
            const isSelected = i === idx
            const l = lfos[i]
            return (
              <button
                key={i}
                onClick={() => handleLFOSelect(i)}
                className="flex flex-col items-center justify-center rounded-sm"
                style={{
                  width: 36,
                  height: 26,
                  backgroundColor: isSelected ? 'var(--bg-hover)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--text-muted)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  padding: '2px 2px 0',
                  position: 'relative',
                }}
                onMouseEnter={() => setStatusText(`LFO ${i + 1} \u2014 Select modulator`)}
                onMouseLeave={() => setStatusText(null)}
              >
                <MiniWaveform tilt={l.tilt} curve={l.curve} active={isSelected} enabled={l.enabled} />
                <span
                  className="text-[6px] font-medium leading-none"
                  style={{
                    color: isSelected ? 'var(--text-secondary)' : 'var(--text-ghost)',
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
                      backgroundColor: 'var(--text-secondary)',
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

        {/* Sync toggle */}
        <div className="flex rounded-sm overflow-hidden" style={{ border: '1px solid var(--border)', marginLeft: 2 }}>
          <button
            className="text-[8px] font-medium uppercase tracking-wider px-2"
            style={{
              height: 18,
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
              borderRight: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            Free
          </button>
          <button
            className="text-[8px] font-medium uppercase tracking-wider px-2"
            style={{
              height: 18,
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
  )
}
