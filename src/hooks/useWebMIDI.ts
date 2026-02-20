import { useEffect, useRef } from 'react'
import { useMIDIStore, type MIDIDeviceInfo } from '../stores/midiStore'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'

export function useWebMIDI() {
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const listenersRef = useRef<Map<string, (e: MIDIMessageEvent) => void>>(new Map())

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      useMIDIStore.getState().setSupported(false)
      return
    }

    let cancelled = false

    async function init() {
      try {
        const access = await navigator.requestMIDIAccess({ sysex: false })
        if (cancelled) return
        midiAccessRef.current = access

        updateInputs(access)
        useMIDIStore.getState().setConnected(true)

        // Listen for device connect/disconnect
        access.onstatechange = () => {
          if (cancelled) return
          updateInputs(access)
        }

        // Attach message listeners
        attachListeners(access)
      } catch (err) {
        console.warn('[WebMIDI] Failed to get MIDI access:', err)
        useMIDIStore.getState().setSupported(false)
      }
    }

    init()

    // Re-attach listeners when selected input changes
    let prevSelectedId = useMIDIStore.getState().selectedInputId
    const unsubscribe = useMIDIStore.subscribe((state) => {
      if (state.selectedInputId !== prevSelectedId) {
        prevSelectedId = state.selectedInputId
        if (midiAccessRef.current) {
          detachListeners(midiAccessRef.current)
          attachListeners(midiAccessRef.current)
        }
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
      if (midiAccessRef.current) {
        detachListeners(midiAccessRef.current)
        midiAccessRef.current.onstatechange = null
      }
      useMIDIStore.getState().setConnected(false)
    }
  }, [])

  function updateInputs(access: MIDIAccess) {
    const inputs: MIDIDeviceInfo[] = []
    access.inputs.forEach((input) => {
      inputs.push({
        id: input.id,
        name: input.name ?? 'Unknown Device',
        manufacturer: input.manufacturer ?? '',
      })
    })
    useMIDIStore.getState().setInputs(inputs)

    // If selected input was disconnected, clear it
    const selectedId = useMIDIStore.getState().selectedInputId
    if (selectedId && !inputs.some((i) => i.id === selectedId)) {
      useMIDIStore.getState().setSelectedInput(null)
    }
  }

  function attachListeners(access: MIDIAccess) {
    const selectedId = useMIDIStore.getState().selectedInputId

    access.inputs.forEach((input) => {
      // If a specific input is selected, only listen to that one
      if (selectedId && input.id !== selectedId) return

      const handler = (e: MIDIMessageEvent) => handleMIDIMessage(e)
      listenersRef.current.set(input.id, handler)
      input.onmidimessage = handler
    })
  }

  function detachListeners(access: MIDIAccess) {
    access.inputs.forEach((input) => {
      input.onmidimessage = null
    })
    listenersRef.current.clear()
  }

  function handleMIDIMessage(e: MIDIMessageEvent) {
    const data = e.data
    if (!data || data.length === 0) return

    const status = data[0] & 0xf0
    const store = useMIDIStore.getState()

    switch (status) {
      case 0x90: {
        // Note On (velocity > 0) or Note Off (velocity = 0)
        const note = data[1]
        const velocity = data[2]
        store.setNoteState(note, velocity > 0)
        break
      }
      case 0x80: {
        // Note Off
        const note = data[1]
        store.setNoteState(note, false)
        break
      }
      case 0xb0: {
        // Control Change
        const cc = data[1]
        const value = data[2]
        store.setCCValue(cc, value)
        break
      }
      default: {
        // System messages (no channel)
        const fullStatus = data[0]
        if (fullStatus === 0xf8) {
          // MIDI Clock
          if (store.clockSyncEnabled) {
            store.receiveClock(performance.now())
          }
        } else if (fullStatus === 0xfa) {
          // Start
          if (store.clockSyncEnabled) {
            const seq = useEffectSequencerStore.getState()
            seq.resetPlayhead()
            seq.play()
          }
        } else if (fullStatus === 0xfc) {
          // Stop
          if (store.clockSyncEnabled) {
            useEffectSequencerStore.getState().stop()
          }
        }
        break
      }
    }
  }
}
