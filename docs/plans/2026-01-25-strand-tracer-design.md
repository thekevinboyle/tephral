# strand-tracer Design Document

**Date:** 2026-01-25
**Status:** Approved

---

## Overview

**strand-tracer** is a fully client-side web application for real-time photo/video manipulation with a clean brutalist industrial aesthetic. It runs entirely in the browser, leveraging the user's GPU for all processing.

### Core Features
- Real-time camera effects + upload/process with export
- 5 stackable, chainable effect modules
- Full parameter exposure with preset save/recall
- Feedback loop system for recursive chaos
- Clean brutalist UI inspired by industrial design

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React UI Layer                      │
│    (Radix/shadcn components, brutalist skin)            │
├─────────────────────────────────────────────────────────┤
│                  Effect Composition Engine               │
│    (Three.js EffectComposer, effect chain management)   │
├─────────────────────────────────────────────────────────┤
│                    5 Effect Modules                      │
│  ┌─────────┬─────────┬─────────┬─────────┬───────────┐  │
│  │ Strand  │ Signal  │ Glitch  │Industrial│ Particle  │  │
│  │ Tracer  │ Decay   │ Engine  │Corruption│Dissolution│  │
│  └─────────┴─────────┴─────────┴─────────┴───────────┘  │
├─────────────────────────────────────────────────────────┤
│              Shader Pipeline (GLSL + WebGPU)             │
├─────────────────────────────────────────────────────────┤
│                Media Input Layer                         │
│         (Webcam / File Upload / Screen Capture)          │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
1. Media source feeds into a texture
2. Texture passes through enabled effect modules in user-defined order
3. Each module applies its GLSL shader passes
4. EffectComposer chains outputs, enabling feedback loops
5. Final output renders to canvas + available for export

---

## Effect Modules

### 1. Strand Tracer

The namesake module. Creates temporal persistence and connective tissue between frames.

#### Persistent Trails
- `trailDecay` (0-1) — How quickly trails fade. 0 = infinite persistence, 1 = instant fade
- `trailBlendMode` — Add, multiply, screen, difference
- `colorShift` — Hue rotation over trail lifetime
- `motionThreshold` — Minimum movement to trigger trail

#### Afterimage Echo
- `echoCount` (1-20) — Number of ghost frames
- `echoOffset` — Pixel displacement per echo
- `echoOpacity` — Falloff curve (linear, exponential, stepped)
- `echoTimeSpread` — Temporal delay between echoes (ms)

#### Strand Connections
- `strandDensity` — Number of connection points tracked
- `strandTension` — How taut vs. droopy the connecting lines
- `strandColor` — Solid, gradient, or sampled from source
- `strandDecay` — How long strands persist after points diverge
- `connectionThreshold` — Distance at which strands form/break

#### Motion Detection Settings (shared)
- `detectionMethod` — Frame differencing, optical flow, or edge-based
- `sensitivityZones` — Define regions of interest
- `noiseFloor` — Ignore micro-movements below threshold

---

### 2. Signal Decay

The analog nightmare module. Simulates corrupted video signals, broken transmission, dying hardware.

#### VHS Tracking
- `trackingInstability` (0-1) — How badly the signal drifts
- `trackingBands` — Number of horizontal distortion bands
- `rollSpeed` — Vertical roll rate when signal "loses lock"
- `headSwitchNoise` — Glitchy bar at frame bottom

#### Scan Lines
- `lineCount` — Density of scan lines
- `lineOpacity` — How visible the lines are
- `lineFlicker` — Randomized brightness variation
- `interlaceMode` — Off, authentic interlace, or pseudo-interlace

#### Signal Interference
- `staticAmount` — Grain/snow overlay intensity
- `staticSize` — Fine grain vs. chunky blocks
- `ghosting` — Faint offset duplicate (bad antenna signal)
- `colorBleed` — Chroma bleeds beyond luma boundaries

#### Datamosh
- `iFrameHold` — Freeze keyframes, let motion vectors go wild
- `pFrameDrift` — How much motion data corrupts over time
- `blockSize` — Compression block granularity
- `moshTrigger` — Manual, on motion spike, or random interval

#### Tape Damage
- `dropoutChance` — Random horizontal white/black streaks
- `warpAmount` — Wavy horizontal distortion (worn tape)
- `chromaDelay` — Color signal arrives late (misaligned heads)

---

### 3. Glitch Engine

The digital destruction toolkit. Clean, intentional pixel-level chaos.

#### Pixel Sorting
- `sortDirection` — Horizontal, vertical, or diagonal
- `sortMode` — By brightness, hue, saturation, or red/green/blue channel
- `threshold` — Brightness range that triggers sorting
- `sortLength` — How far sorted pixels streak
- `sortMask` — Apply only to regions (edge detection, motion areas)

#### RGB Channel Split
- `redOffset` — X/Y displacement of red channel
- `greenOffset` — X/Y displacement of green channel
- `blueOffset` — X/Y displacement of blue channel
- `splitAnimation` — Static, oscillating, or reactive to audio/motion
- `splitBlendMode` — How separated channels recombine

#### Block Displacement
- `blockSize` — Grid size for displacement chunks
- `displaceChance` — Probability a block shifts
- `displaceDistance` — How far blocks can jump
- `displaceSource` — Random, from motion vectors, or from audio
- `blockRepeat` — Displaced blocks can duplicate/smear

#### Compression Artifacts
- `jpegQuality` — Simulate aggressive JPEG compression
- `macroblockSize` — Visible block boundaries
- `dctNoise` — Corrupt frequency coefficients
- `artifactAccumulation` — Re-compress each frame (gets worse over time)

---

### 4. Industrial Corruption

The texture and material layer. Death Stranding's decayed future, rust belt aesthetics.

#### Rust & Corrosion
- `rustDensity` — Coverage amount
- `rustColor` — Orange-brown palette or custom
- `rustGrowth` — Spreads over time from edges/dark areas
- `rustTexture` — Procedural noise vs. sampled texture maps
- `corrosionDepth` — How much it "eats into" the image (displacement)

#### Metal Mesh Overlay
- `meshPattern` — Hexagonal, diamond, chain-link, perforated
- `meshScale` — Size of the pattern
- `meshOpacity` — Transparency of overlay
- `meshLighting` — Simulated metallic sheen/reflection
- `meshDamage` — Holes, tears, bent sections

#### Oil Slick Iridescence
- `iridescenceAmount` — Rainbow color shift intensity
- `slickMovement` — Flowing, pooling animation
- `slickSource` — Appears in shadows, highlights, or motion areas
- `spectrumRange` — Color palette of the iridescence

#### Grime Accumulation
- `grimeOpacity` — Overall dirtiness
- `grimeBias` — Collects in corners, edges, or random
- `grimeColor` — Black soot, brown dirt, green mold
- `grimeWipe` — Motion temporarily clears grime (reveals clean beneath)

#### Industrial Overlay
- `vignetteHarsh` — Burnt, hard-edged vignette
- `cautionStripes` — Hazard tape border elements
- `stencilMarks` — Random industrial typography/symbols

---

### 5. Particle Dissolution

The heavy compute module. Image breaks apart into particles, drifts, reforms.

#### Dissolution Trigger
- `triggerSource` — Motion, edges, brightness threshold, or manual mask
- `triggerSensitivity` — How easily pixels break loose
- `dissolveFrontSpeed` — How fast the dissolution spreads
- `reformChance` — Probability particles snap back to origin

#### Particle Behavior
- `particleCount` — Density (thousands to millions via WebGPU compute)
- `particleSize` — Point size or small sprites
- `particleShape` — Point, square, circle, custom texture
- `particleColor` — Sampled from source pixel, shifted, or overridden

#### Physics
- `gravity` — Downward pull (or any direction)
- `wind` — Directional force, can be animated
- `turbulence` — Perlin noise displacement
- `drag` — Air resistance / slowdown
- `particleLifespan` — How long before fade/death

#### Strand Interaction (cross-module)
- `strandAttachment` — Particles can trail strands behind them
- `clusterAttraction` — Particles gravitate toward each other
- `originTether` — Elastic pull back to source position

#### Render Style
- `additiveBlend` — Glowing particle accumulation
- `motionBlur` — Trails on fast-moving particles
- `depthSort` — Fake Z-depth for 3D feel
- `particleFeedback` — Particles affect next frame's dissolution trigger

---

## Effect Composition System

How effects chain, stack, and feed into each other.

### Effect Chain
- User-defined order — drag to reorder modules in the chain
- Each module's output feeds the next module's input
- Any module can be bypassed without breaking the chain

### Blend Modes Per Module
- `normal` — Replace
- `add` — Brighten accumulation
- `multiply` — Darken/shadow
- `screen` — Lighten
- `difference` — Invert where overlapping
- `overlay` — Contrast punch
- Custom mix amount (0-100%) per module

### Feedback Loop System
- `feedbackEnabled` — Route final output back to input
- `feedbackDecay` — How much signal degrades per loop
- `feedbackOffset` — Slight position shift per iteration (creates drift)
- `feedbackDelay` — Frames of delay before feedback (temporal smear)
- `feedbackTap` — Which point in the chain feeds back (not just final)

### Cross-Module Communication
- Motion data from Strand Tracer available to all modules
- Particle positions can drive Glitch Engine block displacement
- Signal Decay noise can trigger Particle Dissolution
- Shared parameter linking (one knob controls multiple params)

### Performance
- Per-module quality toggle (full / half / quarter resolution)
- Frame skip option for heavy chains
- GPU memory budget indicator

---

## UI/UX Design

Clean brutalist industrial aesthetic. The chaos is in the canvas — the controls are surgically precise.

### Layout Structure
```
┌──────────────────────────────────────────────────────────────┐
│  [STRAND-TRACER] ░░░░░░░░░░░░░░░░░░░ [CAPTURE] [EXPORT]     │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  EFFECT    │                                                 │
│  CHAIN     │              LIVE PREVIEW                       │
│  ────────  │              (main canvas)                      │
│  □ Strand  │                                                 │
│  □ Signal  │                                                 │
│  □ Glitch  │                                                 │
│  □ Indust. │                                                 │
│  □ Particle│                                                 │
│            │                                                 │
├────────────┴─────────────────────────────────────────────────┤
│  PARAMETERS ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  [sub-effect tabs]                                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ slider  │ │ slider  │ │ toggle  │ │ dropdown│   ...      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
├──────────────────────────────────────────────────────────────┤
│  PRESETS: [save] [load] ░░ [Preset1] [Preset2] [Preset3]    │
└──────────────────────────────────────────────────────────────┘
```

### Visual Style
- Light/dark mode toggle, both minimal
- High contrast: near-black (#0f0f0f) or near-white (#f5f5f5) base
- Single accent color — industrial yellow (#ffcc00) or safety orange
- Bold, oversized monospace typography for labels
- Generous whitespace, strict grid alignment
- Raw borders (1-2px solid, no shadows, no rounded corners)
- No textures, no noise — pure flat surfaces
- Uppercase labels, tight letter-spacing
- Exposed structure: visible gutters, explicit grid lines as design elements

### Component Style
- Sliders: thin track, rectangular thumb, numeric readout
- Toggles: square, no animation, instant state change
- Dropdowns: flat, full-width, sharp edges
- Panels: bordered containers, clear hierarchy through weight not color
- Buttons: outlined or solid fill, no gradients, no hover glow — just color invert

### Typography Hierarchy
- Module names: Bold, 14-16px, uppercase
- Parameter labels: Regular, 11-12px, uppercase, muted
- Values: Mono, 12px, full contrast

### Interaction Details
- Sliders show numeric value, click to type exact number
- Right-click any parameter for MIDI learn / randomize / reset
- Shift+drag for fine control
- Double-click to reset to default

---

## Preset System

Full state capture and recall.

### Preset Data Structure
- All 5 modules' parameter values
- Effect chain order
- Per-module enable/bypass state
- Per-module blend mode and mix amount
- Feedback loop configuration
- Cross-module parameter links

### Storage
- LocalStorage for quick saves (persists in browser)
- Export as JSON file for sharing/backup
- Import from JSON file
- Copy preset as URL (encoded in hash — shareable link loads exact state)

### Preset UI
- Save: Names preset, optional tags
- Quick slots: 8 numbered slots for fast A/B comparison (keyboard 1-8)
- Preset browser: searchable list, sorted by date or name
- Preset preview: thumbnail snapshot of effect at save time

### Preset Operations
- Duplicate preset
- Merge presets (blend parameters from two presets)
- Randomize from preset (use as base, randomize within ±range)
- Interpolate between two presets (morph slider)

### Factory Presets
- Ship with 10-15 curated presets demonstrating each module
- Named evocatively: "DEAD SIGNAL", "STRAND COLLAPSE", "OXIDE BLOOM"
- Locked from deletion, but can duplicate and modify

---

## Media Input/Output

### Input Sources
- **Webcam**: Select from available devices, resolution picker
- **File upload**: Drag-drop or file picker. Supports JPG, PNG, WebP, GIF, MP4, WebM
- **Screen capture**: Browser screen/window/tab capture API
- **Image URL**: Paste a URL, fetch and load (CORS permitting)

### Input Controls
- Play/pause for video sources
- Scrub timeline for uploaded video
- Loop toggle
- Playback speed (0.25x - 2x)
- Flip horizontal/vertical
- Crop/zoom before processing

### Output Formats
- **Screenshot**: PNG (lossless) or WebP (smaller)
- **GIF**: For short loops, configurable quality/framerate
- **Video**: WebM (VP9) or MP4 (H.264 via MediaRecorder API)
- **Image sequence**: ZIP of PNGs for external editing

### Export Settings
- Resolution: Source, 720p, 1080p, 4K (GPU permitting)
- Framerate: 24, 30, 60 fps
- Duration: For video recording, set length or record until stopped
- Quality: Bitrate control for video exports

### Recording Workflow
1. Set up effects in real-time preview
2. Hit record — captures to buffer
3. Stop — renders and triggers download
4. Progress indicator during encode

---

## Tech Stack

### Core
- **Vite** — Fast dev server, hot reload, optimized builds
- **React 18** — UI layer
- **TypeScript** — Type safety across the codebase
- **Radix UI** — Unstyled accessible primitives
- **Tailwind CSS** — Utility classes, custom brutalist theme
- **Three.js** — WebGL abstraction, EffectComposer for chaining
- **GLSL** — Custom fragment shaders per effect
- **@webgpu/types** — WebGPU compute shaders for particles (with WebGL2 fallback)

### Supporting Libraries
- **Zustand** — Lightweight state management for parameters/presets
- **React DnD** — Drag-drop for effect chain reordering
- **FFmpeg.wasm** — Client-side video encoding (MP4 export)
- **idb-keyval** — IndexedDB wrapper for preset storage

---

## Project Structure

```
strand-tracer/
├── src/
│   ├── components/        # React UI components
│   ├── effects/           # Effect modules
│   │   ├── strand-tracer/
│   │   ├── signal-decay/
│   │   ├── glitch-engine/
│   │   ├── industrial/
│   │   └── particle/
│   ├── shaders/           # GLSL shader files
│   ├── compute/           # WebGPU compute shaders
│   ├── stores/            # Zustand state stores
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Media handling, export
│   └── presets/           # Factory preset JSON
├── public/
│   └── textures/          # Rust, mesh, noise textures
└── docs/
    └── plans/
```

---

## Initial Scope (v1)

**Included:**
- All 5 modules functional with core sub-effects
- Effect composition with blend modes and feedback
- Webcam and file input working
- PNG/WebM export
- Preset save/load to localStorage
- 10-15 factory presets

**Deferred:**
- Screen capture input
- MP4 export (requires FFmpeg.wasm setup)
- Preset URL sharing
- Preset morphing/interpolation
- MIDI mapping

---

## Aesthetic References

- **Hideo Kojima / Death Stranding** — Industrial decay, strand connections, post-apocalyptic machinery
- **Aphex Twin** — Unsettling digital corruption, signal nightmare, "Come to Daddy" energy
- **Glitch Art** — Intentional pixel destruction, datamosh, compression artifacts
- **Brutalist Design** — Raw structure, honest materials, bold typography, no ornamentation
