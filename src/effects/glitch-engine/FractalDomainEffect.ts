import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float iterations;
uniform float zoomAmt;
uniform float spin;
uniform float time;
uniform float aspect;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv - 0.5;
  p.x *= aspect;

  // Golden angle keeps successive fold axes from stacking on top of each
  // other, so the tiling reads as fractal rather than a single mirror line.
  const float GOLDEN = 2.39996323;
  float zAmt = max(zoomAmt, 1.0001);

  int n = int(clamp(iterations, 1.0, 8.0));
  float scaleAcc = 1.0;

  // Compile-time bounded loop (max 8) with a runtime break at iterations.
  // Kaleidoscopic IFS domain fold: fold + recenter *before* magnifying, so
  // each pass carves finer self-similar structure into the accumulated
  // coordinate instead of just contracting everything toward one point.
  for (int i = 0; i < 8; i++) {
    if (i >= n) break;

    // Rotate this iteration's wedge so each pass folds along a new axis.
    float angle = spin * time + float(i) * GOLDEN;
    float s = sin(angle);
    float c = cos(angle);
    p = mat2(c, -s, s, c) * p;

    // Fold into the positive quadrant, recenter, then magnify -> the
    // recenter step is what keeps the fold bounded across iterations
    // instead of collapsing to the origin.
    p = abs(p) - 0.5;
    p *= zAmt;
    scaleAcc *= zAmt;
  }

  // Undo the accumulated magnification once, in one shot, so the fine
  // structure carved above lands back inside the source's UV range.
  p /= scaleAcc;

  p.x /= aspect;
  vec2 uv2 = clamp(p + 0.5, 0.001, 0.999);

  vec4 warped = texture2D(inputBuffer, uv2);
  outputColor = mix(inputColor, warped, effectMix);
}
`

export interface FractalDomainParams {
  iterations: number
  zoom: number
  spin: number
  mix: number
}

export const DEFAULT_FRACTAL_DOMAIN_PARAMS: FractalDomainParams = {
  iterations: 4,
  zoom: 1.6,
  spin: 0.4,
  mix: 1,
}

export class FractalDomainEffect extends Effect {
  constructor(params: Partial<FractalDomainParams> = {}) {
    const p = { ...DEFAULT_FRACTAL_DOMAIN_PARAMS, ...params }

    super('FractalDomainEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['iterations', new THREE.Uniform(p.iterations)],
        ['zoomAmt', new THREE.Uniform(p.zoom)],
        ['spin', new THREE.Uniform(p.spin)],
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

  updateParams(params: Partial<FractalDomainParams>) {
    if (params.iterations !== undefined) {
      this.uniforms.get('iterations')!.value = params.iterations
    }
    if (params.zoom !== undefined) {
      this.uniforms.get('zoomAmt')!.value = params.zoom
    }
    if (params.spin !== undefined) {
      this.uniforms.get('spin')!.value = params.spin
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
