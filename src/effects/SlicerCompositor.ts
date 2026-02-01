import * as THREE from 'three'

export interface SlicerCompositorParams {
  mode: 'replace' | 'mix' | 'layer'
  wet: number
  blendMode: 'normal' | 'multiply' | 'screen' | 'difference' | 'overlay'
  opacity: number
}

/**
 * Compositor class for handling slicer output modes.
 * Handles texture management and CPU-based blending for mix/layer modes.
 */
export class SlicerCompositor {
  private slicerTexture: THREE.DataTexture | null = null
  private mixedTexture: THREE.DataTexture | null = null
  private mixedData: Uint8ClampedArray | null = null
  private params: SlicerCompositorParams = {
    mode: 'replace',
    wet: 1.0,
    blendMode: 'normal',
    opacity: 1.0
  }
  private lastSlicerFrame: ImageData | null = null

  updateParams(params: Partial<SlicerCompositorParams>): void {
    this.params = { ...this.params, ...params }
  }

  setSlicerFrame(imageData: ImageData): void {
    this.lastSlicerFrame = imageData

    if (
      !this.slicerTexture ||
      this.slicerTexture.image.width !== imageData.width ||
      this.slicerTexture.image.height !== imageData.height
    ) {
      // Create new DataTexture if dimensions changed or doesn't exist
      if (this.slicerTexture) {
        this.slicerTexture.dispose()
      }
      this.slicerTexture = new THREE.DataTexture(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height,
        THREE.RGBAFormat
      )
      this.slicerTexture.flipY = true

      // Also create mixed texture buffer
      this.mixedData = new Uint8ClampedArray(imageData.data.length)
      if (this.mixedTexture) {
        this.mixedTexture.dispose()
      }
      this.mixedTexture = new THREE.DataTexture(
        this.mixedData,
        imageData.width,
        imageData.height,
        THREE.RGBAFormat
      )
      this.mixedTexture.flipY = true
    } else {
      // Update existing texture data
      const textureData = this.slicerTexture.image.data as Uint8ClampedArray
      textureData.set(imageData.data)
      this.slicerTexture.needsUpdate = true
    }
  }

  /**
   * Set the original video frame for mixing/layering
   */
  setOriginalFrame(imageData: ImageData): void {
    if (!this.lastSlicerFrame || !this.mixedData || !this.mixedTexture) return
    if (imageData.width !== this.lastSlicerFrame.width ||
        imageData.height !== this.lastSlicerFrame.height) return

    const slicerData = this.lastSlicerFrame.data
    const originalData = imageData.data
    const { wet, blendMode, opacity } = this.params

    // Perform CPU blending
    for (let i = 0; i < this.mixedData.length; i += 4) {
      const sR = slicerData[i]
      const sG = slicerData[i + 1]
      const sB = slicerData[i + 2]
      const oR = originalData[i]
      const oG = originalData[i + 1]
      const oB = originalData[i + 2]

      let bR: number, bG: number, bB: number

      // Apply blend mode
      switch (blendMode) {
        case 'multiply':
          bR = (sR * oR) / 255
          bG = (sG * oG) / 255
          bB = (sB * oB) / 255
          break
        case 'screen':
          bR = 255 - ((255 - sR) * (255 - oR)) / 255
          bG = 255 - ((255 - sG) * (255 - oG)) / 255
          bB = 255 - ((255 - sB) * (255 - oB)) / 255
          break
        case 'difference':
          bR = Math.abs(sR - oR)
          bG = Math.abs(sG - oG)
          bB = Math.abs(sB - oB)
          break
        case 'overlay':
          bR = oR < 128 ? (2 * sR * oR) / 255 : 255 - (2 * (255 - sR) * (255 - oR)) / 255
          bG = oG < 128 ? (2 * sG * oG) / 255 : 255 - (2 * (255 - sG) * (255 - oG)) / 255
          bB = oB < 128 ? (2 * sB * oB) / 255 : 255 - (2 * (255 - sB) * (255 - oB)) / 255
          break
        default: // normal
          bR = sR
          bG = sG
          bB = sB
      }

      // Apply opacity for layer mode
      if (this.params.mode === 'layer') {
        bR = oR + (bR - oR) * opacity
        bG = oG + (bG - oG) * opacity
        bB = oB + (bB - oB) * opacity
      }

      // Apply wet mix
      this.mixedData[i] = oR + (bR - oR) * wet
      this.mixedData[i + 1] = oG + (bG - oG) * wet
      this.mixedData[i + 2] = oB + (bB - oB) * wet
      this.mixedData[i + 3] = 255
    }

    this.mixedTexture.needsUpdate = true
  }

  getOutputTexture(): THREE.Texture | null {
    if (this.params.mode === 'replace') {
      return this.slicerTexture
    }
    return this.mixedTexture
  }

  getSlicerTexture(): THREE.Texture | null {
    return this.slicerTexture
  }

  getMode(): SlicerCompositorParams['mode'] {
    return this.params.mode
  }

  dispose(): void {
    if (this.slicerTexture) {
      this.slicerTexture.dispose()
      this.slicerTexture = null
    }
    if (this.mixedTexture) {
      this.mixedTexture.dispose()
      this.mixedTexture = null
    }
    this.mixedData = null
    this.lastSlicerFrame = null
  }
}
