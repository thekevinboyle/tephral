import { useEffect, useState, useCallback } from 'react'
import { PlayIcon, PauseIcon, RecordIcon, StopIcon } from '../ui/DotMatrixIcons'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore, type AutomationEvent } from '../../stores/recordingStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useAcidStore } from '../../stores/acidStore'
import { useSlicerStore } from '../../stores/slicerStore'
import { useUIStore } from '../../stores/uiStore'

export function CanvasTransportBar() {
  const { source, videoElement } = useMediaStore()
  const setStatusText = useUIStore((s) => s.setStatusText)

  const {
    isRecording,
    isPlaying: isRecordingPlaying,
    duration: recordingDuration,
    currentTime: recordingTime,
    startRecording,
    stopRecording,
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

  const handleStartRecording = useCallback(() => {
    const initialEvents: AutomationEvent[] = []
    const glitch = useGlitchEngineStore.getState()
    const ascii = useAsciiRenderStore.getState()
    const stipple = useStippleStore.getState()
    const acid = useAcidStore.getState()

    if (glitch.rgbSplitEnabled) initialEvents.push({ t: 0, effect: 'rgb_split', action: 'on' })
    if (glitch.blockDisplaceEnabled) initialEvents.push({ t: 0, effect: 'block_displace', action: 'on' })
    if (glitch.scanLinesEnabled) initialEvents.push({ t: 0, effect: 'scan_lines', action: 'on' })
    if (glitch.noiseEnabled) initialEvents.push({ t: 0, effect: 'noise', action: 'on' })
    if (glitch.pixelateEnabled) initialEvents.push({ t: 0, effect: 'pixelate', action: 'on' })
    if (glitch.edgeDetectionEnabled) initialEvents.push({ t: 0, effect: 'edges', action: 'on' })
    if (glitch.chromaticAberrationEnabled) initialEvents.push({ t: 0, effect: 'chromatic', action: 'on' })
    if (glitch.vhsTrackingEnabled) initialEvents.push({ t: 0, effect: 'vhs', action: 'on' })
    if (glitch.lensDistortionEnabled) initialEvents.push({ t: 0, effect: 'lens', action: 'on' })
    if (glitch.ditherEnabled) initialEvents.push({ t: 0, effect: 'dither', action: 'on' })
    if (glitch.posterizeEnabled) initialEvents.push({ t: 0, effect: 'posterize', action: 'on' })
    if (glitch.staticDisplacementEnabled) initialEvents.push({ t: 0, effect: 'static_displace', action: 'on' })
    if (glitch.colorGradeEnabled) initialEvents.push({ t: 0, effect: 'color_grade', action: 'on' })
    if (glitch.feedbackLoopEnabled) initialEvents.push({ t: 0, effect: 'feedback', action: 'on' })
    if (ascii.enabled) initialEvents.push({ t: 0, effect: 'ascii', action: 'on' })
    if (stipple.enabled) initialEvents.push({ t: 0, effect: 'stipple', action: 'on' })
    if (acid.dotsEnabled) initialEvents.push({ t: 0, effect: 'acid_dots', action: 'on' })
    if (acid.glyphEnabled) initialEvents.push({ t: 0, effect: 'acid_glyph', action: 'on' })
    if (acid.iconsEnabled) initialEvents.push({ t: 0, effect: 'acid_icons', action: 'on' })
    if (acid.contourEnabled) initialEvents.push({ t: 0, effect: 'acid_contour', action: 'on' })
    if (acid.decompEnabled) initialEvents.push({ t: 0, effect: 'acid_decomp', action: 'on' })
    if (acid.mirrorEnabled) initialEvents.push({ t: 0, effect: 'acid_mirror', action: 'on' })
    if (acid.sliceEnabled) initialEvents.push({ t: 0, effect: 'acid_slice', action: 'on' })
    if (acid.thGridEnabled) initialEvents.push({ t: 0, effect: 'acid_thgrid', action: 'on' })
    if (acid.cloudEnabled) initialEvents.push({ t: 0, effect: 'acid_cloud', action: 'on' })
    if (acid.ledEnabled) initialEvents.push({ t: 0, effect: 'acid_led', action: 'on' })
    if (acid.slitEnabled) initialEvents.push({ t: 0, effect: 'acid_slit', action: 'on' })
    if (acid.voronoiEnabled) initialEvents.push({ t: 0, effect: 'acid_voronoi', action: 'on' })
    startRecording(initialEvents)
  }, [startRecording])

  const handlePlayPause = useCallback(() => {
    const slicerState = useSlicerStore.getState()
    if (slicerState.enabled && !isRecordingMode) {
      useSlicerStore.getState().setIsPlaying(false)
      useSlicerStore.getState().setEnabled(false)
      return
    }
    if (isRecordingMode) {
      if (isRecordingPlaying) {
        pauseRecording()
      } else {
        if (recordingTime === 0) resetEffects()
        playRecording()
      }
    } else if (videoElement) {
      if (videoElement.paused) {
        videoElement.play().catch(console.error)
      } else {
        videoElement.pause()
      }
    }
  }, [isRecordingMode, isRecordingPlaying, pauseRecording, recordingTime, resetEffects, playRecording, videoElement])

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 48,
        gap: 12,
        padding: '0 12px',
        backgroundColor: 'var(--bg-void)',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      {/* Record / Stop */}
      <button
        onClick={isRecording ? stopRecording : handleStartRecording}
        disabled={!hasSource}
        className="w-10 h-10 rounded-sm flex items-center justify-center transition-all"
        style={{
          backgroundColor: isRecording ? 'var(--accent)' : 'var(--bg-elevated)',
          border: `1px solid ${isRecording ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: isRecording ? '0 0 12px var(--accent-glow)' : 'none',
          opacity: hasSource ? 1 : 0.4,
          cursor: hasSource ? 'pointer' : 'not-allowed',
        }}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onMouseEnter={() => setStatusText('Record — Capture effect automation')}
        onMouseLeave={() => setStatusText(null)}
      >
        {isRecording ? (
          <StopIcon size={16} color="var(--text-primary)" />
        ) : (
          <RecordIcon size={16} color="var(--accent)" />
        )}
      </button>

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
