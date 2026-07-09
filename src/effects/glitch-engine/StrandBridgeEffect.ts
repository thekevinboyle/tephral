import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/bridgeLinkEffect.ts (CPU
// ground truth, effect id 'strand_bridge'). No persistent state on the CPU
// side — every frame is a pure function of (sourceCanvas, params, time).
//
// CPU pipeline: build a coarse edge map on a `gridSize`-spaced axis-aligned
// grid, where each cell's value is the average of a 5x5 neighborhood of
// RED-CHANNEL-ONLY (not luma — a genuine CPU quirk, `src[iLeft]` reads the
// red byte directly with no offset, reproduced verbatim here since it's
// cheap to match and changes the look) horizontal/vertical central
// differences, normalized by 255. Then walk a pointy-top offset hex
// lattice (`hexWidth = gridSize`, `hexHeight = gridSize*0.866`, odd rows
// shifted by `hexWidth/2`) and, for every hex, look up its edge value by
// flooring its OWN (x,y) position by gridSize into that same axis-aligned
// edge grid, and stroke the hex outline at
// `alpha = opacity*0.2 + opacity*glow*0.8*pulse`,
// `lineWidth = 0.5 + glow*1.5`, where
// `glow = clamp(edgeIntensity*edgeSensitivity*5, 0, 1)` and
// `pulse = 0.5 + 0.5*sin(time*2 + x*0.01 + y*0.01)`. Critically, EVERY hex
// is stroked at at least the `opacity*0.2` baseline regardless of edge
// strength — the grid itself is always faintly visible, edges only add
// glow on top.
//
// Per pixel, this shader: (1) finds the nearest and second-nearest hex
// lattice centers via a 3x3 row/col search (a properly-spaced hex
// lattice's nearest-center Voronoi partition IS the hex tiling, same
// technique as AcidHexEffect); (2) tests the pixel's distance to each of
// those two hexes' 6-edge outline (point-to-segment, matching the CPU's
// vertex angle formula `PI/3*i - PI/6` exactly); (3) only for a candidate
// whose stroke distance is within a small clip window does it evaluate
// that hex's OWN edge-intensity sample (an on-the-fly 3x3-neighborhood
// red-channel Sobel-like estimate centered at the hex's own screen
// position, standing in for the CPU's separate uniform-grid edge map —
// "Sobel edge magnitude per hex cell" per the task brief, not a literal
// port of the CPU's offset grid-index lookup, since that's a few px off
// from a hex's own center anyway and the parity bar is "same look, not
// pixel-identical"). This bounds the expensive per-pixel work (the Sobel
// taps) to only the sparse boundary pixels near a hex's own stroke rather
// than every pixel in every candidate cell.
//
// COLORSPACE WARNING compliance: every sample feeding a red-channel
// difference or the composited stroke color goes through linearToSRGB
// before use; the final result goes through sRGBToLinear immediately
// before outputColor.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float gridSize;
uniform float edgeSensitivity;
uniform float opacity;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

vec2 bridgeHexCenter(float row, float col, float hexW, float hexV) {
  float rowOffset = mod(abs(row), 2.0) * (hexW * 0.5);
  return vec2(col * hexW + rowOffset, row * hexV);
}

void bridgeHexNearest(vec2 p, float hexW, float hexV, out vec2 nearest, out vec2 second) {
  float rowGuess = floor(p.y / hexV + 0.5);
  float nearestDist = 1.0e9;
  float secondDist = 1.0e9;
  nearest = vec2(0.0);
  second = vec2(0.0);
  for (float dr = -1.0; dr <= 1.0; dr += 1.0) {
    float row = rowGuess + dr;
    float rowOffset = mod(abs(row), 2.0) * (hexW * 0.5);
    float colGuess = floor((p.x - rowOffset) / hexW + 0.5);
    for (float dc = -1.0; dc <= 1.0; dc += 1.0) {
      float col = colGuess + dc;
      vec2 c = bridgeHexCenter(row, col, hexW, hexV);
      float d = distance(p, c);
      if (d < nearestDist) {
        secondDist = nearestDist;
        second = nearest;
        nearestDist = d;
        nearest = c;
      } else if (d < secondDist) {
        secondDist = d;
        second = c;
      }
    }
  }
}

// Point-to-hexagon-outline distance, vertices at the CPU's exact angles
// (PI/3*i - PI/6): pointy-top orientation.
float bridgeHexEdgeDist(vec2 p, vec2 center, float size) {
  float minD = 1.0e9;
  for (int i = 0; i < 6; i++) {
    float aA = (3.14159265 / 3.0) * float(i) - 3.14159265 / 6.0;
    float aB = (3.14159265 / 3.0) * float(i + 1) - 3.14159265 / 6.0;
    vec2 vA = center + size * vec2(cos(aA), sin(aA));
    vec2 vB = center + size * vec2(cos(aB), sin(aB));
    vec2 pa = p - vA;
    vec2 ba = vB - vA;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    minD = min(minD, length(pa - ba * h));
  }
  return minD;
}

float bridgeSampleR(vec2 px) {
  vec2 uv = px / resolution;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return linearToSRGB(clamp(texture2D(inputBuffer, uv).rgb, 0.0, 1.0)).r;
}

// On-the-fly red-channel Sobel-like edge magnitude centered at a hex's own
// screen position (see header comment) — a coarse 3x3 average of central
// differences, standing in for the CPU's denser 5x5 uniform-grid sample.
float bridgeEdgeAt(vec2 centerPx) {
  float sum = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 p = centerPx + vec2(float(dx), float(dy)) * 4.0;
      float rL = bridgeSampleR(p + vec2(-2.0, 0.0));
      float rR = bridgeSampleR(p + vec2(2.0, 0.0));
      float rU = bridgeSampleR(p + vec2(0.0, -2.0));
      float rD = bridgeSampleR(p + vec2(0.0, 2.0));
      float gx = abs(rR - rL);
      float gy = abs(rD - rU);
      sum += sqrt(gx * gx + gy * gy);
    }
  }
  return sum / 9.0;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  float hexW = gridSize;
  float hexV = gridSize * 0.866;

  vec2 nearestC;
  vec2 secondC;
  bridgeHexNearest(pixelCoord, hexW, hexV, nearestC, secondC);

  float hexSize = hexW * 0.5 * 0.9;
  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));
  vec3 cyan = vec3(0.0, 212.0, 255.0) / 255.0;

  // Clip window a little past the max possible lineWidth (0.5 + 1*1.5 = 2)
  // plus AA feather — keeps the expensive Sobel sampling below to only the
  // sparse pixels actually near a stroke.
  float dNear = bridgeHexEdgeDist(pixelCoord, nearestC, hexSize);
  if (dNear < 3.0) {
    float edge = bridgeEdgeAt(nearestC);
    float glow = clamp(edge * edgeSensitivity * 5.0, 0.0, 1.0);
    float lineWidth = 0.5 + glow * 1.5;
    float coverage = 1.0 - smoothstep(lineWidth * 0.5, lineWidth * 0.5 + 0.75, dNear);
    if (coverage > 0.0) {
      float pulse = 0.5 + 0.5 * sin(time * 2.0 + nearestC.x * 0.01 + nearestC.y * 0.01);
      float a = (opacity * 0.2 + opacity * glow * 0.8 * pulse) * coverage;
      colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, cyan), a);
    }
  }

  float dSecond = bridgeHexEdgeDist(pixelCoord, secondC, hexSize);
  if (dSecond < 3.0) {
    float edge = bridgeEdgeAt(secondC);
    float glow = clamp(edge * edgeSensitivity * 5.0, 0.0, 1.0);
    float lineWidth = 0.5 + glow * 1.5;
    float coverage = 1.0 - smoothstep(lineWidth * 0.5, lineWidth * 0.5 + 0.75, dSecond);
    if (coverage > 0.0) {
      float pulse = 0.5 + 0.5 * sin(time * 2.0 + secondC.x * 0.01 + secondC.y * 0.01);
      float a = (opacity * 0.2 + opacity * glow * 0.8 * pulse) * coverage;
      colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, cyan), a);
    }
  }

  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandBridgeParams {
  gridSize: number
  edgeSensitivity: number
  opacity: number
  mix: number
}

export const DEFAULT_STRAND_BRIDGE_PARAMS: StrandBridgeParams = {
  gridSize: 32,
  edgeSensitivity: 0.5,
  opacity: 0.6,
  mix: 1,
}

export class StrandBridgeEffect extends Effect {
  constructor(params: Partial<StrandBridgeParams> = {}) {
    const p = { ...DEFAULT_STRAND_BRIDGE_PARAMS, ...params }

    super('StrandBridgeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['gridSize', new THREE.Uniform(p.gridSize)],
        ['edgeSensitivity', new THREE.Uniform(p.edgeSensitivity)],
        ['opacity', new THREE.Uniform(p.opacity)],
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

  updateParams(params: Partial<StrandBridgeParams>) {
    if (params.gridSize !== undefined) {
      this.uniforms.get('gridSize')!.value = params.gridSize
    }
    if (params.edgeSensitivity !== undefined) {
      this.uniforms.get('edgeSensitivity')!.value = params.edgeSensitivity
    }
    if (params.opacity !== undefined) {
      this.uniforms.get('opacity')!.value = params.opacity
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
