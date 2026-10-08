import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModReadoutProps {
  /** Depth-drag (assigning) readout */
  depth?: { name: string; value: number; color?: string } | null
  /** Modulation-dot drag readout */
  dot?: { name: string; depth: number; color: string } | null
}

const CLS = 'fixed px-1.5 py-0.5 text-[9px] font-bold tabular-nums whitespace-nowrap pointer-events-none'
const GAP = 24 // the readout sits this far above the control's top edge (was -top-6)
const EDGE = 4

const pct = (d: number) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(0)}%`

/**
 * Floating depth readout shown while assigning a modulator or dragging a modulation dot. Portaled to
 * document.body with position: fixed (placed from an in-flow anchor) so scrollers and overflow: hidden
 * cards cannot clip it; kept inside the viewport.
 */
export function ModReadout({ depth, dot }: ModReadoutProps) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const text = depth ? (depth.name ? `${depth.name}: ${pct(depth.value)}` : pct(depth.value)) : dot ? `${dot.name}: ${pct(dot.depth)}` : null
  const bg = depth ? (depth.color ?? 'var(--accent)') : dot?.color

  // Place the portaled box from the anchor before paint (DOM write only; left/top are not React-managed)
  useLayoutEffect(() => {
    const box = boxRef.current
    const a = anchorRef.current?.getBoundingClientRect()
    if (!box || !a) return
    const w = box.offsetWidth
    const h = box.offsetHeight
    const left = Math.max(EDGE, Math.min(a.left - w / 2, window.innerWidth - EDGE - w))
    let top = a.top - GAP
    if (top < EDGE) top = a.top + 4 // no room above: drop just below the control's top edge
    top = Math.min(top, window.innerHeight - EDGE - h)
    box.style.left = `${left}px`
    box.style.top = `${top}px`
  })

  return (
    <>
      <span ref={anchorRef} aria-hidden className="absolute pointer-events-none" style={{ left: '50%', top: 0, width: 0, height: 0 }} />
      {text && createPortal(
        <div
          ref={boxRef}
          data-mod-readout
          className={CLS}
          style={{ backgroundColor: bg, color: '#000', zIndex: 200 }}
        >
          {text}
        </div>,
        document.body,
      )}
    </>
  )
}
