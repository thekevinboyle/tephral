import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { NOISE_GLSL } from './glsl-utils'

const fragmentShader = NOISE_GLSL + /* glsl */ `
uniform float cellCount;
uniform float shatterAmt;
uniform float edgeGlowAmt;
uniform float aspect;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Aspect-correct grid space: x is scaled by aspect so a "cell" is a
  // square in on-screen units, then cellCount is distributed across the
  // long axis (whichever of width/height is >= the other) so cells stay
  // roughly square instead of stretching on non-square canvases.
  float longAxis = max(aspect, 1.0);
  float cells = max(cellCount, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 gp = p * (cells / longAxis);

  vec2 cellId = floor(gp);

  // Jittered-grid Voronoi: search only the 3x3 neighborhood (a jittered
  // center can never be closer than one full cell away, so cells further
  // out can never win F1/F2). Track both the closest (F1, for sampling)
  // and second-closest (F2, for the edge estimate) distances.
  float f1 = 1.0e9;
  float f2 = 1.0e9;
  vec2 nearestCenter = gp;

  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 neighbor = cellId + vec2(float(dx), float(dy));
      // shatter scales the jitter displacement of each cell center away
      // from its regular grid position — 0 is a perfect uniform grid,
      // 1 pushes centers up to half a cell off-grid (classic jittered
      // Voronoi range, stays non-degenerate for the 3x3 search).
      vec2 jitter = (hash2(neighbor) - 0.5) * shatterAmt;
      vec2 center = neighbor + 0.5 + jitter;
      float d = length(center - gp);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        nearestCenter = center;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }

  // Sample the source at the winning cell's center (not the pixel's own
  // uv) — every pixel inside a cell reads the same texel, producing the
  // flat-color faceted/shattered look.
  vec2 centerP = nearestCenter * (longAxis / cells);
  vec2 centerUV = clamp(vec2(centerP.x / aspect, centerP.y), 0.001, 0.999);
  vec3 color = texture2D(inputBuffer, centerUV).rgb;

  // Edge glow from the F2-F1 gap: near a cell boundary two centers are
  // almost equidistant (gap -> 0); deep inside a cell one center clearly
  // wins (gap large). A fixed threshold in cell-space units keeps the
  // fracture-line thickness visually consistent across cellCount values.
  float edgeDist = f2 - f1;
  float edgeWidth = 0.15;
  float edgeFactor = 1.0 - smoothstep(0.0, edgeWidth, edgeDist);
  color += vec3(1.0) * edgeFactor * edgeGlowAmt;
  color = clamp(color, 0.0, 1.0);

  outputColor = mix(inputColor, vec4(color, inputColor.a), effectMix);
}
`

export interface CrystallizeParams {
  cellCount: number
  shatter: number
  edgeGlow: number
  mix: number
}

export const DEFAULT_CRYSTALLIZE_PARAMS: CrystallizeParams = {
  cellCount: 32,
  shatter: 0.3,
  edgeGlow: 0.4,
  mix: 1,
}

export class CrystallizeEffect extends Effect {
  constructor(params: Partial<CrystallizeParams> = {}) {
    const p = { ...DEFAULT_CRYSTALLIZE_PARAMS, ...params }

    super('CrystallizeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['cellCount', new THREE.Uniform(p.cellCount)],
        ['shatterAmt', new THREE.Uniform(p.shatter)],
        ['edgeGlowAmt', new THREE.Uniform(p.edgeGlow)],
        ['aspect', new THREE.Uniform(1)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setAspect(aspect: number) {
    this.uniforms.get('aspect')!.value = aspect > 0 ? aspect : 1
  }

  updateParams(params: Partial<CrystallizeParams>) {
    if (params.cellCount !== undefined) {
      this.uniforms.get('cellCount')!.value = params.cellCount
    }
    if (params.shatter !== undefined) {
      this.uniforms.get('shatterAmt')!.value = params.shatter
    }
    if (params.edgeGlow !== undefined) {
      this.uniforms.get('edgeGlowAmt')!.value = params.edgeGlow
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
