import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// GPU port of src/components/overlays/acid/mirrorEffect.ts (CPU ground truth).
// The CPU version clips the canvas into `segments` pie wedges about
// (centerX, centerY) and, per wedge, draws the ENTIRE source image
// transformed so only the "first wedge" region shows through the clip —
// alternating wedges additionally get a horizontal flip. Working through the
// canvas transform algebra (see task report), the net effect for any
// destination angle is a rigid rotation about the center: fold the angle
// (relative to `rotation`) into a period of `2 * segAngle`, then
// triangle-fold that into [0, segAngle) — the classic "mirror-repeat"
// identity, with NO extra intra-wedge half-fold (unlike the denser Phase-2
// KaleidoscopeEffect, which folds to segAngle/2 for a busier look).
// rotation is a static offset — the CPU source has no time-based spin.
//
// Because it's a RIGID rotation (radius from center preserved), this must
// run in raw PIXEL space, not aspect-corrected normalized UV space: folding
// a corner's angle can point its (large) radius toward the horizontal axis,
// and on a portrait canvas dividing that back through the aspect ratio
// blows the sample far outside [0,1], producing a stretched clamp artifact
// that doesn't match the CPU look at all. In pixel space this can't happen
// — the rotated point just lands outside the source canvas, exactly as it
// does for the CPU's clipped drawImage (which paints nothing there, letting
// the pre-filled background show through). That background is black when
// !preserveVideo (matching the CPU's solid black wedge-corners at high
// segment counts on non-square canvases) or the untouched frame when
// preserveVideo is set.
const fragmentShader = `
uniform float segments;
uniform float rotation;
uniform vec2 center;
uniform vec2 resolution;
uniform float preserveVideo;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 centerPx = center * resolution;
  vec2 pixelCoord = uv * resolution;
  vec2 p = pixelCoord - centerPx;

  float r = length(p);
  float theta = atan(p.y, p.x);

  const float TWO_PI = 6.28318530718;
  float segAngle = TWO_PI / max(segments, 2.0);

  // Mirror-repeat fold: alternating wedges reflect, matching the CPU's
  // per-wedge shouldMirror = (i % 2 === 1) behavior.
  float t = mod(theta - rotation, 2.0 * segAngle);
  float local = t < segAngle ? t : (2.0 * segAngle - t);
  float sampleAngle = rotation + local;

  vec2 p2 = vec2(cos(sampleAngle), sin(sampleAngle)) * r;
  vec2 samplePx = centerPx + p2;
  vec2 uv2 = samplePx / resolution;

  vec4 computed;
  if (uv2.x < 0.0 || uv2.x > 1.0 || uv2.y < 0.0 || uv2.y > 1.0) {
    computed = preserveVideo > 0.5 ? inputColor : vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    computed = texture2D(inputBuffer, uv2);
  }

  outputColor = mix(inputColor, computed, effectMix);
}
`

export interface AcidMirrorParams {
  segments: number
  centerX: number
  centerY: number
  rotation: number
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_MIRROR_PARAMS: AcidMirrorParams = {
  segments: 4,
  centerX: 0.5,
  centerY: 0.5,
  rotation: 0,
  preserveVideo: false,
  mix: 1,
}

export class AcidMirrorEffect extends Effect {
  constructor(params: Partial<AcidMirrorParams> = {}) {
    const p = { ...DEFAULT_ACID_MIRROR_PARAMS, ...params }

    super('AcidMirrorEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['segments', new THREE.Uniform(p.segments)],
        ['rotation', new THREE.Uniform(p.rotation)],
        ['center', new THREE.Uniform(new THREE.Vector2(p.centerX, p.centerY))],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['preserveVideo', new THREE.Uniform(p.preserveVideo ? 1 : 0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<AcidMirrorParams>) {
    if (params.segments !== undefined) {
      this.uniforms.get('segments')!.value = params.segments
    }
    if (params.rotation !== undefined) {
      this.uniforms.get('rotation')!.value = params.rotation
    }
    if (params.centerX !== undefined || params.centerY !== undefined) {
      const center = this.uniforms.get('center')!.value as THREE.Vector2
      if (params.centerX !== undefined) center.x = params.centerX
      if (params.centerY !== undefined) center.y = params.centerY
    }
    if (params.preserveVideo !== undefined) {
      this.uniforms.get('preserveVideo')!.value = params.preserveVideo ? 1 : 0
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
