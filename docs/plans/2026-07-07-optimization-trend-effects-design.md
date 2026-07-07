# Optimization + Trend Effects — Design Document

**Date:** 2026-07-07
**Status:** Approved
**Scope:** Three phases — (1) core render-pipeline performance fixes, (2) 16 new GPU effects from 2025-26 Instagram/TikTok and TouchDesigner trends, (3) port the 29 STRAND/ACID Canvas-2D CPU effects to GPU shader passes.

Phases land independently on feature branches; the app stays shippable between phases. Phase 3 gets its own implementation plan after Phases 1–2 merge.

---

## Background: audit findings driving this work

A performance audit of the render path found:

1. **Full pass-chain rebuild + GPU leak on every param change.** `Canvas.tsx` subscribes to the entire glitch-engine store with no selector; every param object is in one giant `useEffect` dependency array (`Canvas.tsx:216-532`). Any knob change re-runs `pipeline.updateEffects()`, which removes and recreates every active `EffectPass` (`EffectPipeline.ts:249-252, 309-318`). `postprocessing`'s `removePass()` never disposes, and neither do we — every rebuild leaks the discarded passes' compiled shader materials. `Knob.tsx` fires `onChange` per raw `pointermove`, so a knob drag triggers this dozens of times per second.
2. **Temporal captures never stop.** `EffectPipeline.render()` unconditionally calls `captureFrame()` for feedbackLoop, datamosh, motionExtract, echoTrail, timeSmear, freezeMask, motionTrace every frame. Each early-returns only while its render target is null — which is created on first enable and never released. After an effect is tried once, its full-res GPU copy (two full renders for Datamosh) costs every frame for the rest of the session even while disabled.
3. **STRAND (16 effects) and ACID (~13 effects) are CPU pixel loops.** Each active overlay does its own `drawImage(glCanvas)` GPU→CPU sync readback per frame, plus full-resolution `getImageData`/`createImageData` allocations per frame (e.g. `tarSpreadEffect.ts:41,56,86`). This is the largest dropped-frame source.
4. **PixelSort shader** does up to ~190 dependent texture samples per fragment at up to 2× DPR with no downscale path (`PixelSortEffect.ts:117-137, 162-209`).
5. **Nine overlay canvases** each run their own rAF loop and their own readback; `preserveDrawingBuffer: true` (`useThree.ts:19`) already forfeits zero-copy swaps to make those readbacks possible.

---

## Phase 1 — Core performance fixes

### 1.1 Structural vs param update split

**Problem:** one code path handles both "effect enabled/disabled/reordered" and "knob moved".

**Design:**
- `EffectPipeline.updateEffects()` keeps only structural responsibility: diff the enabled-effect set and order; rebuild the pass chain only when the set or order actually changed (shallow compare against the previous enabled list).
- Param changes bypass React entirely: `Canvas.tsx` registers `store.subscribe(selector, listener)` (zustand subscribeWithSelector or manual slice compare) per effect group; the listener calls `pipeline.<effect>.updateParams(params)` directly. The giant `useEffect` shrinks to structural inputs only (enabled flags, effect order, source/routing changes).
- All existing `updateParams()` methods already mutate uniforms in place — no per-effect changes needed.

### 1.2 Pass disposal

Cache one `EffectPass` per effect instance (`Map<Effect, EffectPass>`) and reuse it across structural rebuilds — rebuilds only add/remove cached passes from the composer in the new order. A pass is created when its effect first enters the chain and `pass.dispose()`d only when its effect leaves the chain (and in `pipeline.dispose()`). This eliminates per-rebuild pass construction entirely and sidesteps `EffectPass.dispose()` cascading into a still-in-use shared `Effect`: disposal only happens when the effect is going away too. A regression test toggles an effect off/on and confirms it still renders (re-created pass) and that `renderer.info.programs.length` returns to baseline after disable.

### 1.3 Temporal capture gating

`render()` calls `captureFrame()` only for effects whose enabled flag is currently true (the pipeline already receives the enabled map in `updateEffects()`; cache it). When a temporal effect is disabled, release its render target(s) (`target.dispose()`, null the reference) so re-enabling re-initializes cleanly.

### 1.4 Shared overlay readback

New module `src/components/overlays/sharedReadback.ts`: one offscreen canvas, populated at most once per rAF tick (guarded by frame counter) at a capped resolution (default 640×360, configurable per consumer need), by drawing the WebGL canvas once. All Canvas-2D overlays that currently `drawImage(glCanvas)` switch to sampling this shared canvas. Overlays that need higher resolution than the cap keep their own readback only if visually necessary (decided per overlay during implementation; default is the shared one).

### 1.5 Knob rAF throttling

`Knob.tsx`: accumulate the latest pointer-derived value; flush `onChange` at most once per animation frame via `requestAnimationFrame` guard. Pointer-up flushes immediately. Same treatment for XYPad if it has the same pattern.

### 1.6 PixelSort internal downscale

Render the PixelSort pass at half the composer resolution (own render target) and upscale, or cap its loop iterations by a resolution-aware factor. Choose whichever preserves the look better in side-by-side testing; default plan is half-res target since streaks are low-frequency.

### Phase 1 verification

- Dev-only frame-time readout in StatusBar (or console perf marks): record before/after ms/frame for a standard stack (RGB split + echo trail + pixel sort + one strand effect active).
- Knob-drag test: drag a knob for 10 s; frame time must stay flat and `renderer.info.programs.length` must not grow.
- Temporal gating test: enable/disable Datamosh; confirm `captureFrame` cost disappears when disabled (frame-time delta).
- `tsc -b` and production build green.

---

## Phase 2 — 16 new GPU effects

All are `postprocessing.Effect` fragment-shader effects in `src/effects/glitch-engine/` (physarum may use raw passes), reusing `NOISE_GLSL` utilities. Each is registered through the full 10-location checklist in CLAUDE.md and added to `routingStore.defaultEffectOrder`, with 3–5 params, compact-knob set, and expanded-panel controls, all modulation-routable.

### Placement (reserved slots only — no new pages)

| Page | Slot | ID | Label | Look |
|------|------|-----|-------|------|
| VISION | reserved_v4 | `halation` | HALATE | Film-glow: bright-pass → red-biased blur → screen blend |
| VISION | reserved_v5 | `y2k_digicam` | Y2K | Flash blowout, desaturated highlights, grain, low-res resample, optional timestamp |
| VISION | reserved_v6 | `thermal` | THERML | Luminance → 1D LUT ramp (thermal palette) or green night-vision variant w/ vignette + grain |
| VISION | reserved_v7 | `dreamcore` | DREAM | Orton bloom: blurred duplicate screen-blended, pastel lift, drifting haze noise |
| VISION | reserved_v8 | `anamorphic` | ANMRPH | Bright-pass → wide horizontal-only blur → blue tint → additive; optional lens squeeze |
| MOTION | motion_reserved_5 | `flow_smear` | FLOW | Frame-diff-driven displacement into feedback buffer (TD painterly smear) |
| MOTION | motion_reserved_6 | `feedback_tunnel` | TUNNEL | Classic TD feedback: prev output scaled/rotated/hue-shifted under new frame |
| MOTION | motion_reserved_7 | `opium_trails` | OPIUM | Exponential-decay ghost trails + crushed blacks + desaturation S-curve |
| MOTION | motion_reserved_8 | `rutt_etra` | RUTT | Luminance-displaced scanline mesh (Three.js LineSegments, vertex-shader Z from video texture, oblique camera) |
| MOTION | motion_reserved_9 | `reaction_diffusion` | REACT | Gray-Scott ping-pong sim seeded/masked by video luminance |
| MOTION | motion_reserved_10 | `physarum` | SLIME | WebGL2 GPGPU agent sim: float-texture positions, 3-sensor steering, trail deposit/decay/diffuse; video luminance biases deposit |
| DESTROY | destruction_reserved_5 | `kaleidoscope` | KALEID | Polar UV fold: angle modulo 2π/N with mirroring, animated rotation |
| DESTROY | destruction_reserved_6 | `liquid_morph` | LIQUID | Curl-noise UV domain warp + chrome treatment (contrast, teal shift, gradient-based specular) — per anima-morph plan |
| DESTROY | destruction_reserved_7 | `crystallize` | CRYSTL | Voronoi cell decomposition, cell-center sampling, boundary edges — per anima-morph plan |
| DESTROY | destruction_reserved_8 | `ripple_warp` | RIPPLE | Concentric sin-wave UV displacement with distance decay — per anima-morph plan |
| DESTROY | destruction_reserved_9 | `fractal_domain` | FRACTL | Iterative abs-fold/rotate/scale UV kaleidoscope tiling — per anima-morph plan |

Parameter tables for the four anima-morph effects come from `docs/plans/2026-03-20-anima-morph-effects.md` (authoritative for those four). The rest get params defined in the implementation plan following the same conventions (each includes a `mix` dry/wet).

### Implementation notes for the non-trivial three

- **FLOW** reuses the temporal-capture infrastructure (previous-frame texture) rather than adding a new capture; displacement magnitude from frame diff, direction from luminance gradient; feedback buffer with decay.
- **REACT** needs ping-pong float render targets and a fixed internal sim resolution (e.g. 512×288) independent of display resolution; video luminance composites into the B field each frame.
- **SLIME** is WebGL2-only: agent state in float textures updated by fragment passes (or transform feedback), trail map with decay+diffuse pass, rendered composited over/instead of video. Feature-detect float-texture render support; if absent, the effect button shows disabled state (same pattern as any unavailable source). Built last; target ≥100k agents at 60 fps on Apple Silicon.
- **RUTT** is a 3D vertex-displacement effect (like PointCloudEffect, which is the in-repo precedent for non-fragment-only effects in the chain).

### Effect ordering / build order

Ship in three waves so value lands early: (1) pure single-pass shaders — KALEID, RIPPLE, FRACTL, THERML, HALATE, ANMRPH, Y2K, DREAM, LIQUID, CRYSTL; (2) feedback/temporal — TUNNEL, OPIUM, FLOW; (3) sim/3D — REACT, RUTT, SLIME.

### Phase 2 verification (per effect)

- Enable via Playwright on localhost, screenshot, assert non-black canvas and zero console errors.
- Knob sweep on primary param produces visible change (two screenshots differ).
- All 10 checklist locations verified (grid button works, card stack shows card, compact knobs live, remove button works, appears in routing order).
- `tsc -b` + build green after each effect.

---

## Phase 3 — Port STRAND/ACID CPU effects to GPU (follow-on plan)

**Decision:** ported effects become passes in the main `EffectPipeline` composer (not a second WebGL overlay engine). This removes their readbacks and rAF loops entirely and makes them routable/reorderable like all other effects.

- ~24 of 29 are per-pixel transforms (tar spread, timefall, void out, halftone, hex, LED, voronoi, ripple, etc.) → direct fragment-shader ports.
- A handful are stateful particle/vector drawings (handprints, odradek, web strands, icons, glyph) that don't map to fragment shaders → they remain Canvas-2D overlays but consume the Phase-1 shared downsampled readback, and their per-frame allocations are fixed (reused buffers).
- Parity: per-effect side-by-side screenshot comparison (CPU vs GPU at fixed params/seed); acceptance is "same look", not pixel-identical (noise seeds may differ).
- The STRAND/ACID overlay components and per-effect CPU files are deleted as each port lands; `OverlayContainer` shrinks accordingly.

Detailed effect-by-effect plan is written after Phases 1–2 merge (patterns from Phase 2 inform the ports).

---

## Constraints & guardrails

- The uncommitted motion-polish working-tree changes (theme.css + performance components) are untouched by this work; all phases branch from master after that work is committed or stashed by Kevin.
- No new pages; `uiStore` page limits unchanged.
- No new runtime dependencies for Phases 1–2 (three + postprocessing already present). Physarum uses raw WebGL2 via three.js primitives.
- `preserveDrawingBuffer: true` stays until Phase 3 removes the last full-res readback consumers, then revisit.
- Every task: `tsc -b` green, Vite build green, Playwright smoke test, no console errors.

## Testing strategy summary

| Phase | Gate |
|-------|------|
| 1 | Frame-time before/after on standard stack; program-count stability during knob drag; build green |
| 2 | Per-effect Playwright screenshot + knob-sweep diff + 10-location checklist; build green |
| 3 | Per-effect visual parity screenshots; frame-time improvement with 3+ strand effects active; build green |
