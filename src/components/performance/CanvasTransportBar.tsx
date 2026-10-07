import { useEffect, useState, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { PlayIcon, PauseIcon } from '../ui/DotMatrixIcons'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'
import { useSlicerStore } from '../../stores/slicerStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'

export function CanvasTransportBar() {
  const source = useMediaStore((s) => s.source)
  const videoElement = useMediaStore((s) => s.videoElement)
  const setStatusText = useUIStore((s) => s.setStatusText)

  const {
    isRecording,
    isPlaying: isRecordingPlaying,
    duration: recordingDuration,
    currentTime: recordingTime,
    play: playRecording,
    pause: pauseRecording,
  } = useRecordingStore(useShallow((s) => ({
    isRecording: s.isRecording,
    isPlaying: s.isPlaying,
    duration: s.duration,
    currentTime: s.currentTime,
    play: s.play,
    pause: s.pause,
  })))
  const { resetEffects } = useAutomationPlayback()

  const hasSource = source !== 'none'
  const hasRecording = recordingDuration > 0 && !isRecording
  const hasSourceVideo = source === 'file' && videoElement !== null

  const isRecordingMode = hasRecording
  const [isSourcePlaying, setIsSourcePlaying] = useState(false)
  const isPlaying = isRecordingMode ? isRecordingPlaying : isSourcePlaying
  const hasPlayableContent = hasRecording || hasSourceVideo

  const sourceLabel = source === 'none' ? 'None' : source === 'webcam' ? 'Camera' : 'File'

  useEffect(() => {
    if (!videoElement || source !== 'file') return
    const handlePlay = () => setIsSourcePlaying(true)
    const handlePause = () => setIsSourcePlaying(false)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    setIsSourcePlaying(!videoElement.paused)
    return () => {
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
    }
  }, [videoElement, source])

  const handlePlayPause = useCallback(() => {
    const slicerState = useSlicerStore.getState()
    if (slicerState.enabled && !isRecordingMode) {
      useSlicerStore.getState().setIsPlaying(false)
      useSlicerStore.getState().setEnabled(false)
      return
    }
    const seq = useEffectSequencerStore.getState()
    if (isRecordingMode) {
      if (isRecordingPlaying) {
        pauseRecording()
        seq.stop()
      } else {
        if (recordingTime === 0) resetEffects()
        playRecording()
        seq.play()
      }
    } else if (videoElement) {
      if (videoElement.paused) {
        videoElement.play().catch(console.error)
        seq.play()
      } else {
        videoElement.pause()
        seq.stop()
      }
    }
  }, [isRecordingMode, isRecordingPlaying, pauseRecording, recordingTime, resetEffects, playRecording, videoElement])

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 32,
        gap: 10,
        padding: '0 10px',
        backgroundColor: 'var(--bg-primary)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <button
        data-media="playpause"
        onClick={handlePlayPause}
        disabled={!hasPlayableContent}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
        className="flex items-center justify-center"
        style={{
          width: 28,
          height: 24,
          borderRadius: 'var(--radius-ctrl)',
          backgroundColor: isPlaying ? 'var(--bg-hover)' : 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          opacity: hasPlayableContent ? 1 : 0.4,
          cursor: hasPlayableContent ? 'pointer' : 'default',
        }}
        title={isPlaying ? 'Pause video (Space)' : 'Play video (Space)'}
        onMouseEnter={() => setStatusText('Play or pause the video source (Space)')}
        onMouseLeave={() => setStatusText(null)}
      >
        {isPlaying ? (
          <PauseIcon size={14} color="var(--text-primary)" />
        ) : (
          <PlayIcon size={14} color="var(--text-secondary)" />
        )}
      </button>

      <span
        data-media="src"
        style={{
          color: hasSource ? 'var(--text-secondary)' : 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
        }}
      >
        SRC: {sourceLabel}
      </span>
    </div>
  )
}
