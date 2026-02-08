# seg_f4ult.sys Documentation Page Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a comprehensive documentation page with a layered approach - quick-start sections for new users plus expandable detailed documentation for power users.

**Architecture:** Static HTML page in `/site/docs.html` with CSS-only expandable sections, sidebar navigation, and effect reference cards. Follows existing site design system.

**Tech Stack:** HTML, CSS (existing design system from main.css), vanilla JS for scroll-spy navigation

---

## Overview

The documentation page provides complete feature documentation for seg_f4ult.sys with:
- **Quick Start Guide** - Get running in 60 seconds
- **Feature Walkthroughs** - Visual guides for each major feature
- **Effect Reference** - Complete catalog of 80+ effects across 6 pages
- **Keyboard Shortcuts** - Full reference table
- **Tips & Tricks** - Advanced techniques for power users

## Page Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│ NAV: SEG_F4ULT ─────────────────────────── [APP] [DOCS ●] [GITHUB]     │
├───────────────┬─────────────────────────────────────────────────────────┤
│               │                                                         │
│  SIDEBAR      │  CONTENT                                                │
│  ─────────    │  ───────────────────────────────────────────────────    │
│               │                                                         │
│  Quick Start  │  # QUICK START                                          │
│               │                                                         │
│  Features     │  Get running in 60 seconds.                            │
│   ├ Slicer    │                                                         │
│   ├ Sequencer │  ┌─────────────────────────────────────────────────┐   │
│   ├ Clip Bin  │  │  1. Select Input  →  2. Add Effects  →          │   │
│   └ Modulation│  │  3. Record/Export                                │   │
│               │  └─────────────────────────────────────────────────┘   │
│  Effects      │                                                         │
│   ├ VISION    │  [▼ Show detailed steps]                               │
│   ├ ACID      │                                                         │
│   ├ GLITCH    │  ─────────────────────────────────────────────────     │
│   ├ OVERLAY   │                                                         │
│   ├ STRAND    │  # SAMPLE SLICER                                        │
│   └ MOTION    │                                                         │
│               │  [Screenshot: Slicer panel]                            │
│  Shortcuts    │                                                         │
│               │  Chop video into slices for live performance.          │
│  Tips         │                                                         │
│               │  ● Click slice to jump                                 │
│               │  ● Hold to loop section                                │
│               │  ● Drag slice edges to adjust                          │
│               │                                                         │
│               │  [▼ Advanced: Slice modes & options]                   │
│               │                                                         │
└───────────────┴─────────────────────────────────────────────────────────┘
```

---

## Design Patterns

### 1. Layered Information Architecture

Each section follows this pattern:
1. **Title + one-line summary** (5 seconds to understand)
2. **Screenshot** (visual context)
3. **Key points** (3-5 bullet points for essentials)
4. **Expandable details** (CSS-only, for power users)

```html
<section class="doc-section" id="slicer">
  <h2 class="doc-title">SAMPLE SLICER</h2>
  <p class="doc-summary">Chop video into slices for live performance.</p>

  <div class="doc-screenshot">
    <img src="assets/screenshots/slicer.png" alt="Sample slicer interface">
  </div>

  <ul class="doc-points">
    <li>Click slice to jump to that position</li>
    <li>Hold to loop a section</li>
    <li>Drag slice edges to adjust boundaries</li>
  </ul>

  <details class="doc-details">
    <summary>Advanced: Slice modes & options</summary>
    <div class="doc-details-content">
      <!-- Detailed documentation here -->
    </div>
  </details>
</section>
```

### 2. Effect Cards

Effects organized in a grid with visual indicators:

```html
<div class="effect-card" data-page="glitch">
  <div class="effect-header">
    <span class="effect-color" style="background: #0891b2"></span>
    <span class="effect-name">RGB</span>
  </div>
  <p class="effect-desc">Splits color channels with offset displacement</p>
  <div class="effect-params">
    <span class="param">Intensity: 0-50</span>
  </div>
</div>
```

### 3. Sidebar Navigation

Sticky sidebar with scroll-spy highlighting:

```css
.docs-sidebar {
  position: sticky;
  top: 80px;
  height: calc(100vh - 100px);
  overflow-y: auto;
}

.sidebar-link.active {
  color: var(--accent);
  border-left: 2px solid var(--accent);
}
```

---

## Content Sections

### 1. Quick Start (60-second guide)

```
┌─────────────────────────────────────────────────────────────────┐
│  QUICK START                                                     │
│  Get running in 60 seconds.                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐               │
│  │  SELECT   │ → │   ADD     │ → │  RECORD   │               │
│  │  INPUT    │    │  EFFECTS  │    │  EXPORT   │               │
│  │           │    │           │    │           │               │
│  │ Webcam    │    │ Click to  │    │ R to      │               │
│  │ File      │    │ toggle    │    │ record    │               │
│  │ Screen    │    │ Drag to   │    │ Export    │               │
│  │ URL       │    │ adjust    │    │ WebM/MP4  │               │
│  └───────────┘    └───────────┘    └───────────┘               │
│                                                                 │
│  [▼ Detailed walkthrough with screenshots]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Features

#### 2.1 Sample Slicer
- Screenshot: Slicer with waveform and slice markers
- Quick points: Click/hold/drag mechanics
- Advanced: Slice count, instant load from URL

#### 2.2 Sequencer
- Screenshot: Multi-track sequencer with automation
- Quick points: 64 steps, parameter routing, BPM sync
- Advanced: Track types (Trigger, Gate, Value), Euclidean patterns

#### 2.3 Clip Bin
- Screenshot: Clip bin with thumbnails
- Quick points: Auto-capture, drag to slicer, instant recall
- Advanced: Storage limits, clearing clips

#### 2.4 Modulation
- Screenshot: Modulation lane with LFO/Random/Step/Envelope
- Quick points: Drag to route, 4 modulator types
- Advanced: Each modulator's parameters (rate, shape, depth, etc.)

#### 2.5 Crossfader
- Screenshot: Crossfader controls
- Quick points: Blend source/FX, A/B mix control
- Advanced: Blend modes, dry/wet curves

### 3. Effect Reference

Organized by page with expandable sections:

#### VISION (Page 0) - AI-Powered Tracking
| Effect | Description | Parameter |
|--------|-------------|-----------|
| BRIGHT | Track brightest regions | Threshold 0-255 |
| EDGE | Edge detection tracking | Threshold 0-255 |
| COLOR | Track specific hue | Hue 0-100 |
| MOTION | Motion vector tracking | Sensitivity 0-100 |
| FACE | MediaPipe face detection | Confidence 10-90% |
| HANDS | MediaPipe hand landmarks | Confidence 10-90% |
| CONTOUR | Silhouette extraction | Threshold 0-100 |
| LANDMARKS | Facial landmark overlay | Size 10-90 |

#### ACID (Page 1) - Data Destruction
| Effect | Description | Parameter |
|--------|-------------|-----------|
| DOTS | Halftone dot replacement | Size 4-32px |
| GLYPH | Character replacement | Size 8-24px |
| ICONS | Icon matrix overlay | Size 16-48px |
| CONTOUR | Topographic lines | Spacing 4-20 |
| DECOMP | Triangular decomposition | Triangles 8-64 |
| MIRROR | Kaleidoscopic mirroring | Segments 2-8 |
| SLICE | Horizontal slice scramble | Slices 4-64 |
| THGRID | Threshold grid | Levels 0-255 |
| CLOUD | Point cloud render | Points 1K-50K |
| LED | LED matrix display | Size 4-16px |
| SLIT | Slit-scan temporal | Speed 1-10 |
| VORONOI | Voronoi cell regions | Cells 16-256 |

#### GLITCH (Page 2) - Digital Corruption
| Effect | Description | Parameter |
|--------|-------------|-----------|
| RGB | Channel separation | Offset 0-50px |
| CHROMA | Chromatic aberration | Intensity 0-100 |
| POSTER | Color quantization | Levels 2-16 |
| GRADE | Color grading shift | Intensity 0-200 |
| BLOCK | Block displacement | Intensity 0-100 |
| STATIC | Static noise displacement | Intensity 0-100 |
| PIXEL | Pixelation | Size 2-32px |
| LENS | Barrel/pincushion distort | -100 to 100 |
| SCAN | Scanline overlay | Lines 100-1000 |
| VHS | VHS tracking distortion | Intensity 0-100 |
| NOISE | Film grain noise | Intensity 0-100 |
| DITHER | Dithering | Levels 2-16 |
| EDGES | Edge detection render | Threshold 10-100 |
| FEEDBACK | Temporal feedback | Decay 0-100 |
| ASCII | ASCII art render | Size 6-20px |
| STIPPLE | Stipple dot render | Density 1-8 |

#### OVERLAY (Page 3) - Textures & Data
| Effect | Description | Parameter |
|--------|-------------|-----------|
| Grain | Film grain texture | Intensity 0-100 |
| Dust | Dust particle overlay | Intensity 0-100 |
| Leak | Light leak overlay | Intensity 0-100 |
| Paper | Paper texture | Intensity 0-100 |
| Canvas | Canvas texture | Intensity 0-100 |
| VHS | VHS tape texture | Intensity 0-100 |
| Watermark | Text watermark | Size 12-48px |
| Stats | Stats bar overlay | Size 12-48px |
| Title | Title card overlay | Size 12-48px |
| Social | Social media overlay | Size 12-48px |

#### STRAND (Page 4) - Death Stranding FX
| Effect | Description | Parameter |
|--------|-------------|-----------|
| HANDPRINTS | BT handprint overlay | Count 1-20 |
| TAR | Tar/oil spreading | Spread 0-100 |
| TIMEFALL | Rain aging effect | Intensity 0-100 |
| VOID OUT | Explosion shockwave | Intensity 0-100 |
| STRAND WEB | Connection strands | Density 0-100 |
| BRIDGE | Bridge construction | Count 8-64 |
| CHIRAL PATH | Glowing pathways | Length 10-200 |
| UMBILICAL | Cord connections | Count 2-12 |
| ODRADEK | Scanning radar | Range 0-100 |
| CHIRALIUM | Crystal formations | Density 0-100 |
| BEACH | Beach realm effect | Intensity 0-100 |
| DOOMS | Vision distortion | Level 0-100 |
| CHIRAL CLOUD | Atmospheric cloud | Density 0-100 |
| BB POD | BB pod interface | Intensity 0-100 |
| SEAM | Dimensional seam | Width 0-100 |
| EXTINCTION | Entity effect | Intensity 0-100 |

#### MOTION (Page 5) - Temporal Effects
| Effect | Description | Parameter |
|--------|-------------|-----------|
| EXTRACT | Motion isolation | Threshold 0-100 |
| ECHO | Motion trails | Decay 0-100 |
| SMEAR | Temporal smearing | Intensity 0-100 |
| FREEZE | Selective freeze | Threshold 0-100 |

### 4. Keyboard Shortcuts

Full reference table:

| Key | Action |
|-----|--------|
| `SPACE` | Play / Pause video |
| `R` | Start / Stop recording |
| `1-6` | Switch effect page |
| `S` | Toggle slicer visibility |
| `ESC` | Clear selection / Close panel |
| `←` `→` | Previous / Next effect page |
| `Shift+Click` | Show effect info |

### 5. Tips & Tricks

Power user techniques:

- **Sequencer Routing**: Drag the colored handle from any track to any parameter slider to create automation
- **Modulation Stacking**: Route multiple modulators to the same parameter for complex movement
- **Feedback Loops**: Combine FEEDBACK with temporal effects for recursive visuals
- **Slice Loops**: Hold a slice to loop it, release to continue normal playback
- **Quick A/B**: Use crossfader to quickly compare source vs processed

---

## File Structure

```
site/
├── index.html          # Existing marketing page
├── docs.html           # NEW: Documentation page
├── styles/
│   ├── main.css        # Shared design system
│   ├── animations.css  # Shared animations
│   └── docs.css        # NEW: Docs-specific styles
├── scripts/
│   ├── main.js         # Existing scripts
│   └── docs.js         # NEW: Scroll-spy, expand/collapse
└── assets/
    └── screenshots/
        ├── hero.png
        ├── slicer.png
        ├── sequencer.png
        ├── clipbin.png
        ├── inspector.png
        ├── modulation.png    # NEW: Modulation lane screenshot
        └── effects/          # NEW: Individual effect screenshots
            ├── rgb.png
            ├── vhs.png
            └── ...
```

---

## Implementation Tasks

### Task 1: Create docs.html Structure
- HTML skeleton with nav, sidebar, content areas
- Section IDs for anchor navigation
- Semantic structure for accessibility

### Task 2: Add docs.css Styles
- Sidebar styling (sticky, scroll)
- Doc section styling (cards, details)
- Effect card grid
- Responsive layout (sidebar collapses on mobile)

### Task 3: Add docs.js Functionality
- Scroll-spy for sidebar highlighting
- Smooth scroll to sections
- Expand/collapse state persistence

### Task 4: Write Quick Start Content
- 3-step visual guide
- Expandable detailed walkthrough
- Screenshot annotations

### Task 5: Write Feature Documentation
- Slicer, Sequencer, Clip Bin, Modulation, Crossfader
- Screenshots for each
- Quick points + expandable advanced sections

### Task 6: Complete Effect Reference
- All 80+ effects organized by page
- Color indicators matching app
- Parameter ranges and descriptions

### Task 7: Add Keyboard Shortcuts & Tips
- Full keyboard reference table
- Power user tips section

### Task 8: Update Site Navigation
- Add DOCS link to nav in index.html
- Update branding from TEPHRAL to SEG_F4ULT

### Task 9: Capture Missing Screenshots
- Modulation lane screenshot
- Individual effect examples (optional)

---

## Design Tokens (from existing theme)

```css
/* Use existing site variables */
--bg-primary: #0a0a0a;
--bg-surface: #141414;
--border: #2a2a2a;
--text-primary: #f5f5f5;
--text-muted: #666666;
--accent: #00d4ff;  /* Updated to cyan for seg_f4ult */

/* Effect page colors */
--vision: #eab308;
--acid: #e5e5e5;
--glitch: #0891b2;
--overlay: #a3a3a3;
--strand: #00d4ff;
--motion: #22c55e;
```

---

## Responsive Behavior

- **Desktop (>1024px)**: Sidebar + content layout
- **Tablet (768-1024px)**: Collapsible sidebar, hamburger toggle
- **Mobile (<768px)**: No sidebar, top navigation with anchor links, full-width content

---

## Verification

1. All links work (sidebar → sections)
2. All sections have content (no empty sections)
3. Screenshots load correctly
4. Responsive behavior works at all breakpoints
5. Keyboard shortcuts are accurate
6. Effect parameters match actual app values
7. Branding uses SEG_F4ULT throughout
