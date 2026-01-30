# Tephral Marketing Site — Product Requirements Prompt

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this PRP task-by-task.

---

## 1. PRODUCT REQUIREMENTS

### 1.1 Overview

Build a single-page marketing website for **Tephral** — a real-time video destruction toolkit. The site targets creative professionals (VJs, video artists, live performers) and showcases the app's 64 GPU-accelerated effects, Death Stranding-inspired aesthetic, and browser-based architecture.

### 1.2 Goals

1. **Communicate value instantly** — Visitors understand what Tephral does within 5 seconds
2. **Drive app launches** — Primary CTA is launching the app
3. **Showcase capabilities** — Feature the 5 effect pages, sequencer, AI tracking, recording
4. **Match the product aesthetic** — Brutalist, industrial, Kojima-inspired design
5. **Look cool as fuck** — Memorable animations and interactions

### 1.3 Target Audience

Creative professionals: VJs, video artists, live performers who need real-time visual tools.

### 1.4 Success Metrics

- Time to first CTA click
- Scroll depth
- App launch rate from site

---

## 2. DESIGN SYSTEM

### 2.1 Color Palette

```css
:root {
  --bg-primary: #0a0a0a;      /* Near-black background */
  --bg-surface: #141414;       /* Card/section background */
  --border: #2a2a2a;           /* Grid lines, dividers */
  --text-primary: #f5f5f5;     /* Main text */
  --text-muted: #666666;       /* Secondary text */
  --accent: #ff6b35;           /* Industrial orange (BT color) */
  --accent-glow: rgba(255, 107, 53, 0.4);
}
```

### 2.2 Typography

```css
/* All text is monospace for brutalist consistency */
font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

/* Headings */
.heading-xl { font-size: 4rem; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em; }
.heading-lg { font-size: 2.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: -0.01em; }
.heading-md { font-size: 1.5rem; font-weight: 600; text-transform: uppercase; }
.heading-sm { font-size: 1rem; font-weight: 600; text-transform: uppercase; }

/* Body */
.body { font-size: 1rem; font-weight: 400; line-height: 1.6; }
.body-sm { font-size: 0.875rem; font-weight: 400; line-height: 1.5; }
```

### 2.3 Grid System

- 12-column grid, max-width 1400px
- Gutters: 24px
- Section padding: 120px vertical
- Visible grid lines as design elements (1px borders)

### 2.4 Components

**Buttons**
```css
.btn-primary {
  background: var(--accent);
  color: #000;
  padding: 16px 32px;
  font-weight: 700;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
}

.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  padding: 16px 32px;
  border: 1px solid var(--border);
}
```

**Cards**
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 24px;
}
```

**Screenshots**
```css
.screenshot {
  border: 1px solid var(--border);
  background: var(--bg-surface);
}
```

---

## 3. ANIMATIONS & INTERACTIONS

### 3.1 Page Load Sequence

```
Timeline:
0ms     — Background fades in (0.3s ease-out)
100ms   — Nav slides down from top (0.4s ease-out)
300ms   — Headline types in character by character (50ms per char)
600ms   — Subhead fades up (0.5s ease-out)
900ms   — CTAs fade up with slight scale (0.4s ease-out)
1200ms  — Hero image slides up from bottom (0.6s ease-out)
```

**Implementation:**
```css
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-100%); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 3.2 Scroll Animations

**Section reveals** — Each section fades up as it enters viewport:
```css
.section {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.section.visible {
  opacity: 1;
  transform: translateY(0);
}
```

**Staggered children** — Cards/items animate in sequence:
```css
.card:nth-child(1) { transition-delay: 0ms; }
.card:nth-child(2) { transition-delay: 100ms; }
.card:nth-child(3) { transition-delay: 200ms; }
/* etc. */
```

**Parallax screenshots** — Screenshots move at 0.5x scroll speed:
```javascript
const parallax = scrollY * 0.5;
screenshot.style.transform = `translateY(${parallax}px)`;
```

### 3.3 Hover Effects

**RGB Glitch on headings:**
```css
.heading:hover {
  animation: rgbGlitch 0.3s ease-out;
}

@keyframes rgbGlitch {
  0% { text-shadow: 0 0 0 transparent; }
  25% { text-shadow: -2px 0 0 #ff0000, 2px 0 0 #00ffff; }
  50% { text-shadow: 2px 0 0 #ff0000, -2px 0 0 #00ffff; }
  75% { text-shadow: -1px 0 0 #ff0000, 1px 0 0 #00ffff; }
  100% { text-shadow: 0 0 0 transparent; }
}
```

**Button glow:**
```css
.btn-primary:hover {
  box-shadow: 0 0 30px var(--accent-glow), 0 0 60px var(--accent-glow);
  transform: translateY(-2px);
}
```

**Card border highlight:**
```css
.card:hover {
  border-color: var(--accent);
  box-shadow: inset 0 0 20px rgba(255, 107, 53, 0.1);
}
```

**Screenshot zoom:**
```css
.screenshot:hover img {
  transform: scale(1.02);
  transition: transform 0.3s ease-out;
}
```

### 3.4 Micro-interactions

**Cursor trail** — Subtle orange particles follow cursor:
```javascript
// On mousemove, spawn particle at cursor position
// Particle: 4px circle, orange, fades out over 0.5s
// Max 20 particles at a time
```

**Scanline overlay** — Subtle CRT scanlines across entire page:
```css
.scanlines::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```

**Noise texture** — Animated film grain overlay:
```css
.noise::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url('/noise.png');
  opacity: 0.03;
  animation: noiseShift 0.5s steps(10) infinite;
  pointer-events: none;
}

@keyframes noiseShift {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-10%, -10%); }
}
```

### 3.5 Special Effects

**Glitch text on section numbers:**
```css
.section-number {
  position: relative;
}

.section-number::before,
.section-number::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  opacity: 0;
}

.section-number:hover::before {
  animation: glitchTop 0.3s ease-out;
  color: #ff0000;
  clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
}

.section-number:hover::after {
  animation: glitchBottom 0.3s ease-out;
  color: #00ffff;
  clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
}
```

**Strand connections** — SVG lines connecting feature cards on hover:
```javascript
// When hovering a card, draw animated SVG path to adjacent cards
// Path: bezier curve with dashed stroke
// Animation: stroke-dashoffset animates to reveal line
```

---

## 4. SITE STRUCTURE

### 4.1 Navigation (Sticky)

```
┌─────────────────────────────────────────────────────────────┐
│  TEPHRAL                                         [LAUNCH]   │
└─────────────────────────────────────────────────────────────┘
```

- Logo left, single CTA right
- Background becomes solid on scroll (transparent at top)
- Height: 64px

### 4.2 Hero Section

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  REAL-TIME VIDEO DESTRUCTION                                │
│  ─────────────────────────────                              │
│                                                             │
│  64 GPU-accelerated effects. Death Stranding aesthetic.     │
│  Runs entirely in your browser. No uploads. No waiting.     │
│                                                             │
│  [ LAUNCH APP ]                    [ SCROLL TO EXPLORE ↓ ]  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [ HERO SCREENSHOT — FULL WIDTH ]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Full viewport height
- Headline types in on load
- Screenshot has parallax effect

### 4.3 Effect Pages Section

```
┌─────────────────────────────────────────────────────────────┐
│  01 ─── EFFECT PAGES                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   VISION    │ │    ACID     │ │   GLITCH    │           │
│  │   ───────   │ │   ───────   │ │   ───────   │           │
│  │  AI-powered │ │    Data     │ │   Digital   │           │
│  │  tracking   │ │ destruction │ │ corruption  │           │
│  │             │ │             │ │             │           │
│  │ ● BRIGHT    │ │ ● DOTS      │ │ ● RGB       │           │
│  │ ● EDGE      │ │ ● DECOMP    │ │ ● BLOCK     │           │
│  │ ● FACE      │ │ ● VORONOI   │ │ ● VHS       │           │
│  │ ● HANDS     │ │ ● LED       │ │ ● FEEDBACK  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐                           │
│  │   OVERLAY   │ │   STRAND    │                           │
│  │   ───────   │ │   ───────   │                           │
│  │  Textures & │ │    Death    │                           │
│  │  overlays   │ │  Stranding  │                           │
│  │             │ │             │                           │
│  │ ● GRAIN     │ │ ● HANDPRINT │                           │
│  │ ● DUST      │ │ ● VOID OUT  │                           │
│  │ ● VHS       │ │ ● UMBILICAL │                           │
│  │ ● WATERMARK │ │ ● ODRADEK   │                           │
│  └─────────────┘ └─────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- 5 cards with staggered entrance
- RGB glitch on card title hover
- Orange border on hover
- Strand lines connect cards on hover

### 4.4 Product Shots Section

```
┌─────────────────────────────────────────────────────────────┐
│  02 ─── INTERFACE                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              [ SCREENSHOT 1 — FULL WIDTH ]            │  │
│  └───────────────────────────────────────────────────────┘  │
│  Performance grid with 16 effect buttons.                   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │   [ SCREENSHOT 2 ]   │  │   [ SCREENSHOT 3 ]   │        │
│  │   Sequencer panel    │  │   Expanded params    │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │   [ SCREENSHOT 4 ]   │  │   [ SCREENSHOT 5 ]   │        │
│  │   Preset library     │  │   Inspector panel    │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Hero screenshot with parallax
- 2x2 grid of feature screenshots
- Zoom effect on hover
- Captions below each

### 4.5 Capabilities Section

```
┌─────────────────────────────────────────────────────────────┐
│  03 ─── CAPABILITIES                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────┬─────────────────────────┐  │
│  │  SEQUENCER                  │  ● 64-step tracks       │  │
│  │  Automate any parameter     │  ● Parameter automation │  │
│  │  with multi-track sequencer │  ● Drag-to-route        │  │
│  ├─────────────────────────────┼─────────────────────────┤  │
│  │  AI TRACKING                │  ● Face detection       │  │
│  │  Effects respond to faces,  │  ● Hand landmarks       │  │
│  │  hands, and motion          │  ● Motion vectors       │  │
│  ├─────────────────────────────┼─────────────────────────┤  │
│  │  RECORDING                  │  ● Live canvas capture  │  │
│  │  Capture sessions directly  │  ● WebM/MP4 export      │  │
│  │  to file                    │  ● No server upload     │  │
│  ├─────────────────────────────┼─────────────────────────┤  │
│  │  PRESETS                    │  ● Folder organization  │  │
│  │  Save and recall effect     │  ● Import/export JSON   │  │
│  │  configurations             │  ● Bank system (A-D)    │  │
│  └─────────────────────────────┴─────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Table layout with visible grid
- Rows highlight on hover
- Staggered row entrance

### 4.6 Technical Section

```
┌─────────────────────────────────────────────────────────────┐
│  04 ─── TECHNICAL                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │    GPU    │ │  BROWSER  │ │  PRIVATE  │ │   ZERO    │   │
│  │  POWERED  │ │   BASED   │ │   FIRST   │ │  CONFIG   │   │
│  │           │ │           │ │           │ │           │   │
│  │  WebGL 2  │ │  No app   │ │ No server │ │ Works out │   │
│  │  shaders  │ │  install  │ │  uploads  │ │  of box   │   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                             │
│  STACK: React ─── Three.js ─── GLSL ─── MediaPipe          │
│  INPUTS: Webcam ─── File ─── Screen ─── URL                │
│  OUTPUTS: WebM ─── MP4 ─── PNG ─── GIF                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- 4 benefit cards with icons
- Tech lists with em-dash separators
- Cards scale slightly on hover

### 4.7 Documentation Section

```
┌─────────────────────────────────────────────────────────────┐
│  05 ─── DOCUMENTATION                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  KEYBOARD SHORTCUTS                                         │
│  ┌────────────┬──────────────────────────────────────────┐  │
│  │  SPACE     │  Play / Pause                            │  │
│  │  R         │  Start / Stop recording                  │  │
│  │  1-5       │  Switch effect page                      │  │
│  │  SHIFT     │  Hold + click for info panel             │  │
│  │  ESC       │  Clear selection                         │  │
│  └────────────┴──────────────────────────────────────────┘  │
│                                                             │
│  HOW TO USE                                                 │
│  01  Select input source                                   │
│  02  Click effect buttons to toggle                        │
│  03  Drag up/down to adjust intensity                      │
│  04  Use sequencer to automate                             │
│  05  Save presets to recall setups                         │
│  06  Hit record to capture                                 │
│                                                             │
│  TIPS                                                       │
│  ● Double-click effect to solo                             │
│  ● Drag track handle to parameter slider                   │
│  ● Click routing indicator to inspect                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Keyboard shortcuts in table
- Numbered steps for how-to
- Bullet tips
- Keys styled as inline code

### 4.8 Footer

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              [ LAUNCH APP — FULL WIDTH BUTTON ]             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TEPHRAL                                                    │
│  Real-time video destruction toolkit                        │
│                                                             │
│  Built with React, Three.js, and GLSL                      │
│  Inspired by Death Stranding                                │
│                                                             │
│  © 2026                                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Large final CTA
- Minimal credits
- Copyright

---

## 5. FILE STRUCTURE

```
site/
├── index.html
├── styles/
│   ├── main.css           # All styles
│   └── animations.css     # Keyframes and transitions
├── scripts/
│   ├── main.js            # Scroll animations, interactions
│   ├── cursor.js          # Cursor trail effect
│   └── glitch.js          # Text glitch effects
├── assets/
│   ├── screenshots/
│   │   ├── hero.png       # Full app screenshot
│   │   ├── sequencer.png
│   │   ├── params.png
│   │   ├── presets.png
│   │   └── inspector.png
│   ├── noise.png          # Film grain texture
│   └── fonts/
│       └── JetBrainsMono.woff2
└── README.md
```

---

## 6. IMPLEMENTATION PHASES

| Phase | Description | Status | Dependencies |
|-------|-------------|--------|--------------|
| 1 | HTML structure + semantic markup | pending | — |
| 2 | CSS design system + typography | pending | Phase 1 |
| 3 | Section layouts + grid | pending | Phase 2 |
| 4 | Screenshot placeholders + frames | pending | Phase 3 |
| 5 | Scroll animations (Intersection Observer) | pending | Phase 3 |
| 6 | Hover effects + micro-interactions | pending | Phase 2 |
| 7 | Page load sequence | pending | Phase 5 |
| 8 | Cursor trail + noise overlay | pending | Phase 6 |
| 9 | Final polish + performance | pending | All |

---

## 7. VALIDATION COMMANDS

```bash
# Lint HTML
npx htmlhint site/index.html

# Lint CSS
npx stylelint "site/styles/*.css"

# Check accessibility
npx pa11y site/index.html

# Performance audit
npx lighthouse site/index.html --output=json

# Visual regression (if baseline exists)
npx backstopjs test
```

---

## 8. SCREENSHOTS NEEDED

Capture these from the running app at `http://localhost:5177/`:

1. **hero.png** — Full app with multiple effects active (RGB, VHS, Feedback visible)
2. **sequencer.png** — Sequencer panel with 3+ tracks and steps
3. **params.png** — Expanded parameter panel with sliders
4. **presets.png** — Preset library with folder tree expanded
5. **inspector.png** — Inspector panel showing track info

**Screenshot specs:**
- Resolution: 2x for retina (capture at 2880x1800 or similar)
- Format: PNG
- Crop to relevant area, include enough context

---

## 9. CODEBASE PATTERNS

**Existing app conventions to match:**

```typescript
// Color references from app
'#f5f5f5' // Light background
'#1a1a1a' // Dark background
'#d0d0d0' // Borders
'#666666' // Muted text
'#999999' // Secondary text

// Effect colors for reference
'#FF6B6B' // Coral (track 1)
'#4ECDC4' // Teal (track 2)
'#ff6b35' // Orange (BT/accent)
'#00d4ff' // Cyan (strand)
'#ffd700' // Gold (chiralium)
'#7b68ee' // Purple (atmosphere)
```

**Font stack:**
```css
font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

---

## 10. SOURCES

- [Rasmus Widing — PRP Framework](https://github.com/Wirasm/PRPs-agentic-eng)
- [AI Coding Assistants: A Guide to Context Engineering & PRP](https://www.aifire.co/p/ai-coding-assistants-a-guide-to-context-engineering-prp)
