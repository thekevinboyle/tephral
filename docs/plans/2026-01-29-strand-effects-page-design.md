# Strand Effects Page Design

Death Stranding-inspired visual effects page for the Tephral effects grid.

## Overview

Add a new "Strand" page (Page 4) to the existing effects grid with 16 effects inspired by Death Stranding's visual language. Effects are organized into four themes: Chiral/BT, Strand/Connection, Chiralium/Tech, and Atmosphere.

## Integration

### Config Changes (`src/config/effects.ts`)

Add `STRAND_EFFECTS` array and update page navigation:

```typescript
export const STRAND_EFFECTS = [
  // Chiral/BT (black/orange)
  { id: 'strand_handprints', label: 'Handprints', color: '#1a1a1a', min: 1, max: 20 },
  { id: 'strand_tar', label: 'Tar Spread', color: '#ff6b35', min: 0, max: 100 },
  { id: 'strand_timefall', label: 'Timefall', color: '#4a5568', min: 0, max: 100 },
  { id: 'strand_voidout', label: 'Void Out', color: '#ff6b35', min: 0, max: 100 },

  // Strand/Connection (cyan)
  { id: 'strand_web', label: 'Strand Web', color: '#00d4ff', min: 0, max: 100 },
  { id: 'strand_bridge', label: 'Bridge Link', color: '#00d4ff', min: 8, max: 64 },
  { id: 'strand_path', label: 'Chiral Path', color: '#00d4ff', min: 10, max: 200 },
  { id: 'strand_umbilical', label: 'Umbilical', color: '#00d4ff', min: 2, max: 12 },

  // Chiralium/Tech (gold)
  { id: 'strand_odradek', label: 'Odradek', color: '#ffd700', min: 0, max: 100 },
  { id: 'strand_chiralium', label: 'Chiralium', color: '#ffd700', min: 0, max: 100 },
  { id: 'strand_beach', label: 'Beach Static', color: '#ffd700', min: 0, max: 100 },
  { id: 'strand_dooms', label: 'DOOMS Sense', color: '#ffd700', min: 0, max: 100 },

  // Atmosphere (purple)
  { id: 'strand_cloud', label: 'Chiral Cloud', color: '#7b68ee', min: 0, max: 100 },
  { id: 'strand_bbpod', label: 'BB Pod', color: '#7b68ee', min: 0, max: 100 },
  { id: 'strand_seam', label: 'Seam', color: '#7b68ee', min: 0, max: 100 },
  { id: 'strand_extinction', label: 'Extinction', color: '#7b68ee', min: 0, max: 100 },
]

export const PAGE_NAMES = ['Glitch', 'Vision', 'Acid', 'Overlay', 'Strand']
```

Update `getEffectsForPage()` to return `STRAND_EFFECTS` for page 4.

### New Store (`src/stores/strandStore.ts`)

Follows `acidStore.ts` pattern:

```typescript
interface StrandState {
  // Chiral/BT
  handprintsEnabled: boolean
  handprintsParams: { density: number; fadeSpeed: number; size: number }
  tarSpreadEnabled: boolean
  tarSpreadParams: { spreadSpeed: number; threshold: number; coverage: number }
  timefallEnabled: boolean
  timefallParams: { intensity: number; streakCount: number; ageAmount: number }
  voidOutEnabled: boolean
  voidOutParams: { speed: number; distortAmount: number; ringWidth: number }

  // Strand/Connection
  strandWebEnabled: boolean
  strandWebParams: { threshold: number; maxConnections: number; glowIntensity: number }
  bridgeLinkEnabled: boolean
  bridgeLinkParams: { gridSize: number; edgeSensitivity: number; opacity: number }
  chiralPathEnabled: boolean
  chiralPathParams: { particleCount: number; trailLength: number; flowSpeed: number }
  umbilicalEnabled: boolean
  umbilicalParams: { tendrilCount: number; reachDistance: number; pulseSpeed: number }

  // Chiralium/Tech
  odradekEnabled: boolean
  odradekParams: { sweepSpeed: number; revealDuration: number; pingIntensity: number }
  chiraliumEnabled: boolean
  chiraliumParams: { threshold: number; density: number; shimmer: number }
  beachStaticEnabled: boolean
  beachStaticParams: { grainAmount: number; invertProbability: number; flickerSpeed: number }
  doomsEnabled: boolean
  doomsParams: { haloSize: number; pulseSpeed: number; sensitivity: number }

  // Atmosphere
  chiralCloudEnabled: boolean
  chiralCloudParams: { density: number; responsiveness: number; tint: number }
  bbPodEnabled: boolean
  bbPodParams: { vignetteSize: number; tintStrength: number; causticAmount: number }
  seamEnabled: boolean
  seamParams: { riftWidth: number; parallaxAmount: number; edgeDistort: number }
  extinctionEnabled: boolean
  extinctionParams: { erosionSpeed: number; decayStages: number; coverage: number }

  // Actions for each effect...
}
```

### PerformanceGrid Updates

- Import `useStrandStore`
- Add 16 cases to `getEffectState()` for strand effect IDs
- Update page navigation max from 3 to 4

## Effect Implementations

### Chiral/BT Effects

#### Handprints (`handprintsEffect.ts`)
- Renders 5-12 black handprint sprites at random positions
- Each handprint fades in over 0.5s, holds, then fades out
- Parameters: `density` (count), `fadeSpeed`, `size`
- Implementation: Canvas 2D overlay with pre-rendered handprint PNG sprites, alpha-animated

#### Tar Spread (`tarSpreadEffect.ts`)
- Black liquid creeps in from edges or spreads from dark regions of source
- Uses threshold on source luminance to "seed" tar locations
- Parameters: `spreadSpeed`, `threshold`, `coverage`
- Implementation: WebGL shader using cellular automata-style expansion from dark seeds

#### Timefall (`timefallEffect.ts`)
- Vertical rain streaks moving downward
- Where streaks pass, adds grain/noise and slight desaturation (aging)
- Parameters: `intensity`, `streakCount`, `ageAmount`
- Implementation: Two-pass shader - rain streak mask, then noise/desat where mask active

#### Void Out (`voidOutEffect.ts`)
- Circular shockwave distortion expanding from center
- Inside ring: inverted/distorted, outside: normal
- Parameters: `speed`, `distortAmount`, `ringWidth`
- Implementation: WebGL displacement shader with animated radius uniform

### Strand/Connection Effects

#### Strand Web (`strandWebEffect.ts`)
- Detects bright points in image (local maxima above threshold)
- Draws glowing cyan lines connecting nearby points
- Lines pulse with traveling light particles
- Parameters: `threshold`, `maxConnections`, `glowIntensity`
- Implementation: Canvas 2D - brightness detection finds points, bezier curves between neighbors

#### Bridge Link (`bridgeLinkEffect.ts`)
- Hexagonal grid overlay across the frame
- Hexagons near detected edges glow brighter
- Parameters: `gridSize`, `edgeSensitivity`, `opacity`
- Implementation: WebGL shader renders hex grid, samples edge detection for brightness

#### Chiral Path (`chiralPathEffect.ts`)
- Particles flow along motion vectors in the image
- Creates ribbon-like trails following movement
- Parameters: `particleCount`, `trailLength`, `flowSpeed`
- Implementation: Motion detection (frame diff), particles follow flow field, Canvas 2D trails

#### Umbilical (`umbilicalEffect.ts`)
- Pulsing organic tendrils from screen edges toward center/bright regions
- Tendrils wave gently with cord-like texture
- Parameters: `tendrilCount`, `reachDistance`, `pulseSpeed`
- Implementation: Canvas 2D bezier curves, sine-animated control points, gradient stroke

### Chiralium/Tech Effects

#### Odradek Scan (`odradekEffect.ts`)
- Radar-style sweep line rotating around screen center
- Sweep reveals edge detection briefly, leaves fading ping trail
- Parameters: `sweepSpeed`, `revealDuration`, `pingIntensity`
- Implementation: WebGL shader with angle-based mask, composites edge detection

#### Chiralium (`chiraliumEffect.ts`)
- Golden crystalline fracture patterns on bright/highlight areas
- Sharp geometric edges with slight refraction
- Parameters: `threshold`, `density`, `shimmer`
- Implementation: Voronoi pattern shader masked to highlights, animated vertex jitter

#### Beach Static (`beachStaticEffect.ts`)
- Grainy otherworldly static with inverted luminance zones
- Random patches flip to negative
- Parameters: `grainAmount`, `invertProbability`, `flickerSpeed`
- Implementation: Noise shader with random block inversion, animated seed

#### DOOMS Sense (`doomsEffect.ts`)
- Soft luminous halos around bright regions or detected motion
- Halos pulse slowly with ethereal blur
- Parameters: `haloSize`, `pulseSpeed`, `sensitivity`
- Implementation: Blur pass on thresholded brightness, additive glow composite

### Atmosphere Effects

#### Chiral Cloud (`chiralCloudEffect.ts`)
- Fog that pools in dark areas, thins over bright areas
- Subtle swirling animation, purple/blue tint
- Parameters: `density`, `responsiveness`, `tint`
- Implementation: Perlin noise fog, opacity modulated by inverted luminance

#### BB Pod (`bbPodEffect.ts`)
- Circular amber-tinted vignette simulating pod view
- Edge has liquid caustic distortion, rising bubbles
- Parameters: `vignetteSize`, `tintStrength`, `causticAmount`
- Implementation: Radial gradient vignette, caustic displacement, bubble particles

#### Seam (`seamEffect.ts`)
- Vertical tear/rift splitting the image
- Each side has parallax offset, dark void in gap
- Parameters: `riftWidth`, `parallaxAmount`, `edgeDistort`
- Implementation: WebGL UV split shader, gap fill with noise, edge displacement

#### Extinction (`extinctionEffect.ts`)
- Slow erosion/decay from edges inward
- Eroded areas: desaturate → noise → black
- Parameters: `erosionSpeed`, `decayStages`, `coverage`
- Implementation: Animated edge-distance mask, multi-stage decay shader

## Overlay Architecture

### StrandOverlay Component (`src/components/overlays/StrandOverlay.tsx`)

```typescript
interface StrandOverlayProps {
  sourceCanvas: HTMLCanvasElement | null
  width: number
  height: number
}
```

### Two Canvas Layers

**Canvas 2D layer** - Sprite/path effects:
- Handprints, Strand Web, Chiral Path, Umbilical, BB Pod bubbles

**WebGL layer** - Shader effects:
- Tar Spread, Void Out, Bridge Link, Odradek, Chiralium
- Beach Static, DOOMS Sense, Chiral Cloud, Seam, Extinction, Timefall

### Render Loop
- Single `requestAnimationFrame` loop
- Reads enabled state from `strandStore.getState()`
- Each effect receives: source canvas, output context, dimensions, deltaTime, params
- WebGL effects share single GL context

### Integration

Add to `OverlayContainer.tsx` after AcidOverlay:

```tsx
<StrandOverlay
  sourceCanvas={glCanvas}
  width={dimensions.width}
  height={dimensions.height}
/>
```

## File Structure

```
src/
├── stores/
│   └── strandStore.ts
├── components/
│   └── overlays/
│       ├── StrandOverlay.tsx
│       └── strand/
│           ├── handprintsEffect.ts
│           ├── tarSpreadEffect.ts
│           ├── timefallEffect.ts
│           ├── voidOutEffect.ts
│           ├── strandWebEffect.ts
│           ├── bridgeLinkEffect.ts
│           ├── chiralPathEffect.ts
│           ├── umbilicalEffect.ts
│           ├── odradekEffect.ts
│           ├── chiraliumEffect.ts
│           ├── beachStaticEffect.ts
│           ├── doomsEffect.ts
│           ├── chiralCloudEffect.ts
│           ├── bbPodEffect.ts
│           ├── seamEffect.ts
│           └── extinctionEffect.ts
├── config/
│   └── effects.ts (updated)
└── assets/
    └── strand/
        └── handprint.png
```

## Implementation Order

1. Store and config (foundation)
2. StrandOverlay component skeleton
3. Simple Canvas 2D effects first (Handprints, Strand Web)
4. WebGL shader effects (Void Out, Beach Static)
5. Complex effects requiring motion detection (Chiral Path)
6. Polish and parameter tuning
