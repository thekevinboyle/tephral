import { memo, useEffect, useMemo, useRef } from 'react'
import { usePadStore, MASTER_PAD, PAD_BEATS, type PadTarget } from '../../stores/padStore'
import { useUIStore } from '../../stores/uiStore'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import { displayParamLabel } from '../../config/paramNames'
import { getEffectInfo } from '../../config/effectNames'
import { statusHover } from '../../utils/statusHover'
import { PAD_SLOTS, clearPadPath, dicePadPath, getPadPath, hasPadPath, padDown, padHeads, padMove, padUp } from '../../effects/pads/padEngine'

const MASTER_TARGETS: [string, string][] = [['master.allMix', 'All Dry/wet'], ['warp.amount', 'Warp · Amount'], ['warp.skew', 'Warp · Skew']]
const BEAT_LABELS: Record<number, string> = { 2: '½ bar', 4: '1 bar', 8: '2 bars', 16: '4 bars', 32: '8 bars' }
const padName = (id: string) => (id === MASTER_PAD ? 'Master' : getEffectInfo(id).name)

/** An effect pad starts on the effect's first two dials (the second falls back to its Dry/wet). */
function effectDefaults(id: string): { x: PadTarget; y: PadTarget } {
  const params = EFFECT_PARAM_REGISTRY[id]?.getParams() ?? []
  return { x: params[0] ? `${id}.${params[0].id}` : `${id}.effectMix`, y: params[1] ? `${id}.${params[1].id}` : `${id}.effectMix` }
}

/** Readable name of a target, for the axis labels. */
function targetLabel(t: PadTarget): string {
  if (!t) return 'Nothing'
  const m = MASTER_TARGETS.find(([v]) => v === t)
  if (m) return m[1]
  const dot = t.indexOf('.'), id = t.slice(0, dot), pid = t.slice(dot + 1)
  if (pid === 'effectMix') return `${getEffectInfo(id).name} · Dry/wet`
  const p = EFFECT_PARAM_REGISTRY[id]?.getParams().find((q) => q.id === pid)
  return `${getEffectInfo(id).name} · ${p ? displayParamLabel(id, p) : pid}`
}

/** Any target in the app: master ones, then each chain effect's Dry/wet and numeric params. */
function TargetSelect({ axis, value, ids, onChange }: { axis: 'X' | 'Y'; value: PadTarget; ids: string[]; onChange: (t: PadTarget) => void }) {
  return (
    <label className="seg-pad-target" {...statusHover(`${axis} axis: what moving ${axis === 'X' ? 'across' : 'up and down'} the pad changes. Anything in the app`)}>
      <span>{axis}</span>
      <select data-pad-axis={axis.toLowerCase()} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Nothing</option>
        <optgroup label="Master">
          {MASTER_TARGETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </optgroup>
        {ids.map((id) => (
          <optgroup key={id} label={getEffectInfo(id).name}>
            <option value={`${id}.effectMix`}>Dry/wet</option>
            {(EFFECT_PARAM_REGISTRY[id]?.getParams() ?? []).map((p) => (
              <option key={p.id} value={`${id}.${p.id}`}>{displayParamLabel(id, p)}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

/** The pad surface: grid, the recorded path (brighter towards the playhead), the dot and crosshair. Drawn in rAF. */
function PadSurface({ id, color }: { id: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    let raf = 0
    const css = getComputedStyle(c)
    const grid = css.getPropertyValue('--bg-surface').trim() || '#2e2e2e'
    const live = css.getPropertyValue('--live').trim() || '#C4FA13'
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr))
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
      const g = c.getContext('2d')!
      g.clearRect(0, 0, w, h)
      g.strokeStyle = grid; g.lineWidth = dpr
      for (let i = 1; i < 8; i++) {
        g.beginPath(); g.moveTo((w * i) / 8, 0); g.lineTo((w * i) / 8, h); g.stroke()
        g.beginPath(); g.moveTo(0, (h * i) / 8); g.lineTo(w, (h * i) / 8); g.stroke()
      }
      const head = padHeads.get(id) ?? null
      const path = getPadPath(id)
      const headSlot = head && !Number.isNaN(head.phase) ? Math.floor(head.phase * PAD_SLOTS) : -1
      // The path in loop order, fading the further it is behind the playhead
      g.lineCap = 'round'; g.strokeStyle = color
      for (let i = 1; i < PAD_SLOTS; i++) {
        const a = i - 1, b = i
        if (Number.isNaN(path.xs[a]) || Number.isNaN(path.xs[b])) continue
        const age = headSlot < 0 ? 0.5 : ((headSlot - b + PAD_SLOTS) % PAD_SLOTS) / PAD_SLOTS
        g.globalAlpha = 0.15 + 0.85 * (1 - age)
        g.lineWidth = (1.5 + 2.5 * (1 - age)) * dpr
        g.beginPath(); g.moveTo(path.xs[a] * w, (1 - path.ys[a]) * h); g.lineTo(path.xs[b] * w, (1 - path.ys[b]) * h); g.stroke()
      }
      g.globalAlpha = 1
      if (head) {
        const x = head.x * w, y = (1 - head.y) * h
        g.strokeStyle = live; g.globalAlpha = 0.45; g.lineWidth = dpr
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.moveTo(0, y); g.lineTo(w, y); g.stroke()
        g.globalAlpha = 1; g.fillStyle = live
        g.beginPath(); g.arc(x, y, 7 * dpr, 0, Math.PI * 2); g.fill()
        g.strokeStyle = '#111'; g.lineWidth = 2 * dpr; g.stroke()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [id, color])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return [(e.clientX - r.left) / Math.max(1, r.width), 1 - (e.clientY - r.top) / Math.max(1, r.height)] as const
  }
  return (
    <canvas
      ref={canvasRef}
      className="seg-pad-surface"
      data-pad-surface={id}
      onPointerDown={(e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); padDown(id, ...pos(e)) }}
      onPointerMove={(e) => { if (e.buttons & 1 || e.pointerType === 'touch') padMove(...pos(e)) }}
      onPointerUp={padUp}
      onPointerCancel={padUp}
      {...statusHover('Drag while it plays to record a path over the loop; it replays in time. Stopped, the pad plays live')}
    />
  )
}

/**
 * The Sequencer's Pad view: an X/Y pad for the master and one per effect in the chain. Drag while the transport
 * plays to record a path over the pad's loop (Replace starts it over, Overdub writes over it); it then replays in
 * time, driving the X and Y targets (anything in the app). Stop gives every target its own value back.
 */
export const PadView = memo(function PadView({ ids, colors }: { ids: string[]; colors: Record<string, string> }) {
  const tab = useUIStore((s) => s.padTab)
  const open = tab !== MASTER_PAD && ids.includes(tab) ? tab : MASTER_PAD
  const pad = usePadStore((s) => s.pads[open])
  useEffect(() => { usePadStore.getState().ensure(open, open === MASTER_PAD ? undefined : effectDefaults(open)) }, [open])
  const color = open === MASTER_PAD ? 'var(--warp)' : colors[open] ?? 'var(--text-muted)'
  const update = (p: Parameters<ReturnType<typeof usePadStore.getState>['update']>[1]) => usePadStore.getState().update(open, p)
  const recorded = useMemo(() => hasPadPath(open), [open, pad?.version]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="seg-pad" data-pad-view>
      <div className="seg-pad-tabs" role="tablist" aria-label="Pads">
        {[MASTER_PAD, ...ids].map((id) => (
          <button key={id} type="button" role="tab" data-pad-tab={id} aria-selected={id === open}
            onClick={() => useUIStore.getState().setPadTab(id)} {...statusHover(`${padName(id)} pad`)}>
            <i style={{ background: id === MASTER_PAD ? 'var(--warp)' : colors[id] }} aria-hidden="true" />{padName(id)}
          </button>
        ))}
      </div>
      <div className="seg-pad-main">
        <div className="seg-pad-area" style={{ ['--pad-color' as string]: color }}>
          {/* Canvas colours must be concrete, so the CSS variable is resolved by the surface's own getComputedStyle */}
          <PadSurface id={open} color={resolveColor(color)} />
          <span className="seg-pad-axis" data-axis="y">Y → {targetLabel(pad?.y ?? null)}</span>
          <span className="seg-pad-axis" data-axis="x">X → {targetLabel(pad?.x ?? null)}</span>
        </div>
        <div className="seg-pad-side">
          <TargetSelect axis="X" value={pad?.x ?? null} ids={ids} onChange={(x) => update({ x })} />
          <TargetSelect axis="Y" value={pad?.y ?? null} ids={ids} onChange={(y) => update({ y })} />
          <label className="seg-pad-target" {...statusHover('Loop length: how long the recorded path is before it repeats')}>
            <span>Loop</span>
            <select data-pad-beats value={pad?.beats ?? 8} onChange={(e) => update({ beats: Number(e.target.value) as (typeof PAD_BEATS)[number] })}>
              {PAD_BEATS.map((b) => <option key={b} value={b}>{BEAT_LABELS[b]}</option>)}
            </select>
          </label>
          <div className="seg-pad-modes" role="group" aria-label="Record mode">
            {(['replace', 'overdub'] as const).map((m) => (
              <button key={m} type="button" data-pad-mode={m} aria-pressed={(pad?.mode ?? 'replace') === m} onClick={() => update({ mode: m })}
                {...statusHover(m === 'replace' ? 'Replace: a new touch starts the path over' : 'Overdub: a touch writes over the path only where you draw')}>
                {m === 'replace' ? 'Replace' : 'Overdub'}
              </button>
            ))}
          </div>
          <div className="seg-pad-actions">
            <button type="button" data-pad-dice onClick={() => dicePadPath(open)} {...statusHover('Dice: draw a random looping path')}>Dice</button>
            <button type="button" data-pad-clear disabled={!recorded} onClick={() => clearPadPath(open)} {...statusHover('Clear the recorded path')}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  )
})

/** `var(--x)` → its value on :root (canvas strokes need a real colour). */
function resolveColor(c: string): string {
  const m = /^var\((--[\w-]+)\)$/.exec(c)
  return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#aeaca7' : c
}
