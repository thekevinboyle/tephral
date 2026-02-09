import { create } from 'zustand'

interface SlicerBufferState {
  // State
  frames: ImageData[]
  writeHead: number
  maxFrames: number
  capturedFrames: ImageData[] | null
  currentOutputFrame: ImageData | null

  // Actions
  addFrame: (frame: ImageData) => void
  capture: () => void
  release: () => void
  importFrames: (frames: ImageData[]) => void
  clear: () => void
  setMaxFrames: (max: number) => void
  setCurrentOutputFrame: (frame: ImageData | null) => void

  // Getters
  getActiveFrames: () => ImageData[]
  getSliceFrames: (sliceIndex: number, sliceCount: number) => ImageData[]
  getGrainFrame: (sliceIndex: number, sliceCount: number, position: number) => ImageData | null
  getFrameAtPosition: (position: number) => ImageData | null
}

export const useSlicerBufferStore = create<SlicerBufferState>((set, get) => ({
  // State defaults
  frames: [],
  writeHead: 0,
  maxFrames: 120, // 4 seconds at 30fps
  capturedFrames: null,
  currentOutputFrame: null,

  // Actions
  addFrame: (frame) => {
    const { capturedFrames, frames, writeHead, maxFrames } = get()

    // If frozen (capturedFrames is not null), don't add frames
    if (capturedFrames !== null) return

    if (frames.length < maxFrames) {
      // Buffer not full yet, push to array
      set({
        frames: [...frames, frame],
        writeHead: (writeHead + 1) % maxFrames,
      })
    } else {
      // Buffer full, overwrite at writeHead position
      const newFrames = [...frames]
      newFrames[writeHead] = frame
      set({
        frames: newFrames,
        writeHead: (writeHead + 1) % maxFrames,
      })
    }
  },

  capture: () => {
    const { frames } = get()
    const captured = [...frames]
    set({
      capturedFrames: captured,
      currentOutputFrame: captured.length > 0 ? captured[0] : null, // Show first frame immediately
    })
  },

  release: () => {
    set({ capturedFrames: null })
  },

  importFrames: (frames) => {
    set({
      capturedFrames: frames,
      frames: [],
      writeHead: 0,
      currentOutputFrame: frames.length > 0 ? frames[0] : null, // Show first frame immediately
    })
  },

  clear: () => {
    set({
      frames: [],
      writeHead: 0,
      capturedFrames: null,
    })
  },

  setMaxFrames: (max) => {
    set({ maxFrames: max })
  },

  setCurrentOutputFrame: (frame) => {
    set({ currentOutputFrame: frame })
  },

  // Getters
  getActiveFrames: () => {
    const { capturedFrames, frames } = get()
    return capturedFrames !== null ? capturedFrames : frames
  },

  getSliceFrames: (sliceIndex, sliceCount) => {
    const activeFrames = get().getActiveFrames()
    const frameCount = activeFrames.length
    const framesPerSlice = Math.floor(frameCount / sliceCount)

    if (framesPerSlice === 0) return []

    const startIndex = sliceIndex * framesPerSlice
    const endIndex = (sliceIndex + 1) * framesPerSlice

    return activeFrames.slice(startIndex, endIndex)
  },

  getGrainFrame: (sliceIndex, sliceCount, position) => {
    const sliceFrames = get().getSliceFrames(sliceIndex, sliceCount)

    if (sliceFrames.length === 0) return null

    // Calculate frame index from position (0-1)
    const frameIndex = Math.floor(position * (sliceFrames.length - 1))
    return sliceFrames[frameIndex]
  },

  // Get frame from global buffer position (0-1 across entire buffer)
  // Used for granular playback where grains can span slice boundaries
  getFrameAtPosition: (position: number) => {
    const activeFrames = get().getActiveFrames()
    if (activeFrames.length === 0) return null

    // Wrap position to keep in 0-1 range (allows grains to loop)
    let wrappedPos = position % 1
    if (wrappedPos < 0) wrappedPos += 1

    const frameIndex = Math.floor(wrappedPos * (activeFrames.length - 1))
    return activeFrames[Math.max(0, Math.min(activeFrames.length - 1, frameIndex))]
  },
}))
