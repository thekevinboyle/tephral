import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { NOISE_GLSL, COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/chiralCloudEffect.ts (CPU
// ground truth, effect id 'strand_cloud'). No persistent state on the CPU
// side — every frame is a pure function of (sourceCanvas, params, time), so
// this is a straight-line reproduction of the per-pixel decision, not a
// state reconstruction.
//
// CPU pipeline per pixel: darkness = 1 - avgBrightness(source); fogBase =
// darkness * responsiveness; fogAmount = clamp((fogBase + noise*0.3) *
// density, 0, 1); if fogAmount > 0.05, write a purple/blue tinted pixel at
// alpha = fogAmount*150/255, ELSE leave that pixel fully transparent (the
// CPU writes to a separate transparent overlay canvas composited over the
// video by the browser — reproduced here as `mix(inputColor, fogColor,
// alpha)` with alpha=0 below the threshold, same visual result as a
// transparent-pixel composite).
//
// The CPU's noise2D is a hand-rolled 4-term layered-sine function sampled
// at raw pixel coordinates (not normalized uv) — per the task brief this
// shader uses the shared NOISE_GLSL `fbm` for the fog body instead of
// reproducing that exact formula (documented recipe deviation: the parity
// gate is the swirling-fog character pooled into dark regions, not the
// analytic noise function). fbm is sampled in uv-space at a low frequency
// with slow time drift to match the CPU's large-scale, slowly-evolving
// undulation (CPU's 0.01 px-space frequency at typical canvas widths works
// out to multi-hundred-pixel wavelengths).
//
// Color: r = 80 + tint*80, g = 50 + (1-tint)*30, b = 120 + tint*50 (0-255
// space) — tint=0 skews blue, tint=1 skews magenta, matching the CPU
// comment exactly.
//
// Zero-value semantics (no special-casing needed — all three fall out of
// the shared formula):
// - density=0: fogAmount is multiplied by density last, so it's pinned to
//   0 everywhere regardless of darkness/noise — the effect fully VANISHES,
//   not freezes.
// - responsiveness=0: fogBase=darkness*0=0, so fogAmount collapses to
//   `clamp(noise*0.3*density, 0, 1)` — fog no longer pools in dark regions
//   at all; instead a uniform density-scaled haze appears/disappears
//   wherever the noise field alone crosses the 0.05 threshold, entirely
//   independent of source brightness. Genuine CPU behavior, reproduced
//   automatically since responsiveness only appears in the fogBase term.
// - tint=0/1: not a vanish case, just the color's low/high hue bound (blue
//   vs magenta) — the fog itself still renders normally.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control (the CPU's overlay canvas has no
// "renders on black" mode; unlit pixels are simply transparent, which is
// the alpha=0 branch here).
//
// Colorspace note (found via in-browser probing, not visible from reading
// the CPU source alone): this pipeline's Effect passes operate on LINEAR
// light values — `outputColor` gets auto-encoded to sRGB only once, at
// final display. The CPU's darkness computation runs on Canvas 2D
// getImageData bytes, which ARE sRGB-encoded. Computing `darkness` directly
// from linear `inputColor.rgb` was verified (via a flat-0.5 debug write
// reading back as byte 188, the sRGB encode of linear 0.5) to make nearly
// the ENTIRE frame read as nearly-maximum darkness regardless of visible
// brightness, blowing fogAmount far past the CPU's — so brightness/darkness
// is computed on a `linearToSRGB`'d copy of the source to match what the
// CPU actually sees, and the composited result is converted back with
// `sRGBToLinear` before writing `outputColor` so the pipeline's own
// auto-encode reproduces the intended sRGB pixel.
const fragmentShader = COLOR_UTILS_GLSL + NOISE_GLSL + /* glsl */ `
uniform float density;
uniform float responsiveness;
uniform float tint;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // inputColor is linear; convert to sRGB bytes-equivalent so darkness
  // matches what the CPU reads from getImageData (see header comment).
  vec3 srgbSrc = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));
  float brightness = (srgbSrc.r + srgbSrc.g + srgbSrc.b) / 3.0;
  float darkness = 1.0 - brightness;

  float fogBase = darkness * responsiveness;

  // Slow, large-scale swirling undulation standing in for the CPU's
  // layered-sine noise2D (see header comment).
  float noiseVal = fbm(uv * 3.0 + vec2(time * 0.05, -time * 0.035)) * 2.0 - 1.0;

  float fogAmount = clamp((fogBase + noiseVal * 0.3) * density, 0.0, 1.0);

  vec3 fogColor = vec3(
    80.0 + tint * 80.0,
    50.0 + (1.0 - tint) * 30.0,
    120.0 + tint * 50.0
  ) / 255.0;

  float alpha = fogAmount > 0.05 ? fogAmount * (150.0 / 255.0) : 0.0;

  // Composite in sRGB space (matching the CPU's byte-space overlay), then
  // convert back to linear before writing outputColor.
  vec3 colorSRGB = mix(srgbSrc, fogColor, alpha);
  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandCloudParams {
  density: number
  responsiveness: number
  tint: number
  mix: number
}

export const DEFAULT_STRAND_CLOUD_PARAMS: StrandCloudParams = {
  density: 0.5,
  responsiveness: 0.5,
  tint: 0.5,
  mix: 1,
}

export class StrandCloudEffect extends Effect {
  constructor(params: Partial<StrandCloudParams> = {}) {
    const p = { ...DEFAULT_STRAND_CLOUD_PARAMS, ...params }

    super('StrandCloudEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['density', new THREE.Uniform(p.density)],
        ['responsiveness', new THREE.Uniform(p.responsiveness)],
        ['tint', new THREE.Uniform(p.tint)],
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

  updateParams(params: Partial<StrandCloudParams>) {
    if (params.density !== undefined) {
      this.uniforms.get('density')!.value = params.density
    }
    if (params.responsiveness !== undefined) {
      this.uniforms.get('responsiveness')!.value = params.responsiveness
    }
    if (params.tint !== undefined) {
      this.uniforms.get('tint')!.value = params.tint
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
