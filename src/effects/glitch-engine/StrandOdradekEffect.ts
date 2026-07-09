import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/odradekEffect.ts (CPU ground
// truth, effect id 'strand_odradek') — Death Stranding "Odradek" radar
// sweep that reveals edges along a rotating cone, with trailing ping-flash
// glow that decays over `revealDuration`.
//
// CPU mechanics (module-level state: `sweepAngle`, `pingTrails[]`):
//   - `sweepAngle += sweepSpeed*deltaTime*2` every frame (monotonic,
//     unbounded) — reproduced here as the closed-form `sweepAngle(t) =
//     2*sweepSpeed*time` (same integral, dropping the CPU's frame-summed
//     drift; identical angular velocity, only the arbitrary start phase
//     differs — fine per the "animation phase differences fine" parity
//     note).
//   - A coarse edge map is built once per frame from `sourceCtx`'s raw
//     canvas bytes via `min(1, sqrt(gx^2+gy^2)/100)`, where
//     `gx=abs(R(right)-R(left))`, `gy=abs(R(down)-R(up))` — RED-CHANNEL-ONLY
//     central differences (the CPU indexes `src[iL]` etc. with NO +0/+1/+2
//     offset, i.e. it reads the R byte directly — same genuine CPU quirk
//     already reproduced verbatim in StrandBridgeEffect), reproduced here
//     exactly, byte-scaled via `linearToSRGB(...).r*255`.
//   - Every frame, `Math.random()<0.3` spawns ONE new ping `{angle:
//     sweepAngle, time, intensity: pingIntensity}` at the CURRENT sweep
//     angle (not bright-point-gated — the brief's "sweep-crossing bright
//     points" describes the net visual result: pings only ever show up
//     where the edge map is significant, since edge<0.1 pixels are skipped
//     entirely in the reveal loop). Pings are pruned once
//     `time-p.time >= revealDuration*2`.
//   - Draw order onto a CLEARED, per-frame TRANSPARENT overlay canvas
//     (`StrandOverlay`'s `ctx`, `clearRect`'d every frame — same setup
//     already documented in StrandChiraliumEffect's DEFECT 2 finding):
//     (1) sweep cone — radial-gradient pie slice from `sweepAngle-0.3` to
//     `sweepAngle`, alpha stops 0.3/0.1/0, DEFAULT (source-over) blend;
//     (2) sweep line — 2px stroke at `sweepAngle`, alpha 0.8, source-over;
//     (3) edge reveal — for every alive ping, every edge pixel (2px
//     stride, `fillRect(x,y,3,3)` — a deliberately CHUNKY/blocky texture,
//     not full-resolution) within `sweepWidth=0.3` rad of `ping.angle`
//     drawn at `alpha=edge*fadeAlpha*ping.intensity` under
//     `globalCompositeOperation='screen'`; (4) center dot + 4 rotating
//     arms (`sweepAngle*0.5 + PI/2*i`), source-over.
//
// CRITICAL — screen blend is NOT against bright video (convention warning
// from this phase's review history): the CPU's `screen` mode in step (3)
// composites gold reveal squares against the CLEARED TRANSPARENT overlay
// canvas (screen-against-black == identity, `1-(1-0)(1-b)=b`), and that
// whole overlay is then layered over the video via normal DOM/canvas
// stacking (plain alpha), not a shader screen blend against the bright
// source. Reproduced here as straight `mix(colorSRGB, gold, alpha)` for
// EVERY layer, including the reveal — exactly the fix already verified for
// StrandChiraliumEffect's "pale fill" defect (screening gold against the
// bright backdrop directly washes it toward white, which the CPU never
// does).
//
// Y-ORIENTATION (see StrandHandprintsEffect.ts / StrandWebEffect.ts for
// the established pattern): the CPU computes `sweepAngle`/`pixelAngle` via
// `Math.atan2(dy,dx)` in canvas space (Y-DOWN — `dy = y - centerY` grows
// DOWNWARD). This shader's `pixelCoord = uv*resolution` is GL-oriented
// (Y-UP). Reusing the CPU's angle math verbatim without a flip would
// reverse the sweep's rotational sense on screen (counter-clockwise
// instead of the CPU's right->down->left->up clockwise sweep) and mirror
// the cone/line/arms vertically. Fixed by converting every screen-relative
// offset into the CPU's canvas-oriented (Y-down) frame FIRST — `relC =
// vec2(rel.x, -rel.y)` — before any atan2/cos/sin, and converting any
// canvas-frame direction vector (e.g. the sweep line's endpoint) back to
// GL via the same (self-inverse) flip on its Y component. Edge magnitude
// itself needs NO flip fix: `gy=abs(up-down)` is symmetric under
// swapping which neighbour is "up", so the abs() cancels the flip.
//
// PING TRAILS as time-windowed hash slots: rather than an unbounded CPU
// array, for a given pixel this inverts the sweep's motion to find
// `t_cross` — the exact past instant `sweepAngle(t_cross) == pixelAngle`
// (mod 2*PI, most recent revolution only) — then searches a small FIXED
// number of taps (ODR_TAPS=9) spanning the CPU's `ping.angle` matching
// window in TIME (`t_cross +/- sweepWidth/angularVel`, clipped to
// `[time-revealDuration*2, time]`). Each tap hashes `floor(t'*60)` (a
// GLOBAL, pixel-INDEPENDENT hash — spawn either happened at a given
// instant or it didn't, same answer for every pixel checking that
// instant, mirroring the CPU's single shared `pingTrails` list) against
// the CPU's exact `<0.3` spawn probability. The most-recent occupied tap's
// age drives `fadeAlpha = clamp(1-age/(revealDuration*2),0,1)`, matching
// the CPU's decay exactly. A narrower window at high sweepSpeed naturally
// yields fewer occupied taps — reproducing the CPU's own tendency toward a
// sparser, more broken-up trail at high speed (fewer per-revolution frames
// x fixed 30% chance), not merely a coincidental stylistic choice.
//
// Edge/angle sampling for the reveal layer only is quantized to the CPU's
// 2px stride (`blockPx = (floor(pixelCoord/2)+0.5)*2`) to reproduce the
// CPU's chunky `fillRect(x,y,3,3)` block texture rather than a smooth
// per-pixel gradient — a deliberate, visible characteristic of the
// original ("revealed edges" read as small gold dots, not hairlines).
//
// COLORSPACE WARNING compliance: every sample feeding the edge magnitude
// goes through linearToSRGB before use; the final composited result goes
// through sRGBToLinear immediately before outputColor.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float sweepSpeed;
uniform float revealDuration;
uniform float pingIntensity;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

#define ODR_TAPS 9
#define ODR_PI 3.14159265359
#define ODR_TWO_PI 6.28318530718
#define ODR_SWEEP_WIDTH 0.3

float odrHash(float n) {
  return fract(sin(n * 78.233) * 43758.5453);
}

// Wrap to [0, 2*PI).
float odrWrapPos(float a) {
  return a - ODR_TWO_PI * floor(a / ODR_TWO_PI);
}

// Wrap to (-PI, PI].
float odrWrapSigned(float a) {
  return odrWrapPos(a + ODR_PI) - ODR_PI;
}

// Distance from the origin-relative point p to the segment from the
// origin to endpoint d (used for the sweep line and the rotating arms,
// both of which start at the radar's center).
float odrSegDist(vec2 p, vec2 d) {
  float dd = dot(d, d);
  float h = dd > 1.0e-6 ? clamp(dot(p, d) / dd, 0.0, 1.0) : 0.0;
  return length(p - d * h);
}

float odrSampleR(vec2 px) {
  vec2 uv = px / resolution;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return linearToSRGB(clamp(texture2D(inputBuffer, uv).rgb, 0.0, 1.0)).r * 255.0;
}

// Red-channel-only central-difference edge magnitude, verbatim CPU
// formula (min(1, sqrt(gx^2+gy^2)/100)). gy's abs() makes the result
// invariant to which vertical neighbour is sampled first, so no Y-flip
// fix is needed here (see header comment).
float odrEdge(vec2 px) {
  float rL = odrSampleR(px - vec2(1.0, 0.0));
  float rR = odrSampleR(px + vec2(1.0, 0.0));
  float rU = odrSampleR(px - vec2(0.0, 1.0));
  float rD = odrSampleR(px + vec2(0.0, 1.0));
  float gx = abs(rR - rL);
  float gy = abs(rD - rU);
  return min(1.0, sqrt(gx * gx + gy * gy) / 100.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 center = resolution * 0.5;
  vec2 rel = pixelCoord - center;
  float maxRadius = length(resolution) * 0.5;

  // Canvas-oriented (Y-down) relative position — see header Y-ORIENTATION
  // note. All angle math below is expressed in this frame, matching the
  // CPU's atan2(dy,dx) exactly.
  vec2 relC = vec2(rel.x, -rel.y);
  float pixelAngle = atan(relC.y, relC.x);

  float angularVel = max(2.0 * sweepSpeed, 1.0e-4);
  float sweepAngle = 2.0 * sweepSpeed * time;

  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));
  vec3 gold = vec3(255.0, 215.0, 0.0) / 255.0;

  // --- Layer 1: sweep cone (radial gradient pie slice, trailing side of
  // the sweep line: [sweepAngle-sweepWidth, sweepAngle]).
  float coneDiff = odrWrapSigned(pixelAngle - sweepAngle);
  bool inCone = coneDiff <= 0.0 && coneDiff >= -ODR_SWEEP_WIDTH;
  if (inCone) {
    float gradT = clamp(length(rel) / max(maxRadius, 1.0), 0.0, 1.0);
    float coneAlpha = gradT <= 0.5
      ? mix(0.3, 0.1, gradT / 0.5)
      : mix(0.1, 0.0, (gradT - 0.5) / 0.5);
    colorSRGB = mix(colorSRGB, gold, coneAlpha);
  }

  // --- Layer 2: sweep line, canvas-frame direction (cos(a), sin(a))
  // converted back to GL via the same Y-flip.
  vec2 lineEnd = vec2(cos(sweepAngle), -sin(sweepAngle)) * maxRadius;
  float lineDist = odrSegDist(rel, lineEnd);
  float lineCoverage = 1.0 - smoothstep(1.0, 1.75, lineDist);
  if (lineCoverage > 0.0) {
    colorSRGB = mix(colorSRGB, gold, 0.8 * lineCoverage);
  }

  // --- Layer 3: edge reveal via time-windowed ping-hash search.
  // Quantize to the CPU's 2px stride for the chunky reveal texture.
  vec2 blockPx = (floor(pixelCoord / 2.0) + 0.5) * 2.0;
  vec2 blockRel = blockPx - center;
  vec2 blockRelC = vec2(blockRel.x, -blockRel.y);
  float blockAngle = atan(blockRelC.y, blockRelC.x);

  float trailAngle = odrWrapPos(sweepAngle - blockAngle);
  float tCross = time - trailAngle / angularVel;
  float windowHalf = ODR_SWEEP_WIDTH / angularVel;
  float windowLo = max(tCross - windowHalf, time - revealDuration * 2.0);
  float windowHi = min(tCross + windowHalf, time);

  float bestT = -1.0e9;
  bool found = false;
  if (windowHi > windowLo) {
    float step = (windowHi - windowLo) / float(ODR_TAPS - 1);
    for (int k = 0; k < ODR_TAPS; k++) {
      float tTap = windowLo + step * float(k);
      float tick = floor(tTap * 60.0);
      if (odrHash(tick) < 0.3) {
        if (tTap > bestT) {
          bestT = tTap;
          found = true;
        }
      }
    }
  }

  if (found) {
    float age = max(0.0, time - bestT);
    float fadeAlpha = clamp(1.0 - age / max(revealDuration * 2.0, 1.0e-4), 0.0, 1.0);
    if (fadeAlpha > 0.0) {
      float edge = odrEdge(blockPx);
      if (edge >= 0.1) {
        float revealAlpha = edge * fadeAlpha * pingIntensity;
        colorSRGB = mix(colorSRGB, gold, clamp(revealAlpha, 0.0, 1.0));
      }
    }
  }

  // --- Layer 4: center indicator dot.
  float centerDist = length(rel);
  float dotCoverage = 1.0 - smoothstep(5.0, 6.0, centerDist);
  if (dotCoverage > 0.0) {
    colorSRGB = mix(colorSRGB, gold, 0.8 * dotCoverage);
  }

  // --- Layer 5: 4 rotating arms at sweepAngle*0.5 + PI/2*i, length 15.
  for (int i = 0; i < 4; i++) {
    float armAngle = sweepAngle * 0.5 + (ODR_PI * 0.5) * float(i);
    vec2 armEnd = vec2(cos(armAngle), -sin(armAngle)) * 15.0;
    float armDist = odrSegDist(rel, armEnd);
    float armCoverage = 1.0 - smoothstep(1.0, 1.75, armDist);
    if (armCoverage > 0.0) {
      colorSRGB = mix(colorSRGB, gold, 0.6 * armCoverage);
    }
  }

  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandOdradekParams {
  sweepSpeed: number
  revealDuration: number
  pingIntensity: number
  mix: number
}

export const DEFAULT_STRAND_ODRADEK_PARAMS: StrandOdradekParams = {
  sweepSpeed: 1,
  revealDuration: 0.3,
  pingIntensity: 0.8,
  mix: 1,
}

export class StrandOdradekEffect extends Effect {
  constructor(params: Partial<StrandOdradekParams> = {}) {
    const p = { ...DEFAULT_STRAND_ODRADEK_PARAMS, ...params }

    super('StrandOdradekEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['sweepSpeed', new THREE.Uniform(p.sweepSpeed)],
        ['revealDuration', new THREE.Uniform(p.revealDuration)],
        ['pingIntensity', new THREE.Uniform(p.pingIntensity)],
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

  updateParams(params: Partial<StrandOdradekParams>) {
    if (params.sweepSpeed !== undefined) {
      this.uniforms.get('sweepSpeed')!.value = params.sweepSpeed
    }
    if (params.revealDuration !== undefined) {
      this.uniforms.get('revealDuration')!.value = params.revealDuration
    }
    if (params.pingIntensity !== undefined) {
      this.uniforms.get('pingIntensity')!.value = params.pingIntensity
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
