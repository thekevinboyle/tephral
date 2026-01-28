# Texture & Data Overlays Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add texture overlays (film grain, paper, light leaks) and data overlays (Strava-style info cards with custom text) to the video preview.

**Architecture:** Two new overlay systems rendered on top of existing effects. Texture overlay uses WebGL for blend modes. Data overlay uses HTML/CSS for crisp text with canvas fallback for export.

**Tech Stack:** React, Zustand, WebGL shaders, Canvas 2D API

---

## Texture Overlay System

### Store: `textureOverlayStore.ts`

```typescript
interface TextureOverlayState {
  enabled: boolean
  textureId: string
  blendMode: 'multiply' | 'screen' | 'overlay' | 'softLight'
  opacity: number      // 0-1
  scale: number        // 0.5-3
  animated: boolean
  animationSpeed: number // 0.1-2

  setEnabled: (enabled: boolean) => void
  setTextureId: (id: string) => void
  setBlendMode: (mode: BlendMode) => void
  setOpacity: (opacity: number) => void
  setScale: (scale: number) => void
  setAnimated: (animated: boolean) => void
  setAnimationSpeed: (speed: number) => void
}
```

### Texture Library

Built-in textures organized by category:

**Film:**
- `grain_fine` - Subtle film grain
- `grain_heavy` - Heavy 35mm grain
- `dust` - Dust and particles
- `scratches` - Film scratches
- `light_leak_warm` - Orange/red light leak (video)
- `light_leak_cool` - Blue/cyan light leak (video)

**Analog:**
- `vhs_noise` - VHS tracking noise
- `film_burn` - Film burn effect (video)
- `vignette` - Dark vignette

**Artistic:**
- `paper` - Paper texture
- `canvas` - Canvas weave
- `concrete` - Concrete texture
- `watercolor` - Watercolor paper

Static textures: PNG/JPG images in `/public/textures/`
Animated textures: Short looping WebM videos

### Component: `TextureOverlay.tsx`

- Full-screen WebGL canvas
- Fragment shader implements blend modes
- Procedural UV animation for static textures (shifts over time)
- Video textures for complex motion (light leaks, film burn)

### Blend Mode Shaders

Four essential blend modes:
- **Multiply** - Darkens, good for grain/dust
- **Screen** - Lightens, good for light leaks
- **Overlay** - Contrast boost, good for textures
- **Soft Light** - Subtle blend, good for paper/canvas

---

## Data Overlay System

### Store: `dataOverlayStore.ts`

```typescript
interface DataField {
  id: string
  label: string
  value: string
  visible: boolean
  autoValue?: () => string  // Function to compute auto value
}

interface DataOverlayState {
  enabled: boolean
  template: 'watermark' | 'statsBar' | 'titleCard' | 'socialCard'
  fields: DataField[]
  style: {
    fontSize: number    // 12-48
    color: string       // hex color
    opacity: number     // 0-1
    font: 'mono' | 'sans' | 'serif'
  }

  setEnabled: (enabled: boolean) => void
  setTemplate: (template: Template) => void
  updateField: (id: string, updates: Partial<DataField>) => void
  setStyle: (style: Partial<Style>) => void
}
```

### Templates

**Watermark (corner)**
- Fields: `text` (default: "TEPHRAL")
- Position selector: top-left, top-right, bottom-left, bottom-right
- Small, subtle branding

**Stats Bar (bottom)**
- Fields: `title`, `duration` (auto), `date` (auto), `custom`
- Horizontal bar at bottom of frame
- Semi-transparent background

**Title Card (centered)**
- Fields: `title`, `subtitle`
- Large centered text
- For intros/outros

**Social Card (Strava-style)**
- Fields: `title`, `subtitle`, `duration` (auto), `effectCount` (auto), `branding`
- Card layout with stats and branding
- Designed for social sharing

### Auto-Values

Pull from existing stores:
- `duration` - From `recordingStore.duration`
- `date` - Current date formatted
- `effectCount` - Count of enabled effects from `glitchEngineStore`

### Component: `DataOverlay.tsx`

- HTML/CSS overlay for crisp text rendering
- Absolute positioned over preview
- Each template is a styled React component
- CSS handles layout (flexbox/grid)

**Fonts:**
- Mono: JetBrains Mono (already loaded)
- Sans: Inter or system-ui
- Serif: Georgia or system serif

### Export Integration

`renderToCanvas(ctx: CanvasRenderingContext2D)` method:
- Called during video export
- Draws text using Canvas 2D API
- Matches HTML styling exactly

---

## UI Integration

### New Grid Page: "OVERLAY"

Add 4th page to PerformanceGrid:

Row 1 - Textures:
| Grain | Dust | Leak | Paper | Canvas | VHS |

Row 2 - Data:
| Watermark | Stats | Title | Social | — | — |

Row 3 - Controls:
| Multiply | Screen | Overlay | SoftLt | Anim | — |

### ParameterPanel Cards

When texture overlay active:
- LED + "TEXTURE" label
- Shows current texture name + blend mode

When data overlay active:
- LED + template name (e.g., "STATS BAR")
- Shows field count

### ExpandedParameterPanel

**Texture Section:**
- Texture picker (thumbnail grid)
- Blend mode buttons (4)
- Opacity slider
- Scale slider
- Animation toggle + speed slider

**Data Section:**
- Template selector (4 buttons)
- Field list:
  - Toggle visibility (eye icon)
  - Inline text input
  - Auto badge for computed fields
- Style controls:
  - Font size slider
  - Color picker (or preset swatches)
  - Opacity slider
  - Font buttons (Mono/Sans/Serif)

---

## Rendering Order

In `OverlayContainer.tsx`:

1. StippleOverlay
2. AsciiRenderOverlay
3. VisionTrackingOverlay
4. AcidOverlay
5. **TextureOverlay** (new)
6. **DataOverlay** (new - topmost)

Data overlay always renders last so text is never obscured.

---

## File Changes

### New Files
- `src/stores/textureOverlayStore.ts`
- `src/stores/dataOverlayStore.ts`
- `src/components/overlays/TextureOverlay.tsx`
- `src/components/overlays/DataOverlay.tsx`
- `public/textures/*.png` (static textures)
- `public/textures/*.webm` (animated textures)

### Modified Files
- `src/components/overlays/OverlayContainer.tsx`
- `src/config/effects.ts`
- `src/components/performance/PerformanceGrid.tsx`
- `src/components/performance/ParameterPanel.tsx`
- `src/components/performance/ExpandedParameterPanel.tsx`

---

## Implementation Order

### Task 1: Create Stores
Create `textureOverlayStore.ts` and `dataOverlayStore.ts` with state and actions.

### Task 2: Build TextureOverlay Component
WebGL canvas with blend mode shaders, texture loading, UV animation.

### Task 3: Build DataOverlay Component
HTML/CSS overlay with 4 template layouts, field rendering, styling.

### Task 4: Add OVERLAY Grid Page
Update effects config, add texture/data buttons to PerformanceGrid.

### Task 5: Wire Up ParameterPanel
Add texture and data overlay cards to ParameterPanel display.

### Task 6: Build ExpandedParameterPanel Sections
Texture picker, field editor, style controls.

### Task 7: Add Texture Assets
Create/source texture images and video clips.

### Task 8: Export Integration
Add `renderToCanvas()` for DataOverlay, ensure textures composite correctly.
