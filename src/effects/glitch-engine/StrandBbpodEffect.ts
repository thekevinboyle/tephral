import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/bbPodEffect.ts (CPU ground
// truth, effect id 'strand_bbpod'). No spatial persistent state for the
// vignette/caustics (pure function of params+time); bubbles are a
// module-level array of up to MAX_BUBBLES=20 {x,y,size,speed,wobble}
// objects the CPU grows/shrinks toward `MAX_BUBBLES*causticAmount` and
// rises via `y -= speed*0.016` every animation frame (a fixed-dt
// approximation, NOT real deltaTime — at ~60fps this is roughly 1:1 with
// wall-clock seconds, so `y(t) ~= y0 - speed*t` is a faithful continuous
// model), wrapping back to `y = height+size` with a freshly re-rolled `x`
// whenever it scrolls past `y < -size`.
//
// Draw order/blending (both preserved exactly):
// 1. Amber vignette: a single whole-frame radial-gradient fillRect with
//    DEFAULT (source-over) compositing — center at (r0=vignetteRadius*0.6,
//    r1=maxRadius*1.2), 4 color/alpha stops at t=0/0.5/0.8/1.0. This is the
//    one part of BBPod that does NOT use 'screen' blending.
// 2. Everything else (caustic rings, caustic light patterns, bubbles) is
//    drawn under `ctx.globalCompositeOperation = 'screen'`, gated behind
//    `causticAmount > 0`.
//
// GPU approach: the vignette and the 5 caustic rings + 21 caustic light
// patterns (CPU's `for (angle=0; angle<2*PI; angle+=0.3)` loop, exactly 21
// iterations) are pure per-pixel math — reproduced as direct radial-falloff
// formulas mirroring the CPU's gradient stops. Bubbles use the same
// per-slot hash-lifecycle technique as StrandTimefallEffect's raindrops:
// MAX_BUBBLE_SLOTS=20 matches the CPU's MAX_BUBBLES constant, each slot's
// speed/size/wobble are hashed once per slot (stable for that slot's
// lifetime, mirroring "rolled once when the Bubble object is created"), and
// `x` re-hashes from (slotIndex, loopGeneration) on every wrap — the same
// "reroll x on reset" technique StrandTimefallEffect documented. The
// bubble's radial-gradient fill (CPU offsets the gradient's inner focal
// point toward the upper-left for a glossy highlight look — a two-circle
// gradient, not a simple concentric one) is approximated with a simpler
// concentric 3-stop falloff from the bubble's true center plus a
// right-facing rim-highlight arc (matching the CPU's `ctx.arc(...,-0.5,
// 0.5)` stroke) — same "look" (small glassy circle with an edge glint),
// not a literal two-circle-gradient reproduction.
//
// COLORSPACE WARNING compliance: every sample/composite goes through
// linearToSRGB before use and sRGBToLinear immediately before outputColor.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control (the CPU always writes a full-frame
// vignette, never a "renders on black" mode).
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float vignetteSize;
uniform float tintStrength;
uniform float causticAmount;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

const int MAX_BUBBLE_SLOTS = 20;
const int CAUSTIC_PATTERNS = 21;

float bbHash(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

float bbHash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Piecewise lerp across the CPU's 4-stop radial gradient (canvas gradients
// clamp/extend the nearest stop beyond [0,1], hence the clamp up front).
vec4 vignetteAt(float t, float tintAlpha) {
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.0);
  vec3 c1 = vec3(180.0, 120.0, 40.0) / 255.0;
  vec3 c2 = vec3(150.0, 90.0, 20.0) / 255.0;
  vec3 c3 = vec3(80.0, 50.0, 10.0) / 255.0;
  float a0 = 0.0;
  float a1 = tintAlpha * 0.3;
  float a2 = tintAlpha * 0.6;
  float a3 = tintAlpha;
  if (t < 0.5) {
    float f = t / 0.5;
    return vec4(mix(c0, c1, f), mix(a0, a1, f));
  } else if (t < 0.8) {
    float f = (t - 0.5) / 0.3;
    return vec4(mix(c1, c2, f), mix(a1, a2, f));
  }
  float f = (t - 0.8) / 0.2;
  return vec4(mix(c2, c3, f), mix(a2, a3, f));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 center = resolution * 0.5;
  float maxRadius = min(resolution.x, resolution.y) * 0.5;
  float vignetteRadius = maxRadius * vignetteSize;
  float d = distance(pixelCoord, center);

  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));

  // 1) Amber vignette — default (source-over) blend.
  float r0 = vignetteRadius * 0.6;
  float r1 = maxRadius * 1.2;
  float t = (d - r0) / max(r1 - r0, 0.001);
  vec4 vig = vignetteAt(t, tintStrength * 0.4);
  colorSRGB = mix(colorSRGB, vig.rgb, vig.a);

  if (causticAmount > 0.0) {
    // 2) Caustic rings (5), screen-blended.
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float phase = time * 0.5 + (fi / 5.0) * 6.28318530718;
      float rippleRadius = vignetteRadius + sin(phase) * 20.0 * causticAmount;
      float lineWidth = 3.0 + sin(phase * 2.0) * 2.0;
      float distFromRing = abs(d - rippleRadius);
      float coverage = 1.0 - smoothstep(lineWidth * 0.5 - 1.0, lineWidth * 0.5 + 1.0, distFromRing);
      if (coverage > 0.0) {
        vec3 ringColor = vec3(255.0, 200.0, 100.0) / 255.0;
        float alpha = causticAmount * 0.15 * coverage;
        colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, ringColor), alpha);
      }
    }

    // 3) Caustic light patterns — 21 fixed angle steps (0..2*PI step 0.3),
    // screen-blended 2-stop radial glow.
    for (int i = 0; i < CAUSTIC_PATTERNS; i++) {
      float angle = float(i) * 0.3;
      float wave = sin(angle * 5.0 + time * 2.0) * causticAmount * 20.0;
      float rr = vignetteRadius + wave;
      vec2 pos = center + vec2(cos(angle), sin(angle)) * rr;
      float dp = distance(pixelCoord, pos);
      if (dp < 30.0) {
        float tp = dp / 30.0;
        vec3 col = mix(vec3(255.0, 220.0, 150.0) / 255.0, vec3(255.0, 200.0, 100.0) / 255.0, tp);
        float alpha = mix(causticAmount * 0.2, 0.0, tp);
        colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, col), alpha);
      }
    }

    // 4) Bubbles — per-slot hash lifecycle.
    float bubbleCount = 20.0 * causticAmount;
    for (int i = 0; i < MAX_BUBBLE_SLOTS; i++) {
      if (float(i) >= bubbleCount) break;
      float fi = float(i);

      float bSpeed = mix(20.0, 60.0, bbHash(fi * 3.3 + 10.0));
      float bSize = mix(2.0, 10.0, bbHash(fi * 5.1 + 11.0));
      float bWobble = bbHash(fi * 7.7 + 12.0) * 6.28318530718;
      float bPhase = bbHash(fi * 9.3 + 13.0);

      float travel = resolution.y + 2.0 * bSize;
      float period = max(travel / max(bSpeed, 0.001), 0.001);
      float rawPhase = time / period + bPhase;
      float loopIdx = floor(rawPhase);
      float frac = fract(rawPhase);
      float by = (resolution.y + bSize) - frac * travel;
      float xGen = bbHash2(vec2(fi, loopIdx));
      float bx = xGen * resolution.x + sin(time * 3.0 + bWobble) * 0.5;

      if (distance(vec2(bx, by), center) >= vignetteRadius * 1.1) continue;

      vec2 rel = pixelCoord - vec2(bx, by);
      float rd = length(rel);
      if (rd > bSize + 1.5) continue;

      float tb = clamp(rd / max(bSize, 0.001), 0.0, 1.0);
      vec3 bc0 = vec3(255.0, 240.0, 200.0) / 255.0;
      vec3 bc1 = vec3(255.0, 220.0, 150.0) / 255.0;
      vec3 bc2 = vec3(255.0, 200.0, 100.0) / 255.0;
      vec3 bcol;
      float balpha;
      if (tb < 0.5) {
        float f = tb / 0.5;
        bcol = mix(bc0, bc1, f);
        balpha = mix(0.4, 0.2, f);
      } else {
        float f = (tb - 0.5) / 0.5;
        bcol = mix(bc1, bc2, f);
        balpha = mix(0.2, 0.0, f);
      }

      // Rim highlight — CPU strokes a partial arc from -0.5..0.5 rad (the
      // bubble's right-facing edge).
      float ang = atan(rel.y, rel.x);
      if (ang > -0.5 && ang < 0.5) {
        float edgeCoverage = 1.0 - smoothstep(0.0, 1.2, abs(rd - bSize));
        balpha = max(balpha, edgeCoverage * 0.3);
        bcol = mix(bcol, vec3(255.0, 255.0, 230.0) / 255.0, edgeCoverage);
      }

      colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, bcol), balpha);
    }
  }

  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandBbpodParams {
  vignetteSize: number
  tintStrength: number
  causticAmount: number
  mix: number
}

export const DEFAULT_STRAND_BBPOD_PARAMS: StrandBbpodParams = {
  vignetteSize: 0.8,
  tintStrength: 0.5,
  causticAmount: 0.3,
  mix: 1,
}

export class StrandBbpodEffect extends Effect {
  constructor(params: Partial<StrandBbpodParams> = {}) {
    const p = { ...DEFAULT_STRAND_BBPOD_PARAMS, ...params }

    super('StrandBbpodEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['vignetteSize', new THREE.Uniform(p.vignetteSize)],
        ['tintStrength', new THREE.Uniform(p.tintStrength)],
        ['causticAmount', new THREE.Uniform(p.causticAmount)],
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

  updateParams(params: Partial<StrandBbpodParams>) {
    if (params.vignetteSize !== undefined) {
      this.uniforms.get('vignetteSize')!.value = params.vignetteSize
    }
    if (params.tintStrength !== undefined) {
      this.uniforms.get('tintStrength')!.value = params.tintStrength
    }
    if (params.causticAmount !== undefined) {
      this.uniforms.get('causticAmount')!.value = params.causticAmount
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
