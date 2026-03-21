import { create } from 'zustand'
import { useRecordingStore } from './recordingStore'

export type MediaSource = 'none' | 'webcam' | 'file' | 'slicer' | 'screen'

interface MediaState {
  source: MediaSource
  videoElement: HTMLVideoElement | null
  imageElement: HTMLImageElement | null
  isPlaying: boolean
  isLoading: boolean
  error: string | null

  // Video dimensions for layout
  videoAspect: number | null  // width/height ratio, null when no media

  // Stashed state for webcam overlay behavior
  stashedSource: MediaSource
  stashedVideoElement: HTMLVideoElement | null
  stashedImageElement: HTMLImageElement | null

  // Actions
  setSource: (source: MediaSource) => void
  setVideoElement: (el: HTMLVideoElement | null) => void
  setImageElement: (el: HTMLImageElement | null) => void
  setVideoAspect: (aspect: number | null) => void
  setIsPlaying: (playing: boolean) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void

  // Unified source management
  switchSource: (newSource: MediaSource) => void
  canSwitchSource: () => { allowed: boolean; reason?: string }
  stopCurrentMedia: () => void
  stashCurrentSource: () => void
  restoreStashedSource: () => boolean
}

export const useMediaStore = create<MediaState>((set, get) => ({
  source: 'none',
  videoElement: null,
  imageElement: null,
  isPlaying: false,
  isLoading: false,
  error: null,

  videoAspect: null,

  // Stashed state
  stashedSource: 'none',
  stashedVideoElement: null,
  stashedImageElement: null,

  setSource: (source) => set({ source }),
  setVideoElement: (el) => set({ videoElement: el }),
  setImageElement: (el) => set({ imageElement: el }),
  setVideoAspect: (aspect) => set({ videoAspect: aspect }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  reset: () => set({
    source: 'none',
    videoElement: null,
    imageElement: null,
    isPlaying: false,
    isLoading: false,
    error: null,
    videoAspect: null,
    stashedSource: 'none',
    stashedVideoElement: null,
    stashedImageElement: null,
  }),

  switchSource: (newSource) => {
    const { stopCurrentMedia } = get()
    stopCurrentMedia()
    set({ source: newSource, error: null })
  },

  canSwitchSource: () => {
    const { isRecording } = useRecordingStore.getState()
    if (isRecording) {
      return { allowed: false, reason: 'Cannot switch source while recording' }
    }
    return { allowed: true }
  },

  stopCurrentMedia: () => {
    const { source, videoElement } = get()

    if (source === 'webcam' && videoElement) {
      // Stop webcam stream
      const stream = videoElement.srcObject as MediaStream | null
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      videoElement.srcObject = null
    }

    if (source === 'file' && videoElement) {
      videoElement.pause()
      videoElement.src = ''
    }

    if (source === 'screen' && videoElement) {
      const stream = videoElement.srcObject as MediaStream | null
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      videoElement.srcObject = null
    }

    set({
      videoElement: null,
      imageElement: null,
      isPlaying: false,
    })
  },

  stashCurrentSource: () => {
    const { source, videoElement, imageElement } = get()
    if (source !== 'none' && source !== 'webcam') {
      set({
        stashedSource: source,
        stashedVideoElement: videoElement,
        stashedImageElement: imageElement,
      })
    }
  },

  restoreStashedSource: () => {
    const { stashedSource, stashedVideoElement, stashedImageElement } = get()
    if (stashedSource === 'none') return false

    set({
      source: stashedSource,
      videoElement: stashedVideoElement,
      imageElement: stashedImageElement,
      stashedSource: 'none',
      stashedVideoElement: null,
      stashedImageElement: null,
    })

    // Resume video playback if it was a file
    if (stashedVideoElement) {
      stashedVideoElement.play().catch(console.error)
    }

    return true
  },
}))
