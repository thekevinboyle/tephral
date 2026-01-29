import { useEffect, useRef, useState, useCallback } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore, type AutomationEvent } from '../../stores/recordingStore'
import { useClipStore } from '../../stores/clipStore'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useAcidStore } from '../../stores/acidStore'

// Note: We use getState() in handleStartRecording to get fresh state at call time

export function TransportBar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { source, reset, videoElement, setVideoElement, setImageElement, setSource } = useMediaStore()
  const {
    isRecording,
    isPlaying: isRecordingPlaying,
    currentTime: recordingTime,
    duration: recordingDuration,
    startRecording,
    stopRecording,
    setCurrentTime,
    addThumbnail,
    setSource: setRecordingSource,
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

  // File select handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)

    if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.src = url
      video.loop = true
      video.muted = true
      video.playsInline = true
      video.autoplay = true
      video.oncanplaythrough = () => {
        setVideoElement(video)
        setSource('file')
        setRecordingSource('file')
        video.play().catch(err => console.error('Video play error:', err))
      }
      video.load()
    } else if (file.type.startsWith('image/')) {
      const img = new Image()
      img.src = url
      img.onload = () => {
        setImageElement(img)
        setSource('file')
        setRecordingSource('file')
      }
    }
  }

  // Webcam handler
  const handleWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      })
      const video = document.createElement('video')
      video.srcObject = stream
      video.playsInline = true
      video.onloadeddata = () => {
        setVideoElement(video)
        setSource('webcam')
        setRecordingSource('webcam')
        video.play()
      }
    } catch (err) {
      console.error('Webcam error:', err)
    }
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
      {/* Source buttons */}
      <button
        onClick={handleWebcam}
        className="h-7 px-3 rounded-md text-[12px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: source === 'webcam' ? '#333333' : '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: source === 'webcam' ? '#ffffff' : '#666666',
        }}
        onMouseEnter={(e) => source !== 'webcam' && (e.currentTarget.style.backgroundColor = '#e8e8e8')}
        onMouseLeave={(e) => source !== 'webcam' && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
      >
        Cam
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="h-7 px-3 rounded-md text-[12px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: source === 'file' ? '#333333' : '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: source === 'file' ? '#ffffff' : '#666666',
        }}
        onMouseEnter={(e) => source !== 'file' && (e.currentTarget.style.backgroundColor = '#e8e8e8')}
        onMouseLeave={(e) => source !== 'file' && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
      >
        File
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Divider */}
      <div className="w-px h-5 bg-gray-300" />

      {/* Record/Stop button - toggles between record (red circle) and stop (white square) */}
      <button
        onClick={isRecording ? stopRecording : handleStartRecording}
        disabled={!hasSource}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
        style={{
          backgroundColor: isRecording ? '#ef4444' : '#f5f5f5',
          border: '1px solid #d0d0d0',
          boxShadow: isRecording ? '0 0 10px #ef4444' : 'none',
          opacity: hasSource ? 1 : 0.5,
          cursor: hasSource ? 'pointer' : 'not-allowed',
        }}
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
      >
        {isRecording ? (
          /* Stop icon - white square */
          <div className="w-3 h-3 bg-white" />
        ) : (
          /* Record icon - red circle */
          <div className="w-3 h-3 rounded-full bg-red-500" />
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-300" />

      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        disabled={!hasPlayableContent}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
        style={{
          opacity: hasPlayableContent ? 1 : 0.4,
          cursor: hasPlayableContent ? 'pointer' : 'default',
        }}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#333">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#333">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </button>

      {/* Timeline */}
      <div
        className="h-2 bg-gray-200 rounded-full relative overflow-hidden group"
        onClick={hasPlayableContent ? handleTimelineClick : undefined}
        style={{
          width: '200px',
          cursor: hasPlayableContent ? 'pointer' : 'default',
          opacity: hasPlayableContent ? 1 : 0.5,
        }}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
        {/* Playhead */}
        {hasPlayableContent && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 5px)` }}
          />
        )}
      </div>

      {/* Playback timecode */}
      <span
        className="text-[12px] tabular-nums"
        style={{
          color: hasPlayableContent ? '#666666' : '#aaaaaa',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear button */}
      <button
        onClick={clips.length > 0 ? clearAllClips : reset}
        disabled={!hasSource && clips.length === 0}
        className="h-7 px-3 rounded-md text-[12px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: '#666666',
          opacity: (hasSource || clips.length > 0) ? 1 : 0.5,
          cursor: (hasSource || clips.length > 0) ? 'pointer' : 'not-allowed',
        }}
        onMouseEnter={(e) => (hasSource || clips.length > 0) && (e.currentTarget.style.backgroundColor = clips.length > 0 ? '#fee2e2' : '#e8e8e8')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
        title={clips.length > 0 ? 'Clear all clips' : 'Clear source'}
      >
        Clear
      </button>
    </div>
  )
}
