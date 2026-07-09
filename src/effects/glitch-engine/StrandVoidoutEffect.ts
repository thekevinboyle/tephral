import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// GPU port of src/components/overlays/strand/voidOutEffect.ts (CPU ground
// truth). The CPU keeps a single module-level scalar (`currentRadius`) plus
// an `expanding` direction flag, advanced every frame by
// `speed * 200 * deltaTime` px, bouncing between 0 and
// `maxRadius = length(canvas diagonal)/2` — i.e. a triangle wave in radius
// vs. wall-clock time. This shader reproduces that with a closed-form
// triangle wave driven by a `time` uniform (a "trivial scalar accumulator"
// as a pure function of time, per the port brief) rather than an integrated
// per-frame delta — same shape (0 -> max -> 0, repeat), not necessarily the
// same phase as a live CPU run (acceptable per the animated-effect parity
// note: judge ring width/distortion falloff/darkening structure, not phase
// alignment).
//
// Within the ring band (ringInner..ringOuter, both = currentRadius ±
// ringWidth*50, matching the CPU's px-space constants exactly), pixels are
// radially displaced by up to distortAmount*30px with a sin(ringPos*PI)
// falloff — reproduced as a texture-coordinate offset in the direction away
// from center (matching the CPU's `srcX = x + cos(angle)*distort`, which
// samples the OUTPUT pixel's color FROM a point offset along the outward
// radial direction).
//
// Inside the ring (dist < ringInner, once currentRadius > 10) the CPU
// darkens/desaturates toward the center via a `0.3 + 0.7*innerFade`
// multiply (innerFade = min(1, dist/ringInner)) — reproduced identically.
//
// The CPU finishes with an explicit canvas stroke: a `ringWidth*20`-wide
// circle at `rgba(255,100,50, 0.5*(1-currentRadius/maxRadius))`, fading out
// as the shockwave approaches the canvas edge — reproduced as a
// distance-band blend of the same orange with a smoothstep for
// anti-aliasing (canvas strokes are natively anti-aliased).
//
// No preserveVideo uniform: the CPU always writes a full opaque frame (every
// destination pixel gets a sampled — possibly displaced/darkened — source
// color, never a "renders on black" mode), matching every other STRAND
// port's compositing contract.
const fragmentShader = `
uniform float voidSpeed;
uniform float distortAmount;
uniform float ringWidth;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

// Named VOID_PI (not PI) — three.js's common shader chunk already #defines
// PI, and postprocessing's macro substitution rewrites the bare token PI
// anywhere it appears, including on the left side of a const declaration,
// which corrupts a "const float PI = ..." into invalid syntax.
const float VOID_PI = 3.14159265359;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 center = resolution * 0.5;
  float maxRadius = length(center);

  // Triangle wave: 0 -> maxRadius -> 0, period derived from the CPU's
  // speed*200 px/sec accumulation rate. voidSpeed <= 0 is a genuine CPU
  // edge case: currentRadius += speed*200*deltaTime adds zero every
  // frame, so the CPU's accumulator freezes at its starting value (0) and
  // never advances -- the ring never grows. An epsilon floor on speedPx
  // would instead produce a near-infinite-period crawl that eventually
  // reaches a nonzero radius, which is not what the CPU does. Guard
  // directly instead: pin currentRadius to 0 when voidSpeed <= 0.
  float speedPx = voidSpeed * 200.0;
  float currentRadius;
  if (speedPx <= 0.0) {
    currentRadius = 0.0;
  } else {
    float halfPeriod = maxRadius / speedPx;
    float period = halfPeriod * 2.0;
    float phase = fract(time / period);
    currentRadius = phase < 0.5
      ? phase * 2.0 * maxRadius
      : (1.0 - phase) * 2.0 * maxRadius;
  }

  vec2 delta = pixelCoord - center;
  float dist = length(delta);

  float ringInner = currentRadius - ringWidth * 50.0;
  float ringOuter = currentRadius + ringWidth * 50.0;

  vec2 samplePx = pixelCoord;
  if (dist > ringInner && dist < ringOuter && ringOuter > ringInner) {
    float ringPos = (dist - ringInner) / (ringOuter - ringInner);
    float distortStrength = sin(ringPos * VOID_PI) * distortAmount;
    float distort = distortStrength * 30.0;
    vec2 dir = dist > 0.0001 ? delta / dist : vec2(0.0);
    samplePx = pixelCoord + dir * distort;
  }

  vec2 sampleUV = clamp(samplePx / resolution, vec2(0.0), vec2(1.0) - 1.0 / resolution);
  vec3 color = texture2D(inputBuffer, sampleUV).rgb;

  if (dist < ringInner && currentRadius > 10.0) {
    float innerFade = clamp(dist / max(ringInner, 0.0001), 0.0, 1.0);
    color *= (0.3 + 0.7 * innerFade);
  }

  if (currentRadius > 10.0) {
    float strokeHalfWidth = max(ringWidth * 20.0 * 0.5, 0.5);
    float strokeDist = abs(dist - currentRadius);
    float coverage = 1.0 - smoothstep(strokeHalfWidth - 1.0, strokeHalfWidth + 1.0, strokeDist);
    float ringAlpha = 0.5 * (1.0 - currentRadius / maxRadius) * coverage;
    color = mix(color, vec3(1.0, 0.392, 0.196), ringAlpha);
  }

  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandVoidoutParams {
  speed: number
  distortAmount: number
  ringWidth: number
  mix: number
}

export const DEFAULT_STRAND_VOIDOUT_PARAMS: StrandVoidoutParams = {
  speed: 0.5,
  distortAmount: 0.5,
  ringWidth: 0.1,
  mix: 1,
}

export class StrandVoidoutEffect extends Effect {
  constructor(params: Partial<StrandVoidoutParams> = {}) {
    const p = { ...DEFAULT_STRAND_VOIDOUT_PARAMS, ...params }

    super('StrandVoidoutEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['voidSpeed', new THREE.Uniform(p.speed)],
        ['distortAmount', new THREE.Uniform(p.distortAmount)],
        ['ringWidth', new THREE.Uniform(p.ringWidth)],
        ['time', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
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

  updateParams(params: Partial<StrandVoidoutParams>) {
    if (params.speed !== undefined) {
      this.uniforms.get('voidSpeed')!.value = params.speed
    }
    if (params.distortAmount !== undefined) {
      this.uniforms.get('distortAmount')!.value = params.distortAmount
    }
    if (params.ringWidth !== undefined) {
      this.uniforms.get('ringWidth')!.value = params.ringWidth
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
