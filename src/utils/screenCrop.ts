/**
 * Crop utilities for screen capture.
 * Draws cropped frames from a source video through an offscreen canvas,
 * producing a new video element via captureStream.
 */

export interface CropRegion {
  x: number
  y: number
  w: number
  h: number
}

export interface CroppedCapture {
  video: HTMLVideoElement
  cropRegion: CropRegion
  dispose: () => void
}

/**
 * Create a cropped video stream from a source video element.
 * Returns a new video element that only shows the cropped region,
 * plus a dispose function to clean up the render loop.
 */
export async function createCroppedCapture(
  sourceVideo: HTMLVideoElement,
  crop: CropRegion,
): Promise<CroppedCapture> {
  const canvas = document.createElement('canvas')
  canvas.width = crop.w
  canvas.height = crop.h
  const ctx = canvas.getContext('2d')!

  let rafId = 0
  let disposed = false

  function draw() {
    if (disposed) return
    ctx.drawImage(
      sourceVideo,
      crop.x,
      crop.y,
      crop.w,
      crop.h,
      0,
      0,
      crop.w,
      crop.h,
    )
    rafId = requestAnimationFrame(draw)
  }
  draw()

  const stream = canvas.captureStream(30)

  const croppedVideo = document.createElement('video')
  croppedVideo.srcObject = stream
  croppedVideo.playsInline = true
  croppedVideo.muted = true
  await croppedVideo.play()

  return {
    video: croppedVideo,
    cropRegion: crop,
    dispose: () => {
      disposed = true
      cancelAnimationFrame(rafId)
      stream.getTracks().forEach((t) => t.stop())
      croppedVideo.srcObject = null
    },
  }
}
