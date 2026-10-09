import { memo, useEffect, useRef } from 'react'
import { useEffectSequencerStore, defaultTrackLine } from '../../stores/effectSequencerStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useMIDIStore } from '../../stores/midiStore'
import { useUIStore } from '../../stores/uiStore'
import { getEffectInfo } from '../../config/effectNames'
import { gateOpenLevel, getMasterLevel, getUserMix } from '../../effects/mixModulation'
import { getLinePhase } from '../../effects/lines/linePhase'
import { lineLevel } from '../../effects/lines/lineLevel'
import { LANE_PRESET_NAMES, lanePresetPoints } from '../../effects/lines/lanePresets'
import type { WarpPoint } from '../../effects/warp/warpMath'
import { statusHover } from '../../utils/statusHover'
import { LinesMenu } from '../performance/warp/WarpLineTools'
import { Spin } from '../performance/warp/WarpSettingsRow'
import { LockIcon } from '../performance/warp/WarpLock'
import { useLineLockStore } from './lineLocks'
import { useLinePickStore } from './lineSelection'
import { diceAllLines, diceLine, diceMaster, MASTER_LOCK, readLine, writeLine } from './lineDice'

const DEFAULT_LINE = defaultTrackLine()
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Lines ▾ (tool row) or Presets ▾ (side panel) for the open tab. Both share the loaded name in useLinePickStore:
 * the name shows while the line still has the points it loaded; another tab or an edit shows Custom.
 */
export const LineLinesMenu = memo(function LineLinesMenu({ tab, title, trigger = 'lines' }: { tab: string; title: string; trigger?: 'lines' | 'presets' }) {
  const points = useEffectSequencerStore((s) => (tab === 'master' ? s.master.line.points : s.tracks[tab]?.line?.points))
  const pick = useLinePickStore((s) => s.pick)
  const current = pick && pick.tab === tab && pick.points === points ? pick.name : null
  const load = (pts: WarpPoint[], name: string) => {
    writeLine(tab, { points: pts })
    useLinePickStore.getState().setPick({ tab, name, points: readLine(tab).points })
  }
  return (
    <LinesMenu attr="line" label={`${title} lines`} builtIns={LANE_PRESET_NAMES} current={current} trigger={trigger}
      onPickBuiltIn={(n) => { const pts = lanePresetPoints(n, readLine(tab).snap || 1 / 16); if (pts) load(pts, n) }}
      onPickUser={(l) => load(l.points, l.name)} />
  )
})

/** Writes the readout's text from a rAF loop (every 6th frame) while the sequencer plays; `idle` when stopped. */
function useReadout(ref: React.RefObject<HTMLElement | null>, text: () => string, idle: string) {
  const isPlaying = useEffectSequencerStore((s) => s.isPlaying)
  const visible = useUIStore((s) => s.bottomTab === 'sequencer' && s.showBottom)
  const textRef = useRef(text)
  useEffect(() => { textRef.current = text })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!isPlaying || !visible) { el.textContent = idle; return }
    let raf = 0, n = 0
    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (n++ % 6) return
      el.textContent = textRef.current()
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [ref, isPlaying, visible, idle])
}

function Foot({ lockId, lockLabel, onDice, diceAttr, diceStatus, tab, title }: {
  lockId: string; lockLabel: string; onDice: () => void; diceAttr: 'track' | 'master'; diceStatus: string; tab: string; title: string
}) {
  const locked = useLineLockStore((s) => !!s.locks[lockId])
  return (
    <div className="seg-warp-actions seg-lines-side-foot">
      <button type="button" className="seg-line-lock" data-line-lock={lockId} aria-pressed={locked} aria-label={`Lock ${lockLabel}`}
        onClick={() => useLineLockStore.getState().toggleLock(lockId)}
        {...statusHover(locked ? `${lockLabel} locked: Dice all lines keeps it. Click to unlock` : `${lockLabel} unlocked: Dice all lines changes it. Click to lock`)}>
        <LockIcon open={!locked} />
      </button>
      <button type="button" data-line-dice={diceAttr} onClick={onDice} {...statusHover(diceStatus)}>
        <span aria-hidden="true">🎲</span> Dice
      </button>
      <LineLinesMenu tab={tab} title={title} trigger="presets" />
      <button type="button" data-line-dice="all" onClick={diceAllLines}
        {...statusHover('Dice all lines: a new random line on every Line track and the master that is not locked. Steps tracks stay as they are')}>
        <span aria-hidden="true">🎲</span> Dice all lines
      </button>
    </div>
  )
}

const TrackSide = memo(function TrackSide({ id }: { id: string }) {
  const info = getEffectInfo(id)
  const name = info.name
  const mode = useEffectSequencerStore((s) => s.tracks[id]?.mode)
  const muted = useEffectSequencerStore((s) => !!s.tracks[id]?.muted)
  const soloed = useEffectSequencerStore((s) => !!s.tracks[id]?.soloed)
  const audio = useEffectSequencerStore((s) => !!s.tracks[id]?.audioReactive?.enabled)
  const midi = useEffectSequencerStore((s) => !!s.tracks[id]?.midiGate)
  const mix = useGlitchEngineStore((s) => s.effectMix[id] ?? 1)
  const roRef = useRef<HTMLDivElement>(null)
  const pct = Math.round(mix * 100)

  useReadout(roRef, () => {
    const s = useEffectSequencerStore.getState()
    const line = s.tracks[id]?.line ?? DEFAULT_LINE
    const ph = getLinePhase(id)
    const l = ph === null ? 1 : lineLevel(line.points, ph, line.skew, line.amount)
    const m = getMasterLevel()
    const stored = useGlitchEngineStore.getState().effectMix[id] ?? 1
    const ceil = gateOpenLevel(id, getUserMix(id) ?? stored)
    return `Line ${l.toFixed(2)} × master ${m.toFixed(2)} × ${Math.round(ceil * 100)}%\nNow playing at ${Math.round(stored * 100)}%`
  }, 'Plays when the Sequencer runs')

  const seq = () => useEffectSequencerStore.getState()
  const stepMix = (dir: number, big: boolean) => {
    const v = Math.round((useGlitchEngineStore.getState().effectMix[id] ?? 1) * 100) + dir * (big ? 10 : 1)
    useGlitchEngineStore.getState().setEffectMix(id, clamp(v, 0, 100) / 100)
  }

  return (
    <aside className="seg-lines-side" data-line-side="track">
      <div className="seg-lines-side-head"><i style={{ background: info.color }} aria-hidden="true" />{name}</div>
      <div className="seg-mode-switch seg-lines-mode" data-track-mode-switch={id} role="group" aria-label={`${name} track mode`}>
        {(['gate', 'line'] as const).map((m) => (
          <button key={m} type="button" data-mode={m} aria-pressed={(mode === 'line') === (m === 'line')}
            onClick={() => seq().setTrackMode(id, m)}
            {...statusHover(m === 'line' ? `Line: draw how much of ${name} plays across the loop` : `Steps: switch ${name} on and off per step`)}>
            {m === 'line' ? 'Line' : 'Steps'}
          </button>
        ))}
      </div>
      <div className="seg-lines-msan" role="group" aria-label={`${name} track`}>
        <button type="button" aria-pressed={muted} aria-label={`Mute ${name}`} onClick={() => seq().setTrackMuted(id, !muted)}
          {...statusHover(`Mute: silence the ${name} track`)}>M</button>
        <button type="button" aria-pressed={soloed} aria-label={`Solo ${name}`} onClick={() => seq().setTrackSoloed(id, !soloed)}
          {...statusHover(`Solo: play only the ${name} track`)}>S</button>
        <button type="button" aria-pressed={audio} aria-label={`Audio reactive ${name}`} onClick={() => seq().setTrackAudioReactiveEnabled(id, !audio)}
          {...statusHover(`Audio: let the audio level drive the ${name} track. Its Dry/wet follows the audio gate`)}>A</button>
        <button type="button" aria-pressed={midi} aria-label={`MIDI note gate ${name}`}
          onClick={() => {
            if (midi) { useMIDIStore.getState().removeNoteMapping(id); seq().setTrackMidiGate(id, false) }
            else seq().setTrackMidiGate(id, true)
          }}
          {...statusHover(`Note gate: trigger ${name} from a MIDI note. Pick the note from the track header in Steps`)}>N</button>
      </div>
      <Spin attr="line-setting" id="mix" label="Dry/wet" value={`${pct}%`} now={pct} min={0} max={100} step={stepMix} pxPerStep={2}
        status={`Dry/wet: the ${name} card's mix, the top of the line. Drag or use the arrow keys`} />
      <div ref={roRef} className="seg-lines-readout" data-line-readout aria-live="off" />
      <Foot lockId={id} lockLabel={`${name} line`} onDice={() => diceLine(id)} diceAttr="track" tab={id} title={name}
        diceStatus={`Dice: a new random line for ${name}, as steps or curves. Quantize and Skew stay`} />
    </aside>
  )
})

const MasterSide = memo(function MasterSide() {
  const enabled = useEffectSequencerStore((s) => s.master.enabled)
  const roRef = useRef<HTMLSpanElement>(null)
  useReadout(roRef, () => `Now ×${getMasterLevel().toFixed(2)}`, 'Now ×1.00')
  return (
    <aside className="seg-lines-side" data-line-side="master">
      <div className="seg-lines-side-head"><i style={{ background: 'var(--warp)' }} aria-hidden="true" />Master line</div>
      <button type="button" className="seg-lines-onoff" data-line-master-toggle aria-pressed={enabled} aria-label="Master line"
        onClick={() => useEffectSequencerStore.getState().setMasterEnabled(!enabled)}
        {...statusHover(enabled ? 'Master line on: it multiplies every track\'s Dry/wet. Click to turn it off' : 'Master line off: tracks play at their own Dry/wet. Click to turn it on')}>
        <span data-on={enabled || undefined}>On</span>
        <span data-on={!enabled || undefined}>Off</span>
      </button>
      <div className="seg-lines-readout" data-line-readout>
        Multiplies every track&apos;s Dry/wet, Steps tracks included.<br /><span ref={roRef}>Now ×1.00</span>
      </div>
      <Foot lockId={MASTER_LOCK} lockLabel="Master line" onDice={diceMaster} diceAttr="master" tab="master" title="Master"
        diceStatus="Dice: a new random master line, as steps or curves. Quantize and Skew stay" />
    </aside>
  )
})

/** The Lines view's side panel (lines editor spec §4.2): the track's controls, or the master's. */
export const LineSidePanel = memo(function LineSidePanel({ tab }: { tab: string }) {
  return tab === 'master' ? <MasterSide /> : <TrackSide key={tab} id={tab} />
})
