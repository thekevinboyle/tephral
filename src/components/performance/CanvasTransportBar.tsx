import { useEffect, useState, useCallback } from 'react'
import { PlayIcon, PauseIcon } from '../ui/DotMatrixIcons'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'
import { useSlicerStore } from '../../stores/slicerStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'

export function CanvasTransportBar() {
  const { source, videoElement } = useMediaStore()
  const setStatusText = useUIStore((s) => s.setStatusText)

  const {
    isRecording,
    isPlaying: isRecordingPlaying,
    duration: recordingDuration,
    currentTime: recordingTime,
    play: playRecording,
    pause: pauseRecording,
  } = useRecordingStore()
  const { resetEffects } = useAutomationPlayback()

  const hasSource = source !== 'none'
  const hasRecording = recordingDuration > 0 && !isRecording
  const hasSourceVideo = source === 'file' && videoElement !== null

  const isRecordingMode = hasRecording
  const [isSourcePlaying, setIsSourcePlaying] = useState(false)
  const isPlaying = isRecordingMode ? isRecordingPlaying : isSourcePlaying
  const hasPlayableContent = hasRecording || hasSourceVideo

  const sourceLabel = source === 'none' ? 'NONE' : source === 'webcam' ? 'CAMERA' : 'FILE'

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
        height: 64,
        gap: 12,
        padding: '0 12px',
        backgroundColor: 'var(--bg-void)',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      {/* Play / Pause */}
      <button
        onClick={handlePlayPause}
        disabled={!hasPlayableContent}
        className="w-10 h-10 rounded-sm flex items-center justify-center transition-all"
        style={{
          backgroundColor: isPlaying ? 'var(--text-primary)' : 'var(--bg-elevated)',
          border: `1px solid ${isPlaying ? 'var(--text-primary)' : 'var(--border)'}`,
          opacity: hasPlayableContent ? 1 : 0.4,
          cursor: hasPlayableContent ? 'pointer' : 'default',
        }}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        onMouseEnter={() => setStatusText('Play/Pause — Start or stop playback (Space)')}
        onMouseLeave={() => setStatusText(null)}
      >
        {isPlaying ? (
          <PauseIcon size={16} color="var(--bg-primary)" />
        ) : (
          <PlayIcon size={16} color="var(--text-muted)" />
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* SRC label */}
      <span
        className="text-[9px] font-medium uppercase"
        style={{
          color: hasSource ? 'var(--text-secondary)' : 'var(--text-ghost)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.12em',
        }}
      >
        SRC: {sourceLabel}
      </span>
    </div>
  )
}
