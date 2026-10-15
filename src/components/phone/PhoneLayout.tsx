import { memo, useRef, useState } from 'react'
import '../performance/layout.css'
import './phone.css'
import { Canvas, type CanvasHandle } from '../Canvas'
import { PadView } from '../sequencer/PadView'
import { useEngine } from '../../hooks/useEngine'
import { useChainIds } from '../../hooks/useChainIds'
import { useMediaSource } from '../../hooks/useMediaSource'
import { useRecordingControl } from '../../hooks/useRecordingControl'
import { useMediaStore } from '../../stores/mediaStore'
import { useEffectSequencerStore, BPM_MIN, BPM_MAX } from '../../stores/effectSequencerStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useClipStore } from '../../stores/clipStore'
import { getEffectInfo, filterCategories } from '../../config/effectNames'
import { toggleEffect, useEnabledEffectIds } from '../../hooks/useEffectToggle'
import { linePath } from '../performance/lines/linePath'
import { linkedToggle } from '../../utils/sequencerTransport'

const STEPS = 16

/** The stage: the canvas in an aspect-locked frame, with the source buttons over it. */
const PhoneStage = memo(function PhoneStage({ canvasRef }: { canvasRef: React.RefObject<CanvasHandle | null> }) {
  const aspect = useMediaStore((s) => s.videoAspect) ?? 16 / 9
  const source = useMediaStore((s) => s.source)
  const { activateWebcam, openFilePicker } = useMediaSource()
  return (
    <div className="seg-phone-stage">
      <div className="seg-phone-frame" style={{ aspectRatio: String(aspect), width: `min(100cqw, calc(100cqh * ${aspect}))` }}>
        <Canvas ref={canvasRef} />
      </div>
      <div className="seg-phone-source">
        <button data-on={source === 'webcam' || undefined} onClick={() => activateWebcam()}>Camera</button>
        <button data-on={source === 'file' || undefined} onClick={openFilePicker}>File</button>
      </div>
    </div>
  )
})

/** The chain as chips: tap bypasses an effect (dimmed), + opens the effect list. */
const PhoneChips = memo(function PhoneChips({ onAdd }: { onAdd: () => void }) {
  const ids = useChainIds()
  const bypassed = useGlitchEngineStore((s) => s.effectBypassed)
  return (
    <div className="seg-phone-chips" role="list" aria-label="Effects">
      {ids.map((id) => {
        const info = getEffectInfo(id)
        return (
          <button key={id} role="listitem" className="seg-phone-chip" data-off={bypassed[id] || undefined} aria-pressed={!bypassed[id]}
            onClick={() => useGlitchEngineStore.getState().setEffectBypassed(id, !bypassed[id])}>
            <i style={{ background: info.color }} aria-hidden="true" />{info.name}
          </button>
        )
      })}
      <button className="seg-phone-chip seg-phone-add" onClick={onAdd} aria-label="Add or remove effects">＋</button>
    </div>
  )
})

/** One effect's sequencer row: 16 step cells, or its drawn line; the badge flips between them. */
const StepRow = memo(function StepRow({ id }: { id: string }) {
  const track = useEffectSequencerStore((s) => s.tracks[id])
  const head = useEffectSequencerStore((s) => (s.isPlaying && s.tracks[id] ? s.tracks[id].trackStep % s.tracks[id].length : -1))
  if (!track) return null
  const info = getEffectInfo(id)
  const isLine = track.mode === 'line'
  const store = useEffectSequencerStore.getState()
  return (
    <div className="seg-phone-track">
      <button className="seg-phone-tname" onClick={() => store.setTrackMode(id, isLine ? 'gate' : 'line')} aria-label={`${info.name}: ${isLine ? 'line, tap for steps' : 'steps, tap for a line'}`}>
        <i style={{ background: info.color }} aria-hidden="true" />
        <span>{info.name}<small>{isLine ? 'LINE' : 'STEPS'}</small></span>
      </button>
      {isLine ? (
        <svg className="seg-phone-line" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
          <path d={linePath(track.line.points, (x) => x * 100, (y) => 1 + y * 28)} style={{ stroke: info.color }} fill="none" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
        </svg>
      ) : (
        <div className="seg-phone-steps">
          {Array.from({ length: STEPS }, (_, i) => {
            const on = !!track.steps[i]?.active
            return (
              <button key={i} data-on={on || undefined} data-head={(head % STEPS) === i || undefined} aria-pressed={on} aria-label={`Step ${i + 1}`}
                style={on ? { background: info.color } : undefined} onClick={() => store.toggleStep(id, i)} />
            )
          })}
        </div>
      )}
    </div>
  )
})

/** Every effect by category, with search; a row switches its effect on or off. */
const PhoneEffectList = memo(function PhoneEffectList() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const enabled = useEnabledEffectIds()
  const cats = filterCategories(query)
  const searching = query.trim().length > 0
  return (
    <div className="seg-phone-fx">
      <input className="seg-phone-fx-search" type="search" placeholder="Search effects" value={query} onChange={(e) => setQuery(e.target.value)} />
      {cats.map((c) => {
        const isOpen = searching || !!open[c.name]
        const on = c.effects.filter((e) => enabled.has(e.id)).length
        return (
          <section key={c.name}>
            <button className="seg-phone-fx-cat" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [c.name]: !isOpen }))}>
              <span>{isOpen ? '▾' : '▸'} {c.name}</span><small>{on ? `${on} on · ` : ''}{c.effects.length}</small>
            </button>
            {isOpen && c.effects.map((e) => (
              <button key={e.id} className="seg-phone-fx-row" data-fx={e.id} aria-pressed={enabled.has(e.id)} onClick={() => toggleEffect(e.id)}>
                <i style={{ background: e.color }} aria-hidden="true" />
                <span><b>{e.name}</b><small>{e.description}</small></span>
                <em>{enabled.has(e.id) ? 'On' : 'Add'}</em>
              </button>
            ))}
          </section>
        )
      })}
    </div>
  )
})

const PhoneSteps = memo(function PhoneSteps({ ids }: { ids: string[] }) {
  if (!ids.length) return <p className="seg-phone-empty">Add an effect with ＋ to sequence it.</p>
  return <div className="seg-phone-tracks">{ids.map((id) => <StepRow key={id} id={id} />)}</div>
})

/** Play, BPM, REC and sharing the last take (on iPhone the share sheet has Save Video). */
const PhoneTransport = memo(function PhoneTransport() {
  const playing = useEffectSequencerStore((s) => s.isPlaying)
  const bpm = useEffectSequencerStore((s) => s.bpm)
  const { isRecording, canRecord, toggle } = useRecordingControl()
  const lastClip = useClipStore((s) => s.clips[s.clips.length - 1])
  const setBpm = (v: number) => useEffectSequencerStore.getState().setBpm(Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(v))))
  const canShare = !!lastClip?.blob && typeof navigator.share === 'function'
  const share = () => {
    if (!lastClip) return
    const ext = lastClip.blob.type.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([lastClip.blob], `seg-f4ult-take.${ext}`, { type: lastClip.blob.type || `video/${ext}` })
    navigator.share({ files: [file] }).catch(() => {})
  }
  return (
    <div className="seg-phone-transport">
      <button className="seg-phone-play" data-on={playing || undefined} onClick={linkedToggle} aria-label={playing ? 'Stop' : 'Play'} data-transport="play">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">{playing ? <rect x="3" y="3" width="10" height="10" /> : <path d="M4 2.5v11l9.5-5.5z" />}</svg>
      </button>
      <div className="seg-phone-bpm">
        <button onClick={() => setBpm(bpm - 1)} aria-label="Slower">−</button>
        <span>{bpm.toFixed(0)}<small>BPM</small></span>
        <button onClick={() => setBpm(bpm + 1)} aria-label="Faster">+</button>
      </div>
      <button className="seg-phone-rec" data-on={isRecording || undefined} disabled={!canRecord} onClick={toggle}>● REC</button>
      <button className="seg-phone-share" disabled={!canShare} onClick={share} aria-label="Share the last take">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M8 10V2M5 5l3-3 3 3M3 8v5h10V8" /></svg>
      </button>
    </div>
  )
})

/**
 * The phone layout (screens under 700 px wide): the stage, the effect chips, Steps or Pad, and the transport.
 * Runs the same engine as the desktop shell (useEngine); the warp, slicer and inspector stay on larger screens.
 */
export function PhoneLayout() {
  const canvasRef = useRef<CanvasHandle>(null)
  useEngine(canvasRef)
  const ids = useChainIds()
  const [view, setView] = useState<'steps' | 'pad'>('steps')
  const [adding, setAdding] = useState(false)
  const colors = Object.fromEntries(ids.map((id) => [id, getEffectInfo(id).color]))
  return (
    <div className="seg-phone" data-phone-layout>
      <PhoneStage canvasRef={canvasRef} />
      <PhoneChips onAdd={() => setAdding(true)} />
      <div className="seg-phone-views" role="tablist" aria-label="Sequencer">
        {(['steps', 'pad'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}>{v === 'steps' ? 'Steps' : 'Pad'}</button>
        ))}
      </div>
      <div className="seg-phone-body">
        {view === 'steps' ? <PhoneSteps ids={ids} /> : <PadView ids={ids} colors={colors} />}
      </div>
      <PhoneTransport />
      {adding && (
        <div className="seg-phone-sheet" role="dialog" aria-label="Effects">
          <div className="seg-phone-sheet-head">
            <span>Effects</span>
            <button onClick={() => setAdding(false)}>Done</button>
          </div>
          <div className="seg-phone-sheet-body"><PhoneEffectList /></div>
        </div>
      )}
    </div>
  )
}
