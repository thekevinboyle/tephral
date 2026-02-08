/**
 * mirrorEffect.ts
 * Kaleidoscopic mirroring - split canvas into pie segments and mirror/reflect
 * Inspired by optical kaleidoscopes
 */

export interface MirrorParams {
  segments: number
  centerX: number
  centerY: number
  rotation: number
}

export function renderMirror(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: MirrorParams
): void {
  const { segments, centerX, centerY, rotation } = params

  // Background handled by AcidOverlay based on preserveVideo setting

  // Calculate center point
  const cx = width * centerX
  const cy = height * centerY

  // Angle per segment
  const segmentAngle = (Math.PI * 2) / segments

  // Calculate the maximum radius needed to cover the canvas
  const maxRadius =
    Math.sqrt(
      Math.max(cx, width - cx) ** 2 + Math.max(cy, height - cy) ** 2
    ) * 1.5

  // For each segment
  for (let i = 0; i < segments; i++) {
    const startAngle = i * segmentAngle + rotation
    const shouldMirror = i % 2 === 1

    destCtx.save()

    // Create clipping path for this segment
    destCtx.beginPath()
    destCtx.moveTo(cx, cy)
    destCtx.arc(cx, cy, maxRadius, startAngle, startAngle + segmentAngle)
    destCtx.closePath()
    destCtx.clip()

    // Move to center
    destCtx.translate(cx, cy)

    // Rotate to segment position
    destCtx.rotate(startAngle)

    // Mirror if odd segment
    if (shouldMirror) {
      // Flip horizontally and adjust rotation
      destCtx.scale(1, -1)
      destCtx.rotate(segmentAngle)
    }

    // Draw the source image from the first segment's position
    destCtx.translate(-cx, -cy)

    // Rotate source to extract from first segment only
    destCtx.translate(cx, cy)
    destCtx.rotate(-rotation)
    destCtx.translate(-cx, -cy)

    destCtx.drawImage(sourceCtx.canvas, 0, 0)

    destCtx.restore()
  }
}
