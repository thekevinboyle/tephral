# Strand Tracer Mobile — Design Document

## Overview

Dedicated native iOS app built with Expo + React Native, bringing the full Strand Tracer performance experience to mobile. Real-time camera effects powered by react-native-skia with react-native-vision-camera, sliding panel UI, photo + video capture with social sharing.

## Tech Stack

- **Framework:** Expo SDK 55+, React Native, iOS first
- **Camera:** react-native-vision-camera — frame processor access for real-time processing
- **GPU Rendering:** @shopify/react-native-skia — SkSL shaders via RuntimeEffect
- **Camera-Skia Bridge:** react-native-vision-camera-skia — pipes frames directly into Skia
- **Animations:** react-native-reanimated — 60fps gesture-driven panel transitions
- **Gestures:** react-native-gesture-handler — swipe, pan, pinch, long-press
- **State:** zustand — same stores as desktop, shared code
- **Media:** expo-media-library (camera roll), expo-sharing (share sheet)
- **Video Encoding:** FFmpegKit or expo-av for processed frame encoding

## Architecture

Three layers:

1. **Camera Layer** — VisionCamera captures frames, passes to Skia via frame processor
2. **Effect Pipeline** — Skia canvas applies chained SkSL shaders (ported from GLSL). Same concept as desktop EffectPipeline but using RuntimeEffect instead of postprocessing EffectPass
3. **UI Layer** — React Native views with Reanimated-powered sliding panel, effect grid, and parameter controls

## UI Layout

Single screen with three states driven by a draggable bottom sheet:

### Collapsed (performance mode)
- Camera preview fills 100% of screen
- Thin translucent bar at bottom: page indicator dots, record button, camera flip
- Semi-transparent 4x4 effect grid fades in on tap, fades out after 2s idle
- Swipe left/right on bottom bar to change effect page

### Half-sheet (control mode)
- Camera preview: top 45%
- Bottom 55%: draggable sheet with effect grid (4x4 touch grid, LED indicators) and active effect cards
- Tap active effect card to expand parameters inline (vertical sliders)

### Full-sheet (deep edit mode)
- Camera preview shrinks to top 25% (pip-style, still live)
- Full parameter panel: sliders, steppers, selects, routing
- Sequencer accessible via tab within the full sheet
- Swipe down to collapse back to half-sheet

### Gestures
- Pull up/down on sheet handle: transition between states
- Swipe left/right on grid: page navigation
- Long-press grid cell: quick-access parameter popup
- Pinch on camera preview: zoom
- Double-tap camera preview: flip front/back

## Effect Pipeline on Skia

### SkSL shader structure

```
uniform shader inputBuffer;  // previous pass output
uniform float effectMix;
// effect-specific uniforms

half4 main(float2 coord) {
  half4 inputColor = inputBuffer.eval(coord);
  // effect logic
  return mix(inputColor, effectColor, effectMix);
}
```

### Porting strategy
- Desktop keeps GLSL in `src/effects/`
- Mobile gets SkSL in `src/effects-skia/`
- Shared param types and defaults — same TypeScript interfaces
- `SkiaEffectPipeline` class mirrors `EffectPipeline` but chains RuntimeEffect instances

### Temporal effects
Echo trail, time smear, feedback loop, datamosh use Skia offscreen surfaces (`Skia.Surface.Make`) for frame history — same concept as WebGLRenderTarget on desktop.

### Face HUD
Replace MediaPipe web with react-native-vision-camera's built-in face detection frame processor. Landmarks render directly on Skia canvas.

### Performance target
- 30fps minimum with 3-4 effects active on iPhone 12+
- Single effect: 60fps
- All 30+ desktop effects ported to SkSL

## Code Sharing — Monorepo

```
packages/
  shared/        — stores, config, types, utils
  web/           — current Vite app (desktop)
  mobile/        — Expo app (iOS)
```

### Shared code (zero changes)
- All Zustand stores
- `config/effects.ts` — effect definitions, pages, getEffectsForPage()
- `config/effectParams.ts` — parameter registry
- `utils/faceEmotions.ts` — emotion heuristics
- Effect param types and default constants

### Mobile-only code
- `effects-skia/` — SkSL shader versions
- `pipeline/SkiaEffectPipeline.ts` — Skia pipeline orchestrator
- `components-mobile/` — sliding panel, touch grid, mobile controls
- `hooks/useCamera.ts` — VisionCamera frame processor
- `hooks/useCapture.ts` — photo/video recording

### Build tooling
Turborepo or Nx for monorepo management. Shared package consumed by both platforms.

### Persistence
zustand/middleware with AsyncStorage on mobile (instead of localStorage) for presets, effect order, preferences.

## Recording & Export

### Photo capture
- Tap shutter: Skia `makeImageSnapshot()` captures current frame with effects
- Saves to camera roll via expo-media-library
- Resolution: matches camera output (1080p or 4K)
- Format: HEIF (iOS default) with JPEG fallback

### Video recording
- Toggle record button: captures processed Skia frames
- Encoded via FFmpegKit or expo-av to H.265/HEVC in .mov container
- Target: 1080p @ 30fps with effects active
- Auto-stops at configurable max duration (default 60s, up to 5min)
- Recording indicator: red pulse on camera preview border

### Share flow
- After capture: thumbnail toast at bottom
- Tap thumbnail: preview screen with save / share / delete
- Native share sheet: Instagram, TikTok, Messages, AirDrop, etc.
- Videos auto-save during recording (no post-processing delay)

## Mobile UX Details

### Touch-optimized controls
- Desktop knobs become vertical sliders (44pt min touch target)
- Parameter value displays above thumb while dragging
- Effect grid cells: 48x48pt minimum, 8pt gaps
- Active effect cards: swipe left to disable/remove
- Long-press + drag for effect chain reordering

### Haptic feedback
- Light tap: effect toggle
- Medium impact: page swipe snap
- Heavy impact: record start/stop
- Selection tick: slider detent points (min, max, default)

### Performance safeguards
- Thermal throttle detection with warning and offer to reduce effects
- FPS counter (dev mode), auto-disable effects below 24fps sustained
- GPU cost budget per effect, warn when total exceeds device capability
- Pause pipeline entirely when app backgrounds

### Onboarding
- First launch: camera with one effect pre-enabled (RGB Split, subtle)
- Coach marks: "Swipe up for controls", "Tap grid to toggle", "Pull up for parameters"
- Skip button, never shows again
