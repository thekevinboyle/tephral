import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL, NOISE_GLSL } from './glsl-utils'

const fragmentShader = COLOR_UTILS_GLSL + NOISE_GLSL + /* glsl */ `
uniform float flowSpeed;
uniform float scale;
uniform float intensity;
uniform float chromeAmount;
uniform float time;
uniform float aspect;
uniform float effectMix;

// Base spatial frequency of the flow field at scale = 1. Dividing by the
// scale param (rather than multiplying) matches its UX contract —
// "larger scale = bigger swirls" — so turning the knob up spreads the
// noise features out instead of shrinking them.
const float BASE_FREQ = 3.2;

// Multi-octave curl-noise flow field: three octaves of curlNoise summed with
// decaying amplitude / rising frequency, so the displacement reads as
// nested swirls at different sizes rather than one uniform vortex. The
// per-octave time offset (t * 0.6, -t * 0.4) keeps the octaves drifting
// against each other instead of scrolling in lockstep.
vec2 flowField(vec2 p, float t) {
  vec2 flow = vec2(0.0);
  float amp = 0.55;
  float freq = 1.0;
  for (int i = 0; i < 3; i++) {
    flow += curlNoise(p * freq + vec2(t * 0.6, -t * 0.4)) * amp;
    freq *= 2.1;
    amp *= 0.42;
  }
  return flow;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv;
  p.x *= aspect;
  p *= BASE_FREQ / max(scale, 0.5);

  float t = time * flowSpeed;

  // Displacement scale constant keeps intensity in a UV-space-sane range
  // (max ~6% of the frame at intensity = 1) so the source stays legible
  // through the flow instead of averaging out to a wash of edge pixels.
  const float DISPLACE_SCALE = 0.055;
  vec2 flow = flowField(p, t);
  vec2 offset = flow * intensity * DISPLACE_SCALE;
  offset.x /= aspect;

  vec2 uv2 = clamp(uv + offset, 0.001, 0.999);
  vec4 warped = texture2D(inputBuffer, uv2);

  // Fake specular from the displacement-field gradient magnitude: sample
  // the flow at two small offsets (in the same noise-frequency space the
  // octaves are built in, so the measure stays consistent across scale)
  // and finite-difference it. Where the flow direction changes sharply
  // (vortex seams, fold creases) the gradient spikes, which is exactly
  // where light would catch a bent chrome surface.
  float eps = 0.3;
  vec2 flowX = flowField(p + vec2(eps, 0.0), t);
  vec2 flowY = flowField(p + vec2(0.0, eps), t);
  float gradMag = (length(flowX - flow) + length(flowY - flow)) / eps;
  float specular = pow(clamp(gradMag * 0.09, 0.0, 1.0), 3.0);

  vec3 color = warped.rgb;

  // Chrome treatment, all scaled by chromeAmount so it fully bypasses at 0:

  // 1) Contrast boost via an S-curve (smoothstep) rather than a linear
  // scale-from-midpoint. A linear boost clips a naturally bright source
  // (lots of near-white pixels) straight to solid white; smoothstep punches
  // up the midtones while staying bounded to [0, 1], so highlights compress
  // instead of blowing out.
  color = mix(color, smoothstep(0.0, 1.0, color), chromeAmount * 0.8);

  // 2) Desaturate toward a blue-teal metallic cast.
  float gray = luminance(color);
  vec3 chromeTint = vec3(gray * 0.55, gray * 0.92, gray * 1.05);
  color = mix(color, chromeTint, chromeAmount * 0.6);

  // 3) Specular glints riding the distortion gradient — bright, cool-white
  // highlights where the flow field folds hardest, like light on liquid
  // metal. Additive but small and sparse (pow 3.0 above), so it reads as
  // glints rather than a global brightness lift.
  vec3 specColor = vec3(0.85, 0.98, 1.0) * specular * chromeAmount * 0.6;
  color += specColor;

  color = clamp(color, 0.0, 1.0);

  vec4 effectColor = vec4(color, warped.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface LiquidMorphParams {
  speed: number         // 0.1-3
  scale: number          // 1-20
  intensity: number       // 0-1
  chromeAmount: number     // 0-1
  mix: number                // 0-1, dry/wet
}

export const DEFAULT_LIQUID_MORPH_PARAMS: LiquidMorphParams = {
  speed: 0.8,
  scale: 6,
  intensity: 0.5,
  chromeAmount: 0.7,
  mix: 1,
}

export class LiquidMorphEffect extends Effect {
  constructor(params: Partial<LiquidMorphParams> = {}) {
    const p = { ...DEFAULT_LIQUID_MORPH_PARAMS, ...params }

    super('LiquidMorphEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['flowSpeed', new THREE.Uniform(p.speed)],
        ['scale', new THREE.Uniform(p.scale)],
        ['intensity', new THREE.Uniform(p.intensity)],
        ['chromeAmount', new THREE.Uniform(p.chromeAmount)],
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

  updateParams(params: Partial<LiquidMorphParams>) {
    if (params.speed !== undefined) {
      this.uniforms.get('flowSpeed')!.value = params.speed
    }
    if (params.scale !== undefined) {
      this.uniforms.get('scale')!.value = params.scale
    }
    if (params.intensity !== undefined) {
      this.uniforms.get('intensity')!.value = params.intensity
    }
    if (params.chromeAmount !== undefined) {
      this.uniforms.get('chromeAmount')!.value = params.chromeAmount
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
