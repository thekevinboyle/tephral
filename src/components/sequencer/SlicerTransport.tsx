import { useState, useCallback } from 'react'
import { useSlicerStore } from '../../stores/slicerStore'
import { useSlicerBufferStore } from '../../stores/slicerBufferStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { useClipStore } from '../../stores/clipStore'
import { extractFramesFromClip } from '../../utils/clipFrameExtractor'

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
    setImportedClipId,
  } = useSlicerStore()

  const { capture, release, importFrames } = useSlicerBufferStore()
  const { bpm } = useSequencerStore()
  const { clips } = useClipStore()

  const [showClipPicker, setShowClipPicker] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleCaptureRelease = () => {
    if (captureState === 'live') {
      capture()
      setCaptureState('frozen')
    } else {
      release()
      setCaptureState('live')
      setImportedClipId(null)
    }
  }

  // Import a clip into the slicer
  const handleImportClip = useCallback(async (clipUrl: string, clipId: string) => {
    setIsLoading(true)
    setShowClipPicker(false)

    try {
      const frames = await extractFramesFromClip(clipUrl)
      importFrames(frames)
      setCaptureState('imported')
      setImportedClipId(clipId)
    } catch (error) {
      console.error('Failed to extract frames from clip:', error)
    } finally {
      setIsLoading(false)
    }
  }, [importFrames, setCaptureState, setImportedClipId])

  return (
    <div className="flex flex-row gap-2 items-center relative">
      {/* Capture/Release button */}
      <button
        onClick={handleCaptureRelease}
        className="h-7 px-2 text-[11px] font-medium rounded"
        style={{
          backgroundColor: captureState === 'frozen' || captureState === 'imported'
            ? '#f87171' : 'var(--bg-surface)',
          border: captureState === 'frozen' || captureState === 'imported'
            ? '1px solid #f87171' : '1px solid var(--border)',
          color: captureState === 'frozen' || captureState === 'imported'
            ? '#ffffff' : 'var(--text-muted)',
        }}
      >
        {captureState === 'live' ? 'Capture' : 'Release'}
      </button>

      {/* Import button */}
      <div className="relative">
        <button
          onClick={() => setShowClipPicker(!showClipPicker)}
          disabled={isLoading || clips.length === 0}
          className="h-7 px-2 text-[11px] font-medium rounded"
          style={{
            backgroundColor: captureState === 'imported' ? '#8b5cf6' : 'var(--bg-surface)',
            border: captureState === 'imported' ? '1px solid #8b5cf6' : '1px solid var(--border)',
            color: captureState === 'imported' ? '#ffffff' : 'var(--text-muted)',
            opacity: isLoading || clips.length === 0 ? 0.5 : 1,
          }}
          title={clips.length === 0 ? 'No clips available' : 'Import from clip bin'}
        >
          {isLoading ? '...' : 'Import'}
        </button>

        {/* Clip picker dropdown */}
        {showClipPicker && clips.length > 0 && (
          <div
            className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              minWidth: '200px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {clips.map((clip) => (
              <button
                key={clip.id}
                onClick={() => handleImportClip(clip.url, clip.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/10 transition-colors"
              >
                <img
                  src={clip.thumbnailUrl}
                  alt=""
                  className="w-12 h-8 object-cover rounded"
                  style={{ backgroundColor: '#000' }}
                />
                <div className="flex-1 text-left">
                  <div className="text-[11px]" style={{ color: 'var(--text-primary)' }}>
                    {clip.duration.toFixed(1)}s
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(clip.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

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

      {/* Click outside to close dropdown */}
      {showClipPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowClipPicker(false)}
        />
      )}
    </div>
  )
}
