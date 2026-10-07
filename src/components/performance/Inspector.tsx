import { memo, useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useUIStore } from '../../stores/uiStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'
import { useModulationStore } from '../../stores/modulationStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useChainIds } from '../../hooks/useChainIds'
import { getEffectInfo } from '../../config/effectNames'
import { displayParamLabel } from '../../config/paramNames'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import { resolveRoutingSource } from '../../utils/modulationSources'
import { EffectSettings } from './EffectSettings'
import { ModulationAssignPanel } from './ModulationAssignPanel'
import { ModulationContent, type ModulatorId } from '../sequencer/ModulationContent'
import { TrackAudioReactivePanel } from '../sequencer/TrackAudioReactivePanel'
import { modulatorName } from './modulatorSlots'
import { statusHover } from '../../utils/statusHover'
import { getUIStatusText } from '../../config/statusDescriptions'

/**
 * Right-hand inspector. Contextual on uiStore: a selected modulator shows its editor, else the selected
 * device shows its header, every setting as a bar, its modulation routes and its audio band, else a hint.
 * Selection itself (auto-select, fallback after a delete) is owned by DeviceChain, which is always mounted.
 * Every piece is memoised with narrow selectors: PerformanceLayout re-renders on every engine tick.
 */

const EMPTY: string[] = []
/** Last device shown in effect mode: the Audio modulator edits that device's band by default. */
let lastEffectId: string | null = null

const InspectorHeader = memo(function InspectorHeader({ name, color, pos, children }: { name: string; color?: string; pos?: string; children?: React.ReactNode }) {
  return (
    <div className="seg-insp-head">
      {color && <span className="seg-insp-swatch" style={{ background: color }} aria-hidden />}
      <span className="seg-insp-name" data-inspector-name>{name}</span>
      {pos && <span className="seg-insp-pos" data-inspector-pos>{pos}</span>}
      <span className="seg-insp-spacer" />
      {children}
    </div>
  )
})

const BypassButton = memo(function BypassButton({ effectId, name }: { effectId: string; name: string }) {
  const bypassed = useGlitchEngineStore((s) => !!s.effectBypassed[effectId])
  return (
    <button
      type="button"
      data-inspector-bypass
      className="seg-insp-btn"
      aria-pressed={bypassed}
      data-on={bypassed || undefined}
      aria-label={`Bypass ${name}`}
      title={bypassed ? 'Turn the device back on' : 'Bypass this device'}
      onClick={() => useGlitchEngineStore.getState().toggleEffectBypassed(effectId)}
      {...statusHover(`${name}. ${getUIStatusText('deviceBypass')}`)}
    >
      Bypass
    </button>
  )
})

const formatDepth = (d: number) => `${d < 0 ? '-' : '+'}${Math.round(Math.abs(d) * 100)}%`

/** Modulation routes into this effect's params. Subscribes only to this effect's routings. */
const InspectorRoutes = memo(function InspectorRoutes({ effectId }: { effectId: string }) {
  const prefix = `${effectId}.`
  const routes = useSequencerStore(useShallow((s) => s.routings.filter((r) => r.targetParam.startsWith(prefix))))
  const has = routes.length > 0
  // Track ids are only needed to name step / poly-Euclid sources; skip the subscription when there are no routes
  const seqTrackIds = useSequencerStore(useShallow((s) => (has ? s.tracks.map((t) => t.id) : EMPTY)))
  const polyTrackIds = usePolyEuclidStore(useShallow((s) => (has ? s.tracks.map((t) => t.id) : EMPTY)))
  const labels = useMemo(() => {
    const entry = EFFECT_PARAM_REGISTRY[effectId]
    const m = new Map<string, string>()
    for (const p of entry?.getParams() ?? []) m.set(p.id, displayParamLabel(effectId, p))
    for (const p of entry?.getSelectParams?.() ?? []) m.set(p.id, displayParamLabel(effectId, p))
    return m
  }, [effectId])
  return (
    <section className="seg-insp-sec" data-inspector-routes>
      <div className="seg-insp-sec-head">
        <span>Modulation</span>
        <span className="seg-insp-sec-note">{routes.length === 1 ? '1 route' : `${routes.length} routes`}</span>
      </div>
      {has ? (
        <ul className="seg-insp-routes">
          {routes.map((r) => {
            const src = resolveRoutingSource(r.trackId, seqTrackIds, polyTrackIds) ?? { name: r.trackId, color: 'var(--text-muted)' }
            const key = r.targetParam.slice(prefix.length)
            const label = labels.get(key) ?? key
            return (
              <li key={r.id} className="seg-insp-route" data-route-row={r.id}>
                <span className="seg-insp-route-dot" style={{ background: src.color }} aria-hidden />
                <span className="seg-insp-route-text" title={`${src.name} → ${label}`}>
                  {src.name} → {label}
                </span>
                <span className="seg-insp-route-depth">{formatDepth(r.depth)}</span>
                <button
                  type="button"
                  className="seg-insp-route-x"
                  data-route-remove
                  aria-label={`Remove route ${src.name} to ${label}`}
                  title="Remove route"
                  {...statusHover(`${src.name} → ${label}. ${getUIStatusText('routeRemove')}`)}
                  onClick={() => useSequencerStore.getState().removeRouting(r.id)}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="seg-insp-hint">No routes. Click a modulator's ● in the chain, then a bar here.</p>
      )}
    </section>
  )
})

const EffectInspector = memo(function EffectInspector({ effectId, index, count }: { effectId: string; index: number; count: number }) {
  const info = getEffectInfo(effectId)
  useEffect(() => { lastEffectId = effectId }, [effectId])
  return (
    <div className="seg-insp" data-inspector-mode="effect" data-inspector-effect={effectId}>
      <InspectorHeader name={info.name} color={info.color} pos={`· ${index + 1} of ${count} in chain`}>
        <BypassButton effectId={effectId} name={info.name} />
      </InspectorHeader>
      <div className="seg-insp-body">
        <EffectSettings effectId={effectId} />
        <InspectorRoutes effectId={effectId} />
        <section className="seg-insp-sec" data-inspector-band>
          <div className="seg-insp-sec-head"><span>Audio band</span></div>
          <div className="seg-insp-editor"><TrackAudioReactivePanel effectId={effectId} /></div>
        </section>
      </div>
    </div>
  )
})

/** LFO slots share one editor; open it on this slot's LFO, and keep the selected slot in step with its own LFO tabs. */
const LfoEditor = memo(function LfoEditor({ index }: { index: number }) {
  useEffect(() => {
    useModulationStore.getState().setSelectedLFOIndex(index)
    return useModulationStore.subscribe((s, prev) => {
      if (s.selectedLFOIndex !== prev.selectedLFOIndex) useUIStore.getState().setSelectedModulator(`lfo-${s.selectedLFOIndex}`)
    })
  }, [index])
  return <div className="seg-insp-editor" data-inspector-editor="lfo"><ModulationAssignPanel /></div>
})

/** Audio: "Per device" edits one device's band (pick the device, defaults to the last one inspected);
 *  "Global bands" routes the Sub/Mid/High/Hit/RMS sources to any control. */
const AudioEditor = memo(function AudioEditor() {
  const ids = useChainIds()
  const [view, setView] = useState<'device' | 'global'>('device')
  const [picked, setPicked] = useState<string | null>(lastEffectId)
  const effectId = picked && ids.includes(picked) ? picked : ids[0] ?? null
  return (
    <div className="seg-insp-editor" data-inspector-editor="audio" data-audio-view={view}>
      <div className="seg-seg seg-insp-tabs" role="tablist" aria-label="Audio modulator">
        {([['device', 'Per device'], ['global', 'Global bands']] as const).map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} aria-pressed={view === v} data-audio-tab={v} onClick={() => setView(v)}>
            {label}
          </button>
        ))}
      </div>
      {view === 'global' ? (
        <ModulationContent activeModulator="audio" />
      ) : effectId ? (
        <>
          <label className="seg-insp-pick">
            <span>Device</span>
            <select value={effectId} onChange={(e) => setPicked(e.target.value)}>
              {ids.map((id) => <option key={id} value={id}>{getEffectInfo(id).name}</option>)}
            </select>
          </label>
          <TrackAudioReactivePanel effectId={effectId} />
        </>
      ) : (
        <p className="seg-insp-hint">Add a device to give it an audio band.</p>
      )}
    </div>
  )
})

const CONTENT_IDS: Record<string, ModulatorId> = { random: 'random', step: 'step', envelope: 'envelope', sampleHold: 'sh', midi: 'midi' }

const ModulatorInspector = memo(function ModulatorInspector({ id }: { id: string }) {
  let editor: React.ReactNode = null
  if (id.startsWith('lfo-')) editor = <LfoEditor index={Number(id.slice(4)) || 0} />
  else if (id === 'audio') editor = <AudioEditor />
  else if (CONTENT_IDS[id]) {
    editor = (
      <div className="seg-insp-editor" data-inspector-editor={CONTENT_IDS[id]}>
        <ModulationContent activeModulator={CONTENT_IDS[id]} />
      </div>
    )
  }
  return (
    <div className="seg-insp" data-inspector-mode="modulator" data-inspector-modulator={id}>
      <InspectorHeader name={modulatorName(id)}>
        <span className="seg-insp-kind">Modulator</span>
      </InspectorHeader>
      <div className="seg-insp-body">{editor}</div>
    </div>
  )
})

export const Inspector = memo(function Inspector() {
  const effectId = useUIStore((s) => s.selectedEffectId)
  const modulator = useUIStore((s) => s.selectedModulator)
  const ids = useChainIds()
  if (modulator) return <ModulatorInspector key={modulator.startsWith('lfo-') ? 'lfo' : modulator} id={modulator} />
  const index = effectId ? ids.indexOf(effectId) : -1
  if (effectId && index >= 0) return <EffectInspector key={effectId} effectId={effectId} index={index} count={ids.length} />
  return (
    <div className="seg-insp" data-inspector-mode="empty">
      <p className="seg-insp-empty">Select a device or modulator to edit it.</p>
    </div>
  )
})
