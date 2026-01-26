export interface VideoDisplayArea {
  displayWidth: number
  displayHeight: number
  offsetX: number
  offsetY: number
}

/**
 * Calculate the display area for video/image content within a container,
 * preserving aspect ratio (letterbox/pillarbox as needed).
 */
export function calculateVideoArea(
  containerWidth: number,
  containerHeight: number,
  videoWidth: number,
  videoHeight: number
): VideoDisplayArea {
  const canvasAspect = containerWidth / containerHeight
  const videoAspect = videoWidth / videoHeight

  let displayWidth: number
  let displayHeight: number
  let offsetX: number
  let offsetY: number

  if (videoAspect > canvasAspect) {
    // Video is wider - fit to width, letterbox top/bottom
    displayWidth = containerWidth
    displayHeight = containerWidth / videoAspect
    offsetX = 0
    offsetY = (containerHeight - displayHeight) / 2
  } else {
    // Video is taller - fit to height, pillarbox left/right
    displayHeight = containerHeight
    displayWidth = containerHeight * videoAspect
    offsetX = (containerWidth - displayWidth) / 2
    offsetY = 0
  }

  return { displayWidth, displayHeight, offsetX, offsetY }
}
