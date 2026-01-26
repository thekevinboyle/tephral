import { create } from 'zustand'

export type MediaSource = 'none' | 'webcam' | 'file' | 'image-url'

interface MediaState {
  source: MediaSource
  videoElement: HTMLVideoElement | null
  imageElement: HTMLImageElement | null
  isPlaying: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setSource: (source: MediaSource) => void
  setVideoElement: (el: HTMLVideoElement | null) => void
  setImageElement: (el: HTMLImageElement | null) => void
  setIsPlaying: (playing: boolean) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useMediaStore = create<MediaState>((set) => ({
  source: 'none',
  videoElement: null,
  imageElement: null,
  isPlaying: false,
  isLoading: false,
  error: null,

  setSource: (source) => set({ source }),
  setVideoElement: (el) => set({ videoElement: el }),
  setImageElement: (el) => set({ imageElement: el }),
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
  }),
}))
