import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// GPU port of src/components/overlays/acid/sliceEffect.ts (CPU ground truth).
// The CPU version splits the frame into `sliceCount` horizontal bands (or
// vertical, or both) and displaces each band by a per-slice-index offset —
// either an animated `sin((i/sliceCount)*2*PI + time [+ 1.5 for the
// vertical pass]) * offset` (when `wave` is true, the default), or a
// deterministic-but-noisy hash `((sin(i*seed)*43758.5453) % 1) * offset*2 -
// offset` (`wave` false) with a different magic seed per axis (12.9898 for
// horizontal-band offsets, 78.233 for vertical-band offsets) — the classic
// GLSL pseudo-hash constants, but evaluated with JS's `%` (truncated,
// sign-of-dividend) semantics, NOT GLSL's floor-based `mod` — those differ
// for negative operands, so this port has its own `jsMod` matching JS
// exactly, kept strictly separate from the plain `mod()` used below for
// wrap-around pixel sampling (which DOES need the always-non-negative floor
// form).
//
// Each band's displaced content wraps around the canvas edge (the CPU draws
// the wrapped remainder as a second drawImage call) — every destination
// pixel always gets a valid, fully-opaque source sample this way, so the
// effect covers 100% of the frame regardless of offset; preserveVideo is
// accepted for interface parity with the CPU store but is a no-op here,
// exactly as the CPU's renderSlice never reads it (background never shows
// through).
//
// `direction: 'both'` in the CPU runs the horizontal pass first (into an
// intermediate canvas), then reads that intermediate back and runs the
// vertical pass on top of it. Composed into a single sample: for a
// destination pixel (x, y), the vertical pass picks source row
// y2 = wrap(y - vOffset(floor(x/sliceWidth))), and the horizontal pass
// (which produced that intermediate row) picks source column
// x2 = wrap(x - hOffset(floor(y2/sliceHeight))) — i.e. the horizontal
// band index used is based on y2 (the row the vertical pass reads FROM),
// not the original y. Implemented exactly as that composition below.
const fragmentShader = `
uniform float sliceCount;
uniform float sliceDirection; // 0 = horizontal, 1 = vertical, 2 = both
uniform float sliceOffset;
uniform float sliceWave;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

// JS % semantics: truncated division, result takes the sign of x.
// Only used for the hash-offset formula below, never for pixel wrapping.
float jsMod(float x, float m) {
  return x - m * trunc(x / m);
}

float sliceOffsetFor(float i, float count, float seed, float wavePhase, float amount, float t, float wave) {
  if (wave > 0.5) {
    return sin((i / count) * 6.28318530718 + t + wavePhase) * amount;
  }
  float h = jsMod(sin(i * seed) * 43758.5453, 1.0);
  return h * amount * 2.0 - amount;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  float sliceHeight = resolution.y / sliceCount;
  float sliceWidth = resolution.x / sliceCount;

  vec2 samplePos = pixelCoord;

  if (sliceDirection < 0.5) {
    // Horizontal bands only.
    float ySliceIdx = floor(pixelCoord.y / sliceHeight);
    float hOff = sliceOffsetFor(ySliceIdx, sliceCount, 12.9898, 0.0, sliceOffset, time, sliceWave);
    samplePos.x = mod(pixelCoord.x - hOff, resolution.x);
  } else if (sliceDirection < 1.5) {
    // Vertical bands only.
    float xSliceIdx = floor(pixelCoord.x / sliceWidth);
    float vOff = sliceOffsetFor(xSliceIdx, sliceCount, 78.233, 1.5, sliceOffset, time, sliceWave);
    samplePos.y = mod(pixelCoord.y - vOff, resolution.y);
  } else {
    // Both: vertical pass reads from the horizontally-sliced intermediate.
    float xSliceIdx = floor(pixelCoord.x / sliceWidth);
    float vOff = sliceOffsetFor(xSliceIdx, sliceCount, 78.233, 1.5, sliceOffset, time, sliceWave);
    float y2 = mod(pixelCoord.y - vOff, resolution.y);
    float ySliceIdx = floor(y2 / sliceHeight);
    float hOff = sliceOffsetFor(ySliceIdx, sliceCount, 12.9898, 0.0, sliceOffset, time, sliceWave);
    float x2 = mod(pixelCoord.x - hOff, resolution.x);
    samplePos = vec2(x2, y2);
  }

  vec2 uv2 = samplePos / resolution;
  vec4 computed = texture2D(inputBuffer, uv2);
  outputColor = mix(inputColor, computed, effectMix);
}
`

export interface AcidSliceParams {
  sliceCount: number
  direction: 'horizontal' | 'vertical' | 'both'
  offset: number
  wave: boolean
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_SLICE_PARAMS: AcidSliceParams = {
  sliceCount: 20,
  direction: 'horizontal',
  offset: 50,
  wave: true,
  preserveVideo: false,
  mix: 1,
}

function directionToFloat(direction: AcidSliceParams['direction']): number {
  if (direction === 'vertical') return 1
  if (direction === 'both') return 2
  return 0
}

export class AcidSliceEffect extends Effect {
  constructor(params: Partial<AcidSliceParams> = {}) {
    const p = { ...DEFAULT_ACID_SLICE_PARAMS, ...params }

    super('AcidSliceEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['sliceCount', new THREE.Uniform(p.sliceCount)],
        ['sliceDirection', new THREE.Uniform(directionToFloat(p.direction))],
        ['sliceOffset', new THREE.Uniform(p.offset)],
        ['sliceWave', new THREE.Uniform(p.wave ? 1 : 0)],
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

  updateParams(params: Partial<AcidSliceParams>) {
    if (params.sliceCount !== undefined) {
      this.uniforms.get('sliceCount')!.value = params.sliceCount
    }
    if (params.direction !== undefined) {
      this.uniforms.get('sliceDirection')!.value = directionToFloat(params.direction)
    }
    if (params.offset !== undefined) {
      this.uniforms.get('sliceOffset')!.value = params.offset
    }
    if (params.wave !== undefined) {
      this.uniforms.get('sliceWave')!.value = params.wave ? 1 : 0
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
    // preserveVideo intentionally not wired to a uniform: the CPU ground
    // truth (renderSlice) never reads it — every destination pixel always
    // gets a fully-opaque wrapped source sample, so there is no background
    // to preserve or blacken. Accepted here only for call-site parity with
    // the other Acid ports' `{ ...params, preserveVideo, mix }` push shape.
  }
}
