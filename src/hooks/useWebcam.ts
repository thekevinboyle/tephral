import { useEffect, useRef, useCallback } from 'react'
import { useMediaStore } from '../stores/mediaStore'

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const {
    setVideoElement,
    setIsPlaying,
    setIsLoading,
    setError,
    setSource,
    source
  } = useMediaStore()

  const startWebcam = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Create hidden video element
      const video = document.createElement('video')
      video.playsInline = true
      video.muted = true
      videoRef.current = video

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      })

      streamRef.current = stream
      video.srcObject = stream

      await video.play()

      setVideoElement(video)
      setSource('webcam')
      setIsPlaying(true)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access webcam')
      setIsLoading(false)
    }
  }, [setVideoElement, setSource, setIsPlaying, setIsLoading, setError])

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }
    setVideoElement(null)
    setIsPlaying(false)
    if (source === 'webcam') {
      setSource('none')
    }
  }, [setVideoElement, setIsPlaying, setSource, source])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return { startWebcam, stopWebcam }
}
