import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float threshold;
uniform float softness;
uniform float thickness;
uniform vec2 resolution;
uniform vec3 edgeColor;
uniform bool colorMapEnabled;
uniform int backgroundMode;
uniform float glowAmount;
uniform float glowSize;
uniform float mixAmount;
uniform float effectMix;

// Multi-sample Sobel for adjustable thickness
float sobelAt(vec2 uv, float scale) {
  vec2 texel = scale / resolution;
  float tl = luminance(texture2D(inputBuffer, uv + vec2(-texel.x, texel.y)).rgb);
  float t  = luminance(texture2D(inputBuffer, uv + vec2(0.0, texel.y)).rgb);
  float tr = luminance(texture2D(inputBuffer, uv + vec2(texel.x, texel.y)).rgb);
  float l  = luminance(texture2D(inputBuffer, uv + vec2(-texel.x, 0.0)).rgb);
  float r  = luminance(texture2D(inputBuffer, uv + vec2(texel.x, 0.0)).rgb);
  float bl = luminance(texture2D(inputBuffer, uv + vec2(-texel.x, -texel.y)).rgb);
  float b  = luminance(texture2D(inputBuffer, uv + vec2(0.0, -texel.y)).rgb);
  float br = luminance(texture2D(inputBuffer, uv + vec2(texel.x, -texel.y)).rgb);
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  return sqrt(gx*gx + gy*gy);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // ─── Multi-scale edge detection for adjustable thickness ─────
  float edge = 0.0;
  if (thickness <= 1.0) {
    edge = sobelAt(uv, 1.0);
  } else {
    // Sample at multiple scales and take max for thicker edges
    float steps = min(thickness, 4.0);
    for (float s = 1.0; s <= 4.0; s += 1.0) {
      if (s > steps) break;
      float sample_edge = sobelAt(uv, s * 0.5 + 0.5);
      edge = max(edge, sample_edge);
    }
  }

  // ─── Soft vs hard threshold ──────────────────────────────────
  float edgeMask;
  if (softness > 0.0) {
    edgeMask = smoothstep(threshold - softness, threshold + softness, edge);
  } else {
    edgeMask = step(threshold, edge);
  }

  // ─── Edge glow (gaussian-approximated bloom on edge signal) ──
  float glow = 0.0;
  if (glowAmount > 0.0 && glowSize > 0.0) {
    vec2 texel = 1.0 / resolution;
    float totalWeight = 0.0;
    // 9-tap cross blur on edge signal
    for (float i = -4.0; i <= 4.0; i += 1.0) {
      for (float j = -4.0; j <= 4.0; j += 1.0) {
        float dist = length(vec2(i, j));
        if (dist > 4.0) continue;
        float weight = exp(-dist * dist / (glowSize * glowSize * 0.5));
        vec2 sampleUV = uv + vec2(i, j) * texel * glowSize;
        float sampleEdge = sobelAt(sampleUV, max(1.0, thickness * 0.5));
        float sampleMask;
        if (softness > 0.0) {
          sampleMask = smoothstep(threshold - softness, threshold + softness, sampleEdge);
        } else {
          sampleMask = step(threshold, sampleEdge);
        }
        glow += sampleMask * weight;
        totalWeight += weight;
      }
    }
    glow = (glow / totalWeight) * glowAmount;
  }

  // Combine edge + glow
  float finalEdge = min(1.0, edgeMask + glow);

  // ─── Edge coloring ───────────────────────────────────────────
  vec3 edgeCol;
  if (colorMapEnabled) {
    // Heat map: dark blue → cyan → green → yellow → white based on edge intensity
    float t = edge * 3.0; // amplify for gradient spread
    t = clamp(t, 0.0, 1.0);
    vec3 cold = vec3(0.0, 0.2, 0.8);   // blue
    vec3 mid  = vec3(0.0, 1.0, 0.5);   // cyan-green
    vec3 warm = vec3(1.0, 0.9, 0.2);   // yellow
    vec3 hot  = vec3(1.0, 1.0, 1.0);   // white
    if (t < 0.33) {
      edgeCol = mix(cold, mid, t * 3.0);
    } else if (t < 0.66) {
      edgeCol = mix(mid, warm, (t - 0.33) * 3.0);
    } else {
      edgeCol = mix(warm, hot, (t - 0.66) * 3.0);
    }
  } else {
    edgeCol = edgeColor;
  }

  // ─── Background modes ────────────────────────────────────────
  vec3 bg;
  if (backgroundMode == 0) {
    // Original image
    bg = inputColor.rgb;
  } else if (backgroundMode == 1) {
    // Black
    bg = vec3(0.0);
  } else if (backgroundMode == 2) {
    // Desaturated
    float lum = luminance(inputColor.rgb);
    bg = vec3(lum) * 0.3;
  } else {
    // Darkened
    bg = inputColor.rgb * 0.15;
  }

  // ─── Composite ───────────────────────────────────────────────
  // Glow uses the edge color at reduced intensity for the bloom halo
  vec3 glowColor = edgeCol * glow * 0.6;
  vec3 result = mix(bg, bg + edgeCol * edgeMask + glowColor, mixAmount);

  vec4 effectColor = vec4(result, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface EdgeDetectionParams {
  threshold: number       // 0.01-0.5
  softness: number        // 0-0.3
  thickness: number       // 0.5-4.0
  edgeColor: string       // hex color
  colorMapEnabled: boolean
  backgroundMode: number  // 0=original, 1=black, 2=desaturated, 3=darkened
  glowAmount: number      // 0-1
  glowSize: number        // 1-8
  mixAmount: number
  mix: number
}

export const DEFAULT_EDGE_DETECTION_PARAMS: EdgeDetectionParams = {
  threshold: 0.08,
  softness: 0.05,
  thickness: 1.5,
  edgeColor: '#00ff88',
  colorMapEnabled: false,
  backgroundMode: 0,
  glowAmount: 0.3,
  glowSize: 3,
  mixAmount: 1.0,
  mix: 1,
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [0, 1, 0]
}

export class EdgeDetectionEffect extends Effect {
  constructor(params: Partial<EdgeDetectionParams> = {}) {
    const p = { ...DEFAULT_EDGE_DETECTION_PARAMS, ...params }
    const [r, g, b] = hexToRgb(p.edgeColor)

    super('EdgeDetectionEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['threshold', new THREE.Uniform(p.threshold)],
        ['softness', new THREE.Uniform(p.softness)],
        ['thickness', new THREE.Uniform(p.thickness)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['edgeColor', new THREE.Uniform(new THREE.Vector3(r, g, b))],
        ['colorMapEnabled', new THREE.Uniform(p.colorMapEnabled)],
        ['backgroundMode', new THREE.Uniform(p.backgroundMode)],
        ['glowAmount', new THREE.Uniform(p.glowAmount)],
        ['glowSize', new THREE.Uniform(p.glowSize)],
        ['mixAmount', new THREE.Uniform(p.mixAmount)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    const res = this.uniforms.get('resolution')!.value as THREE.Vector2
    res.set(width, height)
  }

  updateParams(params: Partial<EdgeDetectionParams>) {
    if (params.threshold !== undefined) this.uniforms.get('threshold')!.value = params.threshold
    if (params.softness !== undefined) this.uniforms.get('softness')!.value = params.softness
    if (params.thickness !== undefined) this.uniforms.get('thickness')!.value = params.thickness
    if (params.edgeColor !== undefined) {
      const [r, g, b] = hexToRgb(params.edgeColor)
      const color = this.uniforms.get('edgeColor')!.value as THREE.Vector3
      color.set(r, g, b)
    }
    if (params.colorMapEnabled !== undefined) this.uniforms.get('colorMapEnabled')!.value = params.colorMapEnabled
    if (params.backgroundMode !== undefined) this.uniforms.get('backgroundMode')!.value = params.backgroundMode
    if (params.glowAmount !== undefined) this.uniforms.get('glowAmount')!.value = params.glowAmount
    if (params.glowSize !== undefined) this.uniforms.get('glowSize')!.value = params.glowSize
    if (params.mixAmount !== undefined) this.uniforms.get('mixAmount')!.value = params.mixAmount
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
