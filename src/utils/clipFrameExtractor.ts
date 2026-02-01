/**
 * Extract frames from a video clip URL as ImageData array
 * @param clipUrl - URL to the video (blob URL or regular URL)
 * @param knownDuration - Known duration in seconds (required for WebM from MediaRecorder)
 * @param onProgress - Optional progress callback (0-1)
 */
export async function extractFramesFromClip(
  clipUrl: string,
  knownDuration: number,
  onProgress?: (progress: number) => void
): Promise<ImageData[]> {
  console.log('[clipFrameExtractor] Starting extraction from:', clipUrl, 'duration:', knownDuration)

  // Create video element
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  // Set source and wait for it to be ready
  video.src = clipUrl

  // Wait for video to be ready to play
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error('[clipFrameExtractor] Video load timeout')
      reject(new Error('Video load timeout'))
    }, 10000)

    video.oncanplay = () => {
      clearTimeout(timeout)
      console.log('[clipFrameExtractor] Video ready')
      resolve()
    }

    video.onerror = () => {
      clearTimeout(timeout)
      console.error('[clipFrameExtractor] Video load error:', video.error)
      reject(new Error('Failed to load video: ' + (video.error?.message || 'unknown error')))
    }

    // Trigger load
    video.load()
  })

  // Use the known duration (MediaRecorder WebM files often report Infinity)
  const duration = knownDuration
  if (!duration || duration <= 0) {
    throw new Error('Invalid duration: ' + duration)
  }

  const fps = 30
  const frameCount = Math.min(Math.floor(duration * fps), 300) // Max 300 frames (10s)
  const frameInterval = duration / frameCount

  console.log('[clipFrameExtractor] Will extract', frameCount, 'frames over', duration.toFixed(2), 'seconds')

  // Create canvas for frame extraction
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 270
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  const frames: ImageData[] = []

  // Extract frames by seeking through video
  for (let i = 0; i < frameCount; i++) {
    const time = Math.min(i * frameInterval, duration - 0.001)

    // Seek to time
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[clipFrameExtractor] Seek timeout at frame', i, 'time', time)
        resolve() // Continue anyway
      }, 1000)

      const onSeeked = () => {
        clearTimeout(timeout)
        video.removeEventListener('seeked', onSeeked)
        resolve()
      }

      video.addEventListener('seeked', onSeeked)
      video.currentTime = time
    })

    // Draw frame to canvas
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      frames.push(imageData)
    } catch (e) {
      console.error('[clipFrameExtractor] Failed to draw frame', i, e)
    }

    // Report progress
    if (onProgress) {
      onProgress((i + 1) / frameCount)
    }
  }

  console.log('[clipFrameExtractor] Successfully extracted', frames.length, 'frames')
  return frames
}
