# Flat UI Redesign

Hybrid approach: Keep colorful effect indicators but simplify everything else - typography, spacing, remove glows. Based on reference in `inspiration/flat/`.

## Color Palette

**Backgrounds:**
```css
--bg-darker: #141414;    /* Deepest areas (canvas surround) */
--bg-dark: #1a1a1a;      /* Panel backgrounds */
--bg-card: #242424;      /* Card/control backgrounds */
--bg-card-hover: #2a2a2a; /* Hover states */
```

**Text:**
```css
--text-primary: #ffffff;   /* Headings, important labels */
--text-secondary: #888888; /* Secondary labels, hints */
--text-muted: #555555;     /* Disabled, placeholder */
```

**Borders:**
```css
--border-subtle: #2a2a2a;  /* Subtle dividers */
--border-default: #333333; /* Default borders */
```

**Effect colors (unchanged):**
- Keep existing effect colors (cyan, magenta, amber, etc.)
- Used ONLY for LED indicators - everything else is grayscale

**Removed:**
- All gradient backgrounds
- Blue-tinted grays (#0d0f12, #1a1d24)
- Colored box-shadows and glows (except effect LEDs)

## Typography

**Font family:**
- Primary: `Inter` or `-apple-system, BlinkMacSystemFont, sans-serif`
- Mono: `JetBrains Mono` for values/numbers

**Scale:**
```css
--text-xl: 18px;  /* Panel headings */
--text-lg: 14px;  /* Section labels, effect names */
--text-md: 12px;  /* Control labels */
--text-sm: 11px;  /* Values, hints */
```

**Weight:**
- `500` (medium) for headings and labels
- `400` (regular) for values and body text

**Style changes:**
- Mixed case everywhere ("Rgb Split" not "RGB SPLIT")
- Remove excessive letter-spacing (use 0 or 0.01em max)
- Remove uppercase transforms except for very short labels

## Controls

**Flat Knobs:**
- Simple circle with 1px border
- Background: `--bg-card`
- Indicator: thin line from center to edge
- Size: 40px diameter
- No shadows, no 3D bevels, no gradients

**Buttons:**
- Flat fill with 6px border radius
- Default: `--bg-card` background, `--text-secondary` text
- Hover: `--bg-card-hover` background
- Active/Selected: effect color background, dark text
- No box-shadows

**Toggles/Segmented Controls:**
- Pill-shaped container with `--bg-card` background
- Selected segment: white or effect color fill
- 6px radius, no glows

**Checkboxes:**
- Simple rounded square (4px radius)
- Unchecked: border only
- Checked: white fill with dark checkmark

**Sliders:**
- Thin track (2px) in `--border-subtle`
- Simple circular thumb (12px) in white
- No colored track fill

## Effect Cards

**Card styling:**
- Background: `--bg-card`
- Border: 1px `--border-subtle`
- Border radius: 8px
- Padding: 16px
- No box-shadows, no gradients

**Active effect indicator:**
- Small circle (8px) with effect color fill
- Subtle glow ONLY on this: `box-shadow: 0 0 8px {color}`
- This is the only glow in the entire UI

**Effect icons (replacing visualizers):**
Simple 24x24 line icons, stroke-based:
- Rgb Split: Three offset vertical bars
- Block Displace: Grid with shifted squares
- Scan Lines: Horizontal parallel lines
- Noise: Scattered dots
- Pixelate: Small grid of squares
- Edges: Square outline with corners emphasized
- Stipple: Dot cluster
- Ascii: "A" letterform

**Card layout:**
```
┌─────────────────────────┐
│ ● Rgb Split        [icon]│
│                         │
│  (Amount)    (Red X)    │
│    ◯           ◯        │
│   24          -5        │
└─────────────────────────┘
```

## Spacing & Layout

**Base unit:** 8px

**Panel padding:**
- Outer margins: 16px
- Inner padding: 16px
- Gap between cards: 12px

**Component spacing:**
- Label to control: 8px
- Between control groups: 16px
- Section dividers: 24px margin with 1px border

**Border radius:**
- Large containers: 12px
- Cards: 8px
- Buttons/controls: 6px
- Small elements: 4px

**Removed:**
- Decorative corner accents on preview
- Multiple nested shadows
- Gradient overlays
- Heavy backdrop-blur

## Files to Update

- `tailwind.config.ts` - color palette, spacing
- `src/components/performance/*.tsx` - all panel components
- `src/components/performance/visualizers/*.tsx` - replace with icons
- `src/components/performance/Knob.tsx` - flatten to 2D

## What Changes

- Gradients → flat solid colors
- Colored glows → only effect LED indicators glow
- Cool blue-grays → warm neutral grays
- ALL CAPS → Mixed case
- 3D knobs → flat 2D circles
- Complex visualizers → simple line icons
- Heavy shadows → flat with 1px borders
- Tight spacing → generous 8px grid

## What Stays

- Effect colors for identification
- Monospace numbers for values
- Dark theme overall
- General layout structure
