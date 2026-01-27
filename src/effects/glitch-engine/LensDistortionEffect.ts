import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float curvature;
uniform float fresnelRings;
uniform float fresnelIntensity;
uniform float fresnelRainbow;
uniform float vignette;
uniform float vignetteShape;
uniform float phosphorGlow;

vec2 barrelDistort(vec2 uv, float k) {
  vec2 center = uv - 0.5;
  float r2 = dot(center, center);
  float f = 1.0 + k * r2;
  return center * f + 0.5;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Apply barrel/pincushion distortion
  vec2 distortedUV = barrelDistort(uv, curvature * 0.5);

  // Check if we're outside the frame after distortion
  if (distortedUV.x < 0.0 || distortedUV.x > 1.0 || distortedUV.y < 0.0 || distortedUV.y > 1.0) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec4 color = texture2D(inputBuffer, distortedUV);

  // Fresnel rings
  if (fresnelRings > 0.0 && fresnelIntensity > 0.0) {
    vec2 center = uv - 0.5;
    float dist = length(center) * 2.0;
    float ring = sin(dist * fresnelRings * 3.14159 * 2.0) * 0.5 + 0.5;

    // Rainbow chromatic effect on rings
    if (fresnelRainbow > 0.0) {
      float hue = dist * 3.0;
      vec3 rainbow = vec3(
        sin(hue) * 0.5 + 0.5,
        sin(hue + 2.094) * 0.5 + 0.5,
        sin(hue + 4.189) * 0.5 + 0.5
      );
      color.rgb = mix(color.rgb, color.rgb + rainbow * ring * fresnelIntensity, fresnelRainbow);
    } else {
      color.rgb = mix(color.rgb, color.rgb * (1.0 + ring * 0.3), fresnelIntensity);
    }
  }

  // Vignette
  if (vignette > 0.0) {
    vec2 center = uv - 0.5;
    float dist;
    if (vignetteShape > 0.5) {
      // Rectangular vignette
      vec2 absCenter = abs(center);
      dist = max(absCenter.x, absCenter.y) * 2.0;
    } else {
      // Circular vignette
      dist = length(center) * 2.0;
    }
    float vig = 1.0 - smoothstep(0.5, 1.2, dist) * vignette;
    color.rgb *= vig;
  }

  // Phosphor glow (simple bloom approximation)
  if (phosphorGlow > 0.0) {
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb += color.rgb * smoothstep(0.5, 1.0, luma) * phosphorGlow;
  }

  outputColor = color;
}
`

export interface LensDistortionParams {
  curvature: number        // -1 to 1
  fresnelRings: number     // 0-20
  fresnelIntensity: number // 0-1
  fresnelRainbow: number   // 0-1
  vignette: number         // 0-1
  vignetteShape: number    // 0-1 (0=circular, 1=rectangular)
  phosphorGlow: number     // 0-1
}

export const DEFAULT_LENS_DISTORTION_PARAMS: LensDistortionParams = {
  curvature: 0.2,
  fresnelRings: 0,
  fresnelIntensity: 0,
  fresnelRainbow: 0,
  vignette: 0.3,
  vignetteShape: 0,
  phosphorGlow: 0,
}

export class LensDistortionEffect extends Effect {
  constructor(params: Partial<LensDistortionParams> = {}) {
    const p = { ...DEFAULT_LENS_DISTORTION_PARAMS, ...params }

    super('LensDistortionEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['curvature', new THREE.Uniform(p.curvature)],
        ['fresnelRings', new THREE.Uniform(p.fresnelRings)],
        ['fresnelIntensity', new THREE.Uniform(p.fresnelIntensity)],
        ['fresnelRainbow', new THREE.Uniform(p.fresnelRainbow)],
        ['vignette', new THREE.Uniform(p.vignette)],
        ['vignetteShape', new THREE.Uniform(p.vignetteShape)],
        ['phosphorGlow', new THREE.Uniform(p.phosphorGlow)],
      ]),
    })
  }

  updateParams(params: Partial<LensDistortionParams>) {
    if (params.curvature !== undefined) this.uniforms.get('curvature')!.value = params.curvature
    if (params.fresnelRings !== undefined) this.uniforms.get('fresnelRings')!.value = params.fresnelRings
    if (params.fresnelIntensity !== undefined) this.uniforms.get('fresnelIntensity')!.value = params.fresnelIntensity
    if (params.fresnelRainbow !== undefined) this.uniforms.get('fresnelRainbow')!.value = params.fresnelRainbow
    if (params.vignette !== undefined) this.uniforms.get('vignette')!.value = params.vignette
    if (params.vignetteShape !== undefined) this.uniforms.get('vignetteShape')!.value = params.vignetteShape
    if (params.phosphorGlow !== undefined) this.uniforms.get('phosphorGlow')!.value = params.phosphorGlow
  }
}
