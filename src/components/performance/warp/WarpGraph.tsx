import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useWarpStore } from '../../../stores/warpStore'
import { useAudioSourceStore } from '../../../stores/audioSourceStore'
import { delaySeconds, skewPhase, warpedY } from '../../../effects/warp/warpMath'
import { getHeardWarpPhase, getWarpPhase, warpLoopSecondsAt, warpNow } from '../../../effects/warp/warpClock'
import { editPoints } from './warpEdit'
import { getActiveWarpCompositor } from '../../../effects/warp/warpRegistry'
import { useLockOutline } from './warpLocks'
import { LockIcon } from './WarpLock'
import { LinePlot, PAD, type WarpTool } from '../lines/LinePlot'

export type { WarpTool } from '../lines/LinePlot'

const THUMB_H = 34 // the frame strip under the plot
const BARS = 120
const THUMBS = 16
const THUMB_MS = 250

const STATUS_GUIDE = 'Stopped: along the dashed line time stands still. Steeper than it plays in reverse'
const ARIA_LABEL = 'Warp line: x is the position in the loop, height is how far back it plays. Top is live, the dashed line is stopped'

/** Hover over empty space: near the stopped guide (the diagonal from (0,0) to (iw,ih)) it explains the guide. */
const guideStatus = (px: number, py: number, iw: number, ih: number) =>
  Math.abs(ih * px - iw * py) / Math.hypot(iw, ih) < 5 ? STATUS_GUIDE : null
const getPoints = () => useWarpStore.getState().points

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
 * The warp graph (v2 spec §2): the plot (16-column grid, the dashed y = x "stopped" guide, the "live" and
 * "1 loop back" edges, the white line with points and bend handles, the output waveform) above the frame
 * strip, with the --live playhead across both. Top is live, lower is further back. The line is React (it
 * changes on edits only); the playhead and waveform are drawn by rAF and the thumbnails every 250 ms, both
 * only while the tab is visible.
 */
export const WarpGraph = memo(function WarpGraph({ tool, visible, selected, onSelect }: Props) {
  const points = useWarpStore((s) => s.points)
  const snap = useWarpStore((s) => s.snap)
  const enabled = useWarpStore((s) => s.enabled)
  const locked = useLockOutline('graph')
  const boxRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef<HTMLCanvasElement>(null)
  const thumbRef = useRef<HTMLCanvasElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

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
  const gh = Math.max(1, h - THUMB_H) // plot height; the frame strip sits below it
  const iw = Math.max(1, w - 2 * PAD), ih = Math.max(1, gh - 2 * PAD)
  const X = (x: number) => PAD + x * iw
  const Y = (y: number) => PAD + y * ih

  // ── playhead + waveform (rAF, visible only) ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || w < 2 || gh < 2) return
    const cv = waveRef.current, head = headRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx || !head) return
    const dpr = window.devicePixelRatio || 1
    cv.width = Math.round(w * dpr); cv.height = Math.round(gh * dpr)
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
      ctx.clearRect(0, 0, w, gh)
      ctx.fillStyle = warp
      const mid = gh * 0.58, amp = gh * 0.26
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
  }, [visible, w, gh, iw])

  // ── thumbnails: the frame each column plays in the last completed pass of the loop. Refreshed every
  // 250 ms while visible; 16 reused canvases, and columns that play the same frame share one readback.
  useEffect(() => {
    if (!visible || w < 2) return
    const cv = thumbRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const th = THUMB_H
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

  return (
    <div className="seg-warp-graph" ref={boxRef} data-tool={tool} data-off={enabled ? undefined : ''} data-warp-graph-box data-locked={locked || undefined}>
      <canvas ref={thumbRef} data-warp-thumbs aria-hidden="true" />
      <LinePlot
        points={points}
        getPoints={getPoints}
        setPoints={editPoints}
        snap={snap}
        tool={tool}
        selected={selected}
        onSelect={onSelect}
        width={w}
        height={gh}
        attr="warp"
        ariaLabel={ARIA_LABEL}
        hoverStatus={guideStatus}
        backChildren={<line data-warp-guide x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} style={{ stroke: 'var(--warp-identity)' }} strokeDasharray="6 6" />}
        between={<>
          <canvas ref={waveRef} aria-hidden="true" />
          <div ref={headRef} className="seg-warp-playhead" data-warp-playhead aria-hidden="true" />
        </>}
      >
        {/* above the line, with a halo in the graph colour, so the line can cross it and it stays readable */}
        <text className="seg-warp-guide-label" data-warp-guide-label x={X(0.62) + 8} y={Y(0.62) - 6} pointerEvents="none">stopped</text>
      </LinePlot>
      {w > 0 && <span className="seg-warp-edge" data-warp-edge="live" aria-hidden="true" style={{ top: PAD + 6 }}>live</span>}
      {/* bottom left, clear of the bottom right corner where the guide (and most lines) end */}
      {w > 0 && <span className="seg-warp-edge seg-warp-edge-back" data-warp-edge="back" aria-hidden="true" style={{ top: gh - PAD - 20 }}>1 loop back</span>}
      {locked && (
        <span className="seg-warp-locked-note" data-warp-locked-note>
          <LockIcon /> Graph locked: dice keeps this line
        </span>
      )}
    </div>
  )
})
