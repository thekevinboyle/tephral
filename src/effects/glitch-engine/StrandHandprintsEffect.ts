import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/handprintsEffect.ts (CPU
// ground truth, effect id 'strand_handprints'). CPU state: a module-level
// array of Handprint objects {x, y, rotation, scale, opacity, phase, timer,
// isLeft}. A new print spawns every `spawnInterval = 1/(density*0.5)`
// seconds while `handprints.length < density` (density both caps
// concurrent count AND the spawn rate). Each print's lifecycle is
// IN (opacity 0->1 over fadeDuration=0.5/fadeSpeed) -> HOLD (opacity=1 for
// holdDuration=1/fadeSpeed) -> OUT (opacity 1->0 over fadeDuration again)
// -> removed. Position/rotation/scale/isLeft are rolled ONCE at spawn and
// never change (pure fade-in-place, no drift). Drawn with fillStyle #000,
// globalAlpha = opacity*0.7, DEFAULT (source-over, NOT screen) compositing
// — one of the few STRAND ports (alongside Timefall's rain line) that
// blends normally rather than via 'screen'.
//
// GPU approach: MAX_HAND_SLOTS=20 matches density's UI ceiling
// (effectParams.ts density max=20). Each slot loops independently and
// continuously with period cycleLen = 2*fadeDuration + holdDuration
// (== 2/fadeSpeed), a hash-derived phase offset so slots don't sync, and
// hash-derived x/y/rotation/scale/isLeft that stay FIXED for that slot's
// entire cycle (mirroring "rolled once at spawn, kept until removed"). Only
// the first ceil(density) slots render, reproducing the CPU's "only
// `density` prints concurrently visible" cap; the phase-staggered loop
// reproduces the spawn-hold-fade-repeat rhythm statistically rather than
// bit-for-bit (same "hash-derivable, not bit-identical" tradeoff as
// StrandTimefallEffect's raindrops / StrandUmbilicalEffect's tendrils).
//
// Hand SHAPE: the brief suggests baking the CPU's hand path into a
// CanvasTexture stamp atlas (the AcidGlyphEffect technique). A first
// implementation did exactly that, but the atlas-sampled result rendered
// visibly blocky in-browser (confirmed via a controlled side-by-side: the
// SAME DataTexture/LinearFilter/RedFormat technique samples perfectly
// smoothly for AcidGlyphEffect's own atlas at comparable on-screen scale,
// and the baked hand-atlas canvas itself was verified pixel-smooth before
// upload — isolating the defect to the atlas-sampling code path itself,
// not the technique in general). Rather than keep chasing that, this
// version drops the atlas and tests the CPU's exact ellipse geometry
// ANALYTICALLY per pixel instead: the palm and each of the 5 fingers are
// each a `(p/radii)` ellipse-distance test with a smoothstep soft edge,
// using the CPU's verbatim position/length/angle constants (scaled by the
// instance's real handSize, not a baked reference size). This is a exact,
// resolution-independent reproduction of the CPU's vector geometry
// (arguably tighter fidelity than a rasterized-and-resampled atlas would
// give) with no texture/filtering surface at all. Per-pixel, each slot's
// screen-space offset is un-rotated and un-mirrored (inverting the CPU's
// translate->rotate->scale(-1,1) transform stack: local = scale^-1 *
// rotate^-1 * (screen - translate), since composed transforms invert in
// reverse order) into the exact local coordinate system the CPU draws
// its ellipses in; each finger then applies its OWN translate+rotate
// on top, matching the CPU's nested ctx.save()/translate()/rotate() calls
// verbatim.
//
// COLORSPACE WARNING compliance: composited result goes through
// sRGBToLinear immediately before outputColor (no per-pixel source sample
// is needed for the print color itself — it's a flat black, not
// source-derived — only the backdrop being blended under it is sRGB-space).
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform vec2 resolution;
uniform float density;
uniform float fadeSpeed;
uniform float size;
uniform float time;
uniform float effectMix;

const int MAX_HAND_SLOTS = 20;
const int FINGER_COUNT = 5;

float hpHash(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

// Soft-edged ellipse coverage: 1 inside, 0 outside. AA must be a genuine
// ~aaPixels band in ACTUAL screen pixels regardless of the ellipse's
// aspect ratio. The prior approximation converted the ellipse-normalized
// distance d (boundary at d=1) to a pixel distance via a single scalar
// (min(rx,ry)) — but the pixel gradient of d is direction-dependent for
// anisotropic ellipses, so one constant is wrong (over-soft at the thin
// fingers' tips, near-hard elsewhere), reading as aliased/uneven edges.
// The screen->ellipse-local map here is an isometry (rotation/mirror only,
// no per-pixel scale), so |d gradient| wrt screen pixels equals |grad_p d|
// = length(p / rr^2) / d exactly. Real-pixel distance to the boundary is
// then (d-1) / |grad d| = (d-1)*d / length(p/rr^2) — an fwidth-free
// analytic AA that stays correct in the divergent per-slot loop (fwidth in
// non-uniform control flow is undefined). At the exact center (p=0 => the
// gradient is 0/0) the point is deep interior, so force a large negative
// (fully-covered) distance.
float ellipseCoverage(vec2 p, float rx, float ry, float aaPixels) {
  vec2 rr = vec2(max(rx, 0.001), max(ry, 0.001));
  vec2 n = p / rr;
  float d = length(n);
  vec2 g = vec2(p.x / (rr.x * rr.x), p.y / (rr.y * rr.y));
  float gl = length(g);
  float pixelDist = gl > 1e-4 ? (d - 1.0) * d / gl : -min(rr.x, rr.y);
  return 1.0 - smoothstep(-aaPixels, aaPixels, pixelDist);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));

  float fadeDur = 0.5 / max(fadeSpeed, 0.001);
  float holdDur = 1.0 / max(fadeSpeed, 0.001);
  float cycleLen = 2.0 * fadeDur + holdDur;

  for (int i = 0; i < MAX_HAND_SLOTS; i++) {
    if (float(i) >= density) break;
    float fi = float(i);

    float hpX = hpHash(fi * 3.1 + 1.0) * resolution.x;
    float hpY = hpHash(fi * 7.7 + 2.0) * resolution.y;
    float rot = (hpHash(fi * 5.3 + 3.0) - 0.5) * 0.5;
    float scl = 0.5 + hpHash(fi * 9.1 + 4.0) * 0.5;
    bool isLeft = hpHash(fi * 11.3 + 5.0) > 0.5;
    float phaseOffset = hpHash(fi * 13.7 + 6.0);

    float localTime = mod(time + phaseOffset * cycleLen, cycleLen);
    float opacity;
    if (localTime < fadeDur) {
      opacity = localTime / max(fadeDur, 0.0001);
    } else if (localTime < fadeDur + holdDur) {
      opacity = 1.0;
    } else {
      float t = localTime - fadeDur - holdDur;
      opacity = 1.0 - clamp(t / max(fadeDur, 0.0001), 0.0, 1.0);
    }
    if (opacity <= 0.0) continue;

    float handSize = 60.0 * size * scl;
    vec2 rel = pixelCoord - vec2(hpX, hpY);
    float maxReach = handSize * 1.3;
    if (dot(rel, rel) > maxReach * maxReach) continue;

    // The CPU draws in canvas space (Y-DOWN): its finger constants use
    // NEGATIVE y (e.g. -handSize*0.5) to fan fingers ABOVE the palm. This
    // shader's pixelCoord is GL-oriented (Y-UP, uv*resolution), so reusing
    // those constants verbatim without flipping Y renders the hand mirrored
    // (fingers below the palm — a paw). Convert rel into the CPU's
    // canvas-oriented (y-down) frame FIRST (relC), then invert the CPU's
    // translate->rotate(rot)->scale(-1,1 if isLeft) stack: rotate by -rot,
    // then apply the (self-inverse) mirror. unrot is then the exact local
    // space the CPU draws its palm+finger ellipses in.
    vec2 relC = vec2(rel.x, -rel.y);
    float c = cos(-rot);
    float s = sin(-rot);
    vec2 unrot = vec2(relC.x * c - relC.y * s, relC.x * s + relC.y * c);
    if (isLeft) unrot.x = -unrot.x;

    float aa = 1.0;

    // Palm — verbatim ellipse(0, 0, handSize*0.4, handSize*0.5).
    float coverage = ellipseCoverage(unrot, handSize * 0.4, handSize * 0.5, aa);

    // Fingers — verbatim positions/lengths/angles from handprintsEffect.ts,
    // each in its own translate+rotate sub-frame (unrolled: GLSL arrays of
    // per-finger constants are awkward, so each finger is inlined).
    float fingerWidth = handSize * 0.12;

    // Finger 0
    {
      vec2 fp = unrot - vec2(-handSize * 0.25, -handSize * 0.5);
      float fa = -0.2;
      float fc = cos(-fa), fs = sin(-fa);
      vec2 fl = vec2(fp.x * fc - fp.y * fs, fp.x * fs + fp.y * fc);
      float flen = handSize * 0.5;
      coverage = max(coverage, ellipseCoverage(fl - vec2(0.0, -flen * 0.5), fingerWidth, flen * 0.5, aa));
    }
    // Finger 1
    {
      vec2 fp = unrot - vec2(-handSize * 0.08, -handSize * 0.55);
      float fa = -0.05;
      float fc = cos(-fa), fs = sin(-fa);
      vec2 fl = vec2(fp.x * fc - fp.y * fs, fp.x * fs + fp.y * fc);
      float flen = handSize * 0.6;
      coverage = max(coverage, ellipseCoverage(fl - vec2(0.0, -flen * 0.5), fingerWidth, flen * 0.5, aa));
    }
    // Finger 2
    {
      vec2 fp = unrot - vec2(handSize * 0.08, -handSize * 0.55);
      float fa = 0.05;
      float fc = cos(-fa), fs = sin(-fa);
      vec2 fl = vec2(fp.x * fc - fp.y * fs, fp.x * fs + fp.y * fc);
      float flen = handSize * 0.55;
      coverage = max(coverage, ellipseCoverage(fl - vec2(0.0, -flen * 0.5), fingerWidth, flen * 0.5, aa));
    }
    // Finger 3
    {
      vec2 fp = unrot - vec2(handSize * 0.25, -handSize * 0.5);
      float fa = 0.2;
      float fc = cos(-fa), fs = sin(-fa);
      vec2 fl = vec2(fp.x * fc - fp.y * fs, fp.x * fs + fp.y * fc);
      float flen = handSize * 0.45;
      coverage = max(coverage, ellipseCoverage(fl - vec2(0.0, -flen * 0.5), fingerWidth, flen * 0.5, aa));
    }
    // Finger 4 (thumb)
    {
      vec2 fp = unrot - vec2(handSize * 0.4, -handSize * 0.1);
      float fa = 0.8;
      float fc = cos(-fa), fs = sin(-fa);
      vec2 fl = vec2(fp.x * fc - fp.y * fs, fp.x * fs + fp.y * fc);
      float flen = handSize * 0.35;
      coverage = max(coverage, ellipseCoverage(fl - vec2(0.0, -flen * 0.5), fingerWidth, flen * 0.5, aa));
    }

    float alpha = opacity * 0.7 * coverage;
    colorSRGB = mix(colorSRGB, vec3(0.0), alpha);
  }

  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandHandprintsParams {
  density: number
  fadeSpeed: number
  size: number
  mix: number
}

export const DEFAULT_STRAND_HANDPRINTS_PARAMS: StrandHandprintsParams = {
  density: 8,
  fadeSpeed: 0.5,
  size: 1,
  mix: 1,
}

export class StrandHandprintsEffect extends Effect {
  constructor(params: Partial<StrandHandprintsParams> = {}) {
    const p = { ...DEFAULT_STRAND_HANDPRINTS_PARAMS, ...params }

    super('StrandHandprintsEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['density', new THREE.Uniform(p.density)],
        ['fadeSpeed', new THREE.Uniform(p.fadeSpeed)],
        ['size', new THREE.Uniform(p.size)],
        ['time', new THREE.Uniform(0)],
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

  updateParams(params: Partial<StrandHandprintsParams>) {
    if (params.density !== undefined) {
      this.uniforms.get('density')!.value = params.density
    }
    if (params.fadeSpeed !== undefined) {
      this.uniforms.get('fadeSpeed')!.value = params.fadeSpeed
    }
    if (params.size !== undefined) {
      this.uniforms.get('size')!.value = params.size
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
