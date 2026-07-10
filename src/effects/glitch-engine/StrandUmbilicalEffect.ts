import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/umbilicalEffect.ts (CPU
// ground truth, effect id 'strand_umbilical').
//
// CPU state: a module-level array of `tendrilCount` Tendril objects
// { startX, startY, angle, length, phase }, regenerated ONLY when
// tendrilCount changes (StrandWebEffect's header explicitly calls out
// checking whether per-tendril state like this is "hash-derivable" — it
// is: every field is a pure function of the tendril's own index i and
// tendrilCount, no cross-frame accumulation). edge = i % 4 picks
// top/right/bottom/left; startX/startY is `(i/tendrilCount)*dimension`
// along that edge; angle points inward with a `(Math.random()-0.5)*0.5`
// jitter; length is `0.5 + Math.random()*0.5`; phase is
// `Math.random()*2*PI`. Reproduced here as per-index hashes
// (umbHash(i,0)=jitter, umbHash(i,1)=length, umbHash(i,2)=phase) — the CPU
// rerolls the whole array's randomness on every count change, which a pure
// hash-of-index can't literally replicate bit-for-bit, but the resulting
// character (edge-anchored tendrils with jittered angle/length/phase) is
// identical.
//
// Per frame each tendril draws a 20-segment wavy polyline from its root to
// `currentLength = maxLength*tendril.length*(0.8+0.2*sin(pulseTime))`
// (`pulseTime = time*pulseSpeed+phase`), with a perpendicular
// `wave = sin(t*PI*3+pulseTime*2)*15*(1-t)` offset that decays to zero at
// the tip. Stroked twice, both under `globalCompositeOperation='screen'`:
// once with a gradient (cyan→cyan-dimmer→orange, alpha 0.6→0.4→0.8, keyed
// on progress `t` along the STRAIGHT baseline direction — not arc length
// along the wave) at `lineWidth = 3+sin(pulseTime)*1`, then again with a
// flat `rgba(200,255,255,0.3)` "inner glow" line at width 1.
//
// GPU reproduction: tendrilCount is tiny (UI range 2-12), so this walks
// every tendril per pixel (bounded MAX_TENDRILS, well above the UI max)
// and, per tendril, samples the SAME 20 polyline segments the CPU draws,
// keeping the closest segment's distance AND its interpolated `t` (used
// for both the line-width smoothstep and the gradient lookup, matching the
// CPU's straight-baseline-keyed gradient exactly since `t` here is already
// defined against `dist = currentLength*t`, the same axis the CPU's
// gradient is built along). 16 tendrils * 20 segments = 320 distance tests
// worst case — negligible next to StrandWebEffect's 512-segment loop or
// StrandBridgeEffect's per-pixel Sobel taps.
//
// COLORSPACE WARNING compliance: base sample converted to sRGB via
// linearToSRGB before the screen-blend compositing (matching the CPU's
// canvas-space 'screen' math), converted back via sRGBToLinear immediately
// before outputColor.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control.
//
// PHASE-SNAP FIX (Task 15 ledger): the CPU's `pulseTime = time*pulseSpeed
// + phase` is a closed form that re-scales the ENTIRE elapsed time by the
// current pulseSpeed every frame, so a live pulseSpeed-knob change snaps
// every tendril's pulse position. Reproduced instead via a CPU-side
// accumulator (`pulsePhase`, advanced in update() by `pulseSpeed*dt` using
// performance.now() deltas), matching the CPU's incremental per-frame
// growth (same pattern as Odradek/Timefall/Chiralium).
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float tendrilCount;
uniform float reachDistance;
uniform float pulseSpeed;
uniform float time;
uniform float pulsePhase;
uniform vec2 resolution;
uniform float effectMix;

const int MAX_TENDRILS = 16;
const int UMB_SEGMENTS = 20;
const float UMB_PI = 3.14159265;

float umbHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec2 umbClosestOnSeg(vec2 p, vec2 a, vec2 b, out float t) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return a + ba * t;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = uv * resolution;
  float W = resolution.x;
  float H = resolution.y;
  float maxLength = min(W, H) * reachDistance;

  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));
  vec3 cyan = vec3(0.0, 212.0, 255.0) / 255.0;
  vec3 orange = vec3(255.0, 107.0, 53.0) / 255.0;
  vec3 innerGlow = vec3(200.0, 255.0, 255.0) / 255.0;

  int count = int(min(max(tendrilCount, 0.0), float(MAX_TENDRILS)));

  for (int i = 0; i < MAX_TENDRILS; i++) {
    if (i >= count) break;
    float fi = float(i);
    float edge = mod(fi, 4.0);
    float frac = fi / max(tendrilCount, 1.0);
    float jitter = (umbHash(vec2(fi, 0.0)) - 0.5) * 0.5;

    vec2 start;
    float angle;
    if (edge < 0.5) {
      start = vec2(frac * W, 0.0);
      angle = UMB_PI / 2.0 + jitter;
    } else if (edge < 1.5) {
      start = vec2(W, frac * H);
      angle = UMB_PI + jitter;
    } else if (edge < 2.5) {
      start = vec2(frac * W, H);
      angle = -UMB_PI / 2.0 + jitter;
    } else {
      start = vec2(0.0, frac * H);
      angle = jitter;
    }

    float lenFrac = 0.5 + umbHash(vec2(fi, 1.0)) * 0.5;
    float phase = umbHash(vec2(fi, 2.0)) * 2.0 * UMB_PI;

    float pulseTime = pulsePhase + phase;
    float curLen = maxLength * lenFrac * (0.8 + 0.2 * sin(pulseTime));
    float lineWidth = 3.0 + sin(pulseTime) * 1.0;

    float perpAngle = angle + UMB_PI / 2.0;
    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 perp = vec2(cos(perpAngle), sin(perpAngle));

    float bestD = 1.0e9;
    float bestT = 0.0;
    vec2 prevP = start;
    for (int s = 1; s <= UMB_SEGMENTS; s++) {
      float t = float(s) / float(UMB_SEGMENTS);
      float dist = curLen * t;
      float wave = sin(t * UMB_PI * 3.0 + pulseTime * 2.0) * 15.0 * (1.0 - t);
      vec2 p = start + dir * dist + perp * wave;

      float segT;
      vec2 c = umbClosestOnSeg(px, prevP, p, segT);
      float d = distance(px, c);
      if (d < bestD) {
        bestD = d;
        float tPrev = float(s - 1) / float(UMB_SEGMENTS);
        bestT = mix(tPrev, t, segT);
      }
      prevP = p;
    }

    // Gradient keyed on the straight-baseline progress bestT (matches the
    // CPU's createLinearGradient axis exactly): 0->cyan a=0.6,
    // 0.7->cyan a=0.4, 1->orange a=0.8.
    vec3 gradColor;
    float gradAlpha;
    if (bestT < 0.7) {
      float k = bestT / 0.7;
      gradColor = cyan;
      gradAlpha = mix(0.6, 0.4, k);
    } else {
      float k = (bestT - 0.7) / 0.3;
      gradColor = mix(cyan, orange, k);
      gradAlpha = mix(0.4, 0.8, k);
    }

    float halfW = lineWidth * 0.5;
    float coverage = 1.0 - smoothstep(halfW, halfW + 1.25, bestD);
    if (coverage > 0.0) {
      colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, gradColor), gradAlpha * coverage);
    }

    // Inner glow line: flat 0.3 alpha, width 1, drawn on top (screen blend).
    float glowHalfW = 0.5;
    float glowCoverage = 1.0 - smoothstep(glowHalfW, glowHalfW + 1.0, bestD);
    if (glowCoverage > 0.0) {
      colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, innerGlow), 0.3 * glowCoverage);
    }
  }

  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandUmbilicalParams {
  tendrilCount: number
  reachDistance: number
  pulseSpeed: number
  mix: number
}

export const DEFAULT_STRAND_UMBILICAL_PARAMS: StrandUmbilicalParams = {
  tendrilCount: 6,
  reachDistance: 0.7,
  pulseSpeed: 1,
  mix: 1,
}

export class StrandUmbilicalEffect extends Effect {
  constructor(params: Partial<StrandUmbilicalParams> = {}) {
    const p = { ...DEFAULT_STRAND_UMBILICAL_PARAMS, ...params }

    super('StrandUmbilicalEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['tendrilCount', new THREE.Uniform(p.tendrilCount)],
        ['reachDistance', new THREE.Uniform(p.reachDistance)],
        ['pulseSpeed', new THREE.Uniform(p.pulseSpeed)],
        ['time', new THREE.Uniform(0)],
        ['pulsePhase', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  // CPU-side phase accumulator (Task 15 ledger fix) — see header comment.
  private lastUpdateMs: number | null = null

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    const now = performance.now()
    const dt = this.lastUpdateMs === null ? 0 : Math.min((now - this.lastUpdateMs) / 1000, 0.1)
    this.lastUpdateMs = now

    const pulseSpeed = this.uniforms.get('pulseSpeed')!.value as number
    const pulsePhase = (this.uniforms.get('pulsePhase')!.value as number) + pulseSpeed * dt
    this.uniforms.get('pulsePhase')!.value = pulsePhase

    this.uniforms.get('time')!.value = now / 1000
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<StrandUmbilicalParams>) {
    if (params.tendrilCount !== undefined) {
      this.uniforms.get('tendrilCount')!.value = params.tendrilCount
    }
    if (params.reachDistance !== undefined) {
      this.uniforms.get('reachDistance')!.value = params.reachDistance
    }
    if (params.pulseSpeed !== undefined) {
      this.uniforms.get('pulseSpeed')!.value = params.pulseSpeed
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
