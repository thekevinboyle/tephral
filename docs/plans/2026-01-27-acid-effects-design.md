# ACID Effects Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a new "ACID" page (page 2) with 12 data-visualization-inspired effects combining symbol replacement and geometric restructuring techniques.

**Architecture:** Separate overlay system (AcidOverlay.tsx) that reads the current canvas output and renders stylized interpretations. Canvas 2D for most effects, WebGL for compute-intensive ones (CLOUD, SLIT, VORONOI).

**Tech Stack:** React 18, Zustand, Canvas 2D API, WebGL (for 3 effects), Tailwind CSS v4

**Inspiration:** Ryoji Ikeda, Rasmus Widing PRP framework, TouchDesigner data visualization aesthetics

---

## Effect Definitions

### Row 1: Symbol Replacement

| ID | Label | Description | Primary Param |
|----|-------|-------------|---------------|
| `acid_dots` | DOTS | Rigid grid of circles, size = brightness | gridSize: 4-32 |
| `acid_glyph` | GLYPH | Unicode symbols (⬢ ◯ ▲ ◼) | gridSize: 8-24 |
| `acid_icons` | ICONS | Emoji/icon sprites in grid | gridSize: 16-48 |
| `acid_contour` | CONTOUR | Flowing parallel lines following luminance | levels: 4-20 |

### Row 2: Geometric Restructuring

| ID | Label | Description | Primary Param |
|----|-------|-------------|---------------|
| `acid_decomp` | DECOMP | Quad-tree variable rectangles | minBlock: 8-64 |
| `acid_mirror` | MIRROR | Kaleidoscopic 2/4/6/8-way mirroring | segments: 2-8 |
| `acid_slice` | SLICE | H/V slices with displacement | sliceCount: 4-64 |
| `acid_thgrid` | THGRID | Harsh B&W with geometric grid overlay | threshold: 0-255 |

### Row 3: Hybrid/Data Viz

| ID | Label | Description | Primary Param |
|----|-------|-------------|---------------|
| `acid_cloud` | CLOUD | 3D depth-scatter particle field (WebGL) | density: 1000-50000 |
| `acid_led` | LED | Circular dots, brightness = opacity | gridSize: 4-16 |
| `acid_slit` | SLIT | Time-slice accumulation (WebGL) | speed: 1-10 |
| `acid_voronoi` | VORONOI | Cell decomposition mosaic (WebGL) | cellCount: 16-256 |

---

## Task 1: Create Acid Store

**Files:**
- Create: `src/stores/acidStore.ts`

**Step 1: Create the store with all effect state**

```typescript
import { create } from 'zustand'

// Shape types
type DotShape = 'circle' | 'square' | 'diamond'
type GlyphCharset = 'geometric' | 'arrows' | 'blocks' | 'math'
type IconSet = 'tech' | 'nature' | 'abstract' | 'faces'
type SliceDirection = 'horizontal' | 'vertical' | 'both'
type DecompFillMode = 'solid' | 'average' | 'original'
type VoronoiSeedMode = 'random' | 'brightness' | 'edges'
type VoronoiFillMode = 'average' | 'centroid' | 'original'

// Parameter interfaces
interface DotsParams {
  gridSize: number
  dotScale: number
  threshold: number
  shape: DotShape
}

interface GlyphParams {
  gridSize: number
  charset: GlyphCharset
  density: number
  invert: boolean
}

interface IconsParams {
  gridSize: number
  iconSet: IconSet
  rotation: number
  colorMode: 'mono' | 'tint' | 'original'
}

interface ContourParams {
  levels: number
  lineWidth: number
  smooth: number
  animate: boolean
}

interface DecompParams {
  minBlock: number
  maxBlock: number
  threshold: number
  showGrid: boolean
  fillMode: DecompFillMode
}

interface MirrorParams {
  segments: number
  centerX: number
  centerY: number
  rotation: number
}

interface SliceParams {
  sliceCount: number
  direction: SliceDirection
  offset: number
  wave: boolean
}

interface ThgridParams {
  threshold: number
  gridSize: number
  lineWidth: number
  invert: boolean
  cornerMarks: boolean
}

interface CloudParams {
  density: number
  depthScale: number
  perspective: number
  rotate: boolean
}

interface LedParams {
  gridSize: number
  dotSize: number
  brightness: number
  bleed: number
}

interface SlitParams {
  slitPosition: number
  direction: 'horizontal' | 'vertical'
  speed: number
  blend: number
}

interface VoronoiParams {
  cellCount: number
  seedMode: VoronoiSeedMode
  showEdges: boolean
  fillMode: VoronoiFillMode
}

interface AcidState {
  // Global
  preserveVideo: boolean
  setPreserveVideo: (v: boolean) => void

  // DOTS
  dotsEnabled: boolean
  dotsParams: DotsParams
  setDotsEnabled: (v: boolean) => void
  updateDotsParams: (p: Partial<DotsParams>) => void

  // GLYPH
  glyphEnabled: boolean
  glyphParams: GlyphParams
  setGlyphEnabled: (v: boolean) => void
  updateGlyphParams: (p: Partial<GlyphParams>) => void

  // ICONS
  iconsEnabled: boolean
  iconsParams: IconsParams
  setIconsEnabled: (v: boolean) => void
  updateIconsParams: (p: Partial<IconsParams>) => void

  // CONTOUR
  contourEnabled: boolean
  contourParams: ContourParams
  setContourEnabled: (v: boolean) => void
  updateContourParams: (p: Partial<ContourParams>) => void

  // DECOMP
  decompEnabled: boolean
  decompParams: DecompParams
  setDecompEnabled: (v: boolean) => void
  updateDecompParams: (p: Partial<DecompParams>) => void

  // MIRROR
  mirrorEnabled: boolean
  mirrorParams: MirrorParams
  setMirrorEnabled: (v: boolean) => void
  updateMirrorParams: (p: Partial<MirrorParams>) => void

  // SLICE
  sliceEnabled: boolean
  sliceParams: SliceParams
  setSliceEnabled: (v: boolean) => void
  updateSliceParams: (p: Partial<SliceParams>) => void

  // THGRID
  thgridEnabled: boolean
  thgridParams: ThgridParams
  setThgridEnabled: (v: boolean) => void
  updateThgridParams: (p: Partial<ThgridParams>) => void

  // CLOUD
  cloudEnabled: boolean
  cloudParams: CloudParams
  setCloudEnabled: (v: boolean) => void
  updateCloudParams: (p: Partial<CloudParams>) => void

  // LED
  ledEnabled: boolean
  ledParams: LedParams
  setLedEnabled: (v: boolean) => void
  updateLedParams: (p: Partial<LedParams>) => void

  // SLIT
  slitEnabled: boolean
  slitParams: SlitParams
  setSlitEnabled: (v: boolean) => void
  updateSlitParams: (p: Partial<SlitParams>) => void

  // VORONOI
  voronoiEnabled: boolean
  voronoiParams: VoronoiParams
  setVoronoiEnabled: (v: boolean) => void
  updateVoronoiParams: (p: Partial<VoronoiParams>) => void
}

export const useAcidStore = create<AcidState>((set) => ({
  // Global
  preserveVideo: false,
  setPreserveVideo: (v) => set({ preserveVideo: v }),

  // DOTS
  dotsEnabled: false,
  dotsParams: { gridSize: 8, dotScale: 1.0, threshold: 20, shape: 'circle' },
  setDotsEnabled: (v) => set({ dotsEnabled: v }),
  updateDotsParams: (p) => set((s) => ({ dotsParams: { ...s.dotsParams, ...p } })),

  // GLYPH
  glyphEnabled: false,
  glyphParams: { gridSize: 12, charset: 'geometric', density: 0.8, invert: false },
  setGlyphEnabled: (v) => set({ glyphEnabled: v }),
  updateGlyphParams: (p) => set((s) => ({ glyphParams: { ...s.glyphParams, ...p } })),

  // ICONS
  iconsEnabled: false,
  iconsParams: { gridSize: 24, iconSet: 'tech', rotation: 0, colorMode: 'mono' },
  setIconsEnabled: (v) => set({ iconsEnabled: v }),
  updateIconsParams: (p) => set((s) => ({ iconsParams: { ...s.iconsParams, ...p } })),

  // CONTOUR
  contourEnabled: false,
  contourParams: { levels: 8, lineWidth: 1, smooth: 0.5, animate: false },
  setContourEnabled: (v) => set({ contourEnabled: v }),
  updateContourParams: (p) => set((s) => ({ contourParams: { ...s.contourParams, ...p } })),

  // DECOMP
  decompEnabled: false,
  decompParams: { minBlock: 16, maxBlock: 128, threshold: 30, showGrid: true, fillMode: 'average' },
  setDecompEnabled: (v) => set({ decompEnabled: v }),
  updateDecompParams: (p) => set((s) => ({ decompParams: { ...s.decompParams, ...p } })),

  // MIRROR
  mirrorEnabled: false,
  mirrorParams: { segments: 4, centerX: 0.5, centerY: 0.5, rotation: 0 },
  setMirrorEnabled: (v) => set({ mirrorEnabled: v }),
  updateMirrorParams: (p) => set((s) => ({ mirrorParams: { ...s.mirrorParams, ...p } })),

  // SLICE
  sliceEnabled: false,
  sliceParams: { sliceCount: 16, direction: 'horizontal', offset: 50, wave: true },
  setSliceEnabled: (v) => set({ sliceEnabled: v }),
  updateSliceParams: (p) => set((s) => ({ sliceParams: { ...s.sliceParams, ...p } })),

  // THGRID
  thgridEnabled: false,
  thgridParams: { threshold: 128, gridSize: 48, lineWidth: 1, invert: false, cornerMarks: true },
  setThgridEnabled: (v) => set({ thgridEnabled: v }),
  updateThgridParams: (p) => set((s) => ({ thgridParams: { ...s.thgridParams, ...p } })),

  // CLOUD
  cloudEnabled: false,
  cloudParams: { density: 10000, depthScale: 50, perspective: 1.0, rotate: false },
  setCloudEnabled: (v) => set({ cloudEnabled: v }),
  updateCloudParams: (p) => set((s) => ({ cloudParams: { ...s.cloudParams, ...p } })),

  // LED
  ledEnabled: false,
  ledParams: { gridSize: 8, dotSize: 0.7, brightness: 1.0, bleed: 0.2 },
  setLedEnabled: (v) => set({ ledEnabled: v }),
  updateLedParams: (p) => set((s) => ({ ledParams: { ...s.ledParams, ...p } })),

  // SLIT
  slitEnabled: false,
  slitParams: { slitPosition: 0.5, direction: 'vertical', speed: 3, blend: 0.5 },
  setSlitEnabled: (v) => set({ slitEnabled: v }),
  updateSlitParams: (p) => set((s) => ({ slitParams: { ...s.slitParams, ...p } })),

  // VORONOI
  voronoiEnabled: false,
  voronoiParams: { cellCount: 64, seedMode: 'brightness', showEdges: true, fillMode: 'average' },
  setVoronoiEnabled: (v) => set({ voronoiEnabled: v }),
  updateVoronoiParams: (p) => set((s) => ({ voronoiParams: { ...s.voronoiParams, ...p } })),
}))
```

**Step 2: Commit**

```bash
git add src/stores/acidStore.ts
git commit -m "feat: add acid effects store with 12 effect parameter sets"
```

---

## Task 2: Update Effects Config

**Files:**
- Modify: `src/config/effects.ts`

**Step 1: Update PAGE_NAMES**

Change line 12 from:
```typescript
export const PAGE_NAMES = ['GLITCH', 'VISION', 'RESERVED', 'RESERVED']
```
to:
```typescript
export const PAGE_NAMES = ['GLITCH', 'VISION', 'ACID', 'RESERVED']
```

**Step 2: Replace page 2 reserved entries with acid effects**

Replace lines 71-86 (the reserved_2_* entries) with:

```typescript
  // ═══════════════════════════════════════════════════════════════
  // PAGE 2: ACID (Data Visualization)
  // ═══════════════════════════════════════════════════════════════

  // Row 1: Symbol Replacement
  { id: 'acid_dots', label: 'DOTS', color: '#e5e5e5', row: 'render', page: 2, min: 4, max: 32 },
  { id: 'acid_glyph', label: 'GLYPH', color: '#d4d4d4', row: 'render', page: 2, min: 8, max: 24 },
  { id: 'acid_icons', label: 'ICONS', color: '#c4c4c4', row: 'render', page: 2, min: 16, max: 48 },
  { id: 'acid_contour', label: 'CONTOUR', color: '#b4b4b4', row: 'render', page: 2, min: 4, max: 20 },

  // Row 2: Geometric Restructuring
  { id: 'acid_decomp', label: 'DECOMP', color: '#94a3b8', row: 'distortion', page: 2, min: 8, max: 64 },
  { id: 'acid_mirror', label: 'MIRROR', color: '#7dd3fc', row: 'distortion', page: 2, min: 2, max: 8 },
  { id: 'acid_slice', label: 'SLICE', color: '#67e8f9', row: 'distortion', page: 2, min: 4, max: 64 },
  { id: 'acid_thgrid', label: 'THGRID', color: '#a5f3fc', row: 'distortion', page: 2, min: 0, max: 255 },

  // Row 3: Hybrid/Data Viz
  { id: 'acid_cloud', label: 'CLOUD', color: '#f0abfc', row: 'render', page: 2, min: 1000, max: 50000 },
  { id: 'acid_led', label: 'LED', color: '#c084fc', row: 'render', page: 2, min: 4, max: 16 },
  { id: 'acid_slit', label: 'SLIT', color: '#a78bfa', row: 'render', page: 2, min: 1, max: 10 },
  { id: 'acid_voronoi', label: 'VORONOI', color: '#818cf8', row: 'render', page: 2, min: 16, max: 256 },

  // Row 4: Reserved for expansion
  { id: 'acid_reserved_1', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'acid_reserved_2', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'acid_reserved_3', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
  { id: 'acid_reserved_4', label: '—', color: '#374151', row: 'reserved', page: 2, min: 0, max: 100 },
```

**Step 3: Commit**

```bash
git add src/config/effects.ts
git commit -m "feat: add ACID page with 12 data-viz effect definitions"
```

---

## Task 3: Create Individual Effect Renderers

**Files:**
- Create: `src/components/overlays/acid/dotsEffect.ts`
- Create: `src/components/overlays/acid/glyphEffect.ts`
- Create: `src/components/overlays/acid/iconsEffect.ts`
- Create: `src/components/overlays/acid/contourEffect.ts`
- Create: `src/components/overlays/acid/decompEffect.ts`
- Create: `src/components/overlays/acid/mirrorEffect.ts`
- Create: `src/components/overlays/acid/sliceEffect.ts`
- Create: `src/components/overlays/acid/thgridEffect.ts`
- Create: `src/components/overlays/acid/ledEffect.ts`

Each effect follows this pattern:

```typescript
// Example: dotsEffect.ts
export interface DotsParams {
  gridSize: number
  dotScale: number
  threshold: number
  shape: 'circle' | 'square' | 'diamond'
}

export function renderDots(
  sourceCtx: CanvasRenderingContext2D,
  destCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: DotsParams
) {
  const { gridSize, dotScale, threshold, shape } = params
  const sourceData = sourceCtx.getImageData(0, 0, width, height)
  const pixels = sourceData.data

  destCtx.fillStyle = '#000'
  destCtx.fillRect(0, 0, width, height)
  destCtx.fillStyle = '#fff'

  for (let y = 0; y < height; y += gridSize) {
    for (let x = 0; x < width; x += gridSize) {
      // Sample center of cell
      const i = ((y + gridSize / 2) * width + (x + gridSize / 2)) * 4
      const r = pixels[i] || 0
      const g = pixels[i + 1] || 0
      const b = pixels[i + 2] || 0
      const brightness = (r + g + b) / 3

      if (brightness < threshold) continue

      const radius = (brightness / 255) * (gridSize / 2) * dotScale

      if (shape === 'circle') {
        destCtx.beginPath()
        destCtx.arc(x + gridSize / 2, y + gridSize / 2, radius, 0, Math.PI * 2)
        destCtx.fill()
      } else if (shape === 'square') {
        destCtx.fillRect(
          x + gridSize / 2 - radius,
          y + gridSize / 2 - radius,
          radius * 2,
          radius * 2
        )
      } else if (shape === 'diamond') {
        destCtx.save()
        destCtx.translate(x + gridSize / 2, y + gridSize / 2)
        destCtx.rotate(Math.PI / 4)
        destCtx.fillRect(-radius, -radius, radius * 2, radius * 2)
        destCtx.restore()
      }
    }
  }
}
```

Similar implementations for each effect. See individual task files for complete code.

**Step: Commit after each effect**

```bash
git add src/components/overlays/acid/
git commit -m "feat: add [effectName] renderer"
```

---

## Task 4: Create WebGL Effects

**Files:**
- Create: `src/components/overlays/acid/cloudEffect.ts`
- Create: `src/components/overlays/acid/slitEffect.ts`
- Create: `src/components/overlays/acid/voronoiEffect.ts`

These use WebGL for performance. Each creates its own WebGL context on a separate canvas.

**cloudEffect.ts** - Point cloud with depth displacement from brightness
**slitEffect.ts** - Time-slice accumulation using framebuffer history
**voronoiEffect.ts** - Jump flooding algorithm for voronoi cells

---

## Task 5: Create AcidOverlay Component

**Files:**
- Create: `src/components/overlays/AcidOverlay.tsx`

**Step 1: Create the overlay component**

```typescript
import { useRef, useEffect } from 'react'
import { useAcidStore } from '../../stores/acidStore'
import { renderDots } from './acid/dotsEffect'
import { renderGlyph } from './acid/glyphEffect'
import { renderIcons } from './acid/iconsEffect'
import { renderContour } from './acid/contourEffect'
import { renderDecomp } from './acid/decompEffect'
import { renderMirror } from './acid/mirrorEffect'
import { renderSlice } from './acid/sliceEffect'
import { renderThgrid } from './acid/thgridEffect'
import { renderLed } from './acid/ledEffect'
// WebGL effects imported separately

interface AcidOverlayProps {
  sourceCanvas: HTMLCanvasElement | null
  width: number
  height: number
}

export function AcidOverlay({ sourceCanvas, width, height }: AcidOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  const {
    preserveVideo,
    dotsEnabled, dotsParams,
    glyphEnabled, glyphParams,
    iconsEnabled, iconsParams,
    contourEnabled, contourParams,
    decompEnabled, decompParams,
    mirrorEnabled, mirrorParams,
    sliceEnabled, sliceParams,
    thgridEnabled, thgridParams,
    cloudEnabled, cloudParams,
    ledEnabled, ledParams,
    slitEnabled, slitParams,
    voronoiEnabled, voronoiParams,
  } = useAcidStore()

  const anyEnabled = dotsEnabled || glyphEnabled || iconsEnabled || contourEnabled ||
    decompEnabled || mirrorEnabled || sliceEnabled || thgridEnabled ||
    cloudEnabled || ledEnabled || slitEnabled || voronoiEnabled

  useEffect(() => {
    if (!anyEnabled || !sourceCanvas || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const sourceCtx = sourceCanvas.getContext('2d')
    if (!sourceCtx) return

    const animate = () => {
      // Clear or preserve
      if (!preserveVideo) {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, width, height)
      } else {
        ctx.drawImage(sourceCanvas, 0, 0)
      }

      // Apply enabled effects in order
      if (dotsEnabled) renderDots(sourceCtx, ctx, width, height, dotsParams)
      if (glyphEnabled) renderGlyph(sourceCtx, ctx, width, height, glyphParams)
      if (iconsEnabled) renderIcons(sourceCtx, ctx, width, height, iconsParams)
      if (contourEnabled) renderContour(sourceCtx, ctx, width, height, contourParams)
      if (decompEnabled) renderDecomp(sourceCtx, ctx, width, height, decompParams)
      if (mirrorEnabled) renderMirror(sourceCtx, ctx, width, height, mirrorParams)
      if (sliceEnabled) renderSlice(sourceCtx, ctx, width, height, sliceParams)
      if (thgridEnabled) renderThgrid(sourceCtx, ctx, width, height, thgridParams)
      if (ledEnabled) renderLed(sourceCtx, ctx, width, height, ledParams)
      // WebGL effects handle their own rendering

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [anyEnabled, sourceCanvas, width, height, preserveVideo,
      dotsEnabled, dotsParams, glyphEnabled, glyphParams,
      iconsEnabled, iconsParams, contourEnabled, contourParams,
      decompEnabled, decompParams, mirrorEnabled, mirrorParams,
      sliceEnabled, sliceParams, thgridEnabled, thgridParams,
      ledEnabled, ledParams])

  if (!anyEnabled) return null

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 15 }}
    />
  )
}
```

**Step 2: Commit**

```bash
git add src/components/overlays/AcidOverlay.tsx
git commit -m "feat: add AcidOverlay component with effect orchestration"
```

---

## Task 6: Wire Up PerformanceGrid

**Files:**
- Modify: `src/components/performance/PerformanceGrid.tsx`

**Step 1: Import acidStore**

Add import:
```typescript
import { useAcidStore } from '../../stores/acidStore'
```

**Step 2: Add acid store hook**

```typescript
const acid = useAcidStore()
```

**Step 3: Add cases for each acid effect in getEffectState()**

Add after the vision tracking cases:

```typescript
    // ═══════════════════════════════════════════════════════════════
    // PAGE 2: ACID EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'acid_dots':
      return {
        active: acid.dotsEnabled,
        value: acid.dotsParams.gridSize,
        onToggle: () => acid.setDotsEnabled(!acid.dotsEnabled),
        onValueChange: (v: number) => acid.updateDotsParams({ gridSize: v }),
      }
    case 'acid_glyph':
      return {
        active: acid.glyphEnabled,
        value: acid.glyphParams.gridSize,
        onToggle: () => acid.setGlyphEnabled(!acid.glyphEnabled),
        onValueChange: (v: number) => acid.updateGlyphParams({ gridSize: v }),
      }
    case 'acid_icons':
      return {
        active: acid.iconsEnabled,
        value: acid.iconsParams.gridSize,
        onToggle: () => acid.setIconsEnabled(!acid.iconsEnabled),
        onValueChange: (v: number) => acid.updateIconsParams({ gridSize: v }),
      }
    case 'acid_contour':
      return {
        active: acid.contourEnabled,
        value: acid.contourParams.levels,
        onToggle: () => acid.setContourEnabled(!acid.contourEnabled),
        onValueChange: (v: number) => acid.updateContourParams({ levels: v }),
      }
    case 'acid_decomp':
      return {
        active: acid.decompEnabled,
        value: acid.decompParams.minBlock,
        onToggle: () => acid.setDecompEnabled(!acid.decompEnabled),
        onValueChange: (v: number) => acid.updateDecompParams({ minBlock: v }),
      }
    case 'acid_mirror':
      return {
        active: acid.mirrorEnabled,
        value: acid.mirrorParams.segments,
        onToggle: () => acid.setMirrorEnabled(!acid.mirrorEnabled),
        onValueChange: (v: number) => acid.updateMirrorParams({ segments: v }),
      }
    case 'acid_slice':
      return {
        active: acid.sliceEnabled,
        value: acid.sliceParams.sliceCount,
        onToggle: () => acid.setSliceEnabled(!acid.sliceEnabled),
        onValueChange: (v: number) => acid.updateSliceParams({ sliceCount: v }),
      }
    case 'acid_thgrid':
      return {
        active: acid.thgridEnabled,
        value: acid.thgridParams.threshold,
        onToggle: () => acid.setThgridEnabled(!acid.thgridEnabled),
        onValueChange: (v: number) => acid.updateThgridParams({ threshold: v }),
      }
    case 'acid_cloud':
      return {
        active: acid.cloudEnabled,
        value: acid.cloudParams.density,
        onToggle: () => acid.setCloudEnabled(!acid.cloudEnabled),
        onValueChange: (v: number) => acid.updateCloudParams({ density: v }),
      }
    case 'acid_led':
      return {
        active: acid.ledEnabled,
        value: acid.ledParams.gridSize,
        onToggle: () => acid.setLedEnabled(!acid.ledEnabled),
        onValueChange: (v: number) => acid.updateLedParams({ gridSize: v }),
      }
    case 'acid_slit':
      return {
        active: acid.slitEnabled,
        value: acid.slitParams.speed,
        onToggle: () => acid.setSlitEnabled(!acid.slitEnabled),
        onValueChange: (v: number) => acid.updateSlitParams({ speed: v }),
      }
    case 'acid_voronoi':
      return {
        active: acid.voronoiEnabled,
        value: acid.voronoiParams.cellCount,
        onToggle: () => acid.setVoronoiEnabled(!acid.voronoiEnabled),
        onValueChange: (v: number) => acid.updateVoronoiParams({ cellCount: v }),
      }
```

**Step 4: Commit**

```bash
git add src/components/performance/PerformanceGrid.tsx
git commit -m "feat: wire acid effects to performance grid"
```

---

## Task 7: Add ExpandedParameterPanel Controls

**Files:**
- Modify: `src/components/performance/ExpandedParameterPanel.tsx`

Add parameter controls for each acid effect following the existing pattern. Example for DOTS:

```typescript
case 'acid_dots':
  return (
    <div className="space-y-1">
      <SliderRow
        label="Grid Size"
        value={acid.dotsParams.gridSize}
        min={4}
        max={32}
        step={2}
        onChange={(v) => acid.updateDotsParams({ gridSize: v })}
        format={(v) => `${v.toFixed(0)}px`}
        paramId="acid_dots.gridSize"
      />
      <SliderRow
        label="Dot Scale"
        value={acid.dotsParams.dotScale}
        min={0.5}
        max={2}
        step={0.1}
        onChange={(v) => acid.updateDotsParams({ dotScale: v })}
        paramId="acid_dots.dotScale"
      />
      <SliderRow
        label="Threshold"
        value={acid.dotsParams.threshold}
        min={0}
        max={255}
        step={5}
        onChange={(v) => acid.updateDotsParams({ threshold: v })}
        format={(v) => v.toFixed(0)}
        paramId="acid_dots.threshold"
      />
      <SelectRow
        label="Shape"
        value={acid.dotsParams.shape}
        options={[
          { value: 'circle', label: 'Circle' },
          { value: 'square', label: 'Square' },
          { value: 'diamond', label: 'Diamond' },
        ]}
        onChange={(v) => acid.updateDotsParams({ shape: v as 'circle' | 'square' | 'diamond' })}
      />
      <SectionLabel label="Global" />
      <ToggleRow
        label="Preserve Video"
        value={acid.preserveVideo}
        onChange={(v) => acid.setPreserveVideo(v)}
      />
    </div>
  )
```

Repeat for all 12 effects with their respective parameters.

**Step: Commit**

```bash
git add src/components/performance/ExpandedParameterPanel.tsx
git commit -m "feat: add acid effect parameter controls"
```

---

## Task 8: Integrate AcidOverlay into Canvas

**Files:**
- Modify: `src/components/Canvas.tsx`

**Step 1: Import and render AcidOverlay**

Add the AcidOverlay component alongside VisionTrackingOverlay, passing the source canvas reference.

**Step 2: Commit**

```bash
git add src/components/Canvas.tsx
git commit -m "feat: integrate AcidOverlay into main canvas"
```

---

## Summary

**New files:**
- `src/stores/acidStore.ts`
- `src/components/overlays/AcidOverlay.tsx`
- `src/components/overlays/acid/dotsEffect.ts`
- `src/components/overlays/acid/glyphEffect.ts`
- `src/components/overlays/acid/iconsEffect.ts`
- `src/components/overlays/acid/contourEffect.ts`
- `src/components/overlays/acid/decompEffect.ts`
- `src/components/overlays/acid/mirrorEffect.ts`
- `src/components/overlays/acid/sliceEffect.ts`
- `src/components/overlays/acid/thgridEffect.ts`
- `src/components/overlays/acid/ledEffect.ts`
- `src/components/overlays/acid/cloudEffect.ts`
- `src/components/overlays/acid/slitEffect.ts`
- `src/components/overlays/acid/voronoiEffect.ts`

**Modified files:**
- `src/config/effects.ts`
- `src/components/performance/PerformanceGrid.tsx`
- `src/components/performance/ExpandedParameterPanel.tsx`
- `src/components/Canvas.tsx`

**12 new effects across 3 categories:**
- Symbol Replacement: DOTS, GLYPH, ICONS, CONTOUR
- Geometric: DECOMP, MIRROR, SLICE, THGRID
- Hybrid/WebGL: CLOUD, LED, SLIT, VORONOI
