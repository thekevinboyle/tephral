# Contour Tracking System Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace basic blob detection with BabyTrack/TouchDesigner-style contour tracing that produces organic, motion-reactive visuals.

**Architecture:** WebGL threshold/edge detection outputs a binary mask, marching squares extracts contour polylines, temporal tracking maintains identity across frames, and an organic renderer draws Catmull-Rom splines with velocity-based stroke width and tapered endings.

**Tech Stack:** WebGL2 shaders, Canvas 2D rendering, TypeScript

---

## Architecture Overview

```
Video Frame
    ↓
┌─────────────────────────────────┐
│  WebGL Preprocessing            │
│  - Threshold/motion detection   │
│  - Edge detection (Sobel)       │
│  - Output binary mask texture   │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  Contour Extraction (CPU)       │
│  - Marching squares algorithm   │
│  - Outputs polyline paths       │
│  - Temporal smoothing/tracking  │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│  Organic Renderer (Canvas 2D)   │
│  - Catmull-Rom spline smoothing │
│  - Velocity-based stroke width  │
│  - Tapered line endings         │
│  - Trail history with fade      │
└─────────────────────────────────┘
```

The WebGL step outputs a small binary texture (320x240) that we read back. Marching squares runs fast on that resolution. The organic renderer is where the visual magic happens.

---

## Task 1: Create Marching Squares Contour Extractor

**Files:**
- Create: `src/effects/contour/MarchingSquares.ts`

**Step 1: Implement the marching squares algorithm**

The algorithm walks through a grid of pixels and traces boundaries between "on" and "off" regions. It outputs polyline paths representing each contour.

```typescript
export interface ContourPoint {
  x: number  // normalized 0-1
  y: number  // normalized 0-1
}

export interface Contour {
  id: number
  points: ContourPoint[]
  centroid: ContourPoint
  area: number
  boundingBox: { x: number; y: number; width: number; height: number }
}

export class MarchingSquares {
  private width: number = 0
  private height: number = 0

  extract(
    imageData: Uint8Array,
    width: number,
    height: number,
    threshold: number
  ): Contour[]

  // Ramer-Douglas-Peucker simplification
  simplify(points: ContourPoint[], epsilon: number): ContourPoint[]
}
```

Processing pipeline:
- Input: Binary mask at 320x180 (downsampled from source)
- Marching squares extracts raw contours (~50-200 points per shape)
- RDP simplification reduces to ~20-50 points per shape
- Output: Normalized coordinates in 0-1 space

**Step 2: Commit**

```bash
git add src/effects/contour/MarchingSquares.ts
git commit -m "feat: add marching squares contour extraction"
```

---

## Task 2: Create Contour Tracker for Temporal Smoothing

**Files:**
- Create: `src/effects/contour/ContourTracker.ts`

**Step 1: Implement contour tracking across frames**

```typescript
export interface TrackedContour extends Contour {
  velocity: number           // pixels per second
  velocityVector: { x: number; y: number }
  age: number               // frames since first detected
  lastSeen: number          // timestamp
  smoothedPoints: ContourPoint[]
}

export class ContourTracker {
  private tracked: Map<number, TrackedContour> = new Map()
  private nextId: number = 0
  private smoothing: number = 0.6

  constructor(options?: { smoothing?: number })

  update(contours: Contour[], timestamp: number): TrackedContour[]

  // Match new contours to existing tracked contours
  private matchContours(
    newContours: Contour[],
    existing: TrackedContour[]
  ): Map<number, number>  // newIndex -> existingId

  // Apply exponential moving average to points
  private smoothPoints(
    current: ContourPoint[],
    previous: ContourPoint[],
    factor: number
  ): ContourPoint[]

  // Calculate velocity from centroid movement
  private calculateVelocity(
    current: ContourPoint,
    previous: ContourPoint,
    deltaTime: number
  ): { velocity: number; vector: { x: number; y: number } }

  setSmoothing(value: number): void
}
```

Matching algorithm:
1. Calculate centroid distance between new and existing contours
2. Calculate area similarity ratio
3. Match pairs with lowest combined score below threshold
4. Unmatched new contours get new IDs
5. Unmatched existing contours kept for ~200ms fade-out

Position smoothing (EMA):
```
smoothed = previous * smoothing + current * (1 - smoothing)
```

**Step 2: Commit**

```bash
git add src/effects/contour/ContourTracker.ts
git commit -m "feat: add contour tracker with temporal smoothing"
```

---

## Task 3: Create Organic Renderer

**Files:**
- Create: `src/effects/contour/OrganicRenderer.ts`

**Step 1: Implement Catmull-Rom spline rendering**

```typescript
export interface RenderStyle {
  color: string
  baseWidth: number         // 1-10px
  velocityResponse: number  // 0-1, how much speed affects width
  taperAmount: number       // 0-1, how much trails thin at tail
  glowIntensity: number     // 0-1
  glowColor: string
}

export interface TrailPoint {
  x: number
  y: number
  width: number
  opacity: number
  timestamp: number
  contourId: number
}

export class OrganicRenderer {
  private trails: Map<number, TrailPoint[]> = new Map()

  render(
    ctx: CanvasRenderingContext2D,
    contours: TrackedContour[],
    style: RenderStyle,
    width: number,
    height: number,
    timestamp: number
  ): void

  // Catmull-Rom spline interpolation
  private catmullRomSpline(
    points: { x: number; y: number }[],
    tension?: number
  ): { x: number; y: number }[]

  // Draw stroke with variable width
  private drawVariableWidthStroke(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number; width: number }[]
  ): void

  // Calculate stroke width based on velocity
  private calculateWidth(
    velocity: number,
    baseWidth: number,
    velocityResponse: number
  ): number

  // Apply taper to trail points
  private applyTaper(
    points: TrailPoint[],
    taperAmount: number
  ): TrailPoint[]

  updateTrails(
    contours: TrackedContour[],
    timestamp: number,
    trailLength: number
  ): void

  clearTrails(): void
}
```

Catmull-Rom implementation:
- Passes through every control point (unlike quadratic/cubic Bezier)
- Tension parameter controls smoothness (0.5 default)
- Interpolate between points for smooth curve

Variable width stroke:
- Break curve into small segments
- Draw each segment as a filled polygon between two parallel curves
- Width at each point determined by velocity

Tapered endings:
- Trail head (newest): full width
- Trail tail (oldest): width * (1 - taperAmount)
- Linear interpolation between

**Step 2: Commit**

```bash
git add src/effects/contour/OrganicRenderer.ts
git commit -m "feat: add organic renderer with Catmull-Rom splines"
```

---

## Task 4: Create Threshold Shader

**Files:**
- Create: `src/shaders/threshold.frag`

**Step 1: Write the threshold/edge detection shader**

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_source;
uniform float u_threshold;
uniform int u_mode;  // 0=brightness, 1=edge, 2=motion
uniform vec3 u_targetColor;
uniform float u_colorRange;

in vec2 v_texCoord;
out vec4 fragColor;

float luminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

// Sobel edge detection
float sobelEdge(sampler2D tex, vec2 uv, vec2 texelSize) {
  float tl = luminance(texture(tex, uv + vec2(-1, -1) * texelSize).rgb);
  float t  = luminance(texture(tex, uv + vec2( 0, -1) * texelSize).rgb);
  float tr = luminance(texture(tex, uv + vec2( 1, -1) * texelSize).rgb);
  float l  = luminance(texture(tex, uv + vec2(-1,  0) * texelSize).rgb);
  float r  = luminance(texture(tex, uv + vec2( 1,  0) * texelSize).rgb);
  float bl = luminance(texture(tex, uv + vec2(-1,  1) * texelSize).rgb);
  float b  = luminance(texture(tex, uv + vec2( 0,  1) * texelSize).rgb);
  float br = luminance(texture(tex, uv + vec2( 1,  1) * texelSize).rgb);

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;

  return sqrt(gx*gx + gy*gy);
}

void main() {
  vec4 color = texture(u_source, v_texCoord);
  float value = 0.0;

  if (u_mode == 0) {
    // Brightness threshold
    value = luminance(color.rgb);
  } else if (u_mode == 1) {
    // Edge detection
    vec2 texelSize = 1.0 / vec2(textureSize(u_source, 0));
    value = sobelEdge(u_source, v_texCoord, texelSize);
  } else if (u_mode == 2) {
    // Color matching
    vec3 diff = abs(color.rgb - u_targetColor);
    float dist = length(diff);
    value = 1.0 - smoothstep(0.0, u_colorRange, dist);
  }

  float binary = step(u_threshold, value);
  fragColor = vec4(binary, binary, binary, 1.0);
}
```

**Step 2: Commit**

```bash
git add src/shaders/threshold.frag
git commit -m "feat: add threshold shader for contour detection"
```

---

## Task 5: Create Contour Store

**Files:**
- Create: `src/stores/contourStore.ts`
- Delete: `src/stores/blobDetectStore.ts` (after migration)

**Step 1: Create the new store with streamlined parameters**

```typescript
import { create } from 'zustand'

export type DetectionMode = 'brightness' | 'edge' | 'color' | 'motion'
export type FadeMode = 'fade' | 'fixed' | 'persistent'
export type StylePreset = 'technical' | 'neon' | 'brush' | 'minimal'

export interface ContourParams {
  // Detection
  mode: DetectionMode
  threshold: number        // 0-1
  minSize: number          // 0-0.5, ignore smaller contours
  targetColor: string      // for color mode
  colorRange: number       // 0-1, tolerance for color matching

  // Smoothing
  positionSmoothing: number    // 0-1, default 0.6
  contourSimplification: number // 0-1, RDP epsilon

  // Line Style
  baseWidth: number        // 1-10px
  velocityResponse: number // 0-1
  taperAmount: number      // 0-1
  color: string
  glowIntensity: number    // 0-1
  glowColor: string

  // Trails
  trailLength: number      // 0-5 seconds
  fadeMode: FadeMode
}

export const DEFAULT_CONTOUR_PARAMS: ContourParams = {
  mode: 'brightness',
  threshold: 0.5,
  minSize: 0.01,
  targetColor: '#ff0000',
  colorRange: 0.2,

  positionSmoothing: 0.6,
  contourSimplification: 0.5,

  baseWidth: 3,
  velocityResponse: 0.5,
  taperAmount: 0.7,
  color: '#00ffff',
  glowIntensity: 0.5,
  glowColor: '#00ffff',

  trailLength: 2,
  fadeMode: 'fade',
}

const PRESETS: Record<StylePreset, Partial<ContourParams>> = {
  technical: {
    baseWidth: 1,
    velocityResponse: 0,
    taperAmount: 0,
    glowIntensity: 0,
    color: '#ffffff',
  },
  neon: {
    baseWidth: 2,
    velocityResponse: 0.5,
    taperAmount: 0.5,
    glowIntensity: 0.8,
    color: '#00ffff',
    glowColor: '#ff00ff',
  },
  brush: {
    baseWidth: 6,
    velocityResponse: 0.8,
    taperAmount: 0.9,
    glowIntensity: 0.2,
    color: '#ffffff',
  },
  minimal: {
    baseWidth: 1,
    velocityResponse: 0.3,
    taperAmount: 0.5,
    glowIntensity: 0,
    trailLength: 0.5,
    fadeMode: 'fade',
  },
}

interface ContourState {
  enabled: boolean
  params: ContourParams

  setEnabled: (enabled: boolean) => void
  updateParams: (params: Partial<ContourParams>) => void
  applyPreset: (preset: StylePreset) => void
  reset: () => void
}

export const useContourStore = create<ContourState>((set) => ({
  enabled: false,
  params: { ...DEFAULT_CONTOUR_PARAMS },

  setEnabled: (enabled) => set({ enabled }),

  updateParams: (params) => set((state) => ({
    params: { ...state.params, ...params },
  })),

  applyPreset: (preset) => set((state) => ({
    params: { ...state.params, ...PRESETS[preset] },
  })),

  reset: () => set({
    enabled: false,
    params: { ...DEFAULT_CONTOUR_PARAMS },
  }),
}))
```

**Step 2: Commit**

```bash
git add src/stores/contourStore.ts
git commit -m "feat: add contour store with streamlined parameters"
```

---

## Task 6: Create Contour Overlay Component

**Files:**
- Create: `src/components/overlays/ContourOverlay.tsx`

**Step 1: Implement the overlay component**

```typescript
import { useRef, useEffect, useCallback } from 'react'
import { useContourStore } from '../../stores/contourStore'
import { useMediaStore } from '../../stores/mediaStore'
import { MarchingSquares } from '../../effects/contour/MarchingSquares'
import { ContourTracker } from '../../effects/contour/ContourTracker'
import { OrganicRenderer } from '../../effects/contour/OrganicRenderer'

interface Props {
  width: number
  height: number
  glCanvas?: HTMLCanvasElement | null
}

export function ContourOverlay({ width, height, glCanvas }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const marchingSquares = useRef<MarchingSquares | null>(null)
  const tracker = useRef<ContourTracker | null>(null)
  const renderer = useRef<OrganicRenderer | null>(null)
  const frameId = useRef<number>(0)

  const { enabled, params } = useContourStore()
  const { videoElement, imageElement } = useMediaStore()

  // Initialize
  useEffect(() => {
    marchingSquares.current = new MarchingSquares()
    tracker.current = new ContourTracker({ smoothing: params.positionSmoothing })
    renderer.current = new OrganicRenderer()

    // Offscreen canvas for downsampling
    offscreenRef.current = document.createElement('canvas')
    offscreenRef.current.width = 320
    offscreenRef.current.height = 180

    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current)
    }
  }, [])

  // Update smoothing when param changes
  useEffect(() => {
    tracker.current?.setSmoothing(params.positionSmoothing)
  }, [params.positionSmoothing])

  const animate = useCallback(() => {
    // ... animation loop implementation
    // 1. Draw source to offscreen canvas (downsampled)
    // 2. Get image data, apply threshold
    // 3. Run marching squares
    // 4. Update tracker
    // 5. Render with organic renderer
  }, [enabled, params, videoElement, imageElement, glCanvas, width, height])

  useEffect(() => {
    if (!enabled) return
    frameId.current = requestAnimationFrame(animate)
    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current)
    }
  }, [enabled, animate])

  if (!enabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  )
}
```

**Step 2: Commit**

```bash
git add src/components/overlays/ContourOverlay.tsx
git commit -m "feat: add ContourOverlay component"
```

---

## Task 7: Create Index Export

**Files:**
- Create: `src/effects/contour/index.ts`

**Step 1: Create exports**

```typescript
export { MarchingSquares } from './MarchingSquares'
export type { Contour, ContourPoint } from './MarchingSquares'

export { ContourTracker } from './ContourTracker'
export type { TrackedContour } from './ContourTracker'

export { OrganicRenderer } from './OrganicRenderer'
export type { RenderStyle, TrailPoint } from './OrganicRenderer'
```

**Step 2: Commit**

```bash
git add src/effects/contour/index.ts
git commit -m "feat: add contour module exports"
```

---

## Task 8: Update Effect Configuration

**Files:**
- Modify: `src/config/effects.ts`

**Step 1: Update the blob_detect effect to contour**

Change:
```typescript
{ id: 'blob_detect', label: 'DETECT', color: '#10b981', row: 'vision', page: 1, min: 0, max: 100 },
```

To:
```typescript
{ id: 'contour', label: 'CONTOUR', color: '#10b981', row: 'vision', page: 1, min: 0, max: 100 },
```

**Step 2: Commit**

```bash
git add src/config/effects.ts
git commit -m "feat: rename blob_detect to contour effect"
```

---

## Task 9: Update PerformanceGrid

**Files:**
- Modify: `src/components/performance/PerformanceGrid.tsx`

**Step 1: Update imports and effect handler**

Replace blobDetect imports with contour:
```typescript
import { useContourStore } from '../../stores/contourStore'
```

Update the switch case:
```typescript
case 'contour':
  return {
    active: contour.enabled,
    value: contour.params.threshold * 100,
    onToggle: () => contour.setEnabled(!contour.enabled),
    onValueChange: (v: number) => contour.updateParams({ threshold: v / 100 }),
  }
```

**Step 2: Commit**

```bash
git add src/components/performance/PerformanceGrid.tsx
git commit -m "feat: update PerformanceGrid for contour effect"
```

---

## Task 10: Update ExpandedParameterPanel

**Files:**
- Modify: `src/components/performance/ExpandedParameterPanel.tsx`

**Step 1: Add contour parameter section**

Replace the blob_detect case with a new contour case containing:
- Mode selector (brightness/edge/color/motion)
- Threshold slider
- Min size slider
- Position smoothing slider
- Contour simplification slider
- Base width slider
- Velocity response slider
- Taper amount slider
- Color picker
- Glow intensity slider
- Trail length slider
- Fade mode selector
- Preset buttons (Technical, Neon, Brush, Minimal)

**Step 2: Commit**

```bash
git add src/components/performance/ExpandedParameterPanel.tsx
git commit -m "feat: add contour parameters to ExpandedParameterPanel"
```

---

## Task 11: Update Canvas Component

**Files:**
- Modify: `src/components/Canvas.tsx` (or wherever BlobDetectOverlay is mounted)

**Step 1: Replace BlobDetectOverlay with ContourOverlay**

```typescript
import { ContourOverlay } from './overlays/ContourOverlay'

// In render:
<ContourOverlay width={width} height={height} glCanvas={glCanvasRef.current} />
```

**Step 2: Commit**

```bash
git add src/components/Canvas.tsx
git commit -m "feat: use ContourOverlay in Canvas"
```

---

## Task 12: Clean Up Old Files

**Files:**
- Delete: `src/effects/blob-detect/BrightnessDetector.ts`
- Delete: `src/effects/blob-detect/MotionDetector.ts`
- Delete: `src/effects/blob-detect/ColorDetector.ts`
- Delete: `src/effects/blob-detect/TrailSystem.ts`
- Delete: `src/effects/blob-detect/BlobRenderer.ts`
- Delete: `src/effects/blob-detect/index.ts`
- Delete: `src/stores/blobDetectStore.ts`
- Delete: `src/components/overlays/BlobDetectOverlay.tsx`

**Step 1: Remove old files**

```bash
rm -rf src/effects/blob-detect
rm src/stores/blobDetectStore.ts
rm src/components/overlays/BlobDetectOverlay.tsx
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old blob detection system"
```

---

## Summary

**New files:**
- `src/effects/contour/MarchingSquares.ts`
- `src/effects/contour/ContourTracker.ts`
- `src/effects/contour/OrganicRenderer.ts`
- `src/effects/contour/index.ts`
- `src/shaders/threshold.frag`
- `src/stores/contourStore.ts`
- `src/components/overlays/ContourOverlay.tsx`

**Modified files:**
- `src/config/effects.ts`
- `src/components/performance/PerformanceGrid.tsx`
- `src/components/performance/ExpandedParameterPanel.tsx`
- `src/components/Canvas.tsx`

**Deleted files:**
- `src/effects/blob-detect/*` (6 files)
- `src/stores/blobDetectStore.ts`
- `src/components/overlays/BlobDetectOverlay.tsx`

**Key improvements:**
- Actual contour tracing instead of bounding boxes
- Catmull-Rom spline smoothing for organic curves
- Velocity-based stroke width variation
- Tapered trail endings
- Temporal smoothing to eliminate jitter
- Contour identity tracking across frames
- Streamlined parameter set with useful presets
