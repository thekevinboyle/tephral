import * as THREE from 'three'
import { QuadPass, makeTarget } from './warp/WarpFrameBuffer'
import { WARP_VERTEX } from './warp/warpShaders'

/** HDR transfer of a video, as WebCodecs reports it. */
export type HdrTransfer = 'hlg' | 'pq'

/** Converted frames are at most this long side; the chain renders at the stage size anyway. */
const MAX_LONG_SIDE = 2048

// Chrome hands WebGL an HDR video's coded signal as it is (HLG or PQ R'G'B', BT.2020 primaries), and
// shown as SDR that looks bright and flat. This maps it the way QuickTime does on an SDR screen
// (measured from Apple's own rendering of an HLG test pattern): the signal back to scene light with
// the peak at SDR white, displayed light = scene^0.843, BT.2020 to BT.709, then sRGB coding, which is
// what the rest of the chain expects. PQ is first brought to the same scale (1000 nits = peak).
const FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform int uTransfer;
uniform float uGamut;
varying vec2 vUv;
vec3 hlgToScene(vec3 e) {
  vec3 lo = e * e / 3.0;
  vec3 hi = (exp((e - 0.55991073) / 0.17883277) + 0.28466892) / 12.0;
  return mix(lo, hi, step(0.5, e));
}
vec3 pqToNits(vec3 e) {
  vec3 p = pow(max(e, 0.0), vec3(1.0 / 78.84375));
  return 10000.0 * pow(max(p - 0.8359375, 0.0) / (18.8515625 - 18.6875 * p), vec3(1.0 / 0.1593017578125));
}
vec3 toSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
void main() {
  vec3 e = texture2D(tSrc, vUv).rgb;
  vec3 lin = uTransfer == 1
    ? pow(hlgToScene(e), vec3(0.843))
    : pow(min(pqToNits(e) / 1000.0, 1.0), vec3(0.843 / 1.2));
  if (uGamut > 0.5) {
    lin = mat3(1.6605, -0.1246, -0.0182, -0.5876, 1.1329, -0.1006, -0.0728, -0.0083, 1.1187) * lin;
  }
  gl_FragColor = vec4(toSrgb(clamp(lin, 0.0, 1.0)), 1.0);
}
`

/**
 * Reads an HDR video's transfer and primaries from a decoded frame (WebCodecs). Null for SDR (or a
 * browser without WebCodecs); undefined when there is no frame to read yet (still loading, seeking).
 */
export function detectHdr(video: HTMLVideoElement): { transfer: HdrTransfer; bt2020: boolean } | null | undefined {
  if (typeof VideoFrame === 'undefined') return null
  if (video.readyState < 2) return undefined
  let frame: VideoFrame | null = null
  try {
    frame = new VideoFrame(video)
    // The DOM typings predate the HDR values ('hlg', 'pq', 'bt2020'), so compare as strings
    const cs = frame.colorSpace as unknown as { transfer: string | null; primaries: string | null }
    const transfer = cs.transfer === 'hlg' ? 'hlg' : cs.transfer === 'pq' ? 'pq' : null
    return transfer ? { transfer, bt2020: cs.primaries === 'bt2020' } : null
  } catch {
    return undefined
  } finally {
    frame?.close()
  }
}

/** One pass that turns an HDR video texture into the SDR picture the chain works on. */
export class HdrToSdrPass {
  private readonly geometry = new THREE.PlaneGeometry(2, 2)
  private readonly quad = new QuadPass(this.geometry)
  private readonly material = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uTransfer: { value: 1 }, uGamut: { value: 1 } },
    vertexShader: WARP_VERTEX, fragmentShader: FRAG, depthTest: false, depthWrite: false,
  })
  private target: THREE.WebGLRenderTarget | null = null

  render(renderer: THREE.WebGLRenderer, src: THREE.Texture, width: number, height: number, transfer: HdrTransfer, bt2020: boolean): THREE.Texture {
    const k = Math.min(1, MAX_LONG_SIDE / Math.max(1, width, height))
    const w = Math.max(1, Math.round(width * k)), h = Math.max(1, Math.round(height * k))
    if (!this.target || this.target.width !== w || this.target.height !== h) {
      this.target?.dispose()
      this.target = makeTarget(w, h)
    }
    const u = this.material.uniforms
    u.tSrc.value = src
    u.uTransfer.value = transfer === 'hlg' ? 1 : 2
    u.uGamut.value = bt2020 ? 1 : 0
    this.quad.draw(renderer, this.material, this.target)
    u.tSrc.value = null
    return this.target.texture
  }

  release() {
    this.target?.dispose()
    this.target = null
  }

  dispose() {
    this.release()
    this.material.dispose()
    this.geometry.dispose()
  }
}
