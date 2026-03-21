# Anima Morph Effects — Design Document

Inspired by hajime.kutsuwada's "Emotional Link" project (Unreal Engine 5.6, TouchDesigner, Houdini, After Effects, Ableton Live).

## Overview

Page 6 — **MORPH** — adds 5 new effects focused on face-morphing and organic distortion aesthetics.

| Effect | ID | Row | Color | Description |
|---|---|---|---|---|
| Liquid Morph | `liquid_morph` | distortion | `#4ecdc4` | Flowing metallic/chrome UV displacement with built-in metallic color treatment |
| Ripple Warp | `ripple_warp` | distortion | `#7b68ee` | Concentric circular waves radiating from center |
| Fractal Domain | `fractal_domain` | distortion | `#ff6b9d` | Kaleidoscope UV folding with mandelbrot-like tiling |
| Crystallize | `crystallize` | texture | `#a8e6cf` | Voronoi cell decomposition creating ice-crystal patterns |
| Face HUD | `face_hud` | render | `#00ffcc` | Face detection bounding box, wireframe mesh, emotion scores |

## Shader Approaches

### Liquid Morph

Fragment shader using multi-octave curl noise to generate a 2D displacement field. Displacement vectors flow over time (animated via `time` uniform). The metallic treatment applies after displacement: boost contrast, desaturate toward blue-teal, add fake specular highlights based on displacement gradient magnitude (areas of high distortion get bright highlights, like light catching chrome).

Uses existing `NOISE_GLSL` utilities (`curlNoise`, `fbm`) from `src/effects/glitch-engine/glsl-utils.ts`.

### Ripple Warp

UV displacement using `sin(distance(uv, center) * frequency - time * speed) * amplitude * decay`. Decay attenuates with distance so ripples fade at edges. Center point defaults to screen center but could be routed to face position if Face HUD is active.

### Fractal Domain

Iterative UV space folding. Each iteration: translate UV to center, apply `abs()` fold, rotate, scale down, translate back. After N iterations, sample the input texture at the folded UV. Creates kaleidoscopic self-similar patterns. Rotation speed animates over time.

### Crystallize

Voronoi diagram in UV space. For each pixel, find the nearest cell center from a grid of jittered points. Color the pixel with the input texture sampled at that cell center (faceted/shattered look). Edge detection between cells draws crystal boundaries. Shatter amount controls cell center displacement from grid.

### Face HUD

Not a traditional shader effect. Runs MediaPipe Face Mesh on each frame (or every Nth frame for performance), then renders the HUD via Canvas 2D overlay composited on top as a texture uniform.

Draws: bounding box with corner brackets, wireframe mesh from 468 landmarks, emotion labels with confidence bars. Scan lines via simple shader pass.

Emotion scores derived from landmark geometry heuristics (mouth aspect ratio -> happiness, brow height -> surprise, eye openness -> alertness, etc.) in `src/utils/faceEmotions.ts`.

## Parameters

### Liquid Morph (`liquid_morph`)

| Param | Range | Default | Description |
|---|---|---|---|
| `speed` | 0.1-3.0 | 0.8 | Flow animation speed |
| `scale` | 1-20 | 6.0 | Noise scale (larger = bigger swirls) |
| `intensity` | 0-1 | 0.5 | Displacement strength |
| `chromeAmount` | 0-1 | 0.7 | Metallic color treatment strength |
| `mix` | 0-1 | 1.0 | Dry/wet blend |

Compact knobs: intensity, chromeAmount, speed

### Ripple Warp (`ripple_warp`)

| Param | Range | Default | Description |
|---|---|---|---|
| `frequency` | 1-50 | 15.0 | Number of ripple rings |
| `amplitude` | 0-0.2 | 0.05 | Displacement strength per ring |
| `speed` | 0.1-5.0 | 1.5 | Ripple expansion speed |
| `decay` | 0-1 | 0.5 | How quickly ripples fade with distance |
| `mix` | 0-1 | 1.0 | Dry/wet blend |

Compact knobs: amplitude, frequency, speed

### Fractal Domain (`fractal_domain`)

| Param | Range | Default | Description |
|---|---|---|---|
| `iterations` | 1-8 | 4 | Number of fold iterations |
| `foldScale` | 0.5-3.0 | 1.5 | Scale factor per iteration |
| `rotationSpeed` | 0-2.0 | 0.3 | Animated rotation speed |
| `symmetry` | 2-12 | 6 | Symmetry axes for kaleidoscope |
| `mix` | 0-1 | 1.0 | Dry/wet blend |

Compact knobs: iterations, symmetry, foldScale

### Crystallize (`crystallize`)

| Param | Range | Default | Description |
|---|---|---|---|
| `cellSize` | 5-100 | 30.0 | Voronoi cell size in pixels |
| `edgeThickness` | 0-5 | 1.5 | Crystal boundary line width |
| `shatter` | 0-1 | 0.4 | Cell center jitter |
| `mix` | 0-1 | 1.0 | Dry/wet blend |

Compact knobs: cellSize, shatter, edgeThickness

### Face HUD (`face_hud`)

| Param | Range | Default | Description |
|---|---|---|---|
| `wireframeOpacity` | 0-1 | 0.6 | Landmark wireframe mesh visibility |
| `hudColor` | hex | `#00ffcc` | Color for HUD elements |
| `emotionDisplay` | on/off | on | Show emotion score labels |
| `scanLines` | 0-1 | 0.3 | CRT scan line overlay intensity |
| `detectionInterval` | 1-10 | 3 | Run detection every N frames |
| `mix` | 0-1 | 1.0 | Dry/wet blend |

Compact knobs: wireframeOpacity, scanLines

## New Files

### Effect Classes
- `src/effects/morph/LiquidMorphEffect.ts`
- `src/effects/morph/RippleWarpEffect.ts`
- `src/effects/morph/FractalDomainEffect.ts`
- `src/effects/morph/CrystallizeEffect.ts`
- `src/effects/morph/FaceHudEffect.ts`
- `src/effects/morph/index.ts`

### Utilities
- `src/utils/faceEmotions.ts` — landmark geometry -> emotion scores heuristics

### Store
- `src/stores/morphStore.ts` — Zustand store for all 5 effects

### Dependency
- `@mediapipe/tasks-vision` — Face Mesh (lazy-loaded by Face HUD only)

## Integration Touchpoints

1. **`src/config/effects.ts`** — New `MORPH_EFFECTS` array with 5 definitions, add "MORPH" to `PAGE_NAMES`, update `getEffectsForPage()` for page 6
2. **`src/stores/morphStore.ts`** — New store with enabled flags + param objects for all 5 effects
3. **`src/stores/uiStore.ts`** — Bump `setGridPage`/`nextGridPage` max to 6
4. **`src/effects/EffectPipeline.ts`** — Import 5 effect classes, add instances, `getEffectById()` cases, `updateEffects()` config type + enabledMap, `dispose()` cleanup
5. **`src/components/Canvas.tsx`** — Subscribe to `morphStore`, sync params via `updateParams()`, pass enabled flags to `pipeline.updateEffects()`
6. **`src/hooks/useActiveEffects.ts`** — 5 new enabled checks with primaryValue/primaryLabel
7. **`src/hooks/useEffectDisable.ts`** — 5 new switch cases mapping IDs to store setters
8. **`src/components/performance/CompactEffectParams.tsx`** — 5 new cases with compact knobs
9. **`src/components/performance/ExpandedParameterPanel.tsx`** — Full param controls for all 5 effects
10. **`src/stores/routingStore.ts`** — Add 5 IDs to `defaultEffectOrder`
11. **`src/config/effectParams.ts`** — Register all params in `EFFECT_PARAM_REGISTRY`
