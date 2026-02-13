import * as THREE from 'three'
import { TraceEffect, DEFAULT_TRACE_PARAMS } from './TraceEffect'
import type { TraceParams } from './TraceEffect'

const fragmentShader = `
uniform float threshold;
uniform sampler2D trailTexture;
uniform float trailDecay;
uniform bool trailEnabled;
uniform float effectMix;
uniform float targetHue;
uniform float hueRange;
uniform float satMin;
uniform float valMin;

// RGB to HSV conversion
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;
  vec3 hsv = rgb2hsv(color);

  // Calculate hue distance (circular)
  float hueDist = abs(hsv.x - targetHue);
  hueDist = min(hueDist, 1.0 - hueDist);  // Wrap around

  // Check if color matches criteria
  float hueMatch = 1.0 - smoothstep(hueRange - 0.02, hueRange + 0.02, hueDist);
  float satMatch = smoothstep(satMin - 0.05, satMin + 0.05, hsv.y);
  float valMatch = smoothstep(valMin - 0.05, valMin + 0.05, hsv.z);

  // Combine matches - threshold acts as overall strictness
  float mask = hueMatch * satMatch * valMatch;
  mask = smoothstep(threshold - 0.1, threshold + 0.1, mask);

  // Blend with trail if enabled
  if (trailEnabled) {
    float trail = texture2D(trailTexture, uv).r * trailDecay;
    mask = max(mask, trail);
  }

  // Output mask
  vec4 effectColor = vec4(mask, mask, mask, 1.0);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface ColorTraceParams extends TraceParams {
  targetHue: number   // 0-1: target hue to track (0=red, 0.33=green, 0.66=blue)
  hueRange: number    // 0-0.5: how much hue variation to accept
  satMin: number      // 0-1: minimum saturation required
  valMin: number      // 0-1: minimum value/brightness required
}

export const DEFAULT_COLOR_TRACE_PARAMS: ColorTraceParams = {
  ...DEFAULT_TRACE_PARAMS,
  threshold: 0.5,     // Overall matching strictness
  targetHue: 0.0,     // Default to red
  hueRange: 0.1,      // ±10% hue range
  satMin: 0.3,        // Require some saturation
  valMin: 0.2,        // Require some brightness
}

/**
 * Color Trace Effect
 *
 * Creates a mask based on HSV color matching with adjustable hue targeting.
 * Pixels matching the target hue (within range) become white, others black.
 *
 * Useful for:
 * - Tracking specific colored objects
 * - Creating color-keyed effects
 * - Isolating warm/cool color regions
 */
export class ColorTraceEffect extends TraceEffect {
  constructor(params: Partial<ColorTraceParams> = {}) {
    const p = { ...DEFAULT_COLOR_TRACE_PARAMS, ...params }
    super('ColorTraceEffect', fragmentShader, p)

    // Add color-specific uniforms
    this.uniforms.set('targetHue', new THREE.Uniform(p.targetHue))
    this.uniforms.set('hueRange', new THREE.Uniform(p.hueRange))
    this.uniforms.set('satMin', new THREE.Uniform(p.satMin))
    this.uniforms.set('valMin', new THREE.Uniform(p.valMin))
  }

  updateParams(params: Partial<ColorTraceParams>) {
    super.updateParams(params)
    if (params.targetHue !== undefined) {
      this.uniforms.get('targetHue')!.value = params.targetHue
    }
    if (params.hueRange !== undefined) {
      this.uniforms.get('hueRange')!.value = params.hueRange
    }
    if (params.satMin !== undefined) {
      this.uniforms.get('satMin')!.value = params.satMin
    }
    if (params.valMin !== undefined) {
      this.uniforms.get('valMin')!.value = params.valMin
    }
  }

  /**
   * Set target color from hex string (e.g., '#ff0000')
   */
  setTargetColorFromHex(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return

    const r = parseInt(result[1], 16) / 255
    const g = parseInt(result[2], 16) / 255
    const b = parseInt(result[3], 16) / 255

    // Convert RGB to HSV
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min

    let h = 0
    if (d !== 0) {
      if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      } else if (max === g) {
        h = ((b - r) / d + 2) / 6
      } else {
        h = ((r - g) / d + 4) / 6
      }
    }

    this.uniforms.get('targetHue')!.value = h
  }
}
