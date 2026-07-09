import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/timefallEffect.ts (CPU ground
// truth, effect id 'strand_timefall').
//
// CPU state: a module-level array of `streakCount` Raindrop objects
// { x, y, speed, length }. speed (200-500) and length (20-60) are rolled
// ONCE per drop and persist for that drop's lifetime; only `y` (and, on
// wraparound, `x`) change frame to frame — `y += speed*deltaTime*intensity`,
// and when `y > height+length` the drop resets to `y=-length` with a FRESH
// random `x`. So a drop is really a looping vertical phase with a
// per-loop-iteration random x — no history/accumulation survives past a
// wraparound, and the "aging" is purely a function of the CURRENT drop
// position (streakPos = distance from the streak's trailing top edge),
// recomputed from scratch every frame. This is a pure function of
// (params, time), confirmed by reading the CPU source — no ping-pong age
// buffer needed (the task-10-brief's accumulation escape hatch does not
// apply here).
//
// The CPU's per-frame model is O(streakCount) (a JS loop over the drops
// array touching only their own 1px-wide column). A literal per-pixel GPU
// port would need to loop over up to streakCount (max 500) candidates for
// EVERY pixel just to find "is my column near a drop's x" — expensive and
// unnecessary, since a raindrop's x is fully random anyway (not tied to any
// particular pixel identity). Instead this reproduces the CPU's spatial
// density with an O(1)-per-pixel column-hash model: partition the screen
// into `streakCount` vertical column cells (colWidth = width/streakCount),
// and derive ONE looping raindrop per cell from a hash of the cell index —
// same idea as the CPU (one drop roughly every colWidth px on average) but
// letting each pixel look up only its OWN cell instead of scanning every
// drop. speed/length are hashed from the cell index alone (stable for the
// cell's lifetime, mirroring the CPU's "rolled once, kept until reset"
// behaviour); x re-hashes from (cell index, loop generation) each time the
// drop's phase wraps, reproducing the CPU's "reroll x on reset" — and
// because x is hashed to fall inside the cell's own [cellStart, cellEnd)
// span, a pixel never needs to consult a neighbouring cell.
//
// intensity gates the phase-advance rate exactly as the CPU's
// `y += speed*deltaTime*intensity` does: at intensity=0 the raw phase
// (time*speed*intensity/span) stops advancing, freezing the drop at its
// hash-derived initial offset — analogous to the CPU's drops never moving
// but still being drawn each frame at their last position.
//
// Per column-hit pixel: streakPos/streakIntensity/desaturate math is a
// direct copy of the CPU's per-pixel loop body. The per-pixel noise flicker
// (`Math.random() < streakIntensity*0.5`) is reproduced with a
// coordinate+frame-bucket hash re-rolled every ~1/60s, the same technique
// used by StrandSeamEffect's void-gap particles. The visible rain line
// (`strokeStyle rgba(200,200,220,0.3)`, default source-over compositing —
// NOT screen blend, unlike every other STRAND port's overlay glow) is drawn
// over the SAME column span at a flat 0.3 alpha regardless of streakPos,
// matching the CPU drawing it unconditionally after the desaturation pass.
//
// COLORSPACE WARNING compliance: sample converted to sRGB via
// linearToSRGB before the desaturate/noise/line math (all byte-space CPU
// math), converted back via sRGBToLinear immediately before outputColor.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float intensity;
uniform float streakCount;
uniform float ageAmount;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

float tfHash(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

float tfHash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;
  float width = resolution.x;
  float height = resolution.y;

  float count = max(streakCount, 1.0);
  float colW = max(width / count, 1.0);
  float colIndex = floor(px.x / colW);

  // Per-cell speed/length: rolled once per cell (CPU's "rolled once per
  // drop, kept until the drop object is discarded" behaviour).
  float speed = mix(200.0, 500.0, tfHash(colIndex * 3.17 + 1.0));
  float length_ = mix(20.0, 60.0, tfHash(colIndex * 7.71 + 2.0));
  float initialPhase = tfHash(colIndex * 13.31 + 3.0);

  float span = height + 2.0 * length_;
  float raw = time * speed * intensity / max(span, 1.0) + initialPhase;
  float loopIdx = floor(raw);
  float phaseFrac = fract(raw);
  float y = -length_ + phaseFrac * span;

  // x re-hashes on every wraparound (loopIdx changes), confined to the
  // cell's own span so a pixel only ever needs its own cell.
  float xJitter = tfHash2(vec2(colIndex, loopIdx)) * colW;
  float xPos = colIndex * colW + xJitter;

  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));

  float halfW = 0.6;
  float colCoverage = 1.0 - smoothstep(halfW, halfW + 0.75, abs(px.x - xPos));

  float startY = y - length_;
  float endY = y;

  if (colCoverage > 0.0 && px.y >= startY && px.y <= endY) {
    float streakPos = clamp((px.y - startY) / max(length_, 0.001), 0.0, 1.0);
    float streakIntensity = streakPos * intensity * ageAmount;

    // Desaturate toward gray by streakIntensity.
    float gray = (colorSRGB.r + colorSRGB.g + colorSRGB.b) / 3.0;
    vec3 desat = colorSRGB + (vec3(gray) - colorSRGB) * streakIntensity;
    colorSRGB = mix(colorSRGB, desat, colCoverage);

    // Per-pixel-per-frame noise flicker, re-rolled every ~1/60s.
    float frameBucket = floor(time * 60.0);
    float nRoll = tfHash2(vec2(px.x * 0.37 + px.y * 0.91, frameBucket + colIndex * 0.013));
    if (nRoll < streakIntensity * 0.5) {
      float noiseAmt = (tfHash2(vec2(px.y * 1.7, frameBucket + colIndex * 0.029)) - 0.5) * (50.0 / 255.0);
      colorSRGB = mix(colorSRGB, clamp(colorSRGB + noiseAmt, 0.0, 1.0), colCoverage);
    }

    // Visible rain streak line — flat alpha, default (non-screen) blend.
    vec3 lineColor = vec3(200.0, 200.0, 220.0) / 255.0;
    colorSRGB = mix(colorSRGB, lineColor, 0.3 * colCoverage);
  }

  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandTimefallParams {
  intensity: number
  streakCount: number
  ageAmount: number
  mix: number
}

export const DEFAULT_STRAND_TIMEFALL_PARAMS: StrandTimefallParams = {
  intensity: 0.5,
  streakCount: 100,
  ageAmount: 0.3,
  mix: 1,
}

export class StrandTimefallEffect extends Effect {
  constructor(params: Partial<StrandTimefallParams> = {}) {
    const p = { ...DEFAULT_STRAND_TIMEFALL_PARAMS, ...params }

    super('StrandTimefallEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['intensity', new THREE.Uniform(p.intensity)],
        ['streakCount', new THREE.Uniform(p.streakCount)],
        ['ageAmount', new THREE.Uniform(p.ageAmount)],
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

  updateParams(params: Partial<StrandTimefallParams>) {
    if (params.intensity !== undefined) {
      this.uniforms.get('intensity')!.value = params.intensity
    }
    if (params.streakCount !== undefined) {
      this.uniforms.get('streakCount')!.value = params.streakCount
    }
    if (params.ageAmount !== undefined) {
      this.uniforms.get('ageAmount')!.value = params.ageAmount
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
