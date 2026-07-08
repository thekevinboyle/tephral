// One GPU→CPU readback of the WebGL canvas per frame, shared by all
// Canvas-2D overlays. Overlays copy FROM this 2D canvas (cheap) instead
// of each forcing their own synchronous WebGL drawing-buffer readback.
const WIDTH = 960
const HEIGHT = 540

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let stamp = 0
let renderedStamp = -1

/** Called once per frame by the main render loop (Canvas.tsx). */
export function advanceReadbackFrame() {
  stamp++
}

/** Returns the shared snapshot, refreshing it if this frame hasn't been read yet. */
export function getSharedFrame(source: HTMLCanvasElement): HTMLCanvasElement | null {
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    ctx = canvas.getContext('2d', { willReadFrequently: true })
  }
  if (!ctx) return null
  if (renderedStamp !== stamp) {
    ctx.drawImage(source, 0, 0, WIDTH, HEIGHT)
    renderedStamp = stamp
  }
  return canvas
}
