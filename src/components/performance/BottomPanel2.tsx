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
import { modulatorName } from './modulatorSlots'

/**
 * Bottom panel: header ("Chain · signal flows left to right", Devices/Sequencer tabs, Bypass all, Clear)
 * over two bodies. Both bodies stay mounted and the inactive one is hidden, so switching tabs never
 * remounts the sequencer (which owns the Space/arrow shortcuts) or touches the stage.
 */

const HeaderNote = memo(function HeaderNote() {
  const assigning = useModulationStore((s) => s.assigningModulator)
  const tab = useUIStore((s) => s.bottomTab)

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
  return <span className="seg-bottom-sub">{tab === 'devices' ? '· signal flows left to right' : '· one lane per device'}</span>
})

const Tabs = memo(function Tabs() {
  const tab = useUIStore((s) => s.bottomTab)
  return (
    <div className="seg-seg" role="tablist" aria-label="Bottom panel">
      {(['devices', 'sequencer'] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          id={`seg-bottom-tab-${t}`}
          aria-controls={`seg-bottom-body-${t}`}
          aria-selected={tab === t}
          aria-pressed={tab === t}
          data-bottom-tab-btn={t}
          onClick={() => useUIStore.getState().setBottomTab(t)}
        >
          {t === 'devices' ? 'Devices' : 'Sequencer'}
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
        <span className="seg-bottom-title">{tab === 'devices' ? 'Chain' : 'Sequencer'}</span>
        <HeaderNote />
        <span className="seg-bottom-spacer" />
        <ChainActions />
        <Tabs />
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
