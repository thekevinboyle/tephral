# Expanded Effects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 8 new WebGL effects (Chromatic Aberration, VHS Tracking, Lens Distortion, Dither, Posterize, Feedback Loop, Static Displacement, Color Grade) and update the UI to a 4x4 effect grid.

**Architecture:** Each effect is a postprocessing Effect class with fragment shader and typed params. Effects are registered in glitchEngineStore, config/effects.ts, EffectPipeline.ts, and PerformanceGrid.tsx. The grid displays 16 effects in 4 rows of 4.

**Tech Stack:** Three.js, postprocessing library, GLSL fragment shaders, Zustand, React

---

## Task 1: Chromatic Aberration Effect

**Files:**
- Create: `src/effects/glitch-engine/ChromaticAberrationEffect.ts`
- Modify: `src/effects/glitch-engine/index.ts`

**Step 1: Create the effect file**

```typescript
// src/effects/glitch-engine/ChromaticAberrationEffect.ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float intensity;
uniform float radialAmount;
uniform float direction;
uniform float redOffset;
uniform float blueOffset;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 center = vec2(0.5);
  vec2 toCenter = uv - center;
  float dist = length(toCenter);

  // Radial falloff - more aberration at edges
  float radialFactor = mix(1.0, dist * 2.0, radialAmount);
  float aberration = intensity * radialFactor * 0.1;

  // Direction-based offset
  float angle = direction * 3.14159 / 180.0;
  vec2 dir = vec2(cos(angle), sin(angle));

  // Sample each channel with offset
  vec2 redUV = uv + dir * (redOffset + aberration);
  vec2 greenUV = uv;
  vec2 blueUV = uv + dir * (blueOffset - aberration);

  float r = texture2D(inputBuffer, redUV).r;
  float g = texture2D(inputBuffer, greenUV).g;
  float b = texture2D(inputBuffer, blueUV).b;

  outputColor = vec4(r, g, b, inputColor.a);
}
`

export interface ChromaticAberrationParams {
  intensity: number      // 0-1
  radialAmount: number   // 0-1
  direction: number      // 0-360
  redOffset: number      // -0.05 to 0.05
  blueOffset: number     // -0.05 to 0.05
}

export const DEFAULT_CHROMATIC_ABERRATION_PARAMS: ChromaticAberrationParams = {
  intensity: 0.5,
  radialAmount: 0.8,
  direction: 0,
  redOffset: 0.01,
  blueOffset: -0.01,
}

export class ChromaticAberrationEffect extends Effect {
  constructor(params: Partial<ChromaticAberrationParams> = {}) {
    const p = { ...DEFAULT_CHROMATIC_ABERRATION_PARAMS, ...params }

    super('ChromaticAberrationEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['intensity', new THREE.Uniform(p.intensity)],
        ['radialAmount', new THREE.Uniform(p.radialAmount)],
        ['direction', new THREE.Uniform(p.direction)],
        ['redOffset', new THREE.Uniform(p.redOffset)],
        ['blueOffset', new THREE.Uniform(p.blueOffset)],
      ]),
    })
  }

  updateParams(params: Partial<ChromaticAberrationParams>) {
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.radialAmount !== undefined) this.uniforms.get('radialAmount')!.value = params.radialAmount
    if (params.direction !== undefined) this.uniforms.get('direction')!.value = params.direction
    if (params.redOffset !== undefined) this.uniforms.get('redOffset')!.value = params.redOffset
    if (params.blueOffset !== undefined) this.uniforms.get('blueOffset')!.value = params.blueOffset
  }
}
```

**Step 2: Update index.ts exports**

Add to `src/effects/glitch-engine/index.ts`:

```typescript
export { ChromaticAberrationEffect, DEFAULT_CHROMATIC_ABERRATION_PARAMS } from './ChromaticAberrationEffect'
export type { ChromaticAberrationParams } from './ChromaticAberrationEffect'
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/effects/glitch-engine/ChromaticAberrationEffect.ts src/effects/glitch-engine/index.ts
git commit -m "feat: add ChromaticAberrationEffect"
```

---

## Task 2: VHS Tracking Effect

**Files:**
- Create: `src/effects/glitch-engine/VHSTrackingEffect.ts`
- Modify: `src/effects/glitch-engine/index.ts`

**Step 1: Create the effect file**

```typescript
// src/effects/glitch-engine/VHSTrackingEffect.ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float tearIntensity;
uniform float tearSpeed;
uniform float headSwitchNoise;
uniform float colorBleed;
uniform float jitter;
uniform float time;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 coord = uv;

  // Frame jitter
  float frameJitter = (random(vec2(floor(time * 30.0), 0.0)) - 0.5) * jitter * 0.01;
  coord.y += frameJitter;

  // Horizontal tear lines
  float tearLine = noise(vec2(uv.y * 50.0, time * tearSpeed * 10.0));
  float tearMask = step(0.98 - tearIntensity * 0.1, tearLine);
  coord.x += tearMask * (random(vec2(uv.y, time)) - 0.5) * tearIntensity * 0.1;

  // Color bleed (horizontal smear)
  float bleedOffset = colorBleed * 0.01;
  float r = texture2D(inputBuffer, coord + vec2(bleedOffset, 0.0)).r;
  float g = texture2D(inputBuffer, coord).g;
  float b = texture2D(inputBuffer, coord - vec2(bleedOffset, 0.0)).b;

  vec3 color = vec3(r, g, b);

  // Head switch noise at bottom
  float headSwitch = smoothstep(0.0, 0.08, uv.y);
  float headNoise = random(vec2(uv.x * 100.0, time * 60.0));
  color = mix(vec3(headNoise), color, mix(headSwitch, 1.0, 1.0 - headSwitchNoise));

  outputColor = vec4(color, inputColor.a);
}
`

export interface VHSTrackingParams {
  tearIntensity: number    // 0-1
  tearSpeed: number        // 0.1-5
  headSwitchNoise: number  // 0-1
  colorBleed: number       // 0-1
  jitter: number           // 0-1
}

export const DEFAULT_VHS_TRACKING_PARAMS: VHSTrackingParams = {
  tearIntensity: 0.3,
  tearSpeed: 1.0,
  headSwitchNoise: 0.5,
  colorBleed: 0.2,
  jitter: 0.1,
}

export class VHSTrackingEffect extends Effect {
  constructor(params: Partial<VHSTrackingParams> = {}) {
    const p = { ...DEFAULT_VHS_TRACKING_PARAMS, ...params }

    super('VHSTrackingEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['tearIntensity', new THREE.Uniform(p.tearIntensity)],
        ['tearSpeed', new THREE.Uniform(p.tearSpeed)],
        ['headSwitchNoise', new THREE.Uniform(p.headSwitchNoise)],
        ['colorBleed', new THREE.Uniform(p.colorBleed)],
        ['jitter', new THREE.Uniform(p.jitter)],
        ['time', new THREE.Uniform(0)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  updateParams(params: Partial<VHSTrackingParams>) {
    if (params.tearIntensity !== undefined) this.uniforms.get('tearIntensity')!.value = params.tearIntensity
    if (params.tearSpeed !== undefined) this.uniforms.get('tearSpeed')!.value = params.tearSpeed
    if (params.headSwitchNoise !== undefined) this.uniforms.get('headSwitchNoise')!.value = params.headSwitchNoise
    if (params.colorBleed !== undefined) this.uniforms.get('colorBleed')!.value = params.colorBleed
    if (params.jitter !== undefined) this.uniforms.get('jitter')!.value = params.jitter
  }
}
```

**Step 2: Update index.ts exports**

Add to `src/effects/glitch-engine/index.ts`:

```typescript
export { VHSTrackingEffect, DEFAULT_VHS_TRACKING_PARAMS } from './VHSTrackingEffect'
export type { VHSTrackingParams } from './VHSTrackingEffect'
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/effects/glitch-engine/VHSTrackingEffect.ts src/effects/glitch-engine/index.ts
git commit -m "feat: add VHSTrackingEffect"
```

---

## Task 3: Lens Distortion Effect

**Files:**
- Create: `src/effects/glitch-engine/LensDistortionEffect.ts`
- Modify: `src/effects/glitch-engine/index.ts`

**Step 1: Create the effect file**

```typescript
// src/effects/glitch-engine/LensDistortionEffect.ts
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
```

**Step 2: Update index.ts exports**

Add to `src/effects/glitch-engine/index.ts`:

```typescript
export { LensDistortionEffect, DEFAULT_LENS_DISTORTION_PARAMS } from './LensDistortionEffect'
export type { LensDistortionParams } from './LensDistortionEffect'
```

**Step 3: Verify build and commit**

```bash
npm run build
git add src/effects/glitch-engine/LensDistortionEffect.ts src/effects/glitch-engine/index.ts
git commit -m "feat: add LensDistortionEffect with fresnel rings"
```

---

## Task 4: Dither Effect

**Files:**
- Create: `src/effects/glitch-engine/DitherEffect.ts`
- Modify: `src/effects/glitch-engine/index.ts`

**Step 1: Create the effect file**

```typescript
// src/effects/glitch-engine/DitherEffect.ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float intensity;
uniform float scale;
uniform float colorDepth;
uniform float angle;
uniform int mode; // 0=ordered, 1=halftone, 2=newsprint

// 4x4 Bayer matrix
const mat4 bayerMatrix = mat4(
  0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0,
  12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
  3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0,
  15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
);

float getBayer(vec2 coord) {
  int x = int(mod(coord.x, 4.0));
  int y = int(mod(coord.y, 4.0));
  return bayerMatrix[y][x];
}

vec2 rotateUV(vec2 uv, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

float halftone(vec2 coord, float angle, float scale) {
  vec2 rotated = rotateUV(coord, angle * 3.14159 / 180.0);
  vec2 nearest = floor(rotated / scale) * scale + scale * 0.5;
  float dist = length(rotated - nearest) / (scale * 0.5);
  return dist;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 resolution = vec2(textureSize(inputBuffer, 0));
  vec2 coord = uv * resolution / scale;

  vec3 color = inputColor.rgb;
  float levels = colorDepth;

  if (mode == 0) {
    // Ordered dithering (Bayer)
    float threshold = getBayer(coord) - 0.5;
    color = floor(color * levels + threshold) / levels;
  } else if (mode == 1) {
    // Halftone
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    float ht = halftone(coord, angle, 4.0);
    float threshold = step(ht, luma);
    color = vec3(threshold);
  } else if (mode == 2) {
    // Newsprint (CMYK-style)
    float c = 1.0 - color.r;
    float m = 1.0 - color.g;
    float y = 1.0 - color.b;
    float k = min(min(c, m), y);

    c = halftone(coord, angle + 15.0, 4.0) < (c - k) ? 1.0 : 0.0;
    m = halftone(coord, angle + 75.0, 4.0) < (m - k) ? 1.0 : 0.0;
    y = halftone(coord, angle, 4.0) < (y - k) ? 1.0 : 0.0;
    k = halftone(coord, angle + 45.0, 4.0) < k ? 1.0 : 0.0;

    color = vec3(1.0) - vec3(c + k, m + k, y + k);
  }

  color = mix(inputColor.rgb, color, intensity);
  outputColor = vec4(color, inputColor.a);
}
`

export type DitherMode = 'ordered' | 'halftone' | 'newsprint'

export interface DitherParams {
  mode: DitherMode
  intensity: number  // 0-1
  scale: number      // 1-8
  colorDepth: number // 2-16
  angle: number      // 0-180
}

export const DEFAULT_DITHER_PARAMS: DitherParams = {
  mode: 'ordered',
  intensity: 1.0,
  scale: 1,
  colorDepth: 4,
  angle: 45,
}

const MODE_MAP: Record<DitherMode, number> = {
  'ordered': 0,
  'halftone': 1,
  'newsprint': 2,
}

export class DitherEffect extends Effect {
  constructor(params: Partial<DitherParams> = {}) {
    const p = { ...DEFAULT_DITHER_PARAMS, ...params }

    super('DitherEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['intensity', new THREE.Uniform(p.intensity)],
        ['scale', new THREE.Uniform(p.scale)],
        ['colorDepth', new THREE.Uniform(p.colorDepth)],
        ['angle', new THREE.Uniform(p.angle)],
        ['mode', new THREE.Uniform(MODE_MAP[p.mode])],
      ]),
    })
  }

  updateParams(params: Partial<DitherParams>) {
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.scale !== undefined) this.uniforms.get('scale')!.value = params.scale
    if (params.colorDepth !== undefined) this.uniforms.get('colorDepth')!.value = params.colorDepth
    if (params.angle !== undefined) this.uniforms.get('angle')!.value = params.angle
    if (params.mode !== undefined) this.uniforms.get('mode')!.value = MODE_MAP[params.mode]
  }
}
```

**Step 2: Update index.ts exports**

Add to `src/effects/glitch-engine/index.ts`:

```typescript
export { DitherEffect, DEFAULT_DITHER_PARAMS } from './DitherEffect'
export type { DitherParams, DitherMode } from './DitherEffect'
```

**Step 3: Verify build and commit**

```bash
npm run build
git add src/effects/glitch-engine/DitherEffect.ts src/effects/glitch-engine/index.ts
git commit -m "feat: add DitherEffect with ordered, halftone, newsprint modes"
```

---

## Task 5: Posterize Effect

**Files:**
- Create: `src/effects/glitch-engine/PosterizeEffect.ts`
- Modify: `src/effects/glitch-engine/index.ts`

**Step 1: Create the effect file**

```typescript
// src/effects/glitch-engine/PosterizeEffect.ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float levels;
uniform int mode; // 0=rgb, 1=hsl
uniform float saturationBoost;
uniform float edgeContrast;

vec3 rgb2hsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) / 2.0;

  if (maxC == minC) {
    return vec3(0.0, 0.0, l);
  }

  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

  float h;
  if (maxC == c.r) {
    h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h /= 6.0;

  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 c) {
  if (c.y == 0.0) {
    return vec3(c.z);
  }

  float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
  float p = 2.0 * c.z - q;

  return vec3(
    hue2rgb(p, q, c.x + 1.0/3.0),
    hue2rgb(p, q, c.x),
    hue2rgb(p, q, c.x - 1.0/3.0)
  );
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  if (mode == 0) {
    // RGB posterize
    color = floor(color * levels) / levels;
  } else {
    // HSL posterize
    vec3 hsl = rgb2hsl(color);
    hsl.z = floor(hsl.z * levels) / levels;
    hsl.y = floor(hsl.y * levels) / levels;
    color = hsl2rgb(hsl);
  }

  // Saturation boost
  vec3 hsl = rgb2hsl(color);
  hsl.y = clamp(hsl.y * saturationBoost, 0.0, 1.0);
  color = hsl2rgb(hsl);

  // Edge contrast (sharpen boundaries)
  if (edgeContrast > 0.0) {
    vec2 texel = 1.0 / vec2(textureSize(inputBuffer, 0));
    vec3 left = texture2D(inputBuffer, uv - vec2(texel.x, 0.0)).rgb;
    vec3 right = texture2D(inputBuffer, uv + vec2(texel.x, 0.0)).rgb;
    vec3 up = texture2D(inputBuffer, uv - vec2(0.0, texel.y)).rgb;
    vec3 down = texture2D(inputBuffer, uv + vec2(0.0, texel.y)).rgb;

    vec3 edge = abs(left - right) + abs(up - down);
    float edgeMag = dot(edge, vec3(0.333));
    color = mix(color, color * (1.0 + edgeMag * 2.0), edgeContrast);
  }

  outputColor = vec4(color, inputColor.a);
}
`

export type PosterizeMode = 'rgb' | 'hsl'

export interface PosterizeParams {
  levels: number           // 2-16
  mode: PosterizeMode
  saturationBoost: number  // 0-2
  edgeContrast: number     // 0-1
}

export const DEFAULT_POSTERIZE_PARAMS: PosterizeParams = {
  levels: 4,
  mode: 'rgb',
  saturationBoost: 1.2,
  edgeContrast: 0,
}

const MODE_MAP: Record<PosterizeMode, number> = {
  'rgb': 0,
  'hsl': 1,
}

export class PosterizeEffect extends Effect {
  constructor(params: Partial<PosterizeParams> = {}) {
    const p = { ...DEFAULT_POSTERIZE_PARAMS, ...params }

    super('PosterizeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['levels', new THREE.Uniform(p.levels)],
        ['mode', new THREE.Uniform(MODE_MAP[p.mode])],
        ['saturationBoost', new THREE.Uniform(p.saturationBoost)],
        ['edgeContrast', new THREE.Uniform(p.edgeContrast)],
      ]),
    })
  }

  updateParams(params: Partial<PosterizeParams>) {
    if (params.levels !== undefined) this.uniforms.get('levels')!.value = params.levels
    if (params.mode !== undefined) this.uniforms.get('mode')!.value = MODE_MAP[params.mode]
    if (params.saturationBoost !== undefined) this.uniforms.get('saturationBoost')!.value = params.saturationBoost
    if (params.edgeContrast !== undefined) this.uniforms.get('edgeContrast')!.value = params.edgeContrast
  }
}
```

**Step 2: Update index.ts exports**

Add to `src/effects/glitch-engine/index.ts`:

```typescript
export { PosterizeEffect, DEFAULT_POSTERIZE_PARAMS } from './PosterizeEffect'
export type { PosterizeParams, PosterizeMode } from './PosterizeEffect'
```

**Step 3: Verify build and commit**

```bash
npm run build
git add src/effects/glitch-engine/PosterizeEffect.ts src/effects/glitch-engine/index.ts
git commit -m "feat: add PosterizeEffect with RGB/HSL modes"
```

---

## Task 6: Static Displacement Effect

**Files:**
- Create: `src/effects/glitch-engine/StaticDisplacementEffect.ts`
- Modify: `src/effects/glitch-engine/index.ts`

**Step 1: Create the effect file**

```typescript
// src/effects/glitch-engine/StaticDisplacementEffect.ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float intensity;
uniform float scale;
uniform float speed;
uniform int direction; // 0=both, 1=horizontal, 2=vertical
uniform int noiseType; // 0=white, 1=perlin
uniform float time;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Simplex-like noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 noiseCoord = uv * scale + time * speed;

  float noiseX, noiseY;

  if (noiseType == 0) {
    // White noise
    noiseX = random(noiseCoord) * 2.0 - 1.0;
    noiseY = random(noiseCoord + 100.0) * 2.0 - 1.0;
  } else {
    // Perlin-like noise
    noiseX = snoise(noiseCoord);
    noiseY = snoise(noiseCoord + 100.0);
  }

  vec2 offset = vec2(noiseX, noiseY) * intensity * 0.1;

  if (direction == 1) {
    offset.y = 0.0; // horizontal only
  } else if (direction == 2) {
    offset.x = 0.0; // vertical only
  }

  vec2 displacedUV = uv + offset;
  displacedUV = clamp(displacedUV, 0.0, 1.0);

  outputColor = texture2D(inputBuffer, displacedUV);
}
`

export type DisplacementDirection = 'both' | 'horizontal' | 'vertical'
export type DisplacementNoiseType = 'white' | 'perlin'

export interface StaticDisplacementParams {
  intensity: number             // 0-1
  scale: number                 // 1-100
  speed: number                 // 0-10
  direction: DisplacementDirection
  noiseType: DisplacementNoiseType
}

export const DEFAULT_STATIC_DISPLACEMENT_PARAMS: StaticDisplacementParams = {
  intensity: 0.3,
  scale: 20,
  speed: 1.0,
  direction: 'both',
  noiseType: 'perlin',
}

const DIRECTION_MAP: Record<DisplacementDirection, number> = {
  'both': 0,
  'horizontal': 1,
  'vertical': 2,
}

const NOISE_MAP: Record<DisplacementNoiseType, number> = {
  'white': 0,
  'perlin': 1,
}

export class StaticDisplacementEffect extends Effect {
  constructor(params: Partial<StaticDisplacementParams> = {}) {
    const p = { ...DEFAULT_STATIC_DISPLACEMENT_PARAMS, ...params }

    super('StaticDisplacementEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['intensity', new THREE.Uniform(p.intensity)],
        ['scale', new THREE.Uniform(p.scale)],
        ['speed', new THREE.Uniform(p.speed)],
        ['direction', new THREE.Uniform(DIRECTION_MAP[p.direction])],
        ['noiseType', new THREE.Uniform(NOISE_MAP[p.noiseType])],
        ['time', new THREE.Uniform(0)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  updateParams(params: Partial<StaticDisplacementParams>) {
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.scale !== undefined) this.uniforms.get('scale')!.value = params.scale
    if (params.speed !== undefined) this.uniforms.get('speed')!.value = params.speed
    if (params.direction !== undefined) this.uniforms.get('direction')!.value = DIRECTION_MAP[params.direction]
    if (params.noiseType !== undefined) this.uniforms.get('noiseType')!.value = NOISE_MAP[params.noiseType]
  }
}
```

**Step 2: Update index.ts exports**

Add to `src/effects/glitch-engine/index.ts`:

```typescript
export { StaticDisplacementEffect, DEFAULT_STATIC_DISPLACEMENT_PARAMS } from './StaticDisplacementEffect'
export type { StaticDisplacementParams, DisplacementDirection, DisplacementNoiseType } from './StaticDisplacementEffect'
```

**Step 3: Verify build and commit**

```bash
npm run build
git add src/effects/glitch-engine/StaticDisplacementEffect.ts src/effects/glitch-engine/index.ts
git commit -m "feat: add StaticDisplacementEffect with white/perlin noise"
```

---

## Task 7: Color Grade Effect

**Files:**
- Create: `src/effects/glitch-engine/ColorGradeEffect.ts`
- Modify: `src/effects/glitch-engine/index.ts`

**Step 1: Create the effect file**

```typescript
// src/effects/glitch-engine/ColorGradeEffect.ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform vec3 lift;
uniform vec3 gamma;
uniform vec3 gain;
uniform float saturation;
uniform float contrast;
uniform float brightness;
uniform vec3 tintColor;
uniform float tintAmount;
uniform int tintMode; // 0=overlay, 1=multiply, 2=screen

vec3 rgb2hsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) / 2.0;
  if (maxC == minC) return vec3(0.0, 0.0, l);
  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
  float h;
  if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
  else h = (c.r - c.g) / d + 4.0;
  h /= 6.0;
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 c) {
  if (c.y == 0.0) return vec3(c.z);
  float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
  float p = 2.0 * c.z - q;
  return vec3(hue2rgb(p, q, c.x + 1.0/3.0), hue2rgb(p, q, c.x), hue2rgb(p, q, c.x - 1.0/3.0));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
}

vec3 blendScreen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  // Lift/Gamma/Gain
  // Lift affects shadows, Gain affects highlights, Gamma affects midtones
  color = pow(max(vec3(0.0), color * gain + lift), 1.0 / gamma);

  // Brightness
  color += brightness;

  // Contrast
  color = (color - 0.5) * contrast + 0.5;

  // Saturation
  vec3 hsl = rgb2hsl(color);
  hsl.y *= saturation;
  color = hsl2rgb(hsl);

  // Tint
  if (tintAmount > 0.0) {
    vec3 tinted;
    if (tintMode == 0) {
      tinted = blendOverlay(color, tintColor);
    } else if (tintMode == 1) {
      tinted = color * tintColor;
    } else {
      tinted = blendScreen(color, tintColor);
    }
    color = mix(color, tinted, tintAmount);
  }

  outputColor = vec4(clamp(color, 0.0, 1.0), inputColor.a);
}
`

export type TintMode = 'overlay' | 'multiply' | 'screen'

export interface ColorGradeParams {
  liftR: number; liftG: number; liftB: number
  gammaR: number; gammaG: number; gammaB: number
  gainR: number; gainG: number; gainB: number
  saturation: number
  contrast: number
  brightness: number
  tintColor: string
  tintAmount: number
  tintMode: TintMode
}

export const DEFAULT_COLOR_GRADE_PARAMS: ColorGradeParams = {
  liftR: 0, liftG: 0, liftB: 0,
  gammaR: 1, gammaG: 1, gammaB: 1,
  gainR: 1, gainG: 1, gainB: 1,
  saturation: 1,
  contrast: 1,
  brightness: 0,
  tintColor: '#000000',
  tintAmount: 0,
  tintMode: 'overlay',
}

const TINT_MODE_MAP: Record<TintMode, number> = {
  'overlay': 0,
  'multiply': 1,
  'screen': 2,
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [0, 0, 0]
}

export class ColorGradeEffect extends Effect {
  constructor(params: Partial<ColorGradeParams> = {}) {
    const p = { ...DEFAULT_COLOR_GRADE_PARAMS, ...params }
    const tintRgb = hexToRgb(p.tintColor)

    super('ColorGradeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['lift', new THREE.Uniform(new THREE.Vector3(p.liftR, p.liftG, p.liftB))],
        ['gamma', new THREE.Uniform(new THREE.Vector3(p.gammaR, p.gammaG, p.gammaB))],
        ['gain', new THREE.Uniform(new THREE.Vector3(p.gainR, p.gainG, p.gainB))],
        ['saturation', new THREE.Uniform(p.saturation)],
        ['contrast', new THREE.Uniform(p.contrast)],
        ['brightness', new THREE.Uniform(p.brightness)],
        ['tintColor', new THREE.Uniform(new THREE.Vector3(...tintRgb))],
        ['tintAmount', new THREE.Uniform(p.tintAmount)],
        ['tintMode', new THREE.Uniform(TINT_MODE_MAP[p.tintMode])],
      ]),
    })
  }

  updateParams(params: Partial<ColorGradeParams>) {
    const lift = this.uniforms.get('lift')!.value as THREE.Vector3
    const gamma = this.uniforms.get('gamma')!.value as THREE.Vector3
    const gain = this.uniforms.get('gain')!.value as THREE.Vector3

    if (params.liftR !== undefined) lift.x = params.liftR
    if (params.liftG !== undefined) lift.y = params.liftG
    if (params.liftB !== undefined) lift.z = params.liftB
    if (params.gammaR !== undefined) gamma.x = params.gammaR
    if (params.gammaG !== undefined) gamma.y = params.gammaG
    if (params.gammaB !== undefined) gamma.z = params.gammaB
    if (params.gainR !== undefined) gain.x = params.gainR
    if (params.gainG !== undefined) gain.y = params.gainG
    if (params.gainB !== undefined) gain.z = params.gainB
    if (params.saturation !== undefined) this.uniforms.get('saturation')!.value = params.saturation
    if (params.contrast !== undefined) this.uniforms.get('contrast')!.value = params.contrast
    if (params.brightness !== undefined) this.uniforms.get('brightness')!.value = params.brightness
    if (params.tintColor !== undefined) {
      const rgb = hexToRgb(params.tintColor)
      ;(this.uniforms.get('tintColor')!.value as THREE.Vector3).set(...rgb)
    }
    if (params.tintAmount !== undefined) this.uniforms.get('tintAmount')!.value = params.tintAmount
    if (params.tintMode !== undefined) this.uniforms.get('tintMode')!.value = TINT_MODE_MAP[params.tintMode]
  }
}
```

**Step 2: Update index.ts exports**

Add to `src/effects/glitch-engine/index.ts`:

```typescript
export { ColorGradeEffect, DEFAULT_COLOR_GRADE_PARAMS } from './ColorGradeEffect'
export type { ColorGradeParams, TintMode } from './ColorGradeEffect'
```

**Step 3: Verify build and commit**

```bash
npm run build
git add src/effects/glitch-engine/ColorGradeEffect.ts src/effects/glitch-engine/index.ts
git commit -m "feat: add ColorGradeEffect with lift/gamma/gain and tinting"
```

---

## Task 8: Feedback Loop Effect

**Files:**
- Create: `src/effects/glitch-engine/FeedbackLoopEffect.ts`
- Modify: `src/effects/glitch-engine/index.ts`

**Step 1: Create the effect file**

```typescript
// src/effects/glitch-engine/FeedbackLoopEffect.ts
import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform sampler2D feedbackTexture;
uniform float decay;
uniform float offsetX;
uniform float offsetY;
uniform float zoom;
uniform float rotation;
uniform float hueShift;
uniform bool hasFeedback;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 rotateUV(vec2 uv, float angle) {
  vec2 center = vec2(0.5);
  uv -= center;
  float s = sin(angle);
  float c = cos(angle);
  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
  return uv + center;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasFeedback) {
    outputColor = inputColor;
    return;
  }

  // Transform UV for feedback sampling
  vec2 feedbackUV = uv;

  // Offset
  feedbackUV += vec2(offsetX, offsetY);

  // Zoom from center
  feedbackUV = (feedbackUV - 0.5) / zoom + 0.5;

  // Rotation
  if (rotation != 0.0) {
    feedbackUV = rotateUV(feedbackUV, rotation * 3.14159 / 180.0);
  }

  // Sample previous frame if in bounds
  vec3 feedback = vec3(0.0);
  if (feedbackUV.x >= 0.0 && feedbackUV.x <= 1.0 && feedbackUV.y >= 0.0 && feedbackUV.y <= 1.0) {
    feedback = texture2D(feedbackTexture, feedbackUV).rgb;

    // Hue shift the feedback
    if (hueShift != 0.0) {
      vec3 hsv = rgb2hsv(feedback);
      hsv.x = fract(hsv.x + hueShift / 360.0);
      feedback = hsv2rgb(hsv);
    }
  }

  // Mix current with decayed feedback
  vec3 result = current + feedback * decay;

  outputColor = vec4(result, inputColor.a);
}
`

export interface FeedbackLoopParams {
  decay: number      // 0-1
  offsetX: number    // -0.1 to 0.1
  offsetY: number    // -0.1 to 0.1
  zoom: number       // 0.95-1.05
  rotation: number   // -5 to 5 degrees
  hueShift: number   // 0-30 degrees
}

export const DEFAULT_FEEDBACK_LOOP_PARAMS: FeedbackLoopParams = {
  decay: 0.9,
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0,
  rotation: 0,
  hueShift: 0,
}

export class FeedbackLoopEffect extends Effect {
  private feedbackTarget: THREE.WebGLRenderTarget | null = null
  private tempTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null

  constructor(params: Partial<FeedbackLoopParams> = {}) {
    const p = { ...DEFAULT_FEEDBACK_LOOP_PARAMS, ...params }

    super('FeedbackLoopEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['feedbackTexture', new THREE.Uniform(null)],
        ['decay', new THREE.Uniform(p.decay)],
        ['offsetX', new THREE.Uniform(p.offsetX)],
        ['offsetY', new THREE.Uniform(p.offsetY)],
        ['zoom', new THREE.Uniform(p.zoom)],
        ['rotation', new THREE.Uniform(p.rotation)],
        ['hueShift', new THREE.Uniform(p.hueShift)],
        ['hasFeedback', new THREE.Uniform(false)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    this.feedbackTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    this.tempTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    // Setup copy material for ping-pong
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
    })

    this.copyScene = new THREE.Scene()
    this.copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMaterial)
    this.copyScene.add(quad)
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    if (!this.feedbackTarget || !this.tempTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) {
      return
    }

    // Set feedback texture for next frame
    this.uniforms.get('feedbackTexture')!.value = this.feedbackTarget.texture
    this.uniforms.get('hasFeedback')!.value = true

    // After rendering, copy output to feedback buffer for next frame
    // This happens in a post-render step
  }

  // Call this after the main render pass
  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.feedbackTarget || !this.tempTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) {
      return
    }

    // Copy current output to feedback buffer
    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
    renderer.setRenderTarget(this.feedbackTarget)
    renderer.render(this.copyScene, this.copyCamera)
    renderer.setRenderTarget(null)
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.feedbackTarget?.setSize(width, height)
    this.tempTarget?.setSize(width, height)
  }

  updateParams(params: Partial<FeedbackLoopParams>) {
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    if (params.offsetX !== undefined) this.uniforms.get('offsetX')!.value = params.offsetX
    if (params.offsetY !== undefined) this.uniforms.get('offsetY')!.value = params.offsetY
    if (params.zoom !== undefined) this.uniforms.get('zoom')!.value = params.zoom
    if (params.rotation !== undefined) this.uniforms.get('rotation')!.value = params.rotation
    if (params.hueShift !== undefined) this.uniforms.get('hueShift')!.value = params.hueShift
  }

  dispose() {
    super.dispose()
    this.feedbackTarget?.dispose()
    this.tempTarget?.dispose()
    this.copyMaterial?.dispose()
  }
}
```

**Step 2: Update index.ts exports**

Add to `src/effects/glitch-engine/index.ts`:

```typescript
export { FeedbackLoopEffect, DEFAULT_FEEDBACK_LOOP_PARAMS } from './FeedbackLoopEffect'
export type { FeedbackLoopParams } from './FeedbackLoopEffect'
```

**Step 3: Verify build and commit**

```bash
npm run build
git add src/effects/glitch-engine/FeedbackLoopEffect.ts src/effects/glitch-engine/index.ts
git commit -m "feat: add FeedbackLoopEffect with ping-pong buffer"
```

---

## Task 9: Update glitchEngineStore

**Files:**
- Modify: `src/stores/glitchEngineStore.ts`

**Step 1: Add imports for new effect params**

Add at top of file after existing imports:

```typescript
import {
  type ChromaticAberrationParams,
  DEFAULT_CHROMATIC_ABERRATION_PARAMS
} from '../effects/glitch-engine/ChromaticAberrationEffect'
import {
  type VHSTrackingParams,
  DEFAULT_VHS_TRACKING_PARAMS
} from '../effects/glitch-engine/VHSTrackingEffect'
import {
  type LensDistortionParams,
  DEFAULT_LENS_DISTORTION_PARAMS
} from '../effects/glitch-engine/LensDistortionEffect'
import {
  type DitherParams,
  DEFAULT_DITHER_PARAMS
} from '../effects/glitch-engine/DitherEffect'
import {
  type PosterizeParams,
  DEFAULT_POSTERIZE_PARAMS
} from '../effects/glitch-engine/PosterizeEffect'
import {
  type StaticDisplacementParams,
  DEFAULT_STATIC_DISPLACEMENT_PARAMS
} from '../effects/glitch-engine/StaticDisplacementEffect'
import {
  type ColorGradeParams,
  DEFAULT_COLOR_GRADE_PARAMS
} from '../effects/glitch-engine/ColorGradeEffect'
import {
  type FeedbackLoopParams,
  DEFAULT_FEEDBACK_LOOP_PARAMS
} from '../effects/glitch-engine/FeedbackLoopEffect'
```

**Step 2: Update GlitchSnapshot interface**

Add new fields to `GlitchSnapshot`:

```typescript
export interface GlitchSnapshot {
  // ... existing fields ...
  chromaticAberrationEnabled: boolean
  chromaticAberration: ChromaticAberrationParams
  vhsTrackingEnabled: boolean
  vhsTracking: VHSTrackingParams
  lensDistortionEnabled: boolean
  lensDistortion: LensDistortionParams
  ditherEnabled: boolean
  dither: DitherParams
  posterizeEnabled: boolean
  posterize: PosterizeParams
  staticDisplacementEnabled: boolean
  staticDisplacement: StaticDisplacementParams
  colorGradeEnabled: boolean
  colorGrade: ColorGradeParams
  feedbackLoopEnabled: boolean
  feedbackLoop: FeedbackLoopParams
}
```

**Step 3: Update GlitchEngineState interface**

Add new state fields and actions:

```typescript
interface GlitchEngineState {
  // ... existing fields ...

  chromaticAberrationEnabled: boolean
  vhsTrackingEnabled: boolean
  lensDistortionEnabled: boolean
  ditherEnabled: boolean
  posterizeEnabled: boolean
  staticDisplacementEnabled: boolean
  colorGradeEnabled: boolean
  feedbackLoopEnabled: boolean

  chromaticAberration: ChromaticAberrationParams
  vhsTracking: VHSTrackingParams
  lensDistortion: LensDistortionParams
  dither: DitherParams
  posterize: PosterizeParams
  staticDisplacement: StaticDisplacementParams
  colorGrade: ColorGradeParams
  feedbackLoop: FeedbackLoopParams

  setChromaticAberrationEnabled: (enabled: boolean) => void
  setVHSTrackingEnabled: (enabled: boolean) => void
  setLensDistortionEnabled: (enabled: boolean) => void
  setDitherEnabled: (enabled: boolean) => void
  setPosterizeEnabled: (enabled: boolean) => void
  setStaticDisplacementEnabled: (enabled: boolean) => void
  setColorGradeEnabled: (enabled: boolean) => void
  setFeedbackLoopEnabled: (enabled: boolean) => void

  updateChromaticAberration: (params: Partial<ChromaticAberrationParams>) => void
  updateVHSTracking: (params: Partial<VHSTrackingParams>) => void
  updateLensDistortion: (params: Partial<LensDistortionParams>) => void
  updateDither: (params: Partial<DitherParams>) => void
  updatePosterize: (params: Partial<PosterizeParams>) => void
  updateStaticDisplacement: (params: Partial<StaticDisplacementParams>) => void
  updateColorGrade: (params: Partial<ColorGradeParams>) => void
  updateFeedbackLoop: (params: Partial<FeedbackLoopParams>) => void
}
```

**Step 4: Update store implementation**

Add to the create function initial state:

```typescript
chromaticAberrationEnabled: false,
vhsTrackingEnabled: false,
lensDistortionEnabled: false,
ditherEnabled: false,
posterizeEnabled: false,
staticDisplacementEnabled: false,
colorGradeEnabled: false,
feedbackLoopEnabled: false,

chromaticAberration: { ...DEFAULT_CHROMATIC_ABERRATION_PARAMS },
vhsTracking: { ...DEFAULT_VHS_TRACKING_PARAMS },
lensDistortion: { ...DEFAULT_LENS_DISTORTION_PARAMS },
dither: { ...DEFAULT_DITHER_PARAMS },
posterize: { ...DEFAULT_POSTERIZE_PARAMS },
staticDisplacement: { ...DEFAULT_STATIC_DISPLACEMENT_PARAMS },
colorGrade: { ...DEFAULT_COLOR_GRADE_PARAMS },
feedbackLoop: { ...DEFAULT_FEEDBACK_LOOP_PARAMS },
```

Add setters:

```typescript
setChromaticAberrationEnabled: (enabled) => set({ chromaticAberrationEnabled: enabled }),
setVHSTrackingEnabled: (enabled) => set({ vhsTrackingEnabled: enabled }),
setLensDistortionEnabled: (enabled) => set({ lensDistortionEnabled: enabled }),
setDitherEnabled: (enabled) => set({ ditherEnabled: enabled }),
setPosterizeEnabled: (enabled) => set({ posterizeEnabled: enabled }),
setStaticDisplacementEnabled: (enabled) => set({ staticDisplacementEnabled: enabled }),
setColorGradeEnabled: (enabled) => set({ colorGradeEnabled: enabled }),
setFeedbackLoopEnabled: (enabled) => set({ feedbackLoopEnabled: enabled }),
```

Add updaters:

```typescript
updateChromaticAberration: (params) => set((state) => ({
  chromaticAberration: { ...state.chromaticAberration, ...params }
})),
updateVHSTracking: (params) => set((state) => ({
  vhsTracking: { ...state.vhsTracking, ...params }
})),
updateLensDistortion: (params) => set((state) => ({
  lensDistortion: { ...state.lensDistortion, ...params }
})),
updateDither: (params) => set((state) => ({
  dither: { ...state.dither, ...params }
})),
updatePosterize: (params) => set((state) => ({
  posterize: { ...state.posterize, ...params }
})),
updateStaticDisplacement: (params) => set((state) => ({
  staticDisplacement: { ...state.staticDisplacement, ...params }
})),
updateColorGrade: (params) => set((state) => ({
  colorGrade: { ...state.colorGrade, ...params }
})),
updateFeedbackLoop: (params) => set((state) => ({
  feedbackLoop: { ...state.feedbackLoop, ...params }
})),
```

**Step 5: Update reset, getSnapshot, applySnapshot**

Update `reset` to include new effects (all disabled with defaults).

Update `getSnapshot` to include new effect states.

Update `applySnapshot` to apply new effect states.

**Step 6: Verify build and commit**

```bash
npm run build
git add src/stores/glitchEngineStore.ts
git commit -m "feat: add 8 new effects to glitchEngineStore"
```

---

## Task 10: Update effects config

**Files:**
- Modify: `src/config/effects.ts`

**Step 1: Replace EFFECTS array with new 16-effect grid**

```typescript
export interface EffectDefinition {
  id: string
  label: string
  color: string
  row: 'color' | 'distortion' | 'texture' | 'render'
  min: number
  max: number
}

export const EFFECTS: EffectDefinition[] = [
  // Row 1: Color/Channel
  { id: 'rgb_split', label: 'RGB', color: '#0891b2', row: 'color', min: 0, max: 50 },
  { id: 'chromatic', label: 'CHROMA', color: '#6366f1', row: 'color', min: 0, max: 100 },
  { id: 'posterize', label: 'POSTER', color: '#dc2626', row: 'color', min: 2, max: 16 },
  { id: 'color_grade', label: 'GRADE', color: '#ea580c', row: 'color', min: 0, max: 200 },

  // Row 2: Distortion
  { id: 'block_displace', label: 'BLOCK', color: '#a855f7', row: 'distortion', min: 0, max: 100 },
  { id: 'static_displace', label: 'STATIC', color: '#8b5cf6', row: 'distortion', min: 0, max: 100 },
  { id: 'pixelate', label: 'PIXEL', color: '#d946ef', row: 'distortion', min: 2, max: 32 },
  { id: 'lens', label: 'LENS', color: '#0284c7', row: 'distortion', min: -100, max: 100 },

  // Row 3: Texture/Overlay
  { id: 'scan_lines', label: 'SCAN', color: '#65a30d', row: 'texture', min: 100, max: 1000 },
  { id: 'vhs', label: 'VHS', color: '#059669', row: 'texture', min: 0, max: 100 },
  { id: 'noise', label: 'NOISE', color: '#84cc16', row: 'texture', min: 0, max: 100 },
  { id: 'dither', label: 'DITHER', color: '#22c55e', row: 'texture', min: 2, max: 16 },

  // Row 4: Render Modes
  { id: 'edges', label: 'EDGES', color: '#f59e0b', row: 'render', min: 10, max: 100 },
  { id: 'ascii', label: 'ASCII', color: '#d97706', row: 'render', min: 6, max: 20 },
  { id: 'stipple', label: 'STIPPLE', color: '#b45309', row: 'render', min: 1, max: 8 },
  { id: 'feedback', label: 'FEEDBACK', color: '#92400e', row: 'render', min: 0, max: 100 },
]

export const GRID_ROWS = [
  EFFECTS.filter(e => e.row === 'color'),
  EFFECTS.filter(e => e.row === 'distortion'),
  EFFECTS.filter(e => e.row === 'texture'),
  EFFECTS.filter(e => e.row === 'render'),
]
```

**Step 2: Verify build and commit**

```bash
npm run build
git add src/config/effects.ts
git commit -m "feat: update effects config with 16 effects in 4x4 grid"
```

---

## Task 11: Update EffectPipeline

**Files:**
- Modify: `src/effects/EffectPipeline.ts`

**Step 1: Add imports for new effects**

```typescript
import {
  RGBSplitEffect,
  BlockDisplaceEffect,
  ScanLinesEffect,
  NoiseEffect,
  PixelateEffect,
  EdgeDetectionEffect,
  MixEffect,
  ChromaticAberrationEffect,
  VHSTrackingEffect,
  LensDistortionEffect,
  DitherEffect,
  PosterizeEffect,
  StaticDisplacementEffect,
  ColorGradeEffect,
  FeedbackLoopEffect,
} from './glitch-engine'
```

**Step 2: Add new effect instances**

Add to class properties:

```typescript
chromaticAberration: ChromaticAberrationEffect | null = null
vhsTracking: VHSTrackingEffect | null = null
lensDistortion: LensDistortionEffect | null = null
dither: DitherEffect | null = null
posterize: PosterizeEffect | null = null
staticDisplacement: StaticDisplacementEffect | null = null
colorGrade: ColorGradeEffect | null = null
feedbackLoop: FeedbackLoopEffect | null = null
```

**Step 3: Initialize in constructor**

```typescript
this.chromaticAberration = new ChromaticAberrationEffect()
this.vhsTracking = new VHSTrackingEffect()
this.lensDistortion = new LensDistortionEffect()
this.dither = new DitherEffect()
this.posterize = new PosterizeEffect()
this.staticDisplacement = new StaticDisplacementEffect()
this.colorGrade = new ColorGradeEffect()
this.feedbackLoop = new FeedbackLoopEffect()
```

**Step 4: Update getEffectById**

```typescript
private getEffectById(id: string): Effect | null {
  switch (id) {
    case 'rgb_split': return this.rgbSplit
    case 'chromatic': return this.chromaticAberration
    case 'posterize': return this.posterize
    case 'color_grade': return this.colorGrade
    case 'block_displace': return this.blockDisplace
    case 'static_displace': return this.staticDisplacement
    case 'pixelate': return this.pixelate
    case 'lens': return this.lensDistortion
    case 'scan_lines': return this.scanLines
    case 'vhs': return this.vhsTracking
    case 'noise': return this.noise
    case 'dither': return this.dither
    case 'edges': return this.edgeDetection
    case 'feedback': return this.feedbackLoop
    default: return null
  }
}
```

**Step 5: Update updateEffects signature**

Add new enabled flags to config parameter:

```typescript
updateEffects(config: {
  effectOrder: string[]
  rgbSplitEnabled: boolean
  chromaticAberrationEnabled: boolean
  posterizeEnabled: boolean
  colorGradeEnabled: boolean
  blockDisplaceEnabled: boolean
  staticDisplacementEnabled: boolean
  pixelateEnabled: boolean
  lensDistortionEnabled: boolean
  scanLinesEnabled: boolean
  vhsTrackingEnabled: boolean
  noiseEnabled: boolean
  ditherEnabled: boolean
  edgeDetectionEnabled: boolean
  feedbackLoopEnabled: boolean
  wetMix: number
  bypassActive: boolean
})
```

Update enabledMap:

```typescript
const enabledMap: Record<string, boolean> = {
  rgb_split: config.rgbSplitEnabled,
  chromatic: config.chromaticAberrationEnabled,
  posterize: config.posterizeEnabled,
  color_grade: config.colorGradeEnabled,
  block_displace: config.blockDisplaceEnabled,
  static_displace: config.staticDisplacementEnabled,
  pixelate: config.pixelateEnabled,
  lens: config.lensDistortionEnabled,
  scan_lines: config.scanLinesEnabled,
  vhs: config.vhsTrackingEnabled,
  noise: config.noiseEnabled,
  dither: config.ditherEnabled,
  edges: config.edgeDetectionEnabled,
  feedback: config.feedbackLoopEnabled,
}
```

**Step 6: Update dispose**

```typescript
dispose() {
  // ... existing ...
  this.chromaticAberration?.dispose()
  this.vhsTracking?.dispose()
  this.lensDistortion?.dispose()
  this.dither?.dispose()
  this.posterize?.dispose()
  this.staticDisplacement?.dispose()
  this.colorGrade?.dispose()
  this.feedbackLoop?.dispose()
}
```

**Step 7: Verify build and commit**

```bash
npm run build
git add src/effects/EffectPipeline.ts
git commit -m "feat: integrate 8 new effects into EffectPipeline"
```

---

## Task 12: Update PerformanceGrid

**Files:**
- Modify: `src/components/performance/PerformanceGrid.tsx`

**Step 1: Add new effect cases to getEffectState**

Add cases for each new effect:

```typescript
case 'chromatic':
  return {
    active: glitch.chromaticAberrationEnabled,
    value: glitch.chromaticAberration.intensity * 100,
    onToggle: () => {
      if (!glitch.chromaticAberrationEnabled) moveToEndOfChain(effectId)
      glitch.setChromaticAberrationEnabled(!glitch.chromaticAberrationEnabled)
    },
    onValueChange: (v: number) => glitch.updateChromaticAberration({ intensity: v / 100 }),
  }
case 'posterize':
  return {
    active: glitch.posterizeEnabled,
    value: glitch.posterize.levels,
    onToggle: () => {
      if (!glitch.posterizeEnabled) moveToEndOfChain(effectId)
      glitch.setPosterizeEnabled(!glitch.posterizeEnabled)
    },
    onValueChange: (v: number) => glitch.updatePosterize({ levels: v }),
  }
case 'color_grade':
  return {
    active: glitch.colorGradeEnabled,
    value: glitch.colorGrade.saturation * 100,
    onToggle: () => {
      if (!glitch.colorGradeEnabled) moveToEndOfChain(effectId)
      glitch.setColorGradeEnabled(!glitch.colorGradeEnabled)
    },
    onValueChange: (v: number) => glitch.updateColorGrade({ saturation: v / 100 }),
  }
case 'static_displace':
  return {
    active: glitch.staticDisplacementEnabled,
    value: glitch.staticDisplacement.intensity * 100,
    onToggle: () => {
      if (!glitch.staticDisplacementEnabled) moveToEndOfChain(effectId)
      glitch.setStaticDisplacementEnabled(!glitch.staticDisplacementEnabled)
    },
    onValueChange: (v: number) => glitch.updateStaticDisplacement({ intensity: v / 100 }),
  }
case 'lens':
  return {
    active: glitch.lensDistortionEnabled,
    value: glitch.lensDistortion.curvature * 100,
    onToggle: () => {
      if (!glitch.lensDistortionEnabled) moveToEndOfChain(effectId)
      glitch.setLensDistortionEnabled(!glitch.lensDistortionEnabled)
    },
    onValueChange: (v: number) => glitch.updateLensDistortion({ curvature: v / 100 }),
  }
case 'vhs':
  return {
    active: glitch.vhsTrackingEnabled,
    value: glitch.vhsTracking.tearIntensity * 100,
    onToggle: () => {
      if (!glitch.vhsTrackingEnabled) moveToEndOfChain(effectId)
      glitch.setVHSTrackingEnabled(!glitch.vhsTrackingEnabled)
    },
    onValueChange: (v: number) => glitch.updateVHSTracking({ tearIntensity: v / 100 }),
  }
case 'dither':
  return {
    active: glitch.ditherEnabled,
    value: glitch.dither.colorDepth,
    onToggle: () => {
      if (!glitch.ditherEnabled) moveToEndOfChain(effectId)
      glitch.setDitherEnabled(!glitch.ditherEnabled)
    },
    onValueChange: (v: number) => glitch.updateDither({ colorDepth: v }),
  }
case 'feedback':
  return {
    active: glitch.feedbackLoopEnabled,
    value: glitch.feedbackLoop.decay * 100,
    onToggle: () => {
      if (!glitch.feedbackLoopEnabled) moveToEndOfChain(effectId)
      glitch.setFeedbackLoopEnabled(!glitch.feedbackLoopEnabled)
    },
    onValueChange: (v: number) => glitch.updateFeedbackLoop({ decay: v / 100 }),
  }
```

**Step 2: Remove vision/landmark effect cases**

Remove cases for `face_mesh`, `hands`, `pose`, `holistic`, `matrix`, `blob_detect` (these move out of the main grid).

**Step 3: Verify build and commit**

```bash
npm run build
git add src/components/performance/PerformanceGrid.tsx
git commit -m "feat: update PerformanceGrid with 16 effects"
```

---

## Task 13: Update Canvas component to pass new effect states

**Files:**
- Modify: `src/components/Canvas.tsx`

**Step 1: Update the pipeline.updateEffects call**

Add new enabled flags:

```typescript
pipeline.updateEffects({
  effectOrder,
  rgbSplitEnabled: glitch.rgbSplitEnabled,
  chromaticAberrationEnabled: glitch.chromaticAberrationEnabled,
  posterizeEnabled: glitch.posterizeEnabled,
  colorGradeEnabled: glitch.colorGradeEnabled,
  blockDisplaceEnabled: glitch.blockDisplaceEnabled,
  staticDisplacementEnabled: glitch.staticDisplacementEnabled,
  pixelateEnabled: glitch.pixelateEnabled,
  lensDistortionEnabled: glitch.lensDistortionEnabled,
  scanLinesEnabled: glitch.scanLinesEnabled,
  vhsTrackingEnabled: glitch.vhsTrackingEnabled,
  noiseEnabled: glitch.noiseEnabled,
  ditherEnabled: glitch.ditherEnabled,
  edgeDetectionEnabled: glitch.edgeDetectionEnabled,
  feedbackLoopEnabled: glitch.feedbackLoopEnabled,
  wetMix: glitch.wetMix,
  bypassActive: glitch.bypassActive,
})
```

**Step 2: Add effect param updates**

Add calls to update each new effect's params:

```typescript
pipeline.chromaticAberration?.updateParams(glitch.chromaticAberration)
pipeline.vhsTracking?.updateParams(glitch.vhsTracking)
pipeline.lensDistortion?.updateParams(glitch.lensDistortion)
pipeline.dither?.updateParams(glitch.dither)
pipeline.posterize?.updateParams(glitch.posterize)
pipeline.staticDisplacement?.updateParams(glitch.staticDisplacement)
pipeline.colorGrade?.updateParams(glitch.colorGrade)
pipeline.feedbackLoop?.updateParams(glitch.feedbackLoop)
```

**Step 3: Verify build and commit**

```bash
npm run build
git add src/components/Canvas.tsx
git commit -m "feat: wire up new effects in Canvas component"
```

---

## Task 14: Update bankStore and presetLibraryStore

**Files:**
- Modify: `src/stores/bankStore.ts`
- Modify: `src/stores/presetLibraryStore.ts`

**Step 1: Update BankSnapshot in bankStore.ts**

Add new effect fields following the same pattern as glitchEngineStore.

**Step 2: Update saveBank and loadBank**

Add new effect states to the snapshot creation and application.

**Step 3: Update presetLibraryStore**

The preset store uses BankSnapshot for effects, so changes propagate automatically.

**Step 4: Verify build and commit**

```bash
npm run build
git add src/stores/bankStore.ts src/stores/presetLibraryStore.ts
git commit -m "feat: add new effects to bank and preset snapshots"
```

---

## Task 15: Final verification

**Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Run dev server**

```bash
npm run dev
```

Expected: App loads, 4x4 effect grid visible, all effects toggle and adjust

**Step 3: Test each effect**

1. Enable each new effect one at a time
2. Verify visual output changes
3. Adjust the slider value
4. Verify parameter changes affect the visual

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete 16-effect system implementation"
```

---

## Summary

**New files created (8):**
- `ChromaticAberrationEffect.ts`
- `VHSTrackingEffect.ts`
- `LensDistortionEffect.ts`
- `DitherEffect.ts`
- `PosterizeEffect.ts`
- `StaticDisplacementEffect.ts`
- `ColorGradeEffect.ts`
- `FeedbackLoopEffect.ts`

**Files modified (7):**
- `src/effects/glitch-engine/index.ts`
- `src/stores/glitchEngineStore.ts`
- `src/config/effects.ts`
- `src/effects/EffectPipeline.ts`
- `src/components/performance/PerformanceGrid.tsx`
- `src/components/Canvas.tsx`
- `src/stores/bankStore.ts`

**Effect Grid (4x4):**
| RGB | CHROMA | POSTER | GRADE |
| BLOCK | STATIC | PIXEL | LENS |
| SCAN | VHS | NOISE | DITHER |
| EDGES | ASCII | STIPPLE | FEEDBACK |
