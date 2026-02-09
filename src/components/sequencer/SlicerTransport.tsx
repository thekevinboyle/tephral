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
    processEffects,
    setProcessEffects,
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
  const handleImportClip = useCallback(async (clipUrl: string, clipId: string, duration: number) => {
    console.log('[SlicerTransport] Importing clip:', clipId, clipUrl, 'duration:', duration)
    setIsLoading(true)
    setShowClipPicker(false)

    try {
      const frames = await extractFramesFromClip(clipUrl, duration)
      console.log('[SlicerTransport] Got frames:', frames.length)
      importFrames(frames)
      setCaptureState('imported')
      setImportedClipId(clipId)
    } catch (error) {
      console.error('[SlicerTransport] Failed to extract frames from clip:', error)
    } finally {
      setIsLoading(false)
    }
  }, [importFrames, setCaptureState, setImportedClipId])

  return (
    <div className="flex flex-row gap-1.5 items-center relative">
      {/* Capture/Release button */}
      <button
        onClick={handleCaptureRelease}
        className="h-6 px-2 text-[10px] font-medium rounded-sm"
        style={{
          backgroundColor: captureState === 'frozen' || captureState === 'imported'
            ? 'var(--accent)' : 'var(--bg-surface)',
          border: captureState === 'frozen' || captureState === 'imported'
            ? '1px solid var(--accent)' : '1px solid var(--border)',
          color: captureState === 'frozen' || captureState === 'imported'
            ? 'var(--text-primary)' : 'var(--text-muted)',
          boxShadow: captureState === 'frozen' || captureState === 'imported'
            ? '0 0 4px var(--accent-glow)' : 'none',
        }}
      >
        {captureState === 'live' ? 'Capture' : 'Release'}
      </button>

      {/* Import button */}
      <div className="relative">
        <button
          onClick={() => setShowClipPicker(!showClipPicker)}
          disabled={isLoading || clips.length === 0}
          className="h-6 px-2 text-[10px] font-medium rounded-sm"
          style={{
            backgroundColor: captureState === 'imported' ? 'var(--accent)' : 'var(--bg-surface)',
            border: captureState === 'imported' ? '1px solid var(--accent)' : '1px solid var(--border)',
            color: captureState === 'imported' ? 'var(--text-primary)' : 'var(--text-muted)',
            opacity: isLoading || clips.length === 0 ? 0.5 : 1,
            boxShadow: captureState === 'imported' ? '0 0 4px var(--accent-glow)' : 'none',
          }}
          title={clips.length === 0 ? 'No clips available' : 'Import from clip bin'}
        >
          {isLoading ? '...' : 'Import'}
        </button>

        {/* Clip picker dropdown */}
        {showClipPicker && clips.length > 0 && (
          <div
            className="absolute top-full left-0 mt-1 rounded-sm shadow-lg z-50 overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              minWidth: '180px',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            {clips.map((clip) => (
              <button
                key={clip.id}
                onClick={() => handleImportClip(clip.url, clip.id, clip.duration)}
                className="w-full flex items-center gap-2 px-2 py-1 hover:bg-white/5 transition-colors"
              >
                <img
                  src={clip.thumbnailUrl}
                  alt=""
                  className="w-10 h-7 object-cover rounded-sm"
                  style={{ backgroundColor: '#000' }}
                />
                <div className="flex-1 text-left">
                  <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {clip.duration.toFixed(1)}s
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--text-ghost)' }}>
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
        className="text-[10px] tabular-nums"
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
        className="w-10"
        style={{
          opacity: captureState === 'live' ? 1 : 0.4,
          accentColor: '#FF0055',
        }}
      />

      {/* Play/Stop button */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-6 h-6 flex items-center justify-center rounded-sm"
        style={{
          backgroundColor: isPlaying ? 'var(--accent)' : 'var(--bg-surface)',
          border: isPlaying ? '1px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: isPlaying ? '0 0 6px var(--accent-glow)' : 'none',
        }}
      >
        {isPlaying ? (
          <div
            className="w-2 h-2"
            style={{ backgroundColor: 'var(--text-primary)' }}
          />
        ) : (
          <div
            className="w-0 h-0"
            style={{
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderLeft: '6px solid var(--text-muted)',
              marginLeft: '1px',
            }}
          />
        )}
      </button>

      {/* BPM Sync toggle */}
      <button
        onClick={() => setSyncToBpm(!syncToBpm)}
        className="h-6 px-1.5 text-[10px] font-mono rounded-sm"
        style={{
          backgroundColor: syncToBpm ? 'var(--accent)' : 'var(--bg-surface)',
          border: syncToBpm ? '1px solid var(--accent)' : '1px solid var(--border)',
          color: syncToBpm ? 'var(--text-primary)' : 'var(--text-muted)',
          boxShadow: syncToBpm ? '0 0 4px var(--accent-glow)' : 'none',
        }}
        title={syncToBpm ? `Synced to ${bpm} BPM` : 'Free running'}
      >
        {syncToBpm ? bpm : 'Free'}
      </button>

      {/* Process Effects toggle */}
      <button
        onClick={() => setProcessEffects(!processEffects)}
        className="h-6 px-1.5 text-[10px] font-medium rounded-sm"
        style={{
          backgroundColor: processEffects ? 'var(--accent)' : 'var(--bg-surface)',
          border: processEffects ? '1px solid var(--accent)' : '1px solid var(--border)',
          color: processEffects ? 'var(--text-primary)' : 'var(--text-muted)',
          boxShadow: processEffects ? '0 0 4px var(--accent-glow)' : 'none',
        }}
        title={processEffects ? 'Effects processing enabled' : 'Effects bypassed'}
      >
        FX
      </button>

      {/* Master On/Off button */}
      <button
        onClick={() => setEnabled(!enabled)}
        className="w-6 h-6 rounded-sm flex items-center justify-center"
        style={{
          backgroundColor: enabled ? 'var(--accent)' : 'var(--bg-surface)',
          border: enabled ? '1px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: enabled ? '0 0 6px var(--accent-glow)' : 'none',
        }}
        title={enabled ? 'Slicer On' : 'Slicer Off'}
      >
        {/* Small LED indicator inside button */}
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: enabled ? 'var(--text-primary)' : 'var(--text-ghost)',
          }}
        />
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
