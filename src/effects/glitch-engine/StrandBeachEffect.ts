import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// GPU port of src/components/overlays/strand/beachStaticEffect.ts (CPU ground
// truth). The CPU version keeps two pieces of module-level state: a
// `lastFlickerTime` timestamp and an `invertBlocks` array, re-rolled only
// when `time - lastFlickerTime > 1/flickerSpeed` — i.e. the block pattern
// HOLDS for a while, then re-rolls all at once, rather than continuously
// drifting. This shader reproduces that hold-then-reroll cadence with a
// time-quantized bucket (`floor(time * flickerSpeed)`) fed into a
// coordinate hash per candidate block, so every block in the current bucket
// is stable for its full window and the whole set jumps together on the
// next bucket — matching the CPU's periodic-regeneration character (exact
// block positions won't match since CPU uses Math.random()/JS RNG state,
// but count, size range, and hold cadence do). blockCount =
// floor(invertProbability*20) matches the CPU exactly, as do the block size
// ranges (20-120px wide, 10-60px tall). Blocks fully invert (1-color) the
// pixels they cover, same as the CPU's `r = 255 - r` etc.
//
// Grain is the CPU's per-pixel-per-frame `Math.random() < grainAmount`
// Bernoulli draw with a correlated (same value added to r/g/b)
// (Math.random()-0.5)*100 noise term (in 0-255 space, i.e. ±50 of 255 ~=
// ±0.196 in 0-1 space) — reproduced with a time-varying hash so the grain
// flickers every frame like the CPU's fresh Math.random() calls, not a
// static dither pattern.
//
// flickerSpeed === 0 is a genuine CPU edge case: `1/flickerSpeed` is
// Infinity, so `time - lastFlickerTime` (bounded) never exceeds it and
// invertBlocks stays permanently empty (initialized empty, never
// populated) — no blocks ever appear. Reproduced explicitly below rather
// than relying on floor(time*0)=0 (which would instead render one static,
// never-changing block set).
//
// The CPU always writes a full opaque frame (putImageData covers every
// pixel, sourced from the input frame with only invert/grain applied) —
// there's no "renders on black" mode on STRAND, so this shader has no
// preserveVideo uniform; effectMix is the only blend control, same
// contract as every other port in this file.
const fragmentShader = `
uniform float grainAmount;
uniform float invertProbability;
uniform float flickerSpeed;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

const int MAX_BLOCKS = 20;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;

  int blockCount = flickerSpeed > 0.0 ? int(floor(invertProbability * 20.0)) : 0;
  float bucket = floor(time * flickerSpeed);

  bool invert = false;
  for (int i = 0; i < MAX_BLOCKS; i++) {
    if (i >= blockCount) break;

    vec2 seed = vec2(float(i) * 7.0 + 1.0, bucket);
    float rx = hash(seed + vec2(0.11, 0.0));
    float ry = hash(seed + vec2(0.0, 0.22));
    float rw = hash(seed + vec2(0.33, 0.17));
    float rh = hash(seed + vec2(0.17, 0.44));

    float blockW = 20.0 + rw * 100.0;
    float blockH = 10.0 + rh * 50.0;
    float blockX = rx * max(resolution.x - blockW, 0.0);
    float blockY = ry * max(resolution.y - blockH, 0.0);

    if (pixelCoord.x >= blockX && pixelCoord.x < blockX + blockW &&
        pixelCoord.y >= blockY && pixelCoord.y < blockY + blockH) {
      invert = true;
      break;
    }
  }

  vec3 color = inputColor.rgb;
  if (invert) {
    color = 1.0 - color;
  }

  float grainRoll = hash(pixelCoord + vec2(time * 997.13, time * 613.71));
  if (grainRoll < grainAmount) {
    float noiseRoll = hash(pixelCoord * 1.37 + vec2(time * 811.37, time * 457.19));
    float noise = (noiseRoll - 0.5) * (100.0 / 255.0);
    color = clamp(color + noise, 0.0, 1.0);
  }

  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandBeachParams {
  grainAmount: number
  invertProbability: number
  flickerSpeed: number
  mix: number
}

export const DEFAULT_STRAND_BEACH_PARAMS: StrandBeachParams = {
  grainAmount: 0.3,
  invertProbability: 0.1,
  flickerSpeed: 1,
  mix: 1,
}

export class StrandBeachEffect extends Effect {
  constructor(params: Partial<StrandBeachParams> = {}) {
    const p = { ...DEFAULT_STRAND_BEACH_PARAMS, ...params }

    super('StrandBeachEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['grainAmount', new THREE.Uniform(p.grainAmount)],
        ['invertProbability', new THREE.Uniform(p.invertProbability)],
        ['flickerSpeed', new THREE.Uniform(p.flickerSpeed)],
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

  updateParams(params: Partial<StrandBeachParams>) {
    if (params.grainAmount !== undefined) {
      this.uniforms.get('grainAmount')!.value = params.grainAmount
    }
    if (params.invertProbability !== undefined) {
      this.uniforms.get('invertProbability')!.value = params.invertProbability
    }
    if (params.flickerSpeed !== undefined) {
      this.uniforms.get('flickerSpeed')!.value = params.flickerSpeed
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
