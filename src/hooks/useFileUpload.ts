import { useCallback } from 'react'
import { useMediaStore } from '../stores/mediaStore'

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']

export function useFileUpload() {
  const {
    setVideoElement,
    setImageElement,
    setIsPlaying,
    setIsLoading,
    setError,
    setSource,
    reset
  } = useMediaStore()

  const uploadFile = useCallback(async (file: File) => {
    reset()
    setIsLoading(true)

    try {
      if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        const img = new Image()
        const url = URL.createObjectURL(file)

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = url
        })

        setImageElement(img)
        setSource('file')
        setIsLoading(false)
      } else if (SUPPORTED_VIDEO_TYPES.includes(file.type)) {
        const video = document.createElement('video')
        video.playsInline = true
        video.muted = true
        video.loop = true

        const url = URL.createObjectURL(file)
        video.src = url

        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve()
          video.onerror = () => reject(new Error('Failed to load video'))
        })

        await video.play()

        setVideoElement(video)
        setSource('file')
        setIsPlaying(true)
        setIsLoading(false)
      } else {
        throw new Error(`Unsupported file type: ${file.type}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
      setIsLoading(false)
    }
  }, [reset, setVideoElement, setImageElement, setSource, setIsPlaying, setIsLoading, setError])

  return { uploadFile }
}
