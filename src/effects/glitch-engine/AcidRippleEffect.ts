import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// GPU port of src/components/overlays/acid/rippleEffect.ts (CPU ground truth).
// The CPU version does a per-frame CPU readback (getImageData), searches an
// actual 64px grid of cells for each cell's TRUE local brightness maximum
// (not a single regional-average sample), sorts ALL qualifying peaks
// (brightness > 0.5) by brightness, and CAPS the contributing set to the top
// 8 (`candidates.slice(0, maxCenters=8)`) before radiating a
// sin(dist*frequency*0.1 - time*5)-shaped wave from each, attenuated by
// exp(-dist*decay*0.01) and weighted by that peak's brightness. Doing a true
// per-cell local-max search + global sort per pixel in a single fragment
// pass isn't tractable without a separate reduction pass (defeats the
// "eliminate CPU readbacks" goal of this port) — this samples brightness at
// a fixed 8x8 grid of 64 candidate positions instead (finer than an earlier
// 4x4/16-point attempt, which under-sampled: a single regional-average
// texture read per quadrant only found ~3 "active" (>0.5) spots on typical
// content, versus the CPU's true per-cell local-max search finding many
// more genuine peaks scattered through bright regions — the coarser grid's
// few, widely-separated, strong sources each dominated large uncancelled
// regions of the frame, producing a few big smooth vortex-like rings instead
// of the CPU's dense zigzag interference texture). Rather than an O(n^2)
// exact top-8 selection per pixel (too costly at 64 candidates), this counts
// how many of the 64 pass the same 0.5 threshold the CPU uses, sums their
// full contributions, then scales the SUMMED displacement by
// min(1, 8/activeCount) — normalizing total displacement magnitude to the
// CPU's effective cap of (at most) 8 active sources regardless of how many
// of the finer grid's candidates individually qualify, which is what
// "capped top-8 + matching amplitude scaling" means in aggregate: keep the
// denser spatial texture from more candidate positions, but never let total
// displacement exceed what ~8 CPU-strength sources would produce. Read at
// low amplitude (5) both versions already matched closely; the fix targets
// specifically the default/high-amplitude collapse. Out-of-bounds samples
// resolve to black, exactly like the CPU's explicit fallback.
const fragmentShader = `
uniform float frequency;
uniform float rippleAmplitude;
uniform float rippleSpeed;
uniform float decay;
uniform float time;
uniform vec2 resolution;
uniform float preserveVideo;
uniform float effectMix;

const int GRID = 8;
const int NUM_CENTERS = 64;
const float MAX_ACTIVE_CENTERS = 8.0;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;

  vec2 totalDisplace = vec2(0.0);
  float activeCount = 0.0;

  for (int gx = 0; gx < GRID; gx++) {
    for (int gy = 0; gy < GRID; gy++) {
      vec2 centerUV = (vec2(float(gx), float(gy)) + 0.5) / float(GRID);
      vec3 sampleColor = texture2D(inputBuffer, centerUV).rgb;
      float brightness = dot(sampleColor, vec3(0.299, 0.587, 0.114));
      if (brightness <= 0.5) continue;
      activeCount += 1.0;

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
  }

  // Normalize total magnitude to what (at most) 8 CPU-strength sources would
  // produce, regardless of how many of the finer 64-point grid qualified.
  if (activeCount > MAX_ACTIVE_CENTERS) {
    totalDisplace *= MAX_ACTIVE_CENTERS / activeCount;
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
