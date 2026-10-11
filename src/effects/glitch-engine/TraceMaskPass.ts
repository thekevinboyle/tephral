import * as THREE from 'three'
import { Pass } from 'postprocessing'
import type { TraceEffect } from './TraceEffect'

/** An effect with a Mask dropdown (RGB Split, Block Displace, Datamosh). */
export interface TraceMaskConsumer {
  setTraceMask(texture: THREE.Texture | null): void
}

export interface TraceMaskJob {
  trace: TraceEffect
  consumers: TraceMaskConsumer[]
}

/**
 * Sits right after the input is drawn, before the effect chain. For each trace
 * that some effect's Mask uses, it renders the mask from the source frame and
 * hands the current texture to those effects (the trail ping-pongs, so the
 * texture changes every frame). It never writes the chain's buffers, so it does
 * not swap them.
 */
export class TraceMaskPass extends Pass {
  jobs: TraceMaskJob[] = []

  constructor() {
    super('TraceMaskPass')
    this.needsSwap = false
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget,
    _outputBuffer: THREE.WebGLRenderTarget,
    deltaTime?: number
  ) {
    for (const job of this.jobs) {
      job.trace.renderMask(renderer, inputBuffer, deltaTime)
      const mask = job.trace.getTraceMask()
      for (const consumer of job.consumers) consumer.setTraceMask(mask)
    }
  }

  setSize(width: number, height: number) {
    for (const job of this.jobs) job.trace.setSize(width, height)
  }
}
