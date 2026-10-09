import { memo, useImperativeHandle, useRef } from 'react'
import { useUIStore } from '../../../stores/uiStore'
import { sampleLine, type WarpPoint } from '../../../effects/warp/warpMath'
import { describePoint } from '../warp/warpEdit'
import { linePath } from './linePath'

export type WarpTool = 'draw' | 'steps' | 'curve' | 'erase'

export const PAD = 6
const COLS = 16
const HIT_PX = 9
const HIT_END_PX = 14 // endpoints are easy to grab even at the graph's edges

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const EPS = 1e-9

const STATUS: Record<WarpTool, string> = {
  draw: 'Click or double-click to add a point, drag to move, double-click a point to delete. Shift paints steps, Alt snaps to the grid, Alt-drag a curve handle moves every curve.',
  steps: 'Steps: drag across the graph to paint a staircase on the quantize grid',
  curve: 'Curve: drag up or down over a segment to bend it',
  erase: 'Erase: drag over points to remove them',
}
const STATUS_POINT = 'Drag to move this point (Alt snaps it to the grid). Double-click to delete it. Arrows nudge, Delete removes'
const STATUS_BEND = "Drag up or down to bend this segment. Alt bends every segment, Alt and Shift snap the curve's middle to the grid"

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

export interface LinePlotProps {
  points: WarpPoint[]
  /** Read the latest points during a drag (store getState), so a gesture never sees stale props. */
  getPoints: () => WarpPoint[]
  /** Write points; returns the normalised points now stored. */
  setPoints: (p: WarpPoint[]) => WarpPoint[]
  snap: number // 0 = quantize Off
  /** Vertical snap grid: divisions from top to bottom. Default 16 (the Warp). */
  gridY?: number
  tool: WarpTool
  selected: number | null
  onSelect: (i: number | null) => void
  width: number // svg width in px
  height: number // plot height in px
  /** 'warp' keeps every existing data-warp-* attribute; 'line' emits data-line-* (data-line-graph, -point, -bend). */
  attr: 'warp' | 'line'
  ariaLabel: string
  /** Hover status for empty space at (px, py) inside the plot (relative to the padded plot area); return null to use the tool's text. */
  hoverStatus?: (px: number, py: number, iw: number, ih: number) => string | null
  statusPoint?: string // default: the warp's STATUS_POINT text
  /** SVG children drawn in the back SVG after the grid (no pointer events). */
  backChildren?: React.ReactNode
  /** Rendered between the back and the front SVG (the warp's wave canvas and playhead). */
  between?: React.ReactNode
  /** SVG children drawn on top of the line and handles, without pointer events (labels). */
  children?: React.ReactNode
  /** Stroke for the line. Default var(--text-primary). */
  stroke?: string
}

/**
 * The point-editing core of a line graph (shared by the warp graph and the line tracks): a back SVG (grid,
 * `backChildren`), then `between`, then the interactive front SVG (the line, bend handles, points,
 * `children`). Tools: Draw (click or double-click adds, drag paints, Shift paints steps, drag a point to
 * move, a bend handle to curve, double-click a point deletes; Alt snaps to the X and Y grids, Alt on a bend
 * handle bends every segment), Steps, Curve, Erase. Gestures read the latest points through
 * `getPoints` and write through `setPoints`.
 */
export const LinePlot = memo(function LinePlot({
  points, getPoints, setPoints, snap, gridY = 16, tool, selected, onSelect, width: w, height: gh, attr, ariaLabel,
  hoverStatus, statusPoint = STATUS_POINT, backChildren, between, children, stroke = 'var(--text-primary)', svgRef: outerRef,
}: LinePlotProps & { svgRef?: React.Ref<SVGSVGElement> }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const lastStatus = useRef<string | null>(null)
  // The point a click on empty space just added, so the double-click that click starts keeps it (spec §5)
  const added = useRef<{ x: number; y: number; t: number } | null>(null)
  // The optional outer ref sees the front (interactive) svg; it only exists while the width is non-zero
  useImperativeHandle(outerRef, () => svgRef.current as SVGSVGElement)

  const da = (name: string, v: string | number | boolean | undefined = '') => ({ [`data-${attr}-${name}`]: v })

  const iw = Math.max(1, w - 2 * PAD), ih = Math.max(1, gh - 2 * PAD)
  const X = (x: number) => PAD + x * iw
  const Y = (y: number) => PAD + y * ih

  // ── editing ──────────────────────────────────────────────────────────────────────────────────────
  const toVal = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: clamp01((e.clientX - r.left - PAD) / iw), y: clamp01((e.clientY - r.top - PAD) / ih) }
  }
  const snapX = (x: number) => (snap > 0 ? clamp01(Math.round(x / snap) * snap) : clamp01(x)) // 0 = quantize Off
  const gridX = snap > 0 ? snap : 1 / 16
  const snapGridX = (x: number) => clamp01(Math.round(x / gridX) * gridX)
  const snapGridY = (y: number) => clamp01(Math.round(y * gridY) / gridY)
  const snapY = (y: number, alt: boolean) => (alt ? snapGridY(y) : y) // Alt snaps the height to the Y grid
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
      const cur = getPoints()
      if (!cur[i]) return
      const v = toVal(ev)
      const last = cur.length - 1
      // Endpoints keep x = 0 / 1; inner points stay between their neighbours (equal x allowed: a step)
      // Keys are read on every move: Alt snaps both axes to the grid, and releasing it mid-drag frees them again
      const sx = ev.altKey ? snapGridX(v.x) : snapX(v.x)
      const x = i === 0 ? 0 : i === last ? 1 : Math.min(cur[i + 1].x, Math.max(cur[i - 1].x, sx))
      const next = cur.slice()
      next[i] = { ...cur[i], x, y: snapY(v.y, ev.altKey) }
      setPoints(next)
    })
  }

  /**
   * Bend segment i. Alt moves every bend by the change made to this one (flat segments are skipped); Alt and
   * Shift snap this segment's midpoint height to the Y grid.
   */
  const bendSegment = (i: number, e: React.PointerEvent) => {
    const startBends = getPoints().map((p) => p.bend ?? 0)
    track(e, (ev) => {
      const cur = getPoints()
      const a = cur[i - 1], b = cur[i]
      if (!a || !b || Math.abs(b.y - a.y) < EPS || b.x - a.x < EPS) return
      const next = cur.slice()
      if (ev.altKey && ev.shiftKey) {
        const my = snapGridY(toVal(ev).y)
        next[i] = withBend(b, bendForMid((my - a.y) / (b.y - a.y)))
      } else if (ev.altKey) {
        const f = (toVal(ev).y - a.y) / (b.y - a.y)
        const delta = bendForMid(f) - (startBends[i] ?? 0)
        for (let k = 1; k < cur.length; k++) {
          const pa = cur[k - 1], pb = cur[k]
          if (Math.abs(pb.y - pa.y) < EPS || pb.x - pa.x < EPS) continue
          next[k] = withBend(pb, Math.max(-1, Math.min(1, (startBends[k] ?? 0) + delta)))
        }
      } else {
        const f = (toVal(ev).y - a.y) / (b.y - a.y)
        next[i] = withBend(b, bendForMid(f))
      }
      setPoints(next)
    })
  }

  /**
   * Steps (staircase on the quantize grid) or Draw (one point per grid column) painted across a drag. With
   * quantize Off, steps use 1/16 and Draw paints on a fine 1/64 grid.
   */
  const paint = (e: React.PointerEvent, mode: 'steps' | 'draw', base: WarpPoint[], first?: { x: number; y: number }) => {
    const n = Math.max(1, Math.round(1 / (snap > 0 ? snap : mode === 'steps' ? 1 / 16 : 1 / 64)))
    const cols = new Map<number, number>()
    let lastCol: number | null = null
    const colOf = (x: number) => (mode === 'steps' ? Math.min(n - 1, Math.floor(x * n)) : Math.round(x * n))
    const yOf = (y: number, alt: boolean) => snapY(y, alt) // heights are free; Alt snaps them to the Y grid
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
    const at = (v: { x: number; y: number }, alt: boolean) => {
      const c = colOf(v.x), y = clamp01(yOf(v.y, alt))
      if (lastCol !== null && lastCol !== c) {
        // fill the columns skipped by a fast drag
        const dir = Math.sign(c - lastCol)
        for (let k = lastCol + dir; k !== c; k += dir) cols.set(k, y)
      }
      cols.set(c, y)
      lastCol = c
      apply()
    }
    if (first) { cols.set(colOf(first.x), first.y); lastCol = colOf(first.x) } else at(toVal(e), e.altKey)
    track(e, (ev) => at(toVal(ev), ev.altKey))
  }

  const erase = (e: React.PointerEvent) => {
    const hit = (ev: { clientX: number; clientY: number }) => {
      const r = svgRef.current!.getBoundingClientRect()
      const px = ev.clientX - r.left, py = ev.clientY - r.top
      const cur = getPoints()
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
    const bh = t.closest(`[data-${attr}-bend]`)
    const cur = getPoints()
    const hit = hitPoint(e.clientX, e.clientY, cur)
    if (tool === 'erase') { erase(e); return }
    // Holding Shift in Draw switches to step drawing for this drag (spec §2), except on an existing point or
    // bend handle, which Shift still moves or bends
    if (tool === 'steps' || (tool === 'draw' && e.shiftKey && hit < 0 && !bh)) { paint(e, 'steps', cur); return }
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
    if (bh) { bendSegment(Number(bh.getAttribute(`data-${attr}-bend`)), e); return }
    // Empty space: add a point (x on the snap grid), then a drag paints points along its path
    const v = toVal(e)
    const p = { x: e.altKey ? snapGridX(v.x) : snapX(v.x), y: snapY(v.y, e.altKey) }
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
    added.current = { x: p.x, y: p.y, t: performance.now() }
    paint(e, 'draw', cur, p)
  }

  // Hit-tested by position: pointer capture from the first click retargets dblclick to the svg itself
  const onDoubleClick = (e: React.MouseEvent) => {
    if (tool !== 'draw') return
    const cur = getPoints()
    const i = hitPoint(e.clientX, e.clientY, cur)
    const a = added.current
    added.current = null
    const fresh = !!a && performance.now() - a.t < 600
    // the double-click's first click already added this point: keep it (spec §5)
    if (i >= 0 && fresh && Math.abs(cur[i].x - a!.x) < EPS && Math.abs(cur[i].y - a!.y) < EPS) return
    if (i >= 0) {
      // endpoints, and lines with 2 points, are kept
      if (cur.length > 2 && i > 0 && i < cur.length - 1) { setPoints(cur.filter((_, k) => k !== i)); onSelect(null) }
      return
    }
    // the first click already added a point that snapped away from the cursor: a double-click adds exactly one
    if (fresh) return
    // empty space (e.g. the first click landed on an existing x): add one point
    const v = toVal(e), p = { x: snapX(v.x), y: v.y }
    let at = cur.length
    for (let k = 0; k < cur.length; k++) if (cur[k].x > p.x) { at = k; break }
    setPoints([...cur.slice(0, at), p, ...cur.slice(at)])
    onSelect(at)
  }

  // Hover: status text (only written when it changes)
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons) return
    const t = e.target as Element
    let st = STATUS[tool]
    const hp = hitPoint(e.clientX, e.clientY, getPoints())
    if (hp >= 0) st = `${describePoint(getPoints(), hp)}. ${statusPoint}`
    else if (t.closest(`[data-${attr}-bend]`)) st = STATUS_BEND
    else if (hoverStatus) {
      const r = svgRef.current!.getBoundingClientRect()
      const px = e.clientX - r.left - PAD, py = e.clientY - r.top - PAD
      st = hoverStatus(px, py, iw, ih) ?? st
    }
    if (st !== lastStatus.current) { lastStatus.current = st; useUIStore.getState().setStatusText(st) }
  }
  const onPointerLeave = () => {
    lastStatus.current = null
    useUIStore.getState().setStatusText(null)
  }

  // ── render ──────────────────────────────────────────────────────────────────────────────────────
  const d = linePath(points, X, Y)

  return (
    <>
      {w > 0 && (
        <svg width={w} height={gh} viewBox={`0 0 ${w} ${gh}`} aria-hidden="true" {...da('back')}>
          <g {...da('grid')}>
            {Array.from({ length: COLS + 1 }, (_, i) => (
              <line key={i} x1={X(i / COLS)} y1={0} x2={X(i / COLS)} y2={gh} style={{ stroke: i % 4 === 0 ? 'var(--border)' : 'var(--warp-grid)' }} strokeWidth={1} />
            ))}
            {Array.from({ length: Math.max(0, gridY - 1) }, (_, k) => (k + 1) / gridY).map((y) => (
              <line key={`h${y}`} x1={0} y1={Y(y)} x2={w} y2={Y(y)} style={{ stroke: Math.abs(y - 0.5) < EPS ? 'var(--border)' : 'var(--warp-grid)' }} strokeWidth={1} />
            ))}
          </g>
          {backChildren}
        </svg>
      )}
      {between}
      {w > 0 && (
        <svg
          ref={svgRef}
          width={w}
          height={gh}
          viewBox={`0 0 ${w} ${gh}`}
          tabIndex={0}
          role="application"
          aria-label={ariaLabel}
          {...da('graph')}
          onPointerDown={onPointerDown}
          onDoubleClick={onDoubleClick}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <path d={d} style={{ stroke }} strokeWidth={2} fill="none" strokeLinejoin="round" pointerEvents="none" />
          {tool === 'draw' && points.map((b, i) => {
            if (i === 0) return null
            const a = points[i - 1]
            if (b.x - a.x < 1 / 64 - EPS || Math.abs(b.y - a.y) < EPS) return null
            const mx = (a.x + b.x) / 2
            const my = sampleLine([a, b], mx)
            return (
              <g key={`b${i}`} {...da('bend', i)}>
                <circle cx={X(mx)} cy={Y(my)} r={HIT_PX} fill="transparent" />
                <circle cx={X(mx)} cy={Y(my)} r={2.5} style={{ fill: 'var(--text-secondary)' }} />
              </g>
            )
          })}
          {points.map((p, i) => (
            <g key={i} {...da('point', i)} data-selected={selected === i || undefined}>
              <circle cx={X(p.x)} cy={Y(p.y)} r={HIT_PX} fill="transparent" />
              <circle cx={X(p.x)} cy={Y(p.y)} r={4} style={{ fill: selected === i ? 'var(--warp)' : 'var(--bg-void)', stroke: 'var(--text-primary)' }} strokeWidth={1.5} />
            </g>
          ))}
          {children}
        </svg>
      )}
    </>
  )
})
