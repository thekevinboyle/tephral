import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// GPU port of src/components/overlays/acid/thgridEffect.ts (CPU ground
// truth). The CPU version does three things, in order, each fully
// overwriting the frame (so preserveVideo is accepted for interface parity
// but never actually visible, exactly like the CPU's renderThGrid, which
// never reads it — a full-frame putImageData always replaces every pixel):
//
// 1. Hard B&W threshold: brightness (rec-601 luma, 0..1) > `threshold`
//    becomes white, else black (flipped if `invert`).
// 2. A grid of thin lines every `gridSize` px starting at x=gridSize /
//    y=gridSize (NOT from the edge), stroked at `lineWidth` px and 0.5
//    alpha, drawn as two separate strokes (vertical pass, then horizontal
//    pass) — so intersections, where both strokes land on the same pixel,
//    are visibly denser than a straight run of one line alone (two
//    stacked 0.5-alpha blends ≈ 0.75 combined coverage). Replicated below
//    via `1 - (1-0.5*v)(1-0.5*h)`.
// 3. If `cornerMarks`, four small L-shaped registration-mark brackets at
//    every grid intersection, drawn fully opaque (alpha reset to 1) on top
//    of the grid lines — computed here via a LOCAL nearest-intersection
//    lookup (round to the nearest gridSize multiple, test the bracket
//    geometry in that intersection's local dx/dy space) rather than
//    looping every intersection per pixel, since `markSize` is always well
//    under half of `gridSize` so a pixel can only ever be inside its
//    single nearest intersection's brackets.
//
// Grid lines/marks are colored white unless `invert`, in which case they're
// black — copied directly from the CPU's `invert ? '#000' : '#fff'`
// strokeStyle, independent of the threshold's own invert flip.
const fragmentShader = `
uniform float threshold;
uniform float gridSize;
uniform float lineWidthPx;
uniform float invert;
uniform float cornerMarks;
uniform vec2 resolution;
uniform float effectMix;

float gridLineCoverage(float coord, float size, float lw, float maxCoord) {
  float k = floor(coord / size + 0.5);
  if (k < 1.0) return 0.0;
  float nearest = k * size;
  if (nearest >= maxCoord) return 0.0;
  float d = abs(coord - nearest);
  float halfW = lw * 0.5;
  return 1.0 - smoothstep(halfW - 0.75, halfW + 0.75, d);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;

  float brightness = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
  bool isWhite = brightness > threshold;
  if (invert > 0.5) isWhite = !isWhite;
  vec3 baseColor = vec3(isWhite ? 1.0 : 0.0);
  vec3 gridColor = invert > 0.5 ? vec3(0.0) : vec3(1.0);

  float vCoverage = gridLineCoverage(pixelCoord.x, gridSize, lineWidthPx, resolution.x);
  float hCoverage = gridLineCoverage(pixelCoord.y, gridSize, lineWidthPx, resolution.y);
  float gridAlpha = 1.0 - (1.0 - 0.5 * vCoverage) * (1.0 - 0.5 * hCoverage);

  vec3 withGrid = mix(baseColor, gridColor, gridAlpha);

  float cornerAlpha = 0.0;
  if (cornerMarks > 0.5) {
    float ixK = floor(pixelCoord.x / gridSize + 0.5);
    float iyK = floor(pixelCoord.y / gridSize + 0.5);
    float ix = ixK * gridSize;
    float iy = iyK * gridSize;
    if (ixK >= 1.0 && ix < resolution.x && iyK >= 1.0 && iy < resolution.y) {
      float markSize = min(gridSize * 0.2, 10.0);
      float markLineWidth = max(1.0, lineWidthPx * 0.5);
      float halfMLW = markLineWidth * 0.5;
      float ax = abs(pixelCoord.x - ix);
      float ay = abs(pixelCoord.y - iy);
      bool segA = abs(ax - markSize) < halfMLW && ay >= markSize * 0.3 - halfMLW && ay <= markSize + halfMLW;
      bool segB = abs(ay - markSize) < halfMLW && ax >= markSize * 0.3 - halfMLW && ax <= markSize + halfMLW;
      if (segA || segB) cornerAlpha = 1.0;
    }
  }

  vec3 finalColor = cornerAlpha > 0.5 ? gridColor : withGrid;
  outputColor = mix(inputColor, vec4(finalColor, 1.0), effectMix);
}
`

export interface AcidThgridParams {
  threshold: number
  gridSize: number
  lineWidth: number
  invert: boolean
  cornerMarks: boolean
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_THGRID_PARAMS: AcidThgridParams = {
  threshold: 0.5,
  gridSize: 8,
  lineWidth: 1,
  invert: false,
  cornerMarks: true,
  preserveVideo: false,
  mix: 1,
}

export class AcidThgridEffect extends Effect {
  constructor(params: Partial<AcidThgridParams> = {}) {
    const p = { ...DEFAULT_ACID_THGRID_PARAMS, ...params }

    super('AcidThgridEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['threshold', new THREE.Uniform(p.threshold)],
        ['gridSize', new THREE.Uniform(p.gridSize)],
        ['lineWidthPx', new THREE.Uniform(p.lineWidth)],
        ['invert', new THREE.Uniform(p.invert ? 1 : 0)],
        ['cornerMarks', new THREE.Uniform(p.cornerMarks ? 1 : 0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<AcidThgridParams>) {
    if (params.threshold !== undefined) {
      this.uniforms.get('threshold')!.value = params.threshold
    }
    if (params.gridSize !== undefined) {
      this.uniforms.get('gridSize')!.value = params.gridSize
    }
    if (params.lineWidth !== undefined) {
      this.uniforms.get('lineWidthPx')!.value = params.lineWidth
    }
    if (params.invert !== undefined) {
      this.uniforms.get('invert')!.value = params.invert ? 1 : 0
    }
    if (params.cornerMarks !== undefined) {
      this.uniforms.get('cornerMarks')!.value = params.cornerMarks ? 1 : 0
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
    // preserveVideo intentionally not wired to a uniform: the CPU ground
    // truth (renderThGrid) never reads it — putImageData always replaces
    // every pixel, so there is no background to preserve or blacken.
    // Accepted here only for call-site parity with the other Acid ports'
    // `{ ...params, preserveVideo, mix }` push shape.
  }
}
