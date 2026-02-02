import { useCallback, useRef } from 'react'
import { useMediaStore } from '../stores/mediaStore'
import { useRecordingStore } from '../stores/recordingStore'
import { useSlicerStore } from '../stores/slicerStore'

/**
 * Unified hook for media source management
 * Consolidates all source switching logic in one place
 */
export function useMediaSource() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
    isSlicerActive,
    hasActiveSource,

    // Actions
    activateWebcam,
    deactivateWebcam,
    toggleWebcam,
    activateFile,
    activateSlicer,
    deactivateSlicer,
    deactivateSource,
    openFilePicker,
    switchCheck,
  }
}
