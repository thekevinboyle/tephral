import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// GPU port of src/components/overlays/acid/mirrorEffect.ts (CPU ground truth).
// The CPU version clips the canvas into `segments` pie wedges about
// (centerX, centerY) and, per wedge i, draws the ENTIRE source image through
// a per-wedge canvas transform, clipped to that wedge's angular slice —
// alternating (odd-index) wedges additionally get `scale(1,-1)` + an extra
// `rotate(segmentAngle)` before the draw. This is NOT a continuous
// mirror-repeat fold (that reads as a seamless, symmetric kaleidoscope —
// verified WRONG against ground-truth screenshots, which show a *seamed*
// rotational collage: hard edges at wedge boundaries, each wedge a distinct
// rotated — and for odd wedges, additionally reflected — copy of the
// source, not a smoothly blended reflection).
//
// Solving the exact canvas transform composition per wedge (translate →
// rotate(startAngle) → [scale(1,-1) → rotate(segAngle)] if odd →
// translate back → translate → rotate(-rotation) → translate back), for a
// destination point at angle theta the source angle is:
//   wedge index i = floor(mod(theta - rotation, 2*PI) / segAngle)
//   even i (no mirror): srcAngle = theta - i*segAngle           (pure rotation)
//   odd  i (mirror):    srcAngle = 2*rotation + (i-1)*segAngle - theta  (rotation + reflection)
// radius from center is preserved in both cases (verified numerically
// against a standalone matrix replica of the exact ctx.translate/rotate/
// scale call sequence — see task report). This produces the CPU's
// characteristic hard per-wedge seams instead of a continuous fold.
//
// Because it's a RIGID rotation/reflection (radius from center preserved),
// this must run in raw PIXEL space, not aspect-corrected normalized UV
// space: folding a corner's angle can point its (large) radius toward the
// horizontal axis, and on a portrait canvas dividing that back through the
// aspect ratio blows the sample far outside [0,1], producing a stretched
// clamp artifact that doesn't match the CPU look at all. In pixel space
// this can't happen — the rotated point just lands outside the source
// canvas, exactly as it does for the CPU's clipped drawImage (which paints
// nothing there, letting the pre-filled background show through). That
// background is black when !preserveVideo (matching the CPU's solid black
// wedge-corners at high segment counts on non-square canvases) or the
// untouched frame when preserveVideo is set.
const fragmentShader = `
uniform float segments;
uniform float rotation;
uniform vec2 center;
uniform vec2 resolution;
uniform float preserveVideo;
uniform float isFirstAcidPass;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 centerPx = center * resolution;
  vec2 pixelCoord = uv * resolution;
  vec2 p = pixelCoord - centerPx;

  float r = length(p);
  float theta = atan(p.y, p.x);

  const float TWO_PI = 6.28318530718;
  float segAngle = TWO_PI / max(segments, 2.0);

  // Which wedge (pie slice, relative to rotation) does this destination
  // pixel fall in, and its local angle folded into a canonical branch that
  // lines up with i * segAngle below (matches CPU's startAngle = i *
  // segmentAngle + rotation wedge boundaries exactly).
  float normTheta = mod(theta - rotation, TWO_PI);
  float i = floor(normTheta / segAngle);
  float effTheta = normTheta + rotation;

  bool shouldMirror = mod(i, 2.0) >= 1.0;

  float sampleAngle = shouldMirror
    ? (2.0 * rotation + (i - 1.0) * segAngle - effTheta)
    : (effTheta - i * segAngle);

  vec2 p2 = vec2(cos(sampleAngle), sin(sampleAngle)) * r;
  vec2 samplePx = centerPx + p2;
  vec2 uv2 = samplePx / resolution;

  vec4 computed;
  if (uv2.x < 0.0 || uv2.x > 1.0 || uv2.y < 0.0 || uv2.y > 1.0) {
    bool useBlack = isFirstAcidPass > 0.5 && preserveVideo <= 0.5;
    computed = useBlack ? vec4(0.0, 0.0, 0.0, 1.0) : inputColor;
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
        ['isFirstAcidPass', new THREE.Uniform(1)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
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
