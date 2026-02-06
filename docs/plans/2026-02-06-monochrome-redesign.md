# Monochrome UI Redesign

> Monochrome grids. Micro-type. System data as aesthetics. No glossy gradients. No "friendly" fluff. Just structure, rhythm, and interface as a machine language.

## Design Decisions

| Element | Choice |
|---------|--------|
| Accent color | Toxic Magenta `#FF0055` |
| Text color | Warm Bone `#E8E4DE` |
| Grid treatment | Micro-dot matrix at intersections |
| Typography | Variable density (9-10px data, 12px controls) |
| Components | Minimal structure (2px radius max, subtle backgrounds) |
| Accent usage | Functional highlights (active, primary, progress, crossfader) |

---

## Color Tokens

```css
:root {
  /* Backgrounds - pure black foundation */
  --bg-void: #000000;
  --bg-primary: #0a0a0a;
  --bg-surface: #111111;
  --bg-elevated: #1a1a1a;
  --bg-hover: #222222;

  /* Dot matrix grid */
  --grid-dot: #1f1f1f;

  /* Borders - subtle structure */
  --border: #2a2a2a;
  --border-emphasis: #3a3a3a;

  /* Text - warm bone monochrome */
  --text-primary: #E8E4DE;
  --text-secondary: #B8B4AE;
  --text-muted: #6A6864;
  --text-ghost: #3A3834;

  /* Accent - toxic magenta */
  --accent: #FF0055;
  --accent-dim: #CC0044;
  --accent-glow: rgba(255, 0, 85, 0.3);
  --accent-subtle: rgba(255, 0, 85, 0.08);
}
```

---

## Typography Scale

```css
:root {
  /* Font stack - monospace only */
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;

  /* Type scale - variable density */
  --text-micro: 9px;      /* system data, metadata, timestamps */
  --text-tiny: 10px;      /* labels, status indicators */
  --text-small: 11px;     /* secondary info, tooltips */
  --text-base: 12px;      /* interactive controls, main UI */
  --text-medium: 14px;    /* section headers */
  --text-large: 16px;     /* panel titles (rare) */

  /* Spacing - tight */
  --leading-tight: 1.2;
  --leading-normal: 1.4;
  --tracking-tight: -0.01em;
  --tracking-wide: 0.08em;  /* uppercase labels */
}
```

---

## Dot Matrix Grid

```css
:root {
  --grid-size: 16px;
  --dot-size: 1px;
}

.grid-substrate {
  background-color: var(--bg-primary);
  background-image: radial-gradient(
    circle,
    var(--grid-dot) var(--dot-size),
    transparent var(--dot-size)
  );
  background-size: var(--grid-size) var(--grid-size);
  background-position: center center;
}

.grid-dense {
  --grid-size: 8px;
}

.grid-none {
  background-image: none;
}
```

---

## Component Styling

```css
/* Panels */
.panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 2px;
}

/* Buttons */
.btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-secondary);
  font-size: var(--text-base);
  padding: 6px 12px;
  transition: all 0.1s ease;
}

.btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-emphasis);
  color: var(--text-primary);
}

.btn-active, .btn:active {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

.btn-primary {
  border-color: var(--accent-dim);
  color: var(--accent);
}

.btn-primary:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
}

/* Inputs */
.input {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 2px;
  color: var(--text-primary);
  font-size: var(--text-base);
}

.input:focus {
  border-color: var(--accent);
  outline: none;
}
```

---

## Accent Usage Patterns

Magenta appears **only** for:
- Active/selected states
- Primary action buttons
- Progress bars and position indicators
- Playhead
- Recording indicator (pulsing)
- Crossfader thumb
- Enabled effect indicators
- Critical alerts

```css
.selected {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.progress-fill {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}

.playhead {
  background: var(--accent);
  width: 1px;
  box-shadow: 0 0 4px var(--accent-glow);
}

.recording {
  color: var(--accent);
  animation: pulse 1s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## Data Readout Styling

The "machine language" aesthetic for system data:

```css
.data-row {
  display: flex;
  gap: 16px;
  font-size: var(--text-micro);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.data-label {
  color: var(--text-ghost);
}

.data-value {
  color: var(--text-secondary);
}

.data-sep::after {
  content: '·';
  margin: 0 8px;
  color: var(--text-ghost);
}

.timecode {
  font-size: var(--text-small);
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}
```

**Examples:**
- `00:01:05 \ 00:04:30`
- `BPM 128 · FX ON · WET 85%`
- `77035079 | 81410997`

---

## UI Element Applications

### Transport Bar
```
┌─────────────────────────────────────────────────────────┐
│ ◀◀  ▶  ▶▶  ■    00:01:05 \ 00:04:30    REC ●    120 BPM │
└─────────────────────────────────────────────────────────┘
```
- Transport icons as simple unfilled glyphs
- Timecode in micro-type with ghost separators
- REC pulses magenta when active
- BPM as data readout

### Effects Lane
```
RGB SPLIT ───────────────── [·]
  AMT 0.45 · OFFX -0.02 · OFFY 0.01

CHROMATIC ───────────────── [●]  ← magenta = active
  INT 0.80 · RAD 0.35
```
- Effect names small caps, dashed line to indicator
- Parameters as micro-type data row
- Magenta dot for active state

### Sequencer Grid
- Dense 8px dot matrix background
- Beat markers as 1px magenta vertical lines
- Steps as 2px border squares, magenta fill when active
- Ghost grid numbers along edges

### Crossfader
- 2px track, magenta thumb
- Ghost micro-text labels at ends

---

## Implementation Notes

1. Update `src/styles/theme.css` with new tokens
2. Add `.grid-substrate` class to main layout container
3. Update all `border-radius` values to max 2px
4. Replace green active states (`#10b981`) with magenta
5. Update text colors throughout components
6. Add data readout utility classes
7. Reduce font sizes in data-heavy areas (effects params, transport, sequencer)
