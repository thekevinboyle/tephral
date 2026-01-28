/**
 * sliceEffect.ts
 * Horizontal/vertical slices with displacement
 * Inspired by glitch art and scan line effects
 */

export interface SliceParams {
  sliceCount: number
  direction: 'horizontal' | 'vertical' | 'both'
  offset: number
  wave: boolean
}

export function renderSlice(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: SliceParams
): void {
  const { sliceCount, direction, offset, wave } = params

  // Black background
  destCtx.fillStyle = '#000'
  destCtx.fillRect(0, 0, width, height)

  const time = Date.now() * 0.001

  if (direction === 'horizontal' || direction === 'both') {
    const sliceHeight = height / sliceCount

    for (let i = 0; i < sliceCount; i++) {
      const y = i * sliceHeight

      // Calculate offset for this slice
      let sliceOffset: number
      if (wave) {
        sliceOffset = Math.sin((i / sliceCount) * Math.PI * 2 + time) * offset
      } else {
        // Pseudo-random but deterministic offset based on slice index
        sliceOffset = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * offset * 2 - offset
      }

      // Draw slice with offset
      destCtx.drawImage(
        sourceCtx.canvas,
        0,
        y,
        width,
        sliceHeight,
        sliceOffset,
        y,
        width,
        sliceHeight
      )

      // Wrap around for offset portions
      if (sliceOffset > 0) {
        destCtx.drawImage(
          sourceCtx.canvas,
          width - sliceOffset,
          y,
          sliceOffset,
          sliceHeight,
          0,
          y,
          sliceOffset,
          sliceHeight
        )
      } else if (sliceOffset < 0) {
        destCtx.drawImage(
          sourceCtx.canvas,
          0,
          y,
          -sliceOffset,
          sliceHeight,
          width + sliceOffset,
          y,
          -sliceOffset,
          sliceHeight
        )
      }
    }
  }

  if (direction === 'vertical' || direction === 'both') {
    // If both, we need to read from the current dest and apply vertical slicing
    const sourceCanvas =
      direction === 'both' ? destCtx.canvas : sourceCtx.canvas
    const sliceWidth = width / sliceCount

    // Create temporary canvas for vertical slicing if doing both
    let tempCanvas: HTMLCanvasElement | undefined
    let tempCtx: CanvasRenderingContext2D | undefined

    if (direction === 'both') {
      tempCanvas = document.createElement('canvas')
      tempCanvas.width = width
      tempCanvas.height = height
      tempCtx = tempCanvas.getContext('2d')!
      tempCtx.drawImage(destCtx.canvas, 0, 0)
    }

    // Clear if only vertical
    if (direction === 'vertical') {
      destCtx.fillStyle = '#000'
      destCtx.fillRect(0, 0, width, height)
    }

    for (let i = 0; i < sliceCount; i++) {
      const x = i * sliceWidth

      // Calculate offset for this slice
      let sliceOffset: number
      if (wave) {
        sliceOffset =
          Math.sin((i / sliceCount) * Math.PI * 2 + time + 1.5) * offset
      } else {
        sliceOffset = ((Math.sin(i * 78.233) * 43758.5453) % 1) * offset * 2 - offset
      }

      const srcCanvas = tempCanvas || sourceCanvas

      // Draw slice with offset
      destCtx.drawImage(
        srcCanvas,
        x,
        0,
        sliceWidth,
        height,
        x,
        sliceOffset,
        sliceWidth,
        height
      )

      // Wrap around for offset portions
      if (sliceOffset > 0) {
        destCtx.drawImage(
          srcCanvas,
          x,
          height - sliceOffset,
          sliceWidth,
          sliceOffset,
          x,
          0,
          sliceWidth,
          sliceOffset
        )
      } else if (sliceOffset < 0) {
        destCtx.drawImage(
          srcCanvas,
          x,
          0,
          sliceWidth,
          -sliceOffset,
          x,
          height + sliceOffset,
          sliceWidth,
          -sliceOffset
        )
      }
    }
  }
}
