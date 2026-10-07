import { memo } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useModulationStore } from '../../stores/modulationStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { MODULATOR_SLOTS, type ModulatorSlot } from './modulatorSlots'

/**
 * First card in the device chain: every modulator as a slot. The body selects it (the inspector edits it);
 * the ● arms routing (then click or drag any control). MIDI and Audio are select-only: they route from
 * their own editors. Shapes are static, coloured --mod.
 */

const SHAPES: Record<ModulatorSlot['shape'], string> = {
  sine: 'M0 6 Q 2.5 0 5 6 T 10 6 T 15 6 T 20 6',
  random: 'M0 8 L4 8 L4 2 L8 2 L8 10 L12 10 L12 4 L16 4 L16 7 L20 7',
  step: 'M0 10 L5 10 L5 7 L10 7 L10 4 L15 4 L15 1 L20 1',
  envelope: 'M0 11 L3 1 L8 5 L14 5 L20 11',
  sh: 'M0 7 L5 7 L5 3 L10 3 L10 9 L15 9 L15 5 L20 5',
  midi: 'M1 2 V10 M5 2 V10 M9 2 V10 M13 2 V10 M17 2 V10 M3 2 V7 M11 2 V7 M15 2 V7',
  audio: 'M1 6 V6 M4 3 V9 M7 1 V11 M10 4 V8 M13 2 V10 M16 5 V7 M19 4 V8',
}

const Slot = memo(function Slot({ slot, selected, assigning, inUse }: { slot: ModulatorSlot; selected: boolean; assigning: boolean; inUse: boolean }) {
  return (
    <div
      className="seg-mod-slot"
      data-modulator-slot={slot.id}
      data-selected={selected || undefined}
      data-assigning={assigning || undefined}
      data-in-use={inUse || undefined}
    >
      <button
        type="button"
        data-modulator-select
        className="seg-mod-slot-body"
        aria-pressed={selected}
        title={`Edit ${slot.name}`}
        onClick={() => useUIStore.getState().setSelectedModulator(slot.id)}
      >
        <svg viewBox="0 0 20 12" width="20" height="12" aria-hidden>
          <path d={SHAPES[slot.shape]} fill="none" stroke="var(--mod)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="seg-mod-slot-name">{slot.name}</span>
      </button>
      {slot.routable && (
        <button
          type="button"
          data-modulator-route
          className="seg-mod-route"
          aria-pressed={assigning}
          aria-label={assigning ? `Stop routing ${slot.name}` : `Route ${slot.name}`}
          title={assigning ? 'Click a control to route, Escape to stop' : `Route ${slot.name}: click, then click a control (or drag this onto one)`}
          draggable
          onDragStart={(ev) => {
            // Drop onto any control routes it (useParamControl accepts 'modulation-source')
            ev.dataTransfer.effectAllowed = 'link'
            ev.dataTransfer.setData('modulation-source', slot.id)
          }}
          onClick={() => {
            const m = useModulationStore.getState()
            m.setAssigningModulator(m.assigningModulator === slot.id ? null : slot.id)
          }}
        />
      )}
    </div>
  )
})

const ROUTABLE = MODULATOR_SLOTS.filter((s) => s.routable).map((s) => s.id)

export const ModulatorsCard = memo(function ModulatorsCard() {
  const selected = useUIStore((s) => s.selectedModulator)
  const assigning = useModulationStore((s) => s.assigningModulator)
  // String key: re-renders only when the set of modulators that have routes changes
  const inUseKey = useSequencerStore((s) => ROUTABLE.filter((id) => s.routings.some((r) => r.trackId === id)).join(','))
  const inUse = inUseKey ? inUseKey.split(',') : []
  return (
    <div className="seg-modcard" role="group" aria-label="Modulators" data-modulators-card>
      <div className="seg-modcard-rail">
        <span className="seg-modcard-count" title={`${inUse.length} in use`}>{inUse.length}</span>
        <span className="seg-modcard-name">Modulators</span>
      </div>
      <div className="seg-modcard-grid">
        {MODULATOR_SLOTS.map((slot) => (
          <Slot key={slot.id} slot={slot} selected={selected === slot.id} assigning={assigning === slot.id} inUse={inUse.includes(slot.id)} />
        ))}
      </div>
    </div>
  )
})
