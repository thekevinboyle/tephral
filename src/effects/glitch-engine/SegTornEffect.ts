import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { DEFAULT_SEG_TORN_PARAMS, type SegTornParams } from '../../stores/segStore'
import { NOISE_GLSL } from './glsl-utils'

const fragmentShader = NOISE_GLSL + /* glsl */ `
uniform vec2 resolution;
uniform float depth;
uniform float blockPx;
uniform float speed;
uniform float fillMode;
uniform float uTime;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;
  vec2 blk = floor(px / blockPx);
  vec2 bc = (blk + 0.5) * blockPx;   // decide per block → blocky bites
  float shortSide = min(resolution.x, resolution.y);
  float edgeDist = min(min(bc.x, resolution.x - bc.x), min(bc.y, resolution.y - bc.y)) / shortSide;
  float t = mod(floor(uTime * speed * 8.0), 9973.0); // wrap: keeps hash inputs small after long sessions
  float n = hash(blk + t * 0.37);
  float slow = valueNoise(blk * 0.15 + t * 0.05);
  float bite = depth * (0.3 + 0.7 * n) * (0.5 + 0.5 * slow);
  if (edgeDist >= bite) { outputColor = inputColor; return; }
  vec3 fill = vec3(0.0);
  if (fillMode > 0.5) {
    vec2 toCenter = normalize(vec2(0.5) - uv + 1e-5);
    fill = texture2D(inputBuffer, clamp(uv + toCenter * bite * 1.5, 0.0, 1.0)).rgb;
  }
  outputColor = vec4(mix(inputColor.rgb, fill, effectMix), inputColor.a);
}
`

export class SegTornEffect extends Effect {
  private elapsed = 0

  constructor(params: Partial<SegTornParams> = {}) {
    const p = { ...DEFAULT_SEG_TORN_PARAMS, ...params }
    super('SegTornEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['depth', new THREE.Uniform(p.depth)],
        ['blockPx', new THREE.Uniform(p.blockSize)],
        ['speed', new THREE.Uniform(p.speed)],
        ['fillMode', new THREE.Uniform(p.fill)],
        ['uTime', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(w: number, h: number) {
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(Math.max(1, w), Math.max(1, h))
  }

  update(_r: THREE.WebGLRenderer, _i: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.elapsed += deltaTime
    this.uniforms.get('uTime')!.value = this.elapsed
  }

  updateParams(params: Partial<SegTornParams>) {
    if (params.depth !== undefined) this.uniforms.get('depth')!.value = params.depth
    if (params.blockSize !== undefined) this.uniforms.get('blockPx')!.value = Math.max(1, params.blockSize)
    if (params.speed !== undefined) this.uniforms.get('speed')!.value = params.speed
    if (params.fill !== undefined) this.uniforms.get('fillMode')!.value = params.fill
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
