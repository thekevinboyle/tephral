import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// GPU port of src/components/overlays/acid/scanEffect.ts (CPU ground truth).
// The CPU version keeps a module-level scanPhase incremented every rAF call
// by (speed*deltaTime)/2000 with a hardcoded deltaTime=16 (AcidOverlay never
// passes a real delta) — i.e. phase advances a fixed amount PER FRAME, not
// per wall-clock time, so its effective speed is tied to the browser's
// actual frame rate. At a typical 60Hz refresh that's
// 60 * (speed*16/2000) = speed*0.48 cycles/sec. This port uses a real
// elapsed-time uniform with that same 0.48 constant, which reproduces the
// CPU's cadence at the common 60fps case (the only rate that's really
// checkable from a screenshot anyway — motion character, not exact phase
// alignment, is the parity bar for an animated effect).
//
// For each row (direction=horizontal) or column (direction=vertical), the
// CPU computes `dist` = the forward distance from the current scan position
// to that row/col (wrapped), and blends white over the background with
// alpha = 1 inside `width` px of the line, then a squared linear falloff
// over the next `width + maxPos*trail` px, else 0 — i.e. the trail extends
// AHEAD of the sweep direction (rows the line hasn't reached yet glow in
// anticipation; once passed, brightness snaps to 0 immediately). Brightness
// is read from the pre-effect frame (this shader's inputColor) and boosted
// 1.5x within the line itself. A separate 2px full-brightness indicator
// stripe/spoke is drawn on top at fixed alpha 0.8, plus (radial mode only)
// a 4px solid center dot at alpha 0.9. Pixels below the CPU's 0.05
// brightness cutoff are skipped entirely in the original (leaving the
// pre-filled background untouched) — this shader blends continuously
// instead, which is visually equivalent since a ~0.05-alpha blend barely
// perturbs the background anyway.
//
// Background (what shows where the sweep hasn't lit a pixel) is the source
// frame when preserveVideo is set, else black — matching the CPU's
// pre-fill-then-draw-over compositing order exactly (this effect covers the
// canvas non-uniformly, unlike slice/thgrid, so preserveVideo is genuinely
// load-bearing here).
const fragmentShader = `
uniform float scanSpeed;
uniform float scanWidth;
uniform float scanTrail;
uniform float scanDirection; // 0 = horizontal, 1 = vertical, 2 = radial
uniform float time;
uniform vec2 resolution;
uniform float preserveVideo;
uniform float effectMix;

const float TWO_PI = 6.28318530718;
const float SCAN_PI = 3.14159265359;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  float brightness = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 bg = preserveVideo > 0.5 ? inputColor.rgb : vec3(0.0);
  vec3 computed;

  if (scanDirection < 1.5) {
    // Linear sweep: horizontal (line moves down the y axis) or vertical
    // (line moves across the x axis).
    bool isHorizontal = scanDirection < 0.5;
    float coord = isHorizontal ? pixelCoord.y : pixelCoord.x;
    float maxPos = isHorizontal ? resolution.y : resolution.x;

    float scanPos = fract(time * scanSpeed * 0.48) * maxPos;
    float dist = coord - scanPos;
    if (dist < 0.0) dist += maxPos;

    float trailLength = maxPos * scanTrail;
    float a = 0.0;
    if (dist < scanWidth) {
      a = 1.0;
    } else if (dist < scanWidth + trailLength) {
      a = 1.0 - (dist - scanWidth) / max(trailLength, 0.0001);
      a = a * a;
    }

    float scanBoost = dist < scanWidth ? 1.5 : 1.0;
    float finalBrightness = min(1.0, brightness * a * scanBoost);
    computed = mix(bg, vec3(1.0), finalBrightness);

    if (abs(coord - scanPos) < 1.0) {
      computed = mix(computed, vec3(1.0), 0.8);
    }
  } else {
    // Radial sweep: an angular beam rotating about the canvas center.
    vec2 centerPx = resolution * 0.5;
    vec2 p = pixelCoord - centerPx;
    float r = length(p);
    float theta = atan(p.y, p.x);
    if (theta < 0.0) theta += TWO_PI;

    float scanAngle = fract(time * scanSpeed * 0.48) * TWO_PI;
    float angularWidth = (scanWidth / 180.0) * SCAN_PI;
    float trailAngle = scanTrail * SCAN_PI;

    float angleDist = mod(theta - scanAngle, TWO_PI);

    float a = 0.0;
    if (angleDist < angularWidth) {
      a = 1.0;
    } else if (angleDist < angularWidth + trailAngle) {
      a = 1.0 - (angleDist - angularWidth) / max(trailAngle, 0.0001);
      a = a * a;
    }

    float scanBoost = angleDist < angularWidth ? 1.5 : 1.0;
    float finalBrightness = min(1.0, brightness * a * scanBoost);
    computed = mix(bg, vec3(1.0), finalBrightness);

    // Spoke indicator (~2px canvas line width) and center dot.
    float spokeHalfWidth = 1.0 / max(r, 1.0);
    float shortestAngleDist = abs(mod(theta - scanAngle + SCAN_PI, TWO_PI) - SCAN_PI);
    if (shortestAngleDist < spokeHalfWidth) {
      computed = mix(computed, vec3(1.0), 0.8);
    }
    if (r < 4.0) {
      computed = mix(computed, vec3(1.0), 0.9);
    }
  }

  vec4 result = vec4(computed, 1.0);
  outputColor = mix(inputColor, result, effectMix);
}
`

export interface AcidScanParams {
  speed: number
  width: number
  direction: 'horizontal' | 'vertical' | 'radial'
  trail: number
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_SCAN_PARAMS: AcidScanParams = {
  speed: 2,
  width: 20,
  direction: 'horizontal',
  trail: 0.5,
  preserveVideo: false,
  mix: 1,
}

function directionToFloat(direction: AcidScanParams['direction']): number {
  if (direction === 'vertical') return 1
  if (direction === 'radial') return 2
  return 0
}

export class AcidScanEffect extends Effect {
  constructor(params: Partial<AcidScanParams> = {}) {
    const p = { ...DEFAULT_ACID_SCAN_PARAMS, ...params }

    super('AcidScanEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['scanSpeed', new THREE.Uniform(p.speed)],
        ['scanWidth', new THREE.Uniform(p.width)],
        ['scanTrail', new THREE.Uniform(p.trail)],
        ['scanDirection', new THREE.Uniform(directionToFloat(p.direction))],
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

  // Set by EffectPipeline.updateEffects: true when this is the
  // chain-order-first ACID pass whose background depends on preserveVideo.
  // Stacked ACID passes with preserveVideo=false must NOT each wipe to
  // black — only the first should; later passes composite over the
  // previous pass's output (which already carries the shared black bg).
  setIsFirstAcidPass(isFirst: boolean) {
    this.uniforms.get('isFirstAcidPass')!.value = isFirst ? 1 : 0
  }

  updateParams(params: Partial<AcidScanParams>) {
    if (params.speed !== undefined) {
      this.uniforms.get('scanSpeed')!.value = params.speed
    }
    if (params.width !== undefined) {
      this.uniforms.get('scanWidth')!.value = params.width
    }
    if (params.trail !== undefined) {
      this.uniforms.get('scanTrail')!.value = params.trail
    }
    if (params.direction !== undefined) {
      this.uniforms.get('scanDirection')!.value = directionToFloat(params.direction)
    }
    if (params.preserveVideo !== undefined) {
      this.uniforms.get('preserveVideo')!.value = params.preserveVideo ? 1 : 0
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
