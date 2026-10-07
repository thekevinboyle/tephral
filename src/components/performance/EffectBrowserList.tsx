import { memo, useState } from 'react'
import { EFFECT_CATEGORIES, filterCategories, type EffectInfo } from '../../config/effectNames'
import { getEffectState, toggleEffect, useEnabledEffectIds } from '../../hooks/useEffectToggle'
import { useUIStore } from '../../stores/uiStore'
import { getEffectStatusText, getUIStatusText } from '../../config/statusDescriptions'
import { useModulationStore } from '../../stores/modulationStore'
import { useRecordingStore } from '../../stores/recordingStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { statusHover } from '../../utils/statusHover'

function onRowClick(id: string) {
  const glitch = useGlitchEngineStore.getState()
  // Mirror the pad: clicking the latched-solo effect only releases the solo (the effect stays on)
  if (glitch.soloEffectId === id && glitch.soloLatched) {
    glitch.clearSolo()
    return
  }
  const wasActive = getEffectState(id).active
  toggleEffect(id)
  // Switching off the soloed effect must not leave every other effect bypassed by a dangling solo
  if (wasActive && glitch.soloEffectId === id) glitch.clearSolo()
  // Same side effects as a pad tap: select it for the inspector and clear any modulator selection
  const ui = useUIStore.getState()
  ui.selectEffect(id)
  ui.setSelectedEffect(id)
  useModulationStore.getState().setSelectedModulator(null)
  const rec = useRecordingStore.getState()
  if (rec.isRecording) rec.addEvent({ effect: id, action: wasActive ? 'off' : 'on', mix: useGlitchEngineStore.getState().effectMix[id] ?? 1 })
}

// Categories start folded except Acid and any that already hold chain effects
const initialOpen = (): Record<string, boolean> =>
  Object.fromEntries(EFFECT_CATEGORIES.map((c, i) => [c.name, i === 0 || c.effects.some((e) => getEffectState(e.id).active)]))

const Row = memo(function Row({ info, inChain }: { info: EffectInfo; inChain: boolean }) {
  return (
    <button
      type="button"
      data-effect-row={info.id}
      data-in-chain={inChain ? 'true' : undefined}
      className="seg-fx-row"
      aria-pressed={inChain}
      onClick={() => onRowClick(info.id)}
      onMouseEnter={() => useUIStore.getState().setStatusText(getEffectStatusText(info.id))}
      onMouseLeave={() => useUIStore.getState().setStatusText(null)}
    >
      <span className="seg-fx-dot" style={{ backgroundColor: info.color }} aria-hidden />
      <span className="seg-fx-text">
        <span className="seg-fx-name">{info.name}</span>
        {info.description && <span className="seg-fx-desc">{info.description}</span>}
      </span>
      {inChain && <span className="seg-fx-badge">in chain</span>}
    </button>
  )
})

/** List mode of the Effects browser: folding categories of full names + descriptions. Re-renders only on enable flips or query changes. */
export const EffectBrowserList = memo(function EffectBrowserList({ query }: { query: string }) {
  const enabled = useEnabledEffectIds()
  const [open, setOpen] = useState(initialOpen)
  const searching = query.trim().length > 0
  const cats = filterCategories(query)

  return (
    <div className="seg-fx-list" role="list" aria-label="Effects">
      {cats.map((c) => {
        const isOpen = searching || !!open[c.name]
        return (
          <div key={c.name} role="listitem" data-effect-category={c.name}>
            <button
              type="button"
              className="seg-fx-cat"
              aria-expanded={isOpen}
              disabled={searching}
              onClick={() => setOpen((o) => ({ ...o, [c.name]: !o[c.name] }))}
              {...statusHover(`${c.name}: ${c.effects.length} effects. ${getUIStatusText('browserCategory')}`)}
            >
              <svg className="seg-fx-chevron" width="8" height="8" viewBox="0 0 8 8" aria-hidden>
                <path d="M2 1 L6 4 L2 7 Z" fill="currentColor" />
              </svg>
              <span className="seg-fx-cat-name">{c.name}</span>
              <span className="seg-fx-count">{c.effects.length}</span>
            </button>
            {isOpen && c.effects.map((e) => <Row key={e.id} info={e} inChain={enabled.has(e.id)} />)}
          </div>
        )
      })}
    </div>
  )
})
