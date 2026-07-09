import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float segments;
uniform float spin;
uniform float offsetAmt;
uniform float time;
uniform float aspect;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv - 0.5;
  p.x *= aspect;

  float r = length(p);
  float theta = atan(p.y, p.x);

  const float TWO_PI = 6.28318530718;
  float segAngle = TWO_PI / max(segments, 2.0);
  theta += spin * time + offsetAmt * TWO_PI;

  // Fold theta into a mirrored wedge: sawtooth via mod, then triangle-fold
  // around the segment midpoint so adjacent wedges mirror each other.
  float a = mod(theta, segAngle);
  a = abs(a - segAngle * 0.5);

  vec2 p2 = vec2(cos(a), sin(a)) * r;
  p2.x /= aspect;
  vec2 uv2 = clamp(p2 + 0.5, 0.001, 0.999);

  vec4 warped = texture2D(inputBuffer, uv2);
  outputColor = mix(inputColor, warped, effectMix);
}
`

export interface KaleidoscopeParams {
  segments: number
  spin: number
  offset: number
  mix: number
}

export const DEFAULT_KALEIDOSCOPE_PARAMS: KaleidoscopeParams = {
  segments: 6,
  spin: 0.3,
  offset: 0,
  mix: 1,
}

export class KaleidoscopeEffect extends Effect {
  constructor(params: Partial<KaleidoscopeParams> = {}) {
    const p = { ...DEFAULT_KALEIDOSCOPE_PARAMS, ...params }

    super('KaleidoscopeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['segments', new THREE.Uniform(p.segments)],
        ['spin', new THREE.Uniform(p.spin)],
        ['offsetAmt', new THREE.Uniform(p.offset)],
        ['time', new THREE.Uniform(0)],
        ['aspect', new THREE.Uniform(1)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  setAspect(aspect: number) {
    this.uniforms.get('aspect')!.value = aspect > 0 ? aspect : 1
  }

  updateParams(params: Partial<KaleidoscopeParams>) {
    if (params.segments !== undefined) {
      this.uniforms.get('segments')!.value = params.segments
    }
    if (params.spin !== undefined) {
      this.uniforms.get('spin')!.value = params.spin
    }
    if (params.offset !== undefined) {
      this.uniforms.get('offsetAmt')!.value = params.offset
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
