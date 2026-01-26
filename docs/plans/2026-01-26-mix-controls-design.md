# Mix Controls Design

## Overview

Add a wet/dry crossfader and momentary bypass kill switch for live performance control. Located below the X/Y pad, keeping all hands-on performance controls grouped together.

## Layout

```
┌─────────────────────────────────────────────────┐
│  Bottom Section                                 │
├──────────────────────┬──────────────────────────┤
│                      │  GraphicPanel  │  XYPad  │
│   PerformanceGrid    ├──────────────────────────┤
│                      │      MixControls         │
│                      │  [BYPASS]                │
│                      │  DRY ═══════○═════ WET   │
└──────────────────────┴──────────────────────────┘
```

The right column splits vertically:
- GraphicPanelV2 + XYPad (side by side, flex)
- MixControls strip (~80px fixed height)

## MixControls Component

### Kill Switch Button
- Position: top row, centered
- Size: ~48px square with rounded corners
- Label: "BYPASS" text
- Normal state: dark background, muted border (matches existing button style)
- Pressed state: solid red glow (#ef4444), white text, radiating box-shadow
- Behavior: momentary - only active while held down

### Crossfader
- Position: bottom row, full width
- Style: horizontal slider (DJ crossfader style)
- Track: thin (2-3px), subtle gradient
- Thumb: rounded rectangle (~40px wide, 20px tall), polished knob-like styling
- Labels: "DRY" left, "WET" right (9px uppercase, muted gray)
- Value display: percentage shown above thumb (e.g., "75%")
- Default: 100% wet (fully right)

## State Management

Add to `glitchEngineStore`:

```typescript
wetMix: number      // 0-1, default 1 (100% wet)
bypassActive: boolean  // true while kill switch held

setWetMix: (value: number) => void
setBypassActive: (active: boolean) => void
```

When `bypassActive` is true, it overrides `wetMix` to 0 regardless of fader position.

## Effect Pipeline Integration

### Wet/Dry Mixing

Add a final compositing step after all effects:

1. Store original input texture before effects
2. Run effect chain → produces "wet" output
3. Final MixEffect pass: `mix(original, wet, wetMix)`
4. If `bypassActive`, skip effect chain and output original directly

### MixEffect Shader

```glsl
uniform float wetMix;
uniform sampler2D originalTexture;

void mainImage(const in vec4 wet, const in vec2 uv, out vec4 outputColor) {
  vec4 dry = texture2D(originalTexture, uv);
  outputColor = mix(dry, wet, wetMix);
}
```

### Bypass Optimization

When bypass is active, skip the entire effect chain render and output the input texture directly. This is more efficient than rendering effects and then mixing to 0%.

## Files to Create/Modify

**Create:**
- `src/components/performance/MixControls.tsx` - crossfader and kill switch UI
- `src/effects/glitch-engine/MixEffect.ts` - wet/dry blend shader

**Modify:**
- `src/stores/glitchEngineStore.ts` - add wetMix, bypassActive state
- `src/components/performance/PerformanceLayout.tsx` - add MixControls to layout
- `src/effects/EffectPipeline.ts` - integrate MixEffect, handle bypass
- `src/components/Canvas.tsx` - pass wetMix/bypass to pipeline
