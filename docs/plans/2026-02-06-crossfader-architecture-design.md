# Crossfader Architecture Design

## Goal

Add A/B crossfader control to blend between source video and processed output (slicer + effects chain), enabling smooth transitions back to source material during performance.

## Signal Flow

**Current:**
```
Source → [Slicer?] → Pipeline Input → Effects Chain → Dry/Wet → Output
```

**New:**
```
Source (A) ─────────────────────────────────────────┐
    ↓                                               ↓
[Slicer?] → Effects Chain (each with own wet) → [Crossfader] → Output
                      (B side)                      ↑
                                              0=Source, 1=Processed
```

- Crossfader at 0: Pure source video
- Crossfader at 1: Full processed signal (slicer + effects)
- B side always renders to keep slicer/effects "hot"

## Two-Stage Wet/Dry

1. **Per-effect wet/dry** — Each effect has its own wet mix for fine-tuning the B side
2. **Master crossfader** — Blends entire B side against source (A side)

## UI Component

**HorizontalCrossfader:**
- Horizontal slider at bottom of Effects Lane (below Clear/Bypass buttons)
- Video camera icon on left (source/A side)
- Waveform/effects icon on right (processed/B side)
- Full width of panel
- Same visual style as existing sliders
- Click icons to snap to 0 or 1
- Modulatable via sequencer routing (`mixer.crossfader`)

## Implementation

### Store Changes

**routingStore.ts:**
```typescript
crossfaderPosition: number  // 0 = Source, 1 = Processed (default: 1)
setCrossfaderPosition: (value: number) => void
```

### Pipeline Changes

**EffectPipeline.ts:**
- Add `sourceTexture` field to store original source
- Add `setSourceTexture(texture: THREE.Texture)` method
- Modify final render to blend `sourceTexture` with processed output using crossfader value
- Blending happens AFTER all effect passes and per-effect wet/dry mixing

### Canvas Changes

**Canvas.tsx:**
- Always pass original `mediaTexture` as source texture to pipeline
- Pass slicer output (when active) as input texture for effects chain
- Both textures available for final crossfade blend

### UI Changes

**HorizontalCrossfader.tsx (new):**
- Horizontal slider component with icon labels
- Reads/writes `crossfaderPosition` from routingStore

**EffectsLane.tsx:**
- Add HorizontalCrossfader at bottom, below Clear/Bypass buttons

**PerformanceLayout.tsx:**
- Remove VerticalCrossfader component and its container from bottom section

### Modulation Support

**useSequencerPlayback.ts:**
- Add routing case for `mixer.crossfader`

## Files Changed

| File | Action |
|------|--------|
| `src/stores/routingStore.ts` | Add crossfaderPosition state |
| `src/effects/EffectPipeline.ts` | Add setSourceTexture, final blend |
| `src/components/Canvas.tsx` | Pass source texture separately |
| `src/components/performance/HorizontalCrossfader.tsx` | Create new |
| `src/components/performance/EffectsLane.tsx` | Add crossfader |
| `src/components/performance/PerformanceLayout.tsx` | Remove VerticalCrossfader |
| `src/hooks/useSequencerPlayback.ts` | Add mixer.crossfader routing |

## Not Changed

- Individual effect wet/dry controls (preserved)
- Slicer output mode (replace/mix/layer) — internal to B side
- Bypass button — bypasses effects, crossfader independent
