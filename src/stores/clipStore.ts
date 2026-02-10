import { create } from 'zustand'

export const MAX_FRAMES_PER_CLIP = 150

// Clip interface
export interface Clip {
  id: string
  blob: Blob
  url: string           // Object URL for playback
  thumbnailUrl: string  // First frame as data URL
  duration: number
  createdAt: number
  frames: ImageData[]
}

// Export setting types
export type ExportResolution = 'hd' | '1080p' | '4k'
export type ExportQuality = 'low' | 'medium' | 'high'
export type ExportFrameRate = 30 | 60
export type ExportFormat = 'webm' | 'mp4' | 'mov'

interface ClipState {
  clips: Clip[]
  selectedClipId: string | null

  // Export settings
  exportResolution: ExportResolution
  exportQuality: ExportQuality
  exportFrameRate: ExportFrameRate
  exportFormat: ExportFormat

  // Actions
  addClip: (blob: Blob, duration: number, frames?: ImageData[]) => Promise<void>
  removeClip: (id: string) => void
  clearAllClips: () => void
  selectClip: (id: string | null) => void

  // Export setting setters
  setExportResolution: (resolution: ExportResolution) => void
  setExportQuality: (quality: ExportQuality) => void
  setExportFrameRate: (frameRate: ExportFrameRate) => void
  setExportFormat: (format: ExportFormat) => void

  // Destruction mode capture
  captureDestructionFrame: (canvas: HTMLCanvasElement) => Promise<void>
}

/**
 * Generates a thumbnail from a video blob.
 * Creates a temporary video element, seeks to 0.1s, draws to 160x90 canvas,
 * returns data URL, and revokes the temp object URL after.
 */
async function generateThumbnail(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempUrl = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.src = tempUrl

    const cleanup = () => {
      URL.revokeObjectURL(tempUrl)
      video.remove()
    }

    video.onloadedmetadata = () => {
      // Seek to 0.1 seconds (or 0 if video is shorter)
      video.currentTime = Math.min(0.1, video.duration)
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        cleanup()
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(video, 0, 0, 160, 90)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

      cleanup()
      resolve(dataUrl)
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Failed to load video for thumbnail generation'))
    }
  })
}

/**
 * Generates a UUID v4.
 */
function generateUUID(): string {
  return crypto.randomUUID()
}

export const useClipStore = create<ClipState>((set, get) => ({
  clips: [],
  selectedClipId: null,

  // Export settings with defaults
  exportResolution: '1080p',
  exportQuality: 'high',
  exportFrameRate: 30,
  exportFormat: 'webm',  // webm is instant (no FFmpeg needed)

  addClip: async (blob: Blob, duration: number, frames?: ImageData[]) => {
    const id = generateUUID()
    const url = URL.createObjectURL(blob)

    let thumbnailUrl: string
    try {
      thumbnailUrl = await generateThumbnail(blob)
    } catch (error) {
      console.error('Failed to generate thumbnail:', error)
      // Fallback to empty data URL if thumbnail generation fails
      thumbnailUrl = 'data:image/jpeg;base64,'
    }

    const clip: Clip = {
      id,
      blob,
      url,
      thumbnailUrl,
      duration,
      createdAt: Date.now(),
      frames: frames ?? [],
    }

    set((state) => ({
      clips: [...state.clips, clip],
    }))
  },

  removeClip: (id: string) => {
    const { clips, selectedClipId } = get()
    const clip = clips.find((c) => c.id === id)

    if (clip) {
      URL.revokeObjectURL(clip.url)
    }

    set({
      clips: clips.filter((c) => c.id !== id),
      // Clear selection if the removed clip was selected
      selectedClipId: selectedClipId === id ? null : selectedClipId,
    })
  },

  clearAllClips: () => {
    const { clips } = get()

    // Revoke all object URLs
    clips.forEach((clip) => {
      URL.revokeObjectURL(clip.url)
    })

    set({
      clips: [],
      selectedClipId: null,
    })
  },

  selectClip: (id: string | null) => {
    set({ selectedClipId: id })
  },

  // Export setting setters
  setExportResolution: (resolution: ExportResolution) => {
    set({ exportResolution: resolution })
  },

  setExportQuality: (quality: ExportQuality) => {
    set({ exportQuality: quality })
  },

  setExportFrameRate: (frameRate: ExportFrameRate) => {
    set({ exportFrameRate: frameRate })
  },

  setExportFormat: (format: ExportFormat) => {
    set({ exportFormat: format })
  },

  captureDestructionFrame: async (canvas: HTMLCanvasElement) => {
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const response = await fetch(dataUrl)
      const blob = await response.blob()

      const id = generateUUID()
      const url = URL.createObjectURL(blob)

      set((state) => ({
        clips: [
          ...state.clips,
          {
            id,
            blob,
            url,
            thumbnailUrl: dataUrl,
            duration: 0,
            createdAt: Date.now(),
            frames: [],
          },
        ],
      }))
    } catch (error) {
      console.error('Failed to capture destruction frame:', error)
      // Silently fail - screenshot is a bonus
    }
  },
}))
