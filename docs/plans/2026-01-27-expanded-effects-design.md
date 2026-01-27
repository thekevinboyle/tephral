# Expanded Effects System Design

## Overview

Expand Tephral's effect system from 9 effects to 16, with an industrial/glitch/Hideo Kojima aesthetic. Effects organized in a 4x4 grid by category.

## Effect Grid (4x4)

### Row 1 - Color/Channel
| Slot | Effect | Status |
|------|--------|--------|
| 1 | RGB Split | Existing |
| 2 | Chromatic Aberration | New |
| 3 | Posterize | New |
| 4 | Color Grade | New |

### Row 2 - Distortion
| Slot | Effect | Status |
|------|--------|--------|
| 5 | Block Displace | Existing |
| 6 | Static Displacement | New |
| 7 | Pixelate | Existing |
| 8 | Lens Distortion | New |

### Row 3 - Texture/Overlay
| Slot | Effect | Status |
|------|--------|--------|
| 9 | Scan Lines | Existing |
| 10 | VHS Tracking | New |
| 11 | Noise | Existing |
| 12 | Dither | New |

### Row 4 - Render Modes
| Slot | Effect | Status |
|------|--------|--------|
| 13 | Edge Detection | Existing |
| 14 | ASCII | Existing (move to grid) |
| 15 | Stipple | Existing (move to grid) |
| 16 | Feedback Loop | New |

## New Effect Parameters

### Chromatic Aberration

```typescript
interface ChromaticAberrationParams {
  intensity: number      // 0-1, strength of the effect
  radialAmount: number   // 0-1, how much it increases toward edges
  direction: number      // 0-360, angle of aberration
  redOffset: number      // -0.05 to 0.05
  blueOffset: number     // -0.05 to 0.05
}

const DEFAULT_CHROMATIC_ABERRATION_PARAMS: ChromaticAberrationParams = {
  intensity: 0.5,
  radialAmount: 0.8,
  direction: 0,
  redOffset: 0.01,
  blueOffset: -0.01,
}
```

Lens-style color fringing that increases toward frame edges. Distinct from RGB Split which applies uniformly.

### VHS Tracking

```typescript
interface VHSTrackingParams {
  tearIntensity: number    // 0-1, horizontal line displacement
  tearSpeed: number        // 0.1-5, how fast tears move
  headSwitchNoise: number  // 0-1, bottom-of-frame noise band
  colorBleed: number       // 0-1, horizontal color smearing
  jitter: number           // 0-1, frame position wobble
}

const DEFAULT_VHS_TRACKING_PARAMS: VHSTrackingParams = {
  tearIntensity: 0.3,
  tearSpeed: 1.0,
  headSwitchNoise: 0.5,
  colorBleed: 0.2,
  jitter: 0.1,
}
```

Authentic VHS degradation with horizontal tear lines and head switching artifacts.

### Lens Distortion

```typescript
interface LensDistortionParams {
  // Barrel/Pincushion
  curvature: number        // -1 to 1, negative=pincushion, positive=barrel

  // Fresnel
  fresnelRings: number     // 0-20, number of concentric rings
  fresnelIntensity: number // 0-1, ring visibility
  fresnelRainbow: number   // 0-1, chromatic diffraction on rings

  // Vignette
  vignette: number         // 0-1, edge darkening
  vignetteShape: number    // 0-1, 0=circular, 1=rectangular

  // Glow
  phosphorGlow: number     // 0-1, bloom on bright areas
}

const DEFAULT_LENS_DISTORTION_PARAMS: LensDistortionParams = {
  curvature: 0.2,
  fresnelRings: 0,
  fresnelIntensity: 0,
  fresnelRainbow: 0,
  vignette: 0.3,
  vignetteShape: 0,
  phosphorGlow: 0,
}
```

Combines CRT barrel distortion, fresnel lens ring patterns, vignette, and phosphor glow.

### Dither

```typescript
interface DitherParams {
  mode: 'ordered' | 'floyd-steinberg' | 'halftone' | 'newsprint'
  intensity: number        // 0-1, blend with original
  scale: number            // 1-8, pattern size multiplier
  colorDepth: number       // 2-16, colors per channel
  angle: number            // 0-180, pattern rotation (halftone/newsprint)
}

const DEFAULT_DITHER_PARAMS: DitherParams = {
  mode: 'ordered',
  intensity: 1.0,
  scale: 1,
  colorDepth: 4,
  angle: 45,
}
```

Xerox/newspaper/retro game aesthetic with multiple dithering algorithms.

### Posterize

```typescript
interface PosterizeParams {
  levels: number           // 2-16, color steps per channel
  mode: 'rgb' | 'hsl'      // posterize in RGB or HSL space
  saturationBoost: number  // 0-2, pump up colors after reduction
  edgeContrast: number     // 0-1, sharpen boundaries between levels
}

const DEFAULT_POSTERIZE_PARAMS: PosterizeParams = {
  levels: 4,
  mode: 'rgb',
  saturationBoost: 1.2,
  edgeContrast: 0,
}
```

Propaganda poster / risograph look with bold color reduction.

### Feedback Loop

```typescript
interface FeedbackLoopParams {
  decay: number            // 0-1, how fast previous frames fade
  offsetX: number          // -0.1 to 0.1, horizontal drift per frame
  offsetY: number          // -0.1 to 0.1, vertical drift per frame
  zoom: number             // 0.95-1.05, scale drift per frame
  rotation: number         // -5 to 5 degrees per frame
  hueShift: number         // 0-30 degrees per frame
}

const DEFAULT_FEEDBACK_LOOP_PARAMS: FeedbackLoopParams = {
  decay: 0.9,
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0,
  rotation: 0,
  hueShift: 0,
}
```

Recursive video feedback creating infinite tunnel/echo effects. Requires ping-pong buffer.

### Static Displacement

```typescript
interface StaticDisplacementParams {
  intensity: number        // 0-1, how far pixels get pushed
  scale: number            // 1-100, noise grain size
  speed: number            // 0-10, animation speed
  direction: 'both' | 'horizontal' | 'vertical'
  noiseType: 'white' | 'perlin' | 'simplex'
}

const DEFAULT_STATIC_DISPLACEMENT_PARAMS: StaticDisplacementParams = {
  intensity: 0.3,
  scale: 20,
  speed: 1.0,
  direction: 'both',
  noiseType: 'perlin',
}
```

TV static that displaces pixels rather than just overlaying.

### Color Grade

```typescript
interface ColorGradeParams {
  // Lift/Gamma/Gain (shadows/mids/highlights)
  liftR: number            // -1 to 1
  liftG: number            // -1 to 1
  liftB: number            // -1 to 1
  gammaR: number           // 0.5 to 2
  gammaG: number           // 0.5 to 2
  gammaB: number           // 0.5 to 2
  gainR: number            // 0 to 2
  gainG: number            // 0 to 2
  gainB: number            // 0 to 2

  // Global
  saturation: number       // 0-2
  contrast: number         // 0-2
  brightness: number       // -1 to 1

  // Tint
  tintColor: string        // hex color to blend
  tintAmount: number       // 0-1
  tintMode: 'overlay' | 'multiply' | 'screen'
}

const DEFAULT_COLOR_GRADE_PARAMS: ColorGradeParams = {
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
```

Professional color grading with lift/gamma/gain and tinting for Kojima-style looks.

## Implementation Architecture

### File Structure

```
src/effects/glitch-engine/
  ├── RGBSplitEffect.ts           (existing)
  ├── ChromaticAberrationEffect.ts (new)
  ├── PosterizeEffect.ts           (new)
  ├── ColorGradeEffect.ts          (new)
  ├── BlockDisplaceEffect.ts       (existing)
  ├── StaticDisplacementEffect.ts  (new)
  ├── PixelateEffect.ts            (existing)
  ├── LensDistortionEffect.ts      (new)
  ├── ScanLinesEffect.ts           (existing)
  ├── VHSTrackingEffect.ts         (new)
  ├── NoiseEffect.ts               (existing)
  ├── DitherEffect.ts              (new)
  ├── EdgeDetectionEffect.ts       (existing)
  ├── FeedbackLoopEffect.ts        (new)
  └── index.ts
```

### Store Changes

1. **Expand `glitchEngineStore.ts`**
   - Add 8 new effect enable flags
   - Add 8 new param objects with defaults
   - Add update functions for each
   - Update `GlitchSnapshot` interface

2. **Update `bankStore.ts`**
   - Expand `BankSnapshot` to include new effects

3. **Update `presetLibraryStore.ts`**
   - Ensure preset format handles new effects

### Grid Integration

1. **Update `PerformanceGrid.tsx`**
   - Change from 4x3 to 4x4 layout
   - Add effect buttons for all 16 effects

2. **Unify ASCII/Stipple**
   - Move from separate overlay toggles into the unified effect grid
   - Keep them as WebGL effects in the main pipeline

3. **Blob Detect**
   - Remains separate as a vision/tracking feature
   - Not part of the 16-effect grid

### Shader Implementation

All effects implemented as WebGL fragment shaders following `BaseEffect.ts` pattern:

```typescript
export class NewEffect extends BaseEffect {
  private params: NewEffectParams = DEFAULT_NEW_EFFECT_PARAMS

  constructor(gl: WebGL2RenderingContext) {
    super(gl, vertexShaderSource, fragmentShaderSource)
  }

  setParams(params: Partial<NewEffectParams>) {
    this.params = { ...this.params, ...params }
  }

  render(input: WebGLTexture, output: WebGLFramebuffer | null) {
    // Set uniforms from params
    // Render quad
  }
}
```

**Special case: Feedback Loop** requires ping-pong buffer for frame history:
- Two framebuffers that alternate each frame
- Previous frame texture sampled and blended with current
- Drift/zoom/rotation applied to previous frame sample coordinates

## Effect Order

Default processing order (user can reorder via drag):

1. Color Grade (set the base look)
2. Posterize
3. Chromatic Aberration
4. RGB Split
5. Lens Distortion
6. Block Displace
7. Static Displacement
8. Pixelate
9. VHS Tracking
10. Scan Lines
11. Noise
12. Dither
13. Edge Detection
14. ASCII
15. Stipple
16. Feedback Loop (last - captures everything)

## Migration

Existing presets will continue to work - new effects default to disabled. No breaking changes to the preset format since new fields are additive.
