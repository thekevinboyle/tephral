import * as THREE from 'three'

export interface SlicerCompositorParams {
  mode: 'replace' | 'mix' | 'layer'
  wet: number
  blendMode: 'normal' | 'multiply' | 'screen' | 'difference' | 'overlay'
  opacity: number
}

/**
 * Compositor class for handling slicer output modes.
 * This is a simplified compositor - full blend mode support would require shaders,
 * but for now we handle texture management and basic mode switching.
 */
export class SlicerCompositor {
  private outputTexture: THREE.DataTexture | null = null
  private params: SlicerCompositorParams = {
    mode: 'replace',
    wet: 1.0,
    blendMode: 'normal',
    opacity: 1.0
  }

  updateParams(params: Partial<SlicerCompositorParams>): void {
    this.params = { ...this.params, ...params }
  }

  setSlicerFrame(imageData: ImageData): void {
    if (
      !this.outputTexture ||
      this.outputTexture.image.width !== imageData.width ||
      this.outputTexture.image.height !== imageData.height
    ) {
      // Create new DataTexture if dimensions changed or doesn't exist
      if (this.outputTexture) {
        this.outputTexture.dispose()
      }
      this.outputTexture = new THREE.DataTexture(
        imageData.data,
        imageData.width,
        imageData.height,
        THREE.RGBAFormat
      )
      this.outputTexture.flipY = true
    } else {
      // Update existing texture data
      const textureData = this.outputTexture.image.data as Uint8ClampedArray
      textureData.set(imageData.data)
      this.outputTexture.needsUpdate = true
    }
  }

  getOutputTexture(): THREE.Texture | null {
    return this.outputTexture
  }

  composite(sourceTexture: THREE.Texture): THREE.Texture {
    if (!this.outputTexture) {
      return sourceTexture
    }

    switch (this.params.mode) {
      case 'replace':
        return this.outputTexture
      case 'mix':
        // Simple threshold-based mixing for now
        return this.params.wet > 0.5 ? this.outputTexture : sourceTexture
      case 'layer':
        // Layer compositing handled elsewhere
        return sourceTexture
      default:
        return sourceTexture
    }
  }

  dispose(): void {
    if (this.outputTexture) {
      this.outputTexture.dispose()
      this.outputTexture = null
    }
  }
}
