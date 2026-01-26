import * as THREE from 'three'
import { Pass, FullScreenQuad } from 'postprocessing'

export class ShaderPassEffect extends Pass {
  material: THREE.ShaderMaterial
  fsQuad: FullScreenQuad

  constructor(material: THREE.ShaderMaterial) {
    super('ShaderPassEffect')
    this.material = material
    this.fsQuad = new FullScreenQuad(material)
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget,
    outputBuffer: THREE.WebGLRenderTarget
  ) {
    this.material.uniforms.tDiffuse.value = inputBuffer.texture

    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
    this.fsQuad.render(renderer)
  }

  dispose() {
    this.material.dispose()
    this.fsQuad.dispose()
  }
}
