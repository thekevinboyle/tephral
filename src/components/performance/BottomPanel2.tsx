import { memo, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useModulationStore } from '../../stores/modulationStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { usePresetLibraryStore } from '../../stores/presetLibraryStore'
import { useChainIds } from '../../hooks/useChainIds'
import { disableEffect } from '../../hooks/useEffectDisable'
import { getUIStatusText } from '../../config/statusDescriptions'
import { SequencerContainer } from '../sequencer/SequencerContainer'
import { DeviceChain } from './DeviceChain'
import { WarpEditor } from './warp/WarpEditor'
import { useWarpLockStore } from './warp/warpLocks'
import { modulatorName } from './modulatorSlots'
import { statusHover } from '../../utils/statusHover'

/**
 * Bottom panel: header (Devices/Warp/Sequencer tabs on the left, the view's note, Bypass all, Clear)
 * over three bodies. All bodies stay mounted and the inactive ones are hidden, so switching tabs never
 * remounts the sequencer (which owns the Space/arrow shortcuts) or touches the stage.
 */

const HeaderNote = memo(function HeaderNote() {
  const assigning = useModulationStore((s) => s.assigningModulator)
  const tab = useUIStore((s) => s.bottomTab)
  const warpLockMode = useWarpLockStore((s) => s.lockMode)

  // Escape cancels routing assignment (nothing else clears assigningModulator). Capture phase + preventDefault,
  // so the same keypress does not also close a drawer or a dropdown (those skip defaultPrevented events).
  useEffect(() => {
    if (!assigning) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (!useModulationStore.getState().assigningModulator) return
      e.preventDefault()
      useModulationStore.getState().setAssigningModulator(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [assigning])

  if (assigning) {
    return (
      <span className="seg-bottom-sub" data-assigning-note style={{ color: 'var(--mod)' }}>
        Click or drag a control to route {modulatorName(assigning)}
        <button type="button" className="seg-bottom-cancel" onClick={() => useModulationStore.getState().setAssigningModulator(null)}>
          Cancel
        </button>
      </span>
    )
  }
  const sub = tab === 'devices' ? 'Signal flows left to right'
    : tab === 'warp' ? (warpLockMode ? 'Lock mode: locked parts keep their values when you roll the dice' : 'Top = live · lower = further back · flat = normal · along the dashed line = stopped · steeper = reverse')
    : 'One lane per device'
  return <span className="seg-bottom-sub">{sub}</span>
})

const TABS = [['devices', 'Devices', 'tabDevices'], ['warp', 'Warp', 'tabWarp'], ['sequencer', 'Sequencer', 'tabSequencer']] as const

/** 14px line icons for the three views: a device rack, a warped time line, step lanes. */
const ICONS = {
  devices: <><rect x="1.5" y="3" width="3.2" height="8" rx=".6" /><rect x="5.4" y="3" width="3.2" height="8" rx=".6" /><rect x="9.3" y="3" width="3.2" height="8" rx=".6" /></>,
  warp: <path d="M1.5 11.5C4 11.5 4.5 2.5 7 2.5s3 6 5.5 6" />,
  sequencer: <><path d="M1.5 3.5h11M1.5 7h11M1.5 10.5h11" opacity=".45" /><rect x="2.5" y="2.5" width="2" height="2" /><rect x="7" y="6" width="2" height="2" /><rect x="4.5" y="9.5" width="2" height="2" /><rect x="10" y="9.5" width="2" height="2" /></>,
} as const

/** The panel's main navigation: big tabs at the left of the header; the active one joins the body below. */
const Tabs = memo(function Tabs() {
  const tab = useUIStore((s) => s.bottomTab)
  return (
    <div className="seg-nav" role="tablist" aria-label="Bottom panel views">
      {TABS.map(([t, name, status]) => (
        <button
          key={t}
          type="button"
          role="tab"
          id={`seg-bottom-tab-${t}`}
          aria-controls={`seg-bottom-body-${t}`}
          aria-selected={tab === t}
          tabIndex={tab === t ? 0 : -1}
          data-bottom-tab-btn={t}
          className="seg-nav-tab"
          onClick={() => useUIStore.getState().setBottomTab(t)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            const i = TABS.findIndex(([k]) => k === t)
            const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0]
            useUIStore.getState().setBottomTab(next)
            document.getElementById(`seg-bottom-tab-${next}`)?.focus()
          }}
          {...statusHover(getUIStatusText(status))}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>{ICONS[t]}</svg>
          {name}
        </button>
      ))}
    </div>
  )
})

const ChainActions = memo(function ChainActions() {
  const ids = useChainIds()
  const bypassActive = useGlitchEngineStore((s) => s.bypassActive)
  const setStatusText = useUIStore((s) => s.setStatusText)
  return (
    <div className="seg-bottom-actions">
      <button
        type="button"
        data-devices-bypass
        className="seg-bottom-btn"
        aria-pressed={bypassActive}
        data-on={bypassActive || undefined}
        title="Bypass all devices"
        onClick={() => {
          const s = useGlitchEngineStore.getState()
          s.setBypassActive(!s.bypassActive)
        }}
        onMouseEnter={() => setStatusText(getUIStatusText('bypassAll'))}
        onMouseLeave={() => setStatusText(null)}
      >
        Bypass all
      </button>
      <button
        type="button"
        data-devices-clear
        className="seg-bottom-btn"
        title="Remove every device"
        disabled={ids.length === 0}
        onClick={() => {
          for (const id of ids) disableEffect(id)
          usePresetLibraryStore.getState().clearActivePresetName()
        }}
        onMouseEnter={() => setStatusText(getUIStatusText('clearAll'))}
        onMouseLeave={() => setStatusText(null)}
      >
        Clear
      </button>
    </div>
  )
})

export const BottomPanel2 = memo(function BottomPanel2() {
  const tab = useUIStore((s) => s.bottomTab)
  return (
    <div className="seg-bottom" data-bottom-panel data-tab={tab}>
      <div className="seg-bottom-head">
        <Tabs />
        <HeaderNote />
        <span className="seg-bottom-spacer" />
        {tab !== 'warp' && <ChainActions />}
      </div>
      <div
        className="seg-bottom-body"
        data-bottom-body="devices"
        id="seg-bottom-body-devices"
        role="tabpanel"
        aria-labelledby="seg-bottom-tab-devices"
        hidden={tab !== 'devices'}
      >
        <DeviceChain />
      </div>
      <div
        className="seg-bottom-body"
        data-bottom-body="warp"
        id="seg-bottom-body-warp"
        role="tabpanel"
        aria-labelledby="seg-bottom-tab-warp"
        hidden={tab !== 'warp'}
      >
        <WarpEditor />
      </div>
      <div
        className="seg-bottom-body seg-bottom-seq"
        data-bottom-body="sequencer"
        id="seg-bottom-body-sequencer"
        role="tabpanel"
        aria-labelledby="seg-bottom-tab-sequencer"
        hidden={tab !== 'sequencer'}
      >
        <SequencerContainer />
      </div>
    </div>
  )
})
