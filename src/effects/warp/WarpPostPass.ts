import * as THREE from 'three'
import { CopyMaterial, Pass } from 'postprocessing'
import { makeTarget } from './WarpFrameBuffer'

/**
 * The time warp at the end of the effect chain (placement 'after'). It is the composer's last pass:
 * it copies the finished frame into a target of its own, hands that to `warp` (capture + render on
 * the compositor) and draws what comes back to the screen. It never writes the composer's buffers,
 * so effects that keep history (captureFrame on the composer's output buffer) record the effected
 * frame, never the warped one. Only in the chain while the warp is on with placement 'after'.
 */
export class WarpPostPass extends Pass {
  private readonly copy = new CopyMaterial()
  /**
   * The finished frame, in a target that stays the same object: the composer's last input buffer
   * flips between its two targets when the chain's length changes, and the compositor clears its
   * history whenever its live texture changes.
   */
  private stable: THREE.WebGLRenderTarget | null = null

  private readonly warp: (live: THREE.Texture) => THREE.Texture

  constructor(warp: (live: THREE.Texture) => THREE.Texture) {
    super('WarpPostPass')
    this.warp = warp
    this.fullscreenMaterial = this.copy
    this.needsSwap = false
  }

  render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, outputBuffer: THREE.WebGLRenderTarget) {
    const w = Math.max(1, inputBuffer.width), h = Math.max(1, inputBuffer.height)
    if (!this.stable) this.stable = makeTarget(w, h)
    else if (this.stable.width !== w || this.stable.height !== h) this.stable.setSize(w, h)
    this.copy.inputBuffer = inputBuffer.texture
    renderer.setRenderTarget(this.stable)
    renderer.render(this.scene, this.camera)
    this.copy.inputBuffer = this.warp(this.stable.texture)
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer)
    renderer.render(this.scene, this.camera)
    this.copy.inputBuffer = null as unknown as THREE.Texture // hold no reference to the compositor's target
  }

  /** Free the frame target (the warp went off or moved before the chain); it is re-made on the next render. */
  release() {
    this.stable?.dispose()
    this.stable = null
  }

  dispose() {
    this.release()
    super.dispose()
  }
}
