# Blob Tracking Effect Design

## Overview

Replace ML-based detection with a unified **DETECT** effect featuring blob tracking, motion trails, and generative visual styling inspired by TouchDesigner.

## Architecture

### Single DETECT Effect

**Replaces:** ML object detection, Detection Overlay, Point Network

**Detection Modes** (mutually exclusive):
- **Brightness** - Threshold-based, detect light or dark regions
- **Motion** - Frame differencing, detect movement between frames
- **Color** - Isolate specific hue/saturation range

**Output per frame:** Array of blobs, each with:
- Position (x, y normalized 0-1)
- Size (width, height or radius)
- Velocity, age (for trail system)

---

## Detection Mode Parameters

### Brightness Mode
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| threshold | number | 0-1 | Cutoff for light/dark detection |
| invert | bool | - | Detect dark regions instead of light |
| minSize | number | 0-1 | Minimum blob size (normalized) |
| maxSize | number | 0-1 | Maximum blob size (normalized) |
| blurAmount | number | 0-20 | Pre-blur to reduce noise |

### Motion Mode
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| sensitivity | number | 0-1 | How much change triggers detection |
| decayRate | number | 0-1 | How fast reference frame updates |
| minSize | number | 0-1 | Minimum blob size |
| maxSize | number | 0-1 | Maximum blob size |

### Color Mode
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| targetHue | number | 0-360 | Color to isolate |
| hueRange | number | 0-180 | Tolerance for hue matching |
| saturationMin | number | 0-1 | Minimum saturation to detect |
| brightnessMin | number | 0-1 | Minimum brightness to detect |

### Shared Parameters
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| maxBlobs | number | 1-50 | Limit number of tracked blobs |
| smoothing | number | 0-1 | Position smoothing to reduce jitter |

---

## Trail System

### Trail Modes
- **Fade** - Points fade out over time
- **Fixed Length** - Keep last N positions per blob
- **Persistent** - Accumulate until manual clear

### Trail Parameters
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| trailEnabled | bool | - | Toggle trails on/off |
| trailMode | enum | fade/fixed/persistent | Decay behavior |
| fadeTime | number | 0.5-10s | For fade mode |
| trailLength | number | 10-500 | Points to keep (fixed length mode) |
| recordInterval | number | 16-100ms | Position sampling rate |

### Trail Rendering
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| lineWidth | number | 1-10px | Trail line thickness |
| lineColor | color | - | Solid or gradient |
| lineSmoothness | number | 0-1 | Bezier curve interpolation |
| lineOpacity | number | 0-1 | Trail transparency |

---

## Visual Style

### Blob Appearance
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| blobStyle | enum | box/circle/none | Shape around detected blobs |
| blobFill | bool | - | Filled or outline only |
| blobColor | color | - | Primary color |
| blobOpacity | number | 0-1 | Blob transparency |
| blobLineWidth | number | 1-6px | For outline mode |

### Glow Effect
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| glowEnabled | bool | - | Toggle glow |
| glowIntensity | number | 0-1 | Blur amount/spread |
| glowColor | color | - | Usually matches blob/line color |

### Connecting Lines
| Parameter | Type | Range | Description |
|-----------|------|-------|-------------|
| connectEnabled | bool | - | Toggle connections |
| connectMaxDistance | number | 0-1 | Only connect nearby blobs |
| connectColor | color | - | Line color |
| connectWidth | number | 1-4px | Line thickness |
| connectStyle | enum | solid/dashed/curved | Line style |

### Style Presets
- **Technical** - Thin white lines, no glow, sharp corners
- **Neon** - Bright colors, heavy glow, high contrast
- **Organic** - Curved lines, soft colors, smoothed trails

---

## UI Integration

### Effect Grid Changes
- **Remove:** DETECT (ML), Point Network effects
- **Add:** Unified DETECT effect
- Effect button shows current mode as subtitle (e.g., "DETECT · Motion")

### Graphic Panel Behavior
- **No effect selected:** Shows current visualization (as now)
- **Effect selected:** Panel switches to parameter editor
- Back button or click elsewhere returns to visualization

### Parameter Editor Layout
1. Mode selector at top (Brightness / Motion / Color)
2. Collapsible sections:
   - Detection settings
   - Trails
   - Visuals
   - Connections
3. Style presets dropdown
4. "Clear Trails" button

### Parameter Strip (horizontal)
- Shows 4-5 most-used params for selected effect
- Full control remains in Graphic Panel

---

## Files to Modify/Create

### Remove
- `src/stores/detectionOverlayStore.ts`
- `src/stores/pointNetworkStore.ts`
- Detection-related ML code

### Create
- `src/stores/blobDetectStore.ts` - New unified store
- `src/effects/blob-detect/BrightnessDetector.ts`
- `src/effects/blob-detect/MotionDetector.ts`
- `src/effects/blob-detect/ColorDetector.ts`
- `src/effects/blob-detect/TrailSystem.ts`
- `src/effects/blob-detect/BlobRenderer.ts`
- `src/components/performance/EffectParameterEditor.tsx`

### Modify
- `src/config/effects.ts` - Update effect list
- `src/components/performance/GraphicPanelV2.tsx` - Add parameter editor mode
- `src/components/performance/PerformanceGrid.tsx` - Update effect display
- `src/stores/routingStore.ts` - Update snapshots for new effect
