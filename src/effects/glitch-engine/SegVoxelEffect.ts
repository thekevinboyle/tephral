import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { DEFAULT_SEG_VOXEL_PARAMS, type SegVoxelParams } from '../../stores/segStore'
import { NOISE_GLSL } from './glsl-utils'
import { SEG_MASK_GLSL } from './segShared'

const fragmentShader = NOISE_GLSL + SEG_MASK_GLSL + /* glsl */ `
uniform vec2 resolution;
uniform float cellPx;
uniform float scatterAmt;
uniform float shadingAmt;
uniform int classSel;
uniform float debugMask;
uniform float uTime;
uniform float effectMix;

float selAt(vec2 uvp) { return segSelected(segClass(uvp), classSel); }

vec3 cellColor(vec2 cellCenterUv, vec2 cellUv) {
  // 4-tap average inside the cell → flat block colour
  vec2 q = cellUv * 0.25;
  return 0.25 * (texture2D(inputBuffer, cellCenterUv + vec2(-q.x, -q.y)).rgb +
                 texture2D(inputBuffer, cellCenterUv + vec2( q.x, -q.y)).rgb +
                 texture2D(inputBuffer, cellCenterUv + vec2(-q.x,  q.y)).rgb +
                 texture2D(inputBuffer, cellCenterUv + vec2( q.x,  q.y)).rgb);
}

// Isometric-ish cube shading in the cell's local frame q ∈ [-0.5, 0.5]^2
vec3 shadeCube(vec3 c, vec2 q) {
  float bevel = 0.2;
  float top = step(0.5 - bevel, q.y);                 // lit top face (v up)
  float side = step(0.5 - bevel, q.x) * (1.0 - top);  // dark right face
  float edge = 1.0 - step(max(abs(q.x), abs(q.y)), 0.46);
  vec3 s = c;
  s = mix(s, min(c * 1.3 + 0.04, 1.0), top);
  s = mix(s, c * 0.62, side);
  s = mix(s, c * 0.4, edge);
  return mix(c, s, shadingAmt);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (hasMask < 0.5) { outputColor = inputColor; return; }

  if (debugMask > 0.5) {
    float m = selAt(uv);
    outputColor = vec4(mix(inputColor.rgb, vec3(1.0, 0.2, 0.6), 0.55 * m), inputColor.a);
    return;
  }

  vec2 px = uv * resolution;
  vec2 cell = floor(px / cellPx);
  vec2 cellUv = vec2(cellPx) / resolution;

  // Gather: which cell's (possibly displaced, rotated) square covers this pixel?
  // Edge cells fly outward up to 2 cells, so search a 5x5 neighbourhood.
  vec3 best = inputColor.rgb;
  float bestPri = -1.0;
  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      vec2 k = cell + vec2(float(dx), float(dy));
      vec2 kc = (k + 0.5) * cellPx;                 // cell centre, px
      vec2 kuv = kc / resolution;
      if (selAt(kuv) < 0.5) continue;

      // Edge cell = any 4-neighbour outside the mask; outward = toward the outside
      float l = selAt((kc + vec2(-cellPx, 0.0)) / resolution);
      float r = selAt((kc + vec2( cellPx, 0.0)) / resolution);
      float d = selAt((kc + vec2(0.0, -cellPx)) / resolution);
      float u = selAt((kc + vec2(0.0,  cellPx)) / resolution);
      vec2 grad = vec2(r - l, u - d);               // points INTO the mask
      float isEdge = step(0.5, 4.0 - (l + r + d + u));

      float h = hash(k);
      vec2 jit = hash2(k + 7.13) - 0.5;
      vec2 outward = length(grad) > 0.0 ? -normalize(grad) : normalize(jit + 1e-4);
      float fly = isEdge * scatterAmt * step(1.0 - scatterAmt * 0.8, h);   // only some edge cells fly
      float drift = 0.5 + 0.5 * sin(uTime * (0.6 + h) + h * 6.283);
      vec2 offset = fly * (outward * (0.6 + 1.4 * h) + jit * 0.6) * cellPx * (0.6 + 0.8 * drift);
      float ang = fly * (h - 0.5) * 1.6;
      float scl = 1.0 - fly * 0.25 * h;

      vec2 rel = px - (kc + offset);
      float cs = cos(-ang), sn = sin(-ang);
      vec2 q = vec2(cs * rel.x - sn * rel.y, sn * rel.x + cs * rel.y) / (cellPx * scl);
      if (max(abs(q.x), abs(q.y)) > 0.5) continue;

      float pri = fly + h * 0.01;                   // flying cells draw on top
      if (pri > bestPri) {
        bestPri = pri;
        best = shadeCube(cellColor(kuv, cellUv), q);
      }
    }
  }

  outputColor = vec4(mix(inputColor.rgb, best, effectMix), inputColor.a);
}
`

export class SegVoxelEffect extends Effect {
  private seg: SegmentationService | null = null
  private baseSize = DEFAULT_SEG_VOXEL_PARAMS.size
  private depth = DEFAULT_SEG_VOXEL_PARAMS.depth
  private elapsed = 0

  constructor(params: Partial<SegVoxelParams> = {}) {
    const p = { ...DEFAULT_SEG_VOXEL_PARAMS, ...params }
    super('SegVoxelEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['segMask', new THREE.Uniform(null)],
        ['hasMask', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['cellPx', new THREE.Uniform(p.size)],
        ['scatterAmt', new THREE.Uniform(p.scatter)],
        ['shadingAmt', new THREE.Uniform(p.shading)],
        ['classSel', new THREE.Uniform(p.classes)],
        ['debugMask', new THREE.Uniform(p.debugMask ? 1 : 0)],
        ['uTime', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
    this.baseSize = p.size
    this.depth = p.depth
  }

  setSegmentation(s: SegmentationService) {
    this.seg = s
    this.uniforms.get('segMask')!.value = s.maskTexture
  }

  setResolution(w: number, h: number) {
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(Math.max(1, w), Math.max(1, h))
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.elapsed += deltaTime
    this.uniforms.get('uTime')!.value = this.elapsed
    const cov = this.seg?.personCoverage ?? 0
    this.uniforms.get('hasMask')!.value = this.seg?.hasMask ? 1 : 0
    // Close-ups (high coverage) get bigger blocks, like the reference
    this.uniforms.get('cellPx')!.value = Math.max(2, this.baseSize * (1 + this.depth * cov))
  }

  updateParams(params: Partial<SegVoxelParams>) {
    if (params.size !== undefined) this.baseSize = params.size
    if (params.depth !== undefined) this.depth = params.depth
    if (params.scatter !== undefined) this.uniforms.get('scatterAmt')!.value = params.scatter
    if (params.shading !== undefined) this.uniforms.get('shadingAmt')!.value = params.shading
    if (params.classes !== undefined) this.uniforms.get('classSel')!.value = params.classes
    if (params.debugMask !== undefined) this.uniforms.get('debugMask')!.value = params.debugMask ? 1 : 0
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
