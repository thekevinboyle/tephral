import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/acid/hexEffect.ts (CPU ground
// truth). The CPU version loops explicit (row, col) hex-lattice indices,
// computes each hex's un-rotated center (`hx, hy`, offset so odd rows are
// shifted by half the horizontal spacing — the standard pointy-top offset
// hex layout, confirmed by `horizDist = sqrt(3)*cellSize`,
// `vertDist = 1.5*cellSize`, and drawHexagon's vertex angles landing a
// vertex straight up), rotates that center about the canvas center by
// `rotation` degrees, samples/fills, and draws a hexagon path there.
//
// This shader inverts that per-pixel: since a hex lattice's nearest-center
// Voronoi partition IS the hex tiling itself (by construction, for a
// properly-spaced pointy-top lattice), there is no need to reproduce the
// CPU's explicit polygon fill — inverse-rotating the destination pixel
// into the lattice's local (unrotated) frame and finding its nearest
// lattice center (checking a 3x3 neighborhood of row/col candidates to
// stay correct across the offset-row boundary) reproduces the same
// hexagonal cells. The CPU's exact `startX`/`startY` phase (derived from
// canvas size and hex counts) is NOT reproduced — an infinite tiling looks
// identical under any phase shift, so the lattice here is simply centered
// on the canvas — matching the "same look, not pixel-identical" parity
// bar.
//
// fillMode has three CPU behaviors, each reproduced at the resolved hex
// center (rotated back to screen space):
// - 'average': the CPU takes a FIXED 7-tap sample (hex center + 6 points
//   at axis-aligned 60-degree increments — NOT rotated by the hex's own
//   `rotation`, this is a real CPU quirk, reproduced verbatim) at radius
//   cellSize*0.35 and averages whichever taps land in-bounds.
// - 'center': a single direct color sample at the hex center.
// - 'original': despite its comment claiming "just return white", the
//   CPU code actually computes a GRAYSCALE value from the center sample's
//   luma — the comment is stale, the code is ground truth, reproduced
//   here as the grayscale path.
// A hex whose center falls outside the canvas produces `null` on the CPU
// (skipped entirely, background shows through) for 'center'/'original';
// for 'average', a zero-tap average (all 7 candidates off-canvas) does
// the same. Reproduced via the same in-bounds gating.
//
// showEdges draws a fixed-width (~1px canvas stroke, alpha 0.3, white)
// outline around every filled hex, on top of its fill. Reproduced via the
// nearest-vs-second-nearest lattice distance: at a true Voronoi/hex
// boundary these are equal, and (secondDist - nearestDist)/2 approximates
// the perpendicular pixel distance to that boundary, which is what a
// thin edge stroke needs.
//
// COLORSPACE WARNING compliance: every source sample fueling a fill color
// or luma value goes through linearToSRGB before use; the final
// composited result goes through sRGBToLinear immediately before
// outputColor.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float cellSize;
uniform float fillModeF; // 0 = average, 1 = center, 2 = original (grayscale)
uniform float showEdges;
uniform float rotationRad;
uniform vec2 resolution;
uniform float preserveVideo;
uniform float isFirstAcidPass;
uniform float effectMix;

vec2 hexCenterFor(float row, float col, float hexW, float hexV) {
  float rowOffset = mod(row, 2.0) * (hexW * 0.5);
  return vec2(col * hexW + rowOffset, row * hexV);
}

void hexNearest(vec2 p, float size, out vec2 nearestCenter, out float nearestDist, out float secondDist) {
  float hexW = sqrt(3.0) * size;
  float hexV = 1.5 * size;
  float rowGuess = floor(p.y / hexV + 0.5);
  nearestDist = 1.0e9;
  secondDist = 1.0e9;
  nearestCenter = vec2(0.0);

  for (float dr = -1.0; dr <= 1.0; dr += 1.0) {
    float row = rowGuess + dr;
    float rowOffset = mod(row, 2.0) * (hexW * 0.5);
    float colGuess = floor((p.x - rowOffset) / hexW + 0.5);
    for (float dc = -1.0; dc <= 1.0; dc += 1.0) {
      float col = colGuess + dc;
      vec2 c = hexCenterFor(row, col, hexW, hexV);
      float d = distance(p, c);
      if (d < nearestDist) {
        secondDist = nearestDist;
        nearestDist = d;
        nearestCenter = c;
      } else if (d < secondDist) {
        secondDist = d;
      }
    }
  }
}

vec3 sampleSRGB(vec2 screenPx) {
  vec2 uvS = screenPx / resolution;
  return linearToSRGB(clamp(texture2D(inputBuffer, uvS).rgb, 0.0, 1.0));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 canvasCenter = resolution * 0.5;

  float cr = cos(-rotationRad);
  float sr = sin(-rotationRad);
  vec2 rel = pixelCoord - canvasCenter;
  vec2 pGrid = vec2(rel.x * cr - rel.y * sr, rel.x * sr + rel.y * cr);

  vec2 nearestCenterGrid;
  float nearestDist;
  float secondDist;
  hexNearest(pGrid, cellSize, nearestCenterGrid, nearestDist, secondDist);

  float fcr = cos(rotationRad);
  float fsr = sin(rotationRad);
  vec2 centerScreen = canvasCenter + vec2(
    nearestCenterGrid.x * fcr - nearestCenterGrid.y * fsr,
    nearestCenterGrid.x * fsr + nearestCenterGrid.y * fcr
  );

  vec3 bg = (isFirstAcidPass > 0.5 && preserveVideo <= 0.5) ? vec3(0.0) : linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));
  vec3 colorSRGB = bg;
  bool filled = false;

  vec2 cuv = centerScreen / resolution;
  bool centerInBounds = cuv.x >= 0.0 && cuv.x < 1.0 && cuv.y >= 0.0 && cuv.y < 1.0;

  if (fillModeF < 0.5) {
    // average: fixed 7-tap sample (center + 6 axis-aligned taps, NOT
    // rotated by rotationRad -- matches the CPU's un-rotated angle loop).
    float sampleRadius = cellSize * 0.7 * 0.5;
    vec3 sum = vec3(0.0);
    float count = 0.0;
    if (centerInBounds) {
      sum += sampleSRGB(centerScreen);
      count += 1.0;
    }
    for (int i = 0; i < 6; i++) {
      float angle = float(i) * (3.14159265 / 3.0);
      vec2 sp = centerScreen + vec2(cos(angle), sin(angle)) * sampleRadius;
      vec2 suv = sp / resolution;
      if (suv.x >= 0.0 && suv.x < 1.0 && suv.y >= 0.0 && suv.y < 1.0) {
        sum += sampleSRGB(sp);
        count += 1.0;
      }
    }
    if (count > 0.5) {
      colorSRGB = sum / count;
      filled = true;
    }
  } else if (centerInBounds) {
    vec3 s = sampleSRGB(centerScreen);
    if (fillModeF > 1.5) {
      colorSRGB = vec3(luminance(s));
    } else {
      colorSRGB = s;
    }
    filled = true;
  }

  if (filled && showEdges > 0.5) {
    float edgeDist = (secondDist - nearestDist) * 0.5;
    float edgeAlpha = 1.0 - smoothstep(0.0, 1.25, edgeDist);
    colorSRGB = mix(colorSRGB, vec3(1.0), 0.3 * edgeAlpha);
  }

  vec3 result = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(result, 1.0), effectMix);
}
`

export interface AcidHexParams {
  cellSize: number
  fillMode: 'average' | 'center' | 'original'
  showEdges: boolean
  rotation: number
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_HEX_PARAMS: AcidHexParams = {
  cellSize: 16,
  fillMode: 'average',
  showEdges: false,
  rotation: 0,
  preserveVideo: false,
  mix: 1,
}

function fillModeToFloat(mode: AcidHexParams['fillMode']): number {
  if (mode === 'center') return 1
  if (mode === 'original') return 2
  return 0
}

export class AcidHexEffect extends Effect {
  constructor(params: Partial<AcidHexParams> = {}) {
    const p = { ...DEFAULT_ACID_HEX_PARAMS, ...params }

    super('AcidHexEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['cellSize', new THREE.Uniform(p.cellSize)],
        ['fillModeF', new THREE.Uniform(fillModeToFloat(p.fillMode))],
        ['showEdges', new THREE.Uniform(p.showEdges ? 1 : 0)],
        ['rotationRad', new THREE.Uniform(THREE.MathUtils.degToRad(p.rotation))],
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

  updateParams(params: Partial<AcidHexParams>) {
    if (params.cellSize !== undefined) {
      this.uniforms.get('cellSize')!.value = params.cellSize
    }
    if (params.fillMode !== undefined) {
      this.uniforms.get('fillModeF')!.value = fillModeToFloat(params.fillMode)
    }
    if (params.showEdges !== undefined) {
      this.uniforms.get('showEdges')!.value = params.showEdges ? 1 : 0
    }
    if (params.rotation !== undefined) {
      this.uniforms.get('rotationRad')!.value = THREE.MathUtils.degToRad(params.rotation)
    }
    if (params.preserveVideo !== undefined) {
      this.uniforms.get('preserveVideo')!.value = params.preserveVideo ? 1 : 0
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
