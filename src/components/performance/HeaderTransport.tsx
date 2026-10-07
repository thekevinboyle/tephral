import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useEffectSequencerStore, BPM_MIN, BPM_MAX } from '../../stores/effectSequencerStore'
import { useMIDIStore } from '../../stores/midiStore'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { useMediaTimecode } from '../../hooks/useMediaTimecode'
import { linkedPlay, linkedStop } from '../../utils/sequencerTransport'

const MIDI_COLOR = '#00AAFF'
const AUDIO_COLOR = '#FF8800'
const PX_PER_BPM = 4

const round1 = (n: number) => Math.round(n * 10) / 10

const btn = (active: boolean): React.CSSProperties => ({
  width: 32,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 'var(--radius-ctrl)',
  border: `1px solid ${active ? 'var(--live)' : 'var(--border)'}`,
  background: active ? 'var(--live)' : 'var(--bg-elevated)',
  color: active ? 'var(--bg-void)' : 'var(--text-secondary)',
  cursor: 'pointer',
  padding: 0,
})

/** Header transport: sequencer play/stop, BPM and the media timecode. Per-frame work is written straight to the DOM. */
export const HeaderTransport = memo(function HeaderTransport() {
  const isPlaying = useEffectSequencerStore((s) => s.isPlaying)
  const bpm = useEffectSequencerStore((s) => s.bpm)
  const setBpm = useEffectSequencerStore((s) => s.setBpm)
  const setStatusText = useUIStore((s) => s.setStatusText)
  const midiBpm = useMIDIStore((s) => (s.clockSyncEnabled ? s.clockBpm : null))
  const audioBpm = useAudioSourceStore((s) => (s.audioBpmSyncEnabled ? s.audioBpm : null))
  const timeRef = useMediaTimecode()

  const synced = midiBpm !== null || audioBpm !== null
  const shown = midiBpm ?? audioBpm ?? bpm
  const syncColor = midiBpm !== null ? MIDI_COLOR : audioBpm !== null ? AUDIO_COLOR : 'var(--text-primary)'

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const nudge = useCallback(
    (delta: number) => setBpm(round1(useEffectSequencerStore.getState().bpm + delta)),
    [setBpm],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (synced) return
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      nudge((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      setDraft(String(round1(bpm)))
      setEditing(true)
    }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (synced || e.button !== 0 || editing) return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    let lastY = e.clientY
    // Unrounded accumulator from the drag start; only the written value is rounded.
    let acc = useEffectSequencerStore.getState().bpm
    const move = (ev: PointerEvent) => {
      const dy = lastY - ev.clientY
      lastY = ev.clientY
      acc = Math.max(BPM_MIN, Math.min(BPM_MAX, acc + (dy / PX_PER_BPM) * (ev.shiftKey ? 0.1 : 1)))
      setBpm(round1(acc))
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  const escaped = useRef(false)
  const commit = () => {
    if (escaped.current) { escaped.current = false; setEditing(false); return }
    const v = parseFloat(draft)
    if (Number.isFinite(v)) setBpm(round1(v))
    setEditing(false)
  }

  const hint = (t: string) => ({ onMouseEnter: () => setStatusText(t), onMouseLeave: () => setStatusText(null) })

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 34,
        gap: 8,
        padding: '0 8px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-panel)',
      }}
    >
      <button
        data-transport="play"
        aria-label={isPlaying ? 'Stop playback' : 'Start playback'}
        aria-pressed={isPlaying}
        title={isPlaying ? 'Stop playback' : 'Start playback'}
        onClick={isPlaying ? linkedStop : linkedPlay}
        style={btn(isPlaying)}
        {...hint('Play or stop the step sequencer and the video that goes with it')}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor">
          {isPlaying ? <rect x="2" y="2" width="8" height="8" /> : <path d="M3 1.5v9l7.5-4.5z" />}
        </svg>
      </button>
      <button
        data-transport="stop"
        aria-label="Stop playback"
        title="Stop playback"
        onClick={linkedStop}
        style={btn(false)}
        {...hint('Stop the step sequencer and pause the video that goes with it')}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor"><rect x="2" y="2" width="8" height="8" /></svg>
      </button>

      <div className="flex items-baseline" style={{ gap: 4, minWidth: 82 }}>
        {editing ? (
          <input
            ref={inputRef}
            data-transport="bpm-input"
            aria-label="BPM"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') commit()
              else if (e.key === 'Escape') { escaped.current = true; setEditing(false) }
            }}
            style={{
              width: 56,
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              color: 'var(--text-primary)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-ctrl)',
              padding: '0 4px',
            }}
          />
        ) : (
          <div
            data-transport="bpm"
            role="spinbutton"
            tabIndex={0}
            aria-label="BPM"
            aria-valuemin={BPM_MIN}
            aria-valuemax={BPM_MAX}
            aria-valuenow={shown}
            aria-disabled={synced || undefined}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onDoubleClick={() => {
              if (synced) return
              setDraft(String(round1(bpm)))
              setEditing(true)
            }}
            className="select-none tabular-nums"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              color: syncColor,
              cursor: synced ? 'default' : 'ns-resize',
              touchAction: 'none',
              minWidth: 48,
              textAlign: 'right',
            }}
            {...hint(synced ? 'BPM follows the audio or MIDI clock' : 'BPM: drag up or down, arrows step, double-click to type')}
          >
            {shown.toFixed(1)}
          </div>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>BPM</span>
      </div>

      <span
        ref={timeRef}
        data-transport="timecode"
        className="tabular-nums"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--text-primary)', minWidth: 84 }}
        {...hint('Video timecode')}
      >
        --:--.--
      </span>
    </div>
  )
})
