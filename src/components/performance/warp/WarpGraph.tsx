import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useWarpStore } from '../../../stores/warpStore'
import { useAudioSourceStore } from '../../../stores/audioSourceStore'
import { useUIStore } from '../../../stores/uiStore'
import { delaySeconds, sampleLine, skewPhase, warpedY, type WarpPoint } from '../../../effects/warp/warpMath'
import { getHeardWarpPhase, getWarpPhase, warpLoopSecondsAt, warpNow } from '../../../effects/warp/warpClock'
import { describePoint, editPoints } from './warpEdit'
import { getActiveWarpCompositor } from '../../../effects/warp/warpRegistry'

export type WarpTool = 'draw' | 'steps' | 'curve' | 'erase'

const PAD = 6
const COLS = 16
const BARS = 120
const THUMBS = 16
const THUMB_MS = 250
const HIT_PX = 9
const HIT_END_PX = 14 // endpoints are easy to grab even at the graph's edges

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const EPS = 1e-9

const STATUS: Record<WarpTool, string> = {
  draw: "Click to add a point, drag to move, drag a segment's middle to bend it. Shift snaps the height",
  steps: 'Steps: drag across the graph to paint a staircase on the snap grid',
  curve: 'Curve: drag up or down over a segment to bend it',
  erase: 'Erase: drag over points to remove them',
}
const STATUS_POINT = 'Drag to move this point (Shift snaps the height). Double-click to delete it. Arrows nudge, Delete removes'
const STATUS_BEND = 'Drag up or down to bend this segment into a curve'
const STATUS_NORMAL = 'Normal: the dashed diagonal plays time as it is'

/** Bend (-1..1) that puts the segment's midpoint at fraction `f` of the way from a.y to b.y (inverse of warpMath's curve at t = 0.5). */
function bendForMid(f: number): number {
  const c = Math.min(0.9375, Math.max(0.0625, f))
  const b = c <= 0.5 ? (Math.log(c) / Math.log(0.5) - 1) / 3 : (1 - Math.log(1 - c) / Math.log(0.5)) / 3
  const r = Math.max(-1, Math.min(1, b))
  return Math.abs(r) < 0.02 ? 0 : r
}

function withBend(p: WarpPoint, bend: number): WarpPoint {
  const q: WarpPoint = { x: p.x, y: p.y }
  if (bend) q.bend = bend
  return q
}

/** Sampled bars of a synthetic beat (16 hits a loop) read through the line: what the input would sound like warped. */
function previewEnvelope(lut: Float32Array, amount: number, out: Float32Array) {
  for (let i = 0; i < out.length; i++) {
    const x = (i + 0.5) / out.length
    const r = x - warpedY(lut, x, amount) // read position in loops (y is how far back)
    const y = r - Math.floor(r)
    const hit = (y * 16) % 1
    out[i] = (0.2 + 0.8 * Math.exp(-hit * 4.5)) * (0.55 + 0.45 * Math.abs(Math.sin(y * 23.7)))
  }
}

interface Props { tool: WarpTool; visible: boolean; selected: number | null; onSelect: (i: number | null) => void }

/**
 * The warp graph: 16-column grid, dashed identity, the white line with points and bend handles, the --live playhead,
 * the output waveform and the frame strip behind. The line is React (it changes on edits only); the playhead and
 * waveform are drawn by rAF and the thumbnails every 250 ms, both only while the tab is visible.
 */
export const WarpGraph = memo(function WarpGraph({ tool, visible, selected, onSelect }: Props) {
  const points = useWarpStore((s) => s.points)
  const snap = useWarpStore((s) => s.snap)
  const enabled = useWarpStore((s) => s.enabled)
  const boxRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const waveRef = useRef<HTMLCanvasElement>(null)
  const thumbRef = useRef<HTMLCanvasElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [nearNormal, setNearNormal] = useState(false)
  const lastStatus = useRef<string | null>(null)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight)
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = size
  const iw = Math.max(1, w - 2 * PAD), ih = Math.max(1, h - 2 * PAD)
  const X = (x: number) => PAD + x * iw
  const Y = (y: number) => PAD + y * ih

  // ── playhead + waveform (rAF, visible only) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || w < 2 || h < 2) return
    const cv = waveRef.current, head = headRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx || !head) return
    const dpr = window.devicePixelRatio || 1
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr)
    const warp = getComputedStyle(cv).getPropertyValue('--warp').trim() || '#e8c35a'
    const env = new Float32Array(BARS) // measured output, filled as the playhead passes
    const preview = new Float32Array(BARS)
    let previewKey: Float32Array | null = null, previewAmount = NaN
    let buf: Float32Array<ArrayBuffer> | null = null
    let lastBar = -1
    let raf = 0
    const frame = () => {
      raf = requestAnimationFrame(frame)
      const s = useWarpStore.getState()
      const xs = skewPhase(getHeardWarpPhase(), s.skew)
      head.style.transform = `translateX(${(PAD + xs * iw).toFixed(1)}px)`
      // Output level from the post-warp analyser, written into the bar under the playhead
      const an = useAudioSourceStore.getState().reactiveAnalyser
      const bar = Math.min(BARS - 1, Math.floor(xs * BARS))
      if (an) {
        if (!buf || buf.length !== an.fftSize) buf = new Float32Array(an.fftSize)
        an.getFloatTimeDomainData(buf)
        let peak = 0
        for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > peak) peak = a }
        if (lastBar < 0) lastBar = bar
        for (let b = lastBar; b !== bar; b = (b + 1) % BARS) env[(b + 1) % BARS] = peak
        env[bar] = Math.max(env[bar], peak)
        lastBar = bar
      }
      let max = 0
      for (let i = 0; i < BARS; i++) if (env[i] > max) max = env[i]
      let src = env, norm = max > 0 ? 1 / max : 0
      if (max < 0.01) {
        // No audible output: preview the input through the line instead
        if (previewKey !== s.lut || previewAmount !== s.amount) { previewEnvelope(s.lut, s.amount, preview); previewKey = s.lut; previewAmount = s.amount }
        src = preview; norm = 1
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = warp
      const mid = h * 0.6, amp = h * 0.22
      for (let i = 0; i < BARS; i++) {
        const a = Math.min(1, src[i] * norm) * amp
        if (a < 0.5) { ctx.globalAlpha = 0.3; ctx.fillRect(PAD + ((i + 0.5) / BARS) * iw - 1, mid - 0.5, 2, 1); continue }
        ctx.globalAlpha = (i + 0.5) / BARS < xs ? 0.95 : 0.3
        ctx.fillRect(PAD + ((i + 0.5) / BARS) * iw - 1, mid - a, 2, a * 2)
      }
      ctx.globalAlpha = 1
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [visible, w, h, iw])

  // ── thumbnails: the frame each column plays in the last completed pass of the loop. Refreshed every
  // 250 ms while visible; 16 reused canvases, and columns that play the same frame share one readback.
  useEffect(() => {
    if (!visible || w < 2) return
    const cv = thumbRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const th = 34
    cv.width = Math.round(w * dpr); cv.height = Math.round(th * dpr)
    const surface = getComputedStyle(cv).getPropertyValue('--bg-surface').trim() || '#2c2d31'
    const cells = Array.from({ length: THUMBS }, () => document.createElement('canvas'))
    const times = new Float64Array(THUMBS)
    const src = new Int8Array(THUMBS)
    const args = { phase: 0, lut: useWarpStore.getState().lut, amount: 1, skew: 0, loopSeconds: 2 }
    const draw = () => {
      if (document.visibilityState !== 'visible') return
      const comp = getActiveWarpCompositor()
      const s = useWarpStore.getState()
      const live = !!comp && s.enabled && s.appliesTo !== 'audio'
      times.fill(NaN)
      if (live) {
        const now = warpNow()
        const L = warpLoopSecondsAt(now)
        // Reads of the last completed pass lie up to 3 loops back; ask the ring to keep that (capped at 8 s)
        comp.setThumbnailHistory(3 * L + 0.25)
        const passStart = now - getWarpPhase(now) * L - L
        args.lut = s.lut; args.amount = s.amount; args.skew = s.skew; args.loopSeconds = L
        for (let i = 0; i < THUMBS; i++) {
          // column centre on the graph's axis (x′), back to the clock phase x that reads it
          const x = skewPhase((i + 0.5) / THUMBS, -s.skew)
          args.phase = x
          const t = passStart + x * L - delaySeconds(args)
          const ft = comp.frameTimeAt(t)
          let j = -1
          for (let k = 0; k < i; k++) if (times[k] === ft) { j = src[k]; break }
          if (j < 0 && !Number.isNaN(ft)) { comp.getThumbnailAt(t, cells[i]); j = i }
          times[i] = ft
          src[i] = j
        }
      } else comp?.setThumbnailHistory(0)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, th)
      const cw = (w - (THUMBS - 1)) / THUMBS
      let filled = 0
      for (let i = 0; i < THUMBS; i++) {
        const x = i * (cw + 1)
        const img = Number.isNaN(times[i]) ? null : cells[src[i]]
        if (img && img.width > 1) {
          // cover the cell, centred
          const sc = Math.max(cw / img.width, th / img.height)
          const sw = cw / sc, sh = th / sc
          ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, 0, cw, th)
          filled++
        } else {
          ctx.fillStyle = surface
          ctx.fillRect(x, 0, cw, th)
        }
      }
      cv.dataset.filled = String(filled)
      cv.dataset.frames = Array.from(times, (t) => (Number.isNaN(t) ? '' : t.toFixed(4))).join(',')
    }
    draw()
    const id = window.setInterval(draw, THUMB_MS)
    return () => {
      window.clearInterval(id)
      getActiveWarpCompositor()?.setThumbnailHistory(0)
    }
  }, [visible, w])

  // ── editing ──────────────────────────────────────────────────────────────────────────────────────
  const toVal = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: clamp01((e.clientX - r.left - PAD) / iw), y: clamp01((e.clientY - r.top - PAD) / ih) }
  }
  const snapX = (x: number) => (snap > 0 ? clamp01(Math.round(x / snap) * snap) : clamp01(x)) // 0 = quantize Off
  const snapY = (y: number, shift: boolean) => (shift ? clamp01(Math.round(y * 16) / 16) : y)
  const setPoints = editPoints
  const hitPoint = (clientX: number, clientY: number, pts: WarpPoint[]) => {
    const r = svgRef.current!.getBoundingClientRect()
    const px = clientX - r.left, py = clientY - r.top
    let i = -1, best = Infinity
    pts.forEach((p, k) => {
      const d = Math.hypot(X(p.x) - px, Y(p.y) - py)
      if (d <= (k === 0 || k === pts.length - 1 ? HIT_END_PX : HIT_PX) && d < best) { best = d; i = k }
    })
    return i
  }

  /** Drag: run `move` on every pointermove until release, with pointer capture on the svg. */
  const track = (e: React.PointerEvent, move: (ev: PointerEvent) => void) => {
    const el = svgRef.current!
    el.setPointerCapture(e.pointerId)
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const movePoint = (i: number, e: React.PointerEvent) => {
    track(e, (ev) => {
      const cur = useWarpStore.getState().points
      if (!cur[i]) return
      const v = toVal(ev)
      const last = cur.length - 1
      // Endpoints keep x = 0 / 1; inner points stay between their neighbours (equal x allowed: a step)
      const x = i === 0 ? 0 : i === last ? 1 : Math.min(cur[i + 1].x, Math.max(cur[i - 1].x, snapX(v.x)))
      const next = cur.slice()
      next[i] = { ...cur[i], x, y: snapY(v.y, ev.shiftKey) }
      setPoints(next)
    })
  }

  const bendSegment = (i: number, e: React.PointerEvent) => {
    track(e, (ev) => {
      const cur = useWarpStore.getState().points
      const a = cur[i - 1], b = cur[i]
      if (!a || !b || Math.abs(b.y - a.y) < EPS || b.x - a.x < EPS) return
      const f = (toVal(ev).y - a.y) / (b.y - a.y)
      const next = cur.slice()
      next[i] = withBend(b, bendForMid(f))
      setPoints(next)
    })
  }

  /** Steps (staircase on the snap grid) or Draw (one point per grid column) painted across a drag. */
  const paint = (e: React.PointerEvent, mode: 'steps' | 'draw', base: WarpPoint[], first?: { x: number; y: number }) => {
    const n = Math.max(1, Math.round(1 / (snap > 0 ? snap : 1 / 16)))
    const cols = new Map<number, number>()
    let lastCol: number | null = null
    const colOf = (x: number) => (mode === 'steps' ? Math.min(n - 1, Math.floor(x * n)) : Math.round(x * n))
    const yOf = (y: number) => (mode === 'steps' ? Math.round(y * n) / n : y)
    const apply = () => {
      const ks = [...cols.keys()]
      const lo = Math.min(...ks), hi = Math.max(...ks)
      if (mode === 'draw' && lo === hi) return // a click without a drag only adds its one point
      const x0 = lo / n, x1 = mode === 'steps' ? (hi + 1) / n : hi / n
      const kept = base.filter((p) => p.x < x0 - EPS || p.x > x1 + EPS)
      const add: WarpPoint[] = []
      for (let c = lo; c <= hi; c++) {
        const y = cols.get(c)
        if (y === undefined) continue
        const pts = mode === 'steps' ? [{ x: c / n, y }, { x: (c + 1) / n, y }] : [{ x: c / n, y }]
        for (const p of pts) { const q = add[add.length - 1]; if (!q || q.x !== p.x || q.y !== p.y) add.push(p) }
      }
      const now = setPoints([...kept, ...add].sort((a, b) => a.x - b.x))
      if (mode === 'steps') { onSelect(null); return }
      // keep a valid selection: the point painted last
      const lx = lastCol === null ? NaN : lastCol / n, ly = lastCol === null ? NaN : cols.get(lastCol)
      const k = now.findIndex((p) => Math.abs(p.x - lx) < EPS && p.y === ly)
      onSelect(k < 0 ? null : k)
    }
    const at = (v: { x: number; y: number }) => {
      const c = colOf(v.x), y = clamp01(yOf(v.y))
      if (lastCol !== null && lastCol !== c) {
        // fill the columns skipped by a fast drag
        const dir = Math.sign(c - lastCol)
        for (let k = lastCol + dir; k !== c; k += dir) cols.set(k, y)
      }
      cols.set(c, y)
      lastCol = c
      apply()
    }
    if (first) { cols.set(colOf(first.x), first.y); lastCol = colOf(first.x) } else at(toVal(e))
    track(e, (ev) => at(toVal(ev)))
  }

  const erase = (e: React.PointerEvent) => {
    const hit = (ev: { clientX: number; clientY: number }) => {
      const r = svgRef.current!.getBoundingClientRect()
      const px = ev.clientX - r.left, py = ev.clientY - r.top
      const cur = useWarpStore.getState().points
      const next = cur.filter((p) => Math.hypot(X(p.x) - px, Y(p.y) - py) > HIT_PX)
      if (next.length !== cur.length && next.length >= 2) { setPoints(next); onSelect(null) }
    }
    hit(e)
    track(e, hit)
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    svgRef.current?.focus({ preventScroll: true })
    const t = e.target as Element
    const bh = t.closest('[data-warp-bend]')
    const cur = useWarpStore.getState().points
    const hit = hitPoint(e.clientX, e.clientY, cur)
    if (tool === 'erase') { erase(e); return }
    if (tool === 'steps') { paint(e, 'steps', cur); return }
    if (tool === 'curve') {
      const v = toVal(e)
      let i = cur.findIndex((p, k) => k > 0 && cur[k - 1].x <= v.x && v.x < p.x)
      if (i < 0) i = cur.length - 1
      bendSegment(i, e)
      return
    }
    if (hit >= 0) {
      onSelect(hit)
      movePoint(hit, e)
      return
    }
    if (bh) { bendSegment(Number(bh.getAttribute('data-warp-bend')), e); return }
    // Empty space: add a point (x on the snap grid), then a drag paints points along its path
    const v = toVal(e)
    const p = { x: snapX(v.x), y: snapY(v.y, e.shiftKey) }
    // Snapped onto an existing point's x: move that point (the nearest in y) instead of making an accidental step
    let same = -1
    cur.forEach((q, k) => { if (Math.abs(q.x - p.x) < EPS && (same < 0 || Math.abs(q.y - p.y) < Math.abs(cur[same].y - p.y))) same = k })
    if (same >= 0) {
      const next = cur.slice()
      next[same] = { ...cur[same], y: p.y }
      setPoints(next)
      onSelect(same)
      movePoint(same, e)
      return
    }
    let at = cur.length
    for (let k = 0; k < cur.length; k++) if (cur[k].x > p.x) { at = k; break }
    const next = [...cur.slice(0, at), p, ...cur.slice(at)]
    setPoints(next)
    onSelect(at)
    paint(e, 'draw', cur, p)
  }

  // Hit-tested by position: pointer capture from the first click retargets dblclick to the svg itself
  const onDoubleClick = (e: React.MouseEvent) => {
    if (tool !== 'draw') return
    const cur = useWarpStore.getState().points
    if (cur.length <= 2) return
    const i = hitPoint(e.clientX, e.clientY, cur)
    if (i < 0) return
    setPoints(cur.filter((_, k) => k !== i))
    onSelect(null)
  }

  // Hover: status text (only written when it changes) and the "Normal" label on the identity line
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons) return
    const t = e.target as Element
    let st = STATUS[tool]
    let normal = false
    const hp = hitPoint(e.clientX, e.clientY, useWarpStore.getState().points)
    if (hp >= 0) st = `${describePoint(useWarpStore.getState().points, hp)}. ${STATUS_POINT}`
    else if (t.closest('[data-warp-bend]')) st = STATUS_BEND
    else {
      const r = svgRef.current!.getBoundingClientRect()
      const px = e.clientX - r.left - PAD, py = e.clientY - r.top - PAD
      // distance to the diagonal from (0,0) to (iw,ih)
      const d = Math.abs(ih * px - iw * py) / Math.hypot(iw, ih)
      if (d < 5) { st = STATUS_NORMAL; normal = true }
    }
    if (normal !== nearNormal) setNearNormal(normal)
    if (st !== lastStatus.current) { lastStatus.current = st; useUIStore.getState().setStatusText(st) }
  }
  const onPointerLeave = () => {
    lastStatus.current = null
    if (nearNormal) setNearNormal(false)
    useUIStore.getState().setStatusText(null)
  }

  // ── render ──────────────────────────────────────────────────────────────────────────────────────
  let d = ''
  points.forEach((p, i) => {
    if (i === 0) { d = `M${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`; return }
    const a = points[i - 1]
    if (p.bend && p.x - a.x > EPS) {
      for (let k = 1; k <= 24; k++) {
        const x = a.x + ((p.x - a.x) * k) / 24
        const y = k === 24 ? p.y : sampleLine([a, p], x)
        d += ` L${X(x).toFixed(1)} ${Y(y).toFixed(1)}`
      }
    } else d += ` L${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`
  })

  return (
    <div className="seg-warp-graph" ref={boxRef} data-tool={tool} data-off={enabled ? undefined : ''}>
      <canvas ref={thumbRef} data-warp-thumbs aria-hidden="true" />
      {w > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" data-warp-back>
          <g data-warp-grid>
            {Array.from({ length: COLS + 1 }, (_, i) => (
              <line key={i} x1={X(i / COLS)} y1={0} x2={X(i / COLS)} y2={h} style={{ stroke: i % 4 === 0 ? 'var(--border)' : 'var(--warp-grid)' }} strokeWidth={1} />
            ))}
          </g>
          <line data-warp-identity x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} style={{ stroke: 'var(--warp-identity)' }} strokeDasharray="6 6" />
        </svg>
      )}
      <canvas ref={waveRef} aria-hidden="true" />
      <div ref={headRef} className="seg-warp-playhead" data-warp-playhead aria-hidden="true" />
      {w > 0 && (
        <svg
          ref={svgRef}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          tabIndex={0}
          role="application"
          aria-label="Warp line: x is the position in the loop, y is the position played"
          data-warp-graph
          onPointerDown={onPointerDown}
          onDoubleClick={onDoubleClick}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          {nearNormal && <text className="seg-warp-normal" x={X(0.86)} y={Y(0.86) + 14}>Normal</text>}
          <path d={d} style={{ stroke: 'var(--text-primary)' }} strokeWidth={2} fill="none" strokeLinejoin="round" pointerEvents="none" />
          {tool === 'draw' && points.map((b, i) => {
            if (i === 0) return null
            const a = points[i - 1]
            if (b.x - a.x < 1 / 64 - EPS || Math.abs(b.y - a.y) < EPS) return null
            const mx = (a.x + b.x) / 2
            const my = sampleLine([a, b], mx)
            return (
              <g key={`b${i}`} data-warp-bend={i}>
                <circle cx={X(mx)} cy={Y(my)} r={HIT_PX} fill="transparent" />
                <circle cx={X(mx)} cy={Y(my)} r={2.5} style={{ fill: 'var(--text-secondary)' }} />
              </g>
            )
          })}
          {points.map((p, i) => (
            <g key={i} data-warp-point={i} data-selected={selected === i || undefined}>
              <circle cx={X(p.x)} cy={Y(p.y)} r={HIT_PX} fill="transparent" />
              <circle cx={X(p.x)} cy={Y(p.y)} r={4} style={{ fill: selected === i ? 'var(--warp)' : 'var(--bg-void)', stroke: 'var(--text-primary)' }} strokeWidth={1.5} />
            </g>
          ))}
        </svg>
      )}
    </div>
  )
})
