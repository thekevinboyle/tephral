import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUIStore } from '../../../stores/uiStore'
import { useWarpStore } from '../../../stores/warpStore'
import { PRESETS } from '../../../effects/warp/warpMath'
import { statusHover } from '../../../utils/statusHover'
import { cleanLineName, deleteLine, loadLines, MAX_LINES, MAX_POINTS, saveLine, type WarpLine } from './warpLines'

const BUILT_INS = Object.keys(PRESETS)
const ROW_H = 25

const status = (t: string | null) => useUIStore.getState().setStatusText(t)

/**
 * Lines ▾ (spec §2): the user's saved lines (each with a delete ×), then the built-in lines. The menu is
 * portalled with position: fixed, since every layout area clips overflow. Escape closes it (checking and
 * setting defaultPrevented); ArrowUp / ArrowDown move between its items.
 */
export const WarpLinesMenu = memo(function WarpLinesMenu() {
  const presetName = useWarpStore((s) => s.presetName)
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<WarpLine[]>([])
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; minWidth: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = useCallback((count: number) => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const menuH = count * ROW_H + 14
    const w = Math.max(180, r.width)
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8))
    if (r.bottom + 2 + menuH > window.innerHeight - 8) setPos({ left, bottom: window.innerHeight - r.top + 2, minWidth: w })
    else setPos({ left, top: r.bottom + 2, minWidth: w })
  }, [])

  const close = useCallback((refocus: boolean) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      close(true)
    }
    const onResize = () => setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    // focus the first item, so the keyboard lands in the menu (and Escape reaches it first)
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open, close])

  const toggle = () => {
    if (open) { setOpen(false); return }
    const l = loadLines()
    setLines(l)
    place(l.length + BUILT_INS.length)
    setOpen(true)
  }

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    if (!items.length) return
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const k = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[k].focus()
  }

  const loadUser = (l: WarpLine) => {
    useWarpStore.getState().patch({ points: l.points.map((q) => ({ ...q })), presetName: l.name })
    close(true)
  }
  const remove = (name: string) => {
    if (!deleteLine(name)) { status('Could not delete the line: storage is unavailable in this browser'); return }
    const l = loadLines()
    setLines(l)
    place(l.length + BUILT_INS.length)
    status(`Deleted line ${name}`)
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }

  const name = presetName ?? 'Custom'
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="seg-warp-tool seg-warp-lines"
        data-warp-lines
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Warp lines: ${name}`}
        onClick={toggle}
        {...statusHover('Lines: load one of your saved lines or a built-in line')}
      >
        <span className="seg-warp-lines-name">Lines: {name}</span> <span aria-hidden="true">▾</span>
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} className="seg-warp-menu" role="menu" data-warp-lines-menu aria-label="Warp lines" onKeyDown={onMenuKey}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.minWidth }}>
          {lines.map((l) => (
            <div key={l.name} className="seg-warp-menu-row" role="none">
              <button type="button" role="menuitemradio" aria-checked={presetName === l.name} data-warp-line={l.name}
                onClick={() => loadUser(l)} {...statusHover(`Load your line ${l.name}`)}>
                {l.name}
              </button>
              <button type="button" role="menuitem" className="seg-warp-menu-del" data-warp-line-delete={l.name} aria-label={`Delete line ${l.name}`}
                onClick={() => remove(l.name)} {...statusHover(`Delete your line ${l.name}`)}>
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
          {lines.length > 0 && <div className="seg-warp-menu-sep" role="separator" />}
          {BUILT_INS.map((n) => (
            <button key={n} type="button" role="menuitemradio" aria-checked={presetName === n} data-warp-preset={n}
              onClick={() => { useWarpStore.getState().loadPreset(n); close(true) }} {...statusHover(`Load the built-in ${n} line`)}>
              {n}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
})

interface SaveProps { onAnnounce: (t: string) => void }

/**
 * Save line (spec §2): opens an inline name field in place of the button (no modal). Enter saves the current
 * line under that name; Escape (checking and setting defaultPrevented) or leaving the field cancels.
 * With storage unavailable it only reports that in the status bar.
 */
export const WarpSaveLine = memo(function WarpSaveLine({ onAnnounce }: SaveProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)

  // back on the button after the field closes from the keyboard
  useEffect(() => {
    if (editing || !refocus.current) return
    refocus.current = false
    btnRef.current?.focus({ preventScroll: true })
  }, [editing])

  const say = (t: string) => { status(t); onAnnounce(t) }

  const commit = () => {
    const name = cleanLineName(value)
    if (!name) { say('Type a name to save the line'); return }
    const s = useWarpStore.getState()
    const r = saveLine(name, s.points)
    if (r === 'saved' || r === 'replaced') {
      // Name the loaded line without touching the points (a patch would re-set them and drop the point selection)
      useWarpStore.setState({ presetName: name })
      say(`${r === 'replaced' ? 'Replaced' : 'Saved'} line ${name}`)
    } else if (r === 'builtin') {
      say(`${name} is a built-in line name. Choose another name`)
      return // keep the field open so the name can be changed
    } else if (r === 'full') say(`You have ${MAX_LINES} saved lines. Delete one in Lines to save another`)
    else if (r === 'toolong') say(`The line has more than ${MAX_POINTS} points, too many to save`)
    else if (r === 'empty') { say('Type a name to save the line'); return }
    else say('Could not save the line: storage is unavailable in this browser')
    refocus.current = true
    setEditing(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); return }
    if (e.key === 'Escape') {
      if (e.defaultPrevented) return
      e.preventDefault()
      refocus.current = true
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <button ref={btnRef} type="button" className="seg-warp-tool" data-warp-save
        onClick={() => { setValue(''); setEditing(true) }}
        {...statusHover('Save line: keep the current line under a name of your own, listed first in Lines')}>
        Save line
      </button>
    )
  }
  return (
    <input
      className="seg-warp-save-name"
      data-warp-save-name
      type="text"
      autoFocus
      maxLength={40}
      placeholder="Line name"
      aria-label="Name for the saved line. Enter saves, Escape cancels"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => setEditing(false)}
      {...statusHover('Type a name, then Enter saves the line. Escape cancels')}
    />
  )
})
