import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useWarpStore } from '../../stores/warpStore'
import { useUIStore } from '../../stores/uiStore'
import { statusHover } from '../../utils/statusHover'
import { Knob } from './Knob'

/**
 * Time warp card, right after the Modulators card. Not an effect: it is not in the effect registries, the
 * chain order or the drag targets. Off: a dimmed "+ Time warp" slot. On: power, mini line, Amount.
 * Clicking the card opens the Warp tab (the device selection is left alone); its own controls do not.
 */

const ID = 'time_warp'
const W = 72
const H = 36
const PTS = 64

const openWarpTab = () => {
  const ui = useUIStore.getState()
  if (!ui.showBottom) useUIStore.setState({ showBottom: true })
  ui.setBottomTab('warp')
}

/** lut is y = f(x) with y = 0 drawn at the TOP, like the editor. */
function MiniLine() {
  const lut = useWarpStore((s) => s.lut)
  const d = useMemo(() => {
    let out = ''
    for (let i = 0; i < PTS; i++) {
      const v = lut[Math.round((i / (PTS - 1)) * (lut.length - 1))]
      out += `${i === 0 ? 'M' : 'L'}${((i / (PTS - 1)) * W).toFixed(1)} ${(1 + v * (H - 2)).toFixed(1)}`
    }
    return out
  }, [lut])
  return (
    <svg className="seg-warpcard-mini" data-warp-mini viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      <line x1="0" y1="1" x2={W} y2={H - 1} stroke="var(--warp-identity)" strokeWidth="1" strokeDasharray="3 3" />
      <path d={d} fill="none" stroke="var(--warp)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const AmountKnob = memo(function AmountKnob() {
  const amount = useWarpStore((s) => s.amount)
  const onChange = useCallback((v: number) => useWarpStore.getState().patch({ amount: v }), [])
  return (
    <div className="seg-dev-dial">
      <Knob
        label="Amount" value={amount} min={0} max={1} step={0.01} onChange={onChange}
        formatValue={(v) => `${Math.round(v * 100)}%`} resetOnDoubleClick showArc color="var(--warp)"
        statusText="Amount: how far the time line bends playback. 0 is normal playback, 100% is the full line"
      />
    </div>
  )
})

export const WarpCard = memo(function WarpCard() {
  const enabled = useWarpStore((s) => s.enabled)
  const collapsed = useUIStore((s) => !!s.collapsedDevices[ID])
  const toggleCollapsed = useUIStore((s) => s.toggleDeviceCollapsed)
  const slotRef = useRef<HTMLButtonElement>(null)
  // Power off swaps the card for the slot: keep the keyboard focus there instead of losing it to <body>
  const refocusSlot = useRef(false)
  useLayoutEffect(() => {
    if (enabled || !refocusSlot.current) return
    refocusSlot.current = false
    slotRef.current?.focus({ preventScroll: true })
  }, [enabled])

  if (!enabled) {
    return (
      <button
        ref={slotRef}
        type="button"
        className="seg-warp-slot"
        data-warp-card
        data-warp-off
        aria-label="Add time warp"
        title="Turn on time warp"
        onClick={() => { useWarpStore.getState().setEnabled(true); openWarpTab() }}
        {...statusHover('Time warp: draw a line that bends time on the picture and sound. Click to turn on and edit')}
      >
        + Time warp
      </button>
    )
  }

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label="Time warp"
      className="seg-dev seg-warpcard"
      data-warp-card
      data-collapsed={collapsed || undefined}
      style={{ ['--c' as string]: 'var(--warp)' }}
      onClick={(ev) => {
        if ((ev.target as HTMLElement).closest('button, [data-param-control]') || ev.detail > 1) return
        openWarpTab()
      }}
      onKeyDown={(ev) => {
        if (ev.target !== ev.currentTarget) return
        if (ev.key === 'Enter' || ev.key === ' ') openWarpTab()
        else if (ev.key === 'c' || ev.key === 'C') toggleCollapsed(ID)
        else return
        ev.preventDefault()
        ev.stopPropagation()
      }}
      {...statusHover('Time warp: click to edit the line in the Warp tab')}
    >
      <div
        className="seg-dev-rail"
        title={collapsed ? 'Double-click to expand' : 'Double-click to collapse'}
        onDoubleClick={(ev) => { ev.stopPropagation(); toggleCollapsed(ID) }}
      >
        <button
          type="button"
          data-warp-card-power
          tabIndex={-1}
          className="seg-dev-pwr"
          aria-pressed
          aria-label="Turn time warp off"
          title="Turn off"
          onClick={(ev) => { ev.stopPropagation(); refocusSlot.current = true; useWarpStore.getState().setEnabled(false) }}
        />
        {/* The collapse control: a disclosure for assistive tech and the keyboard (detail 0). A mouse click
            opens the Warp tab like the rest of the card; double-clicking the rail collapses. */}
        <button
          type="button"
          className="seg-dev-name"
          data-warp-card-collapse
          tabIndex={-1}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand time warp' : 'Collapse time warp'}
          onClick={(ev) => {
            ev.stopPropagation()
            if (ev.detail === 0) toggleCollapsed(ID)
            else if (ev.detail === 1) openWarpTab()
          }}
        >
          Time warp
        </button>
      </div>
      <div className="seg-dev-body" hidden={collapsed}>
        <div className="seg-warpcard-row">
          <MiniLine />
          <AmountKnob />
        </div>
      </div>
    </div>
  )
})
