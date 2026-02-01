/**
 * Extract frames from a video clip URL as ImageData array
 */
export async function extractFramesFromClip(
  clipUrl: string,
  onProgress?: (progress: number) => void
): Promise<ImageData[]> {
  // Create video element
  const video = document.createElement('video')
  video.src = clipUrl
  video.muted = true
  video.playsInline = true

  // Wait for video to load metadata
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Failed to load video'))
  })

  const duration = video.duration
  const fps = 30
  const frameCount = Math.min(Math.floor(duration * fps), 300) // Max 300 frames (10s)
  const frameInterval = duration / frameCount

  // Create canvas for frame extraction
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 270
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  const frames: ImageData[] = []

  // Extract frames by seeking through video
  for (let i = 0; i < frameCount; i++) {
    const time = i * frameInterval

    // Seek to time
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
      video.currentTime = time
    })

    // Draw frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    frames.push(imageData)

    // Report progress
    if (onProgress) {
      onProgress((i + 1) / frameCount)
    }
  }

  return frames
}
