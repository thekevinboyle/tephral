// The slicer's live state, outside React. The engine (driven by Canvas's render loop) writes the
// readout every frame; the panel reads it from its own rAF and sends commands back. Nothing here
// triggers a React render.

export interface SlicerReadout {
  /** Frames stored / the ring's current capacity. */
  frames: number
  capacity: number
  /** Buffer position (0..1, oldest to newest) of the frame on screen. */
  playhead: number
  /** Slice the playhead is in. */
  slice: number
  /** Grains on screen this frame. */
  voices: number
  /** True while the engine draws the slicer's picture. */
  active: boolean
}

export const slicerReadout: SlicerReadout = { frames: 0, capacity: 0, playhead: 0, slice: 0, voices: 0, active: false }

export interface SlicerCommands {
  /** Show this buffer position (0..1) while the strip is dragged; null = play normally. */
  scrub: number | null
  /** Loop one slice while it is held on the strip (speed 1 = 500 ms per pass); null = off. */
  loop: { slice: number; speed: number } | null
  /** Play this slice on the next frame. */
  retrigger: number | null
  /** Frames to load into the buffer on the next frame (a clip dropped or picked). */
  importFrames: ImageData[] | null
  /** Empty the buffer on the next frame. */
  clear: boolean
}

export const slicerCommands: SlicerCommands = { scrub: null, loop: null, retrigger: null, importFrames: null, clear: false }

/** Open slicer panels: the buffer fills while one is open, so it is ready when the slicer is turned on. */
let viewers = 0
export const addSlicerViewer = (): (() => void) => {
  viewers++
  return () => { viewers = Math.max(0, viewers - 1) }
}
export const slicerViewers = (): number => viewers
