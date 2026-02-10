# Destruction Mode - Hidden Chaos Feature

## Overview

A secret "god mode" destruction effect activated by a hidden key combo. When enabled, the canvas goes absolutely mental with datamoshing and chaos while the entire UI blacks out with aggressive glitch overlays.

## Activation

**Key Combo:** ↓↓ then Shift+D+M
- Two down-arrow presses within 500ms
- Then Shift+D+M pressed simultaneously within 1 second
- Failed sequences reset silently

**Exit:** Hold Escape for 2 seconds
- Prevents accidental exit - you commit to ending the chaos
- On exit, captures screenshot to clip bin before deactivating

**Indicator:** None - pure immersion

## Chaos Effect Stack

### Layered Existing Effects (Cranked to 11)
When destruction mode activates, force-enable and max out:
- RGB Split: amount 50+, angle randomized
- Block Displacement: intensity 0.8+, block size randomized
- Feedback Loop: intensity 0.9, decay slow
- Chromatic Aberration: maxed
- VHS Tracking: heavy corruption
- Noise/Static: cranked
- Pixel Sort: aggressive threshold

### True Datamosh Shader (New)
A dedicated `DatamoshEffect` GPU shader that simulates I-frame corruption:
- Holds previous frame data and "bleeds" motion vectors incorrectly
- Creates blocky JPEG-style artifact smearing
- Temporal ghosting where movement leaves corrupted trails
- Random "keyframe drops" that cause sudden visual jumps

### Randomized Modulation
A chaos engine that every 100-500ms (randomized) picks 2-3 parameters and tweaks them randomly. Nothing stays static - the destruction constantly evolves. Uses existing modulation infrastructure but bypasses normal routing.

## UI Takeover Overlay

### Dimming Layer
A fixed overlay covering everything except the canvas:
- Fades to ~10% opacity (nearly black)
- `pointer-events: none` so UI is still technically usable
- Instant on activation, slow fade out (~500ms) on deactivation

### Glitch Overlay Animation
On top of the dim layer:
- ASCII/matrix rain characters falling, but corrupted - characters glitch, stutter, occasionally reverse
- Random horizontal tear lines that slice across
- Occasional "static bursts" that flash regions with white noise
- All rendered at low opacity (~20-30%) - menacing but not blinding

### Canvas Exclusion
The overlay uses `clip-path` or absolute positioning to create a "window" for the canvas. Destruction stays visible while UI drowns.

## Screenshot on Exit

When the 2-second Escape hold completes (before deactivation):
1. Capture current canvas frame via `canvas.toDataURL()` or existing capture mechanism
2. Create clip bin entry with metadata:
   - Name: `DESTRUCTION_[timestamp]`
   - Source: `destruction-mode`
   - Thumbnail generated from capture
3. Proceed with normal deactivation

If capture fails, silently continue with exit. Screenshot is a bonus, not a blocker.

## Architecture

### File Structure
```
src/
  stores/destructionModeStore.ts    # Zustand state
  hooks/useDestructionMode.ts       # Key combo detection + escape hold
  hooks/useDestructionChaos.ts      # Chaos engine that modulates params
  components/DestructionOverlay.tsx # UI dimming + glitch animation
  effects/glitch-engine/DatamoshEffect.ts  # New GPU shader
```

### State (destructionModeStore)
```typescript
interface DestructionModeState {
  active: boolean
  activate: () => void
  deactivate: () => void
  escapeHeldStart: number | null
}
```

### Effect Pipeline Integration
1. `EffectPipeline.ts` gets new `datamoshEffect` instance
2. `useDestructionChaos` hook force-enables chaos effects via their stores
3. Saves previous effect states for restoration on exit
4. Runs randomized parameter modulation loop
5. Adds `DatamoshEffect` to render chain

### Cleanup
On deactivate:
1. Capture screenshot to clip bin
2. Restore all effect states to previous values
3. Stop modulation loop
4. Fade out overlay over ~500ms
