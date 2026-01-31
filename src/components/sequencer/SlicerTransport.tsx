import { useSlicerStore } from '../../stores/slicerStore'
import { useSlicerBufferStore } from '../../stores/slicerBufferStore'
import { useSequencerStore } from '../../stores/sequencerStore'

export function SlicerTransport() {
  const {
    isPlaying,
    setIsPlaying,
    syncToBpm,
    setSyncToBpm,
    captureState,
    setCaptureState,
    bufferSize,
    setBufferSize,
    enabled,
    setEnabled,
  } = useSlicerStore()

  const { capture, release } = useSlicerBufferStore()
  const { bpm } = useSequencerStore()

  const handleCaptureRelease = () => {
    if (captureState === 'live') {
      capture()
      setCaptureState('frozen')
    } else {
      release()
      setCaptureState('live')
    }
  }

  return (
    <div className="flex flex-row gap-2 items-center">
      {/* Capture/Release button */}
      <button
        onClick={handleCaptureRelease}
        className="h-7 px-2 text-[11px] font-medium rounded"
        style={{
          backgroundColor: captureState === 'frozen' ? '#f87171' : 'var(--bg-surface)',
          border: captureState === 'frozen' ? '1px solid #f87171' : '1px solid var(--border)',
          color: captureState === 'frozen' ? '#ffffff' : 'var(--text-muted)',
        }}
      >
        {captureState === 'frozen' ? 'Release' : 'Capture'}
      </button>

      {/* Buffer size controls */}
      <span
        className="text-[11px]"
        style={{ color: 'var(--text-muted)' }}
      >
        {bufferSize}s
      </span>
      <input
        type="range"
        min={1}
        max={10}
        step={0.5}
        value={bufferSize}
        onChange={(e) => setBufferSize(parseFloat(e.target.value))}
        disabled={captureState !== 'live'}
        className="w-12"
        style={{
          opacity: captureState === 'live' ? 1 : 0.5,
        }}
      />

      {/* Play/Stop button */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-7 h-7 flex items-center justify-center rounded"
        style={{
          backgroundColor: isPlaying ? '#4ade80' : 'var(--bg-surface)',
          border: isPlaying ? '1px solid #4ade80' : '1px solid var(--border)',
        }}
      >
        {isPlaying ? (
          <div
            className="w-2.5 h-2.5"
            style={{ backgroundColor: isPlaying ? '#ffffff' : 'var(--text-muted)' }}
          />
        ) : (
          <div
            className="w-0 h-0"
            style={{
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: '8px solid var(--text-muted)',
              marginLeft: '2px',
            }}
          />
        )}
      </button>

      {/* BPM Sync toggle */}
      <button
        onClick={() => setSyncToBpm(!syncToBpm)}
        className="h-7 px-2 text-[11px] font-mono rounded"
        style={{
          backgroundColor: syncToBpm ? 'var(--text-primary)' : 'var(--bg-surface)',
          border: syncToBpm ? '1px solid var(--text-primary)' : '1px solid var(--border)',
          color: syncToBpm ? 'var(--bg-surface)' : 'var(--text-muted)',
        }}
        title={syncToBpm ? `Synced to ${bpm} BPM` : 'Free running'}
      >
        {syncToBpm ? bpm : 'Free'}
      </button>

      {/* Master On/Off button */}
      <button
        onClick={() => setEnabled(!enabled)}
        className="w-7 h-7 rounded text-[11px] font-bold"
        style={{
          backgroundColor: enabled ? '#FF6B6B' : 'var(--bg-surface)',
          border: enabled ? '1px solid #FF6B6B' : '1px solid var(--border)',
          color: enabled ? '#ffffff' : 'var(--text-muted)',
        }}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
