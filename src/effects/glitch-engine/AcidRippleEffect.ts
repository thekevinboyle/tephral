import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// GPU port of src/components/overlays/acid/rippleEffect.ts (CPU ground truth).
// The CPU version does a per-frame CPU readback (getImageData) to find up to
// 8 local brightness peaks on a coarse 64px grid (i.e. peaks that can sit
// close together within any one bright region), then radiates a
// sin(dist*frequency*0.1 - time*5)-shaped wave from each, attenuated by
// exp(-dist*decay*0.01) and weighted by that peak's brightness. Doing a true
// global peak search per-pixel in a single fragment pass isn't tractable
// without a separate reduction pass (defeats the "eliminate CPU readbacks"
// goal of this port) — this uses a fixed 4x4 grid of 16 candidate centers
// instead, each weighted by the brightness the GPU itself samples there.
// Candidates below the same 0.5 brightness threshold the CPU uses are
// skipped, so dark/empty regions correctly stay quiet, but the denser grid
// (vs. an earlier 8-point pass, which read as a handful of isolated clean
// rings) lets multiple nearby-and-bright candidates overlap the way the
// CPU's clustered peaks do, producing the same dense interference texture
// rather than a few widely-separated single-source ripples. Out-of-bounds
// samples resolve to black, exactly like the CPU's explicit fallback.
const fragmentShader = `
uniform float frequency;
uniform float rippleAmplitude;
uniform float rippleSpeed;
uniform float decay;
uniform float time;
uniform vec2 resolution;
uniform float preserveVideo;
uniform float effectMix;

const int NUM_CENTERS = 16;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;

  vec2 centers[NUM_CENTERS];
  centers[0] = vec2(0.125, 0.125);
  centers[1] = vec2(0.375, 0.125);
  centers[2] = vec2(0.625, 0.125);
  centers[3] = vec2(0.875, 0.125);
  centers[4] = vec2(0.125, 0.375);
  centers[5] = vec2(0.375, 0.375);
  centers[6] = vec2(0.625, 0.375);
  centers[7] = vec2(0.875, 0.375);
  centers[8] = vec2(0.125, 0.625);
  centers[9] = vec2(0.375, 0.625);
  centers[10] = vec2(0.625, 0.625);
  centers[11] = vec2(0.875, 0.625);
  centers[12] = vec2(0.125, 0.875);
  centers[13] = vec2(0.375, 0.875);
  centers[14] = vec2(0.625, 0.875);
  centers[15] = vec2(0.875, 0.875);

  vec2 totalDisplace = vec2(0.0);

  for (int i = 0; i < NUM_CENTERS; i++) {
    vec2 centerUV = centers[i];
    vec3 sampleColor = texture2D(inputBuffer, centerUV).rgb;
    float brightness = dot(sampleColor, vec3(0.299, 0.587, 0.114));
    if (brightness <= 0.5) continue;

    vec2 centerPx = centerUV * resolution;
    vec2 delta = pixelCoord - centerPx;
    float dist = length(delta);
    if (dist < 1.0) continue;

    vec2 dir = delta / dist;
    float wave = sin(dist * frequency * 0.1 - time * rippleSpeed * 5.0);
    float distDecay = exp(-dist * decay * 0.01);
    float displaceAmount = wave * rippleAmplitude * distDecay * brightness;
    totalDisplace += dir * displaceAmount;
  }

  vec2 samplePx = pixelCoord - totalDisplace;
  vec2 uv2 = samplePx / resolution;

  vec4 warped;
  if (uv2.x < 0.0 || uv2.x > 1.0 || uv2.y < 0.0 || uv2.y > 1.0) {
    warped = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    warped = texture2D(inputBuffer, uv2);
  }

  // preserveVideo is accepted for interface parity with the CPU store, but
  // the CPU ripple always writes an opaque pixel (sampled color, or black
  // when out of bounds) for every destination pixel, so preserveVideo never
  // actually changes what's visible — intentionally unused here to match
  // that ground truth.
  outputColor = mix(inputColor, warped, effectMix);
}
`

export interface AcidRippleParams {
  frequency: number
  amplitude: number
  speed: number
  decay: number
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_RIPPLE_PARAMS: AcidRippleParams = {
  frequency: 5,
  amplitude: 20,
  speed: 2,
  decay: 0.5,
  preserveVideo: false,
  mix: 1,
}

export class AcidRippleEffect extends Effect {
  constructor(params: Partial<AcidRippleParams> = {}) {
    const p = { ...DEFAULT_ACID_RIPPLE_PARAMS, ...params }

    super('AcidRippleEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['frequency', new THREE.Uniform(p.frequency)],
        ['rippleAmplitude', new THREE.Uniform(p.amplitude)],
        ['rippleSpeed', new THREE.Uniform(p.speed)],
        ['decay', new THREE.Uniform(p.decay)],
        ['time', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['preserveVideo', new THREE.Uniform(p.preserveVideo ? 1 : 0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<AcidRippleParams>) {
    if (params.frequency !== undefined) {
      this.uniforms.get('frequency')!.value = params.frequency
    }
    if (params.amplitude !== undefined) {
      this.uniforms.get('rippleAmplitude')!.value = params.amplitude
    }
    if (params.speed !== undefined) {
      this.uniforms.get('rippleSpeed')!.value = params.speed
    }
    if (params.decay !== undefined) {
      this.uniforms.get('decay')!.value = params.decay
    }
    if (params.preserveVideo !== undefined) {
      this.uniforms.get('preserveVideo')!.value = params.preserveVideo ? 1 : 0
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
