# Performance UI Redesign

Teenage Engineering / Elektron-inspired interface for live effect performance and recording.

## Design Goals

- **Instrument-first:** Controls dominant (~75%), video preview secondary (~25%)
- **Full arsenal:** 8-12 effects visible and accessible at once
- **Playful + functional:** OP-1's colorful OLED glow meets Elektron's information density
- **Performance recording:** Capture video output + effect automation timeline

## Overall Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────┐   ┌─────┐ ┌─────┐   ●REC    00:12:47   ┌─────┐ │
│ │         │   │ CAM │ │ FILE│                      │ ▶︎ ■ │ │
│ │ PREVIEW │   └─────┘ └─────┘                      └─────┘ │
│ │  (16:9) │                                                 │
│ └─────────┘   ════════════════════════════════════         │
│               timeline scrubber (after recording)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                  PERFORMANCE GRID                           │
│                  (4x3 effect buttons)                       │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Effect Button Design

Each effect is a chunky square button:

```
┌────────────────────┐
│  ○ RGB SPLIT       │  ← LED dot (glows when active)
│                    │
│    ┌──────────┐    │
│    │   ◐      │    │  ← Rotary encoder graphic
│    └──────────┘    │
│                    │
│      12            │  ← Parameter value
└────────────────────┘
```

### Visual States

- **Off:** Dark charcoal (`#1a1a1a`), subtle border, dim label
- **Active:** Background glows in effect's signature color, LED dot bright
- **Tweaking:** Ring around encoder animates during parameter adjustment

### Interaction

- **Tap** button → toggle effect on/off (latching)
- **Drag vertically** on encoder → adjust primary parameter

## Grid Layout

4x3 grid, 12 slots, organized by effect type:

```
┌──────────┬──────────┬──────────┬──────────┐
│ RGB      │ BLOCK    │ SCAN     │ NOISE    │
│ SPLIT    │ DISPLACE │ LINES    │          │
│    ◐     │    ◐     │    ◐     │    ◐     │
├──────────┼──────────┼──────────┼──────────┤
│ ASCII    │ MATRIX   │ STIPPLE  │ DETECT   │
│          │          │          │ BOXES    │
│    ◐     │    ◐     │    ◐     │    ◐     │
├──────────┼──────────┼──────────┼──────────┤
│ POINT    │ FACE     │ HANDS    │ POSE     │
│ NETWORK  │ MESH     │          │          │
│    ◐     │    ◐     │    ◐     │    ◐     │
└──────────┴──────────┴──────────┴──────────┘
```

### Row Organization

| Row | Type | Colors |
|-----|------|--------|
| 1 | Glitch (post-processing) | Cyan, Magenta, Electric Blue |
| 2 | Render (ASCII, stipple, detection) | Amber, Orange |
| 3 | Vision/tracking modes | Lime, Teal |

## Recording System

### Transport Controls

- **Source toggles:** CAM / FILE buttons
- **Record button:** Red ● pulses when recording
- **Timecode:** Monospace display
- **Transport:** Play/Stop for review
- **Timeline scrubber:** Shows colored markers for effect toggles

### Automation Data Format

```json
{
  "duration": 127.5,
  "source": "webcam",
  "events": [
    { "t": 0.0, "effect": "rgb_split", "action": "on", "param": 12 },
    { "t": 2.3, "effect": "scan_lines", "action": "on", "param": 45 },
    { "t": 3.1, "effect": "rgb_split", "param": 28 },
    { "t": 5.8, "effect": "rgb_split", "action": "off" }
  ]
}
```

### Playback Modes

- **Review:** Play recorded video with baked-in automation
- **Re-perform:** Apply automation to a different source
- **Overdub:** Layer additional toggles over existing automation

## Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| Background | Near black | `#0a0a0a` |
| Button off | Charcoal | `#1a1a1a` |
| Button border | Dark grey | `#2a2a2a` |
| Text (dim) | Grey | `#666666` |
| Text (active) | White | `#f0f0f0` |
| Glitch: Cyan | | `#00d4ff` |
| Glitch: Magenta | | `#ff00aa` |
| Glitch: Electric blue | | `#4444ff` |
| Render: Amber | | `#ffaa00` |
| Render: Orange | | `#ff6600` |
| Vision: Lime | | `#88ff00` |
| Vision: Teal | | `#00ffaa` |
| Record | Red | `#ff3333` |

## Typography

- **Font:** JetBrains Mono or Space Mono
- **Labels:** ALL CAPS
- **Numbers:** Tabular figures (fixed width)

## Visual Effects

- Active buttons get subtle `box-shadow` glow in their color
- OLED-like light bleed onto black background
- Rounded corners on buttons (OP-1 playfulness)
- Generous gaps between buttons (Elektron spacing)
