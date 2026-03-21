import { useCallback, useRef } from 'react'
import { useMediaStore } from '../stores/mediaStore'
import { useRecordingStore } from '../stores/recordingStore'
import { useSlicerStore } from '../stores/slicerStore'
import { createCroppedCapture, type CroppedCapture, type CropRegion } from '../utils/screenCrop'

/**
 * Unified hook for media source management
 * Consolidates all source switching logic in one place
 */
export function useMediaSource() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const croppedCaptureRef = useRef<CroppedCapture | null>(null)

  const {
    source,
    videoElement,
    imageElement,
    isLoading,
    error,
    switchSource,
    canSwitchSource,
    setVideoElement,
    setImageElement,
    setSource,
    setIsLoading,
    setError,
    setIsPlaying,
  } = useMediaStore()

  const { isRecording, setSource: setRecordingSource } = useRecordingStore()
  const { setEnabled: setSlicerEnabled } = useSlicerStore()

  // Check if source switch is allowed
  const switchCheck = useCallback(() => {
    return canSwitchSource()
  }, [canSwitchSource])

  // Activate webcam
  const activateWebcam = useCallback(async () => {
    const check = canSwitchSource()
    if (!check.allowed) {
      setError(check.reason || 'Cannot switch source')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      // Stop slicer if active
      setSlicerEnabled(false)

      // Stop current source
      switchSource('webcam')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.playsInline = true
      video.muted = true

      await video.play()

      setVideoElement(video)
      setRecordingSource('webcam')
      setIsPlaying(true)
      setIsLoading(false)

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access webcam')
      setIsLoading(false)
      setSource('none')
      return false
    }
  }, [canSwitchSource, switchSource, setVideoElement, setIsLoading, setError, setIsPlaying, setSource, setRecordingSource, setSlicerEnabled])

  // Deactivate webcam
  const deactivateWebcam = useCallback(() => {
    if (source === 'webcam' && videoElement) {
      const stream = videoElement.srcObject as MediaStream | null
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      videoElement.srcObject = null
    }
    switchSource('none')
  }, [source, videoElement, switchSource])

  // Toggle webcam on/off
  const toggleWebcam = useCallback(async () => {
    if (source === 'webcam') {
      deactivateWebcam()
      return true
    } else {
      return activateWebcam()
    }
  }, [source, activateWebcam, deactivateWebcam])

  // Activate file (video or image)
  const activateFile = useCallback(async (file: File) => {
    const check = canSwitchSource()
    if (!check.allowed) {
      setError(check.reason || 'Cannot switch source')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      // Stop slicer if active
      setSlicerEnabled(false)

      // Stop current source
      switchSource('file')

      const url = URL.createObjectURL(file)

      if (file.type.startsWith('video/')) {
        const video = document.createElement('video')
        video.src = url
        video.playsInline = true
        video.loop = true

        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve()
          video.onerror = () => reject(new Error('Failed to load video'))
        })

        await video.play()

        setVideoElement(video)
        setRecordingSource('file')
        setIsPlaying(true)
        setIsLoading(false)

        return true
      } else if (file.type.startsWith('image/')) {
        const img = new Image()
        img.src = url

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Failed to load image'))
        })

        setImageElement(img)
        setRecordingSource('file')
        setIsPlaying(false)
        setIsLoading(false)

        return true
      } else {
        throw new Error('Unsupported file type')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
      setIsLoading(false)
      setSource('none')
      return false
    }
  }, [canSwitchSource, switchSource, setVideoElement, setImageElement, setIsLoading, setError, setIsPlaying, setSource, setRecordingSource, setSlicerEnabled])

  // Activate slicer mode
  const activateSlicer = useCallback(() => {
    const check = canSwitchSource()
    if (!check.allowed) {
      setError(check.reason || 'Cannot switch source')
      return false
    }

    // Stash current source before switching to slicer
    useMediaStore.getState().stashCurrentSource()

    setSlicerEnabled(true)
    setSource('slicer')

    return true
  }, [canSwitchSource, setSlicerEnabled, setSource, setError])

  // Deactivate slicer and restore previous source
  const deactivateSlicer = useCallback(() => {
    setSlicerEnabled(false)

    // Try to restore stashed source
    const restored = useMediaStore.getState().restoreStashedSource()
    if (!restored) {
      setSource('none')
    }
  }, [setSlicerEnabled, setSource])

  // Deactivate all sources
  const deactivateSource = useCallback(() => {
    const check = canSwitchSource()
    if (!check.allowed) {
      return false
    }

    setSlicerEnabled(false)
    switchSource('none')
    return true
  }, [canSwitchSource, switchSource, setSlicerEnabled])

  // Store the raw screen capture source video for cropping
  const screenSourceRef = useRef<HTMLVideoElement | null>(null)

  // Start screen/tab/window capture (shows full capture, user crops via UI)
  const startScreenCapture = useCallback(async () => {
    const check = canSwitchSource()
    if (!check.allowed) {
      setError(check.reason || 'Cannot switch source')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      // Stop slicer if active
      setSlicerEnabled(false)

      // Clean up any previous cropped capture
      if (croppedCaptureRef.current) {
        croppedCaptureRef.current.dispose()
        croppedCaptureRef.current = null
      }

      const stream = await (navigator.mediaDevices.getDisplayMedia as (opts: Record<string, unknown>) => Promise<MediaStream>)({
        video: true,
        audio: false,
        preferCurrentTab: false,
        surfaceSwitching: 'exclude',
        selfBrowserSurface: 'exclude',
        systemAudio: 'exclude',
      })

      // Stop current source after user picks (so cancelling doesn't clear existing source)
      switchSource('screen')

      const sourceVideo = document.createElement('video')
      sourceVideo.srcObject = stream
      sourceVideo.playsInline = true
      sourceVideo.muted = true

      await sourceVideo.play()

      // Wait for video dimensions to be available
      if (!sourceVideo.videoWidth) {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (sourceVideo.videoWidth > 0) { resolve(); return }
            requestAnimationFrame(check)
          }
          check()
        })
      }

      screenSourceRef.current = sourceVideo

      // Listen for browser "Stop sharing" button
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (croppedCaptureRef.current) {
          croppedCaptureRef.current.dispose()
          croppedCaptureRef.current = null
        }
        screenSourceRef.current = null
        useMediaStore.getState().stopCurrentMedia()
        useMediaStore.getState().setSource('none')
      })

      // Always pipe through canvas to avoid cross-origin tainted texture issues.
      // getDisplayMedia from a cross-origin tab produces a tainted video that
      // crashes WebGL texImage2D. Drawing through canvas "cleans" the origin.
      const fullCrop: CropRegion = {
        x: 0,
        y: 0,
        w: sourceVideo.videoWidth,
        h: sourceVideo.videoHeight,
      }
      const cropped = await createCroppedCapture(sourceVideo, fullCrop)
      croppedCaptureRef.current = cropped

      setVideoElement(cropped.video)
      setIsPlaying(true)
      setIsLoading(false)

      return true
    } catch (err) {
      // User cancelled the picker — don't clear existing source
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setIsLoading(false)
        return false
      }
      setError(err instanceof Error ? err.message : 'Failed to capture screen')
      setIsLoading(false)
      return false
    }
  }, [canSwitchSource, switchSource, setVideoElement, setIsLoading, setError, setIsPlaying, setSlicerEnabled])

  // Apply a crop region to the current screen capture
  const cropScreenCapture = useCallback(async (crop: CropRegion) => {
    const sourceVideo = screenSourceRef.current
    if (!sourceVideo) return

    // Clean up previous crop
    if (croppedCaptureRef.current) {
      croppedCaptureRef.current.dispose()
      croppedCaptureRef.current = null
    }

    const cropped = await createCroppedCapture(sourceVideo, crop)
    croppedCaptureRef.current = cropped
    setVideoElement(cropped.video)
    useMediaStore.getState().setVideoAspect(crop.w / crop.h)
  }, [setVideoElement])

  // Clear crop and go back to full capture (still piped through canvas)
  const clearScreenCrop = useCallback(async () => {
    if (croppedCaptureRef.current) {
      croppedCaptureRef.current.dispose()
      croppedCaptureRef.current = null
    }
    const sourceVideo = screenSourceRef.current
    if (sourceVideo) {
      const fullCrop: CropRegion = {
        x: 0,
        y: 0,
        w: sourceVideo.videoWidth,
        h: sourceVideo.videoHeight,
      }
      const cropped = await createCroppedCapture(sourceVideo, fullCrop)
      croppedCaptureRef.current = cropped
      setVideoElement(cropped.video)
      useMediaStore.getState().setVideoAspect(null)
    }
  }, [setVideoElement])

  // Open file picker
  const openFilePicker = useCallback(() => {
    if (!fileInputRef.current) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'video/*,image/*'
      input.style.display = 'none'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          activateFile(file)
        }
      }
      document.body.appendChild(input)
      fileInputRef.current = input
    }
    fileInputRef.current.click()
  }, [activateFile])

  // Computed state
  const isWebcamActive = source === 'webcam'
  const isFileActive = source === 'file'
  const isScreenActive = source === 'screen'
  const isSlicerActive = source === 'slicer'
  const hasActiveSource = source !== 'none'

  return {
    // Current state
    source,
    videoElement,
    imageElement,
    isLoading,
    error,
    isRecording,

    // Computed state
    isWebcamActive,
    isFileActive,
    isScreenActive,
    isSlicerActive,
    hasActiveSource,

    // Actions
    activateWebcam,
    deactivateWebcam,
    toggleWebcam,
    activateFile,
    startScreenCapture,
    cropScreenCapture,
    clearScreenCrop,
    screenSourceVideo: screenSourceRef.current,
    activateSlicer,
    deactivateSlicer,
    deactivateSource,
    openFilePicker,
    switchCheck,
  }
}
