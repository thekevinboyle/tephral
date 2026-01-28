import { useEffect, useRef, useCallback } from 'react'
import { useRecordingStore, type AutomationEvent } from '../stores/recordingStore'
import { useMediaStore } from '../stores/mediaStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAcidStore } from '../stores/acidStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'
import { useVisionTrackingStore } from '../stores/visionTrackingStore'

export function useAutomationPlayback() {
  const {
    isPlaying,
    isRecording,
    currentTime,
    duration,
    events,
    source,
    setCurrentTime,
    stop,
    pause,
    play,
    seek,
  } = useRecordingStore()

  const { videoElement } = useMediaStore()

  const glitch = useGlitchEngineStore()
  const acid = useAcidStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const vision = useVisionTrackingStore()

  const animationFrameId = useRef<number | null>(null)
  const lastFrameTime = useRef<number>(0)
  const lastAppliedIndex = useRef<number>(-1)
  const videoStartTime = useRef<number>(0) // Video time when playback started
  const wasPlaying = useRef<boolean>(false) // Track previous playing state

  // Reset all effects to disabled state
  const resetEffects = useCallback(() => {
    glitch.reset()
    acid.reset()
    ascii.setEnabled(false)
    stipple.setEnabled(false)
    vision.setBrightEnabled(false)
    vision.setEdgeEnabled(false)
    vision.setColorEnabled(false)
    vision.setMotionEnabled(false)
    vision.setFaceEnabled(false)
    vision.setHandsEnabled(false)
  }, [glitch, acid, ascii, stipple, vision])

  // Apply an automation event to the appropriate store
  const applyEvent = useCallback((event: AutomationEvent) => {
    const { effect, action } = event

    // Handle effect toggle (on/off)
    if (action) {
      const enabled = action === 'on'
      switch (effect) {
        // Glitch effects
        case 'rgb_split': glitch.setRGBSplitEnabled(enabled); break
        case 'block_displace': glitch.setBlockDisplaceEnabled(enabled); break
        case 'scan_lines': glitch.setScanLinesEnabled(enabled); break
        case 'noise': glitch.setNoiseEnabled(enabled); break
        case 'pixelate': glitch.setPixelateEnabled(enabled); break
        case 'edges': glitch.setEdgeDetectionEnabled(enabled); break
        case 'chromatic': glitch.setChromaticAberrationEnabled(enabled); break
        case 'posterize': glitch.setPosterizeEnabled(enabled); break
        case 'color_grade': glitch.setColorGradeEnabled(enabled); break
        case 'static_displace': glitch.setStaticDisplacementEnabled(enabled); break
        case 'lens': glitch.setLensDistortionEnabled(enabled); break
        case 'vhs': glitch.setVHSTrackingEnabled(enabled); break
        case 'dither': glitch.setDitherEnabled(enabled); break
        case 'feedback': glitch.setFeedbackLoopEnabled(enabled); break

        // Render effects
        case 'ascii': ascii.setEnabled(enabled); break
        case 'stipple': stipple.setEnabled(enabled); break

        // Vision tracking effects
        case 'track_bright': vision.setBrightEnabled(enabled); break
        case 'track_edge': vision.setEdgeEnabled(enabled); break
        case 'track_color': vision.setColorEnabled(enabled); break
        case 'track_motion': vision.setMotionEnabled(enabled); break
        case 'track_face': vision.setFaceEnabled(enabled); break
        case 'track_hands': vision.setHandsEnabled(enabled); break

        // Acid effects
        case 'acid_dots': acid.setDotsEnabled(enabled); break
        case 'acid_glyph': acid.setGlyphEnabled(enabled); break
        case 'acid_icons': acid.setIconsEnabled(enabled); break
        case 'acid_contour': acid.setContourEnabled(enabled); break
        case 'acid_decomp': acid.setDecompEnabled(enabled); break
        case 'acid_mirror': acid.setMirrorEnabled(enabled); break
        case 'acid_slice': acid.setSliceEnabled(enabled); break
        case 'acid_thgrid': acid.setThGridEnabled(enabled); break
        case 'acid_cloud': acid.setCloudEnabled(enabled); break
        case 'acid_led': acid.setLedEnabled(enabled); break
        case 'acid_slit': acid.setSlitEnabled(enabled); break
        case 'acid_voronoi': acid.setVoronoiEnabled(enabled); break
      }
    }

    // Parameter changes are recorded but don't need special handling
    // since the param value was already set during recording
  }, [glitch, acid, ascii, stipple, vision])

  // Main playback loop
  const playbackLoop = useCallback((timestamp: number) => {
    if (!isPlaying) return

    let newTime: number

    // For file sources, use video's currentTime as source of truth for perfect sync
    if (source === 'file' && videoElement) {
      newTime = videoElement.currentTime
    } else {
      // For webcam or other sources, calculate time from delta
      const deltaMs = timestamp - lastFrameTime.current
      lastFrameTime.current = timestamp
      newTime = currentTime + deltaMs / 1000
    }

    if (newTime >= duration) {
      // Reached end of recording
      stop()
      return
    }

    setCurrentTime(newTime)

    // Find and apply all events up to current time
    for (let i = lastAppliedIndex.current + 1; i < events.length; i++) {
      if (events[i].t <= newTime) {
        applyEvent(events[i])
        lastAppliedIndex.current = i
      } else {
        break
      }
    }

    animationFrameId.current = requestAnimationFrame(playbackLoop)
  }, [isPlaying, currentTime, duration, events, setCurrentTime, stop, applyEvent, source, videoElement])

  // Start/stop playback
  useEffect(() => {
    if (isPlaying) {
      lastFrameTime.current = performance.now()
      // Find starting index based on current time
      lastAppliedIndex.current = events.findIndex(e => e.t > currentTime) - 1

      // Sync video playback for file sources
      if (source === 'file' && videoElement) {
        // Seek video to match current playback time
        videoElement.currentTime = currentTime
        videoStartTime.current = currentTime
        videoElement.play().catch(() => {
          // Ignore autoplay errors
        })
      }

      animationFrameId.current = requestAnimationFrame(playbackLoop)
      wasPlaying.current = true
    } else {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }

      // Only pause video when transitioning from playing to not playing
      // (not on every render where isPlaying is false)
      if (wasPlaying.current && source === 'file' && videoElement) {
        videoElement.pause()
      }
      wasPlaying.current = false
    }

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [isPlaying, playbackLoop, events, currentTime, source, videoElement])

  // Reset effects and event index when seeking to beginning
  useEffect(() => {
    if (!isPlaying && currentTime === 0) {
      lastAppliedIndex.current = -1
    }
  }, [currentTime, isPlaying])

  // Sync video when seeking (for file sources)
  useEffect(() => {
    if (source === 'file' && videoElement && !isPlaying && !isRecording) {
      // Seek video to match the current time when not playing
      videoElement.currentTime = currentTime
    }
  }, [currentTime, source, videoElement, isPlaying, isRecording])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (duration > 0) {
            if (isPlaying) {
              pause()
            } else {
              // Reset effects when starting from beginning
              if (currentTime === 0) {
                resetEffects()
              }
              play()
            }
          }
          break
        case 'Escape':
          if (isPlaying) {
            stop()
          }
          break
        case 'Home':
          seek(0)
          break
        case 'End':
          seek(duration)
          break
        case 'ArrowLeft':
          seek(Math.max(0, currentTime - 1))
          break
        case 'ArrowRight':
          seek(Math.min(duration, currentTime + 1))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, duration, currentTime, play, pause, stop, seek, resetEffects])

  return { isPlaying, currentTime, duration, resetEffects }
}
