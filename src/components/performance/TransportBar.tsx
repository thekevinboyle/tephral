import { useEffect, useState, useCallback } from 'react'
import { Button } from '../ui/Button'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore, type AutomationEvent } from '../../stores/recordingStore'
import { useClipStore } from '../../stores/clipStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useAcidStore } from '../../stores/acidStore'
import { useSlicerStore } from '../../stores/slicerStore'
import { SourceSelector } from '../ui/SourceSelector'

// Note: We use getState() in handleStartRecording to get fresh state at call time

export function TransportBar() {
  const { source, reset, videoElement } = useMediaStore()
  const {
    isRecording,
    isPlaying: isRecordingPlaying,
    currentTime: recordingTime,
    duration: recordingDuration,
    startRecording,
    stopRecording,
    setCurrentTime,
    addThumbnail,
    play: playRecording,
    pause: pauseRecording,
    seek: seekRecording,
  } = useRecordingStore()

  const { clips, clearAllClips } = useClipStore()

  const { resetEffects } = useAutomationPlayback()

  // Capture initial effect state and start recording
  // Use getState() to get current state at call time (not stale closure state)
  const handleStartRecording = useCallback(() => {
    const initialEvents: AutomationEvent[] = []

    // Get current state from stores at call time
    const glitch = useGlitchEngineStore.getState()
    const ascii = useAsciiRenderStore.getState()
    const stipple = useStippleStore.getState()
    const acid = useAcidStore.getState()

    // Capture glitch effects that are currently enabled
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

    // Capture render effects
    if (ascii.enabled) initialEvents.push({ t: 0, effect: 'ascii', action: 'on' })
    if (stipple.enabled) initialEvents.push({ t: 0, effect: 'stipple', action: 'on' })

    // Capture acid effects
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

    console.log('[Recording] Starting with initial events:', initialEvents)
    startRecording(initialEvents)
  }, [startRecording])

  // Source video playback state
  const [sourceVideoTime, setSourceVideoTime] = useState(0)
  const [sourceVideoDuration, setSourceVideoDuration] = useState(0)
  const [isSourcePlaying, setIsSourcePlaying] = useState(false)

  const hasSource = source !== 'none'
  const hasRecording = recordingDuration > 0 && !isRecording
  const hasSourceVideo = source === 'file' && videoElement && sourceVideoDuration > 0

  // Determine which mode we're in: recording playback or source video playback
  const isRecordingMode = hasRecording
  const isPlaying = isRecordingMode ? isRecordingPlaying : isSourcePlaying
  const currentTime = isRecordingMode ? recordingTime : sourceVideoTime
  const duration = isRecordingMode ? recordingDuration : sourceVideoDuration

  // Track source video time
  useEffect(() => {
    if (!videoElement || source !== 'file') return

    const handleTimeUpdate = () => {
      setSourceVideoTime(videoElement.currentTime)
    }

    const handleDurationChange = () => {
      if (videoElement.duration && isFinite(videoElement.duration)) {
        setSourceVideoDuration(videoElement.duration)
      }
    }

    const handlePlay = () => setIsSourcePlaying(true)
    const handlePause = () => setIsSourcePlaying(false)

    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('durationchange', handleDurationChange)
    videoElement.addEventListener('loadedmetadata', handleDurationChange)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)

    // Initialize duration if already loaded
    if (videoElement.duration && isFinite(videoElement.duration)) {
      setSourceVideoDuration(videoElement.duration)
    }
    setIsSourcePlaying(!videoElement.paused)

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('durationchange', handleDurationChange)
      videoElement.removeEventListener('loadedmetadata', handleDurationChange)
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
    }
  }, [videoElement, source])

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    // Handle slicer being active - need to properly disable and restore source
    const slicerState = useSlicerStore.getState()
    if (slicerState.enabled && !isRecordingMode) {
      // Stop slicer playback
      useSlicerStore.getState().setIsPlaying(false)
      // Use the proper setEnabled which coordinates with mediaStore
      useSlicerStore.getState().setEnabled(false)
      // setEnabled(false) already restores stashed source and plays it if it was a file
      // so we're done - don't need to call play() again
      return
    }

    if (isRecordingMode) {
      if (isRecordingPlaying) {
        pauseRecording()
      } else {
        if (recordingTime === 0) {
          resetEffects()
        }
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

  // Handle timeline click to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const seekTime = percentage * duration

    if (isRecordingMode) {
      seekRecording(seekTime)
    } else if (videoElement) {
      videoElement.currentTime = seekTime
    }
  }

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const hasPlayableContent = hasRecording || hasSourceVideo

  // Format time as MM:SS.mm
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }


  // Recording timer
  useEffect(() => {
    if (!isRecording) return

    const startTime = performance.now()
    let thumbnailInterval: number

    const updateTime = () => {
      const elapsed = (performance.now() - startTime) / 1000
      setCurrentTime(elapsed)
    }

    const captureInterval = setInterval(updateTime, 100)

    // Capture thumbnails every 2 seconds
    if (videoElement) {
      thumbnailInterval = window.setInterval(() => {
        try {
          // Check if video has data before trying to capture
          if (videoElement.readyState < 2) return // HAVE_CURRENT_DATA

          const canvas = document.createElement('canvas')
          canvas.width = 64
          canvas.height = 64
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoElement, 0, 0, 64, 64)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
            const time = (performance.now() - startTime) / 1000
            addThumbnail({ time, dataUrl })
          }
        } catch (err) {
          console.warn('Failed to capture thumbnail:', err)
        }
      }, 2000)
    }

    return () => {
      clearInterval(captureInterval)
      if (thumbnailInterval) clearInterval(thumbnailInterval)
    }
  }, [isRecording, setCurrentTime, addThumbnail, videoElement])

  return (
    <div className="h-full flex items-center gap-4 px-4 py-1.5">
      {/* Source selector */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          SRC
        </span>
        <SourceSelector variant="compact" />
      </div>

      {/* Divider */}
      <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

      {/* Record/Stop button */}
      <button
        onClick={isRecording ? stopRecording : handleStartRecording}
        disabled={!hasSource}
        className="w-7 h-7 rounded-sm flex items-center justify-center transition-all"
        style={{
          backgroundColor: isRecording ? 'var(--accent)' : 'var(--bg-elevated)',
          border: `1px solid ${isRecording ? 'var(--accent)' : 'var(--border)'}`,
          boxShadow: isRecording ? '0 0 8px var(--accent-glow)' : 'none',
          opacity: hasSource ? 1 : 0.5,
          cursor: hasSource ? 'pointer' : 'not-allowed',
        }}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
      >
        {isRecording ? (
          <div className="w-2.5 h-2.5" style={{ backgroundColor: 'var(--text-primary)' }} />
        ) : (
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        disabled={!hasPlayableContent}
        className="w-7 h-7 rounded-sm flex items-center justify-center transition-all"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          opacity: hasPlayableContent ? 1 : 0.4,
          cursor: hasPlayableContent ? 'pointer' : 'default',
        }}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--text-secondary)">
            <rect x="3" y="2" width="4" height="12" />
            <rect x="9" y="2" width="4" height="12" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--text-secondary)">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </button>

      {/* Timeline */}
      <div
        className="h-1 rounded-sm relative overflow-hidden group"
        onClick={hasPlayableContent ? handleTimelineClick : undefined}
        style={{
          width: '180px',
          backgroundColor: 'var(--bg-elevated)',
          cursor: hasPlayableContent ? 'pointer' : 'default',
          opacity: hasPlayableContent ? 1 : 0.5,
        }}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--accent)',
            boxShadow: '0 0 4px var(--accent-glow)',
          }}
        />
      </div>

      {/* Playback timecode */}
      <div className="flex items-center gap-1">
        <span
          className="text-[11px] tabular-nums tracking-wide"
          style={{
            color: hasPlayableContent ? 'var(--text-secondary)' : 'var(--text-ghost)',
            letterSpacing: '0.05em',
          }}
        >
          {formatTime(currentTime)}
        </span>
        <span style={{ color: 'var(--text-ghost)' }}>\</span>
        <span
          className="text-[11px] tabular-nums tracking-wide"
          style={{
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
          }}
        >
          {formatTime(duration)}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear button */}
      <Button
        size="sm"
        onClick={clips.length > 0 ? clearAllClips : reset}
        disabled={!hasSource && clips.length === 0}
        title={clips.length > 0 ? 'Clear all clips' : 'Clear source'}
      >
        Clear
      </Button>
    </div>
  )
}
