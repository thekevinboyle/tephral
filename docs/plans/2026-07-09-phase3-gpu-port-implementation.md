# Phase 3: STRAND/ACID CPU→GPU Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 27 Canvas-2D overlay effects (STRAND + ACID pages) to GPU passes in the main EffectPipeline, eliminating their per-frame CPU pixel loops and WebGL-canvas readbacks.

**Architecture:** Each ported effect becomes a `postprocessing.Effect` in `src/effects/glitch-engine/`, driven by the EXISTING `acidStore`/`strandStore` params (no store changes), registered in `EffectPipeline` + `Canvas.tsx` enabled flags + `paramSync` pushes — the same integration contract as Phase 2. As each effect's GPU version reaches visual parity, its CPU dispatch is removed from `StrandOverlay.tsx`/`AcidOverlay.tsx`; at the end, `StrandOverlay` is deleted entirely and `AcidOverlay` keeps only DECOMP (unportable recursive quad-tree).

**Tech Stack:** three ^0.182 + postprocessing ^6.38 GLSL, zustand 5. Templates: Phase-2 effects for class shape/lifecycle; `acid/slitEffect.ts` (already WebGL) for temporal history; ReactionDiffusionEffect for ping-pong CA sims.

**Shader bodies are recipes, not verbatim GLSL** (same documented deviation as Phase 2 — the gate is in-browser visual parity, which pre-written code cannot guarantee). Everything else — ids, stores, params, wiring points, parity protocol — is exact.

## Ground truth from code analysis (supersedes the older spec's counts)

- Already GPU, no work: `acid_cloud`, `acid_slit`, `acid_voronoi`. Dead code: `acid/dotsEffect.ts` (GPU version shipped long ago; delete in Task 15).
- Stays CPU by design: `acid_decomp` (recursive variance quad-tree — not fragment-shader shaped). It keeps AcidOverlay alive on the Phase-1 shared readback.
- **Escape hatch (applies to every C-category task):** if an effect cannot reach parity as procedural GLSL within its task (2 serious shader iterations), STOP, report DONE_WITH_CONCERNS recommending keep-CPU, and leave its CPU dispatch in place. A working CPU effect beats a broken GPU one. The coordinator decides; do not grind.

## Global Constraints

- Every task ends with `npm run build` passing.
- **Parity protocol (every port task):** BEFORE screenshots first (CPU version at 2-3 param settings via the harness), then port, then AFTER screenshots at identical settings, then side-by-side comparison (Read the images). Gate: same look — layout, density, motion character, palette; not pixel-identical. Only after parity: remove that effect's dispatch from the overlay component (same commit).
- Ported effects read params from the EXISTING `useAcidStore`/`useStrandStore` — do NOT move params to trendStore. Param names/semantics unchanged (knobs/registry/modulation already target them).
- Compositing semantics: overlay effects drew OVER the composited output; ported passes run in-chain. For ACID effects honor `acidStore.preserveVideo` as a uniform (false = effect renders on black, true = over source). STRAND effects composite over source with their existing alpha behavior. Verify against BEFORE shots.
- Temporal/stateful effects follow the Phase-1-hardened lifecycle verbatim (guarded initialize, releaseTargets true-inverse, temporalIds/temporalEffects, gated captures only if they capture output).
- Browser verification: puppeteer harness (`.superpowers/sdd/fx-verify.mjs` patterns; fresh dev server per run; store-driven with real clicks for enable; STRAND/ACID grid pages are 'STRAND' and 'ACID' tabs).
- Commit per task, prefix `gpu:`.

---

### Task 1: Wiring infrastructure + parity harness

**Files:** Modify `src/components/Canvas.tsx`, `src/effects/EffectPipeline.ts`, `src/effects/paramSync.ts`; Create `.superpowers/sdd/parity-shot.mjs`

- [ ] Canvas.tsx: destructure the 27 enabled flags from `useAcidStore`/`useStrandStore` (flags only) and pass as `updateEffects` config entries via `getEffectiveEnabled('<id>', flag && !effectBypassed['<id>'])` (NOT gated by glitchEnabled); add to the structural dep array. Ids (ACID page 0): acid_mirror, acid_ripple, acid_scan, acid_slice, acid_thgrid, acid_contour, acid_glyph, acid_halftone, acid_hex, acid_icons, acid_led. (STRAND page 3): all 16 strand_* ids. **CRITICAL:** while an effect's GPU class doesn't exist, the null-filter keeps the pass chain unchanged AND the overlay keeps rendering it — no behavior change until each port lands and removes its dispatch.
- [ ] EffectPipeline.ts: add the 27 config fields + enabledMap entries. No getEffectById cases yet.
- [ ] paramSync.ts: add empty `pushAcidPorts()` / `pushStrandPorts()` wired into the initial push, effectMix group, and new `useAcidStore`/`useStrandStore` subscriptions with reference-equality checks on each effect's params slice (read the two stores for exact slice names — acid uses `<name>Params`, strand check actual shape).
- [ ] Create `.superpowers/sdd/parity-shot.mjs`: like fx-verify but takes `<PAGE> <BTN> <store: acid|strand> <camelParamsKey> <param> <v1> <v2> <label>` and saves `.superpowers/sdd/shots/parity/<BTN>-<label>-{on,v1,v2}.png` (no pass/fail — pure capture, used for BEFORE and AFTER sets).
- [ ] `npm run build` exit 0; browser sanity: enabling TAR + HALF still renders exactly as today (overlays untouched). Commit `gpu: wiring scaffold for strand/acid GPU ports + parity harness`.

---

## Wave A — direct stateless ports (Tasks 2–5). Per effect: BEFORE parity shots → Effect class (glitch-engine, existing store params + `preserveVideo` uniform for acid + `effectMix`) → EffectPipeline registration (property/constructor/getEffectById/dispose) → paramSync push line → AFTER shots → visual parity check (Read both sets) → remove the effect's dispatch from AcidOverlay.tsx/StrandOverlay.tsx → build + verify → commit.

### Task 2: acid_mirror + acid_ripple (UV warps)
- [ ] MIRROR: pie-segment kaleidoscope about (centerX, centerY) with `segments`, `rotation` — port the CPU's exact segment-mirror math (read `acid/mirrorEffect.ts`; note differences from Phase-2 KALEID: per-center, no spin animation unless the CPU has it). RIPPLE: concentric displacement per the CPU's frequency/amplitude/speed/decay and its multi-center behavior (≤8 centers). Parity + dispatch removal + commit `gpu: port acid mirror + ripple to shader passes`.

### Task 3: acid_scan + acid_slice + acid_thgrid
- [ ] SCAN: sweep reveal with speed/width/direction/trail (trail = position-based falloff, no buffer needed — verify against CPU). SLICE: band offsets by deterministic hash per slice (sliceCount/direction/offset/wave). THGRID: threshold B&W + procedural grid lines + corner marks (gridSize/lineWidth/invert/cornerMarks). Parity + removals + commit `gpu: port acid scan/slice/thgrid`.

### Task 4: strand_beach + strand_voidout
- [ ] BEACH: invert-flicker blocks + grain (grainAmount/invertProbability/flickerSpeed; CPU regenerates block pattern periodically — reproduce with time-quantized hash so blocks hold then re-roll). VOIDOUT: expanding shockwave ring UV distortion (speed/distortAmount/ringWidth; ring phase = pure function of time). Parity + removals + commit `gpu: port strand beach-static + void-out`.

### Task 5: strand_seam + strand_cloud (chiralCloud)
- [ ] SEAM: parallax rift split with edge distortion (riftWidth/parallaxAmount/edgeDistort + its decorative jitter). CHIRAL CLOUD: fog pooled into dark regions (density/responsiveness/tint; CPU samples at step=2 — full-res in GLSL is fine, use fbm for the fog body). Parity + removals + commit `gpu: port strand seam + chiral-cloud`.

---

## Wave C — procedural-GLSL ports (Tasks 6–12). Same per-effect protocol. Grid/glyph effects: cell = floor(uv*grid), per-cell brightness from a downsampled source sample (or 2-3 taps), shape drawn procedurally in-cell. Text/emoji effects use a CanvasTexture glyph atlas built ONCE at init (not per frame).

### Task 6: acid_halftone + acid_led + acid_hex (grid mosaics)
- [ ] HALFTONE: rotated dot screen (dotSize/angle/colorMode/contrast — replicate the CPU's channel passes for its color modes). LED: LED-matrix dots with bleed (gridSize/dotSize/brightness/bleed). HEX: hex tiling fill/edges (cellSize/fillMode/showEdges/rotation; standard hex-tiling GLSL). Parity + removals + commit.

### Task 7: acid_glyph + acid_icons (atlas glyphs)
- [ ] Build one CanvasTexture atlas per effect at init from the CPU version's exact charsets/icon sets (read the source arrays); cell brightness indexes the atlas; `invert`, `density`, `rotation`, `colorMode` per store params. CPU uses per-cell randomness — reproduce with a stable per-cell hash (cells shouldn't flicker unless CPU's do; CHECK the before shots). Parity + removals + commit.

### Task 8: acid_contour (marching squares)
- [ ] Iso-lines at `levels` brightness bands: GLSL approach = per-pixel band edge detection (fwidth-based iso-line rendering matches marching-squares look at full res) with lineWidth/smooth/animate. Parity + removal + commit.

### Task 9: strand_dooms + strand_bridge + strand_web (bright/edge features)
- [ ] DOOMS: halos at grid-sampled bright spots (haloSize/pulseSpeed/sensitivity) — per-pixel: sample a coarse grid cell's brightness, draw halo field around bright cells. BRIDGE: hex-grid glow from Sobel edges (gridSize/edgeSensitivity/opacity). WEB: connecting lines between bright points — hardest of the three: use a fixed coarse grid (e.g. 24×14 cells), each cell's brightest-point offset from a 3-tap estimate, draw line segments between neighboring bright cells procedurally (distance-to-segment in fragment). If web parity fails the escape hatch applies. Parity + removals + commit.

### Task 10: strand_timefall + strand_umbilical
- [ ] TIMEFALL: vertical rain streaks + column aging (intensity/streakCount/ageAmount) — streaks = per-column hash-driven falling phase; aging = column desaturation by streak history approximated with a time-windowed hash (verify look vs CPU; if the aging genuinely needs accumulation, add a small ping-pong age buffer — that's allowed, use the temporal lifecycle). UMBILICAL: pulsing tendrils from screen edges (tendrilCount/reachDistance/pulseSpeed) — polyline tendrils = per-tendril hash geometry, distance-to-curve rendering. Parity + removals + commit.

### Task 11: strand_handprints + strand_bbpod + strand_chiralium
- [ ] HANDPRINTS: fading handprint stamps (density/fadeSpeed/size) — CPU spawns at random positions/times; GPU: per-slot hash positions on a time-windowed lifecycle, handprint SHAPE from a small CanvasTexture stamp atlas (draw the CPU's hand path once at init). BBPOD: radial vignette + caustic rings + drifting bubbles (vignetteSize/tintStrength/causticAmount; bubbles = per-slot hash lifecycles). CHIRALIUM: crystal facets at bright spots (threshold/density/shimmer; facet placement per bright coarse-grid cells + hash). Parity + removals + commit.

### Task 12: strand_odradek
- [ ] Radar sweep revealing Sobel edges (sweepSpeed/revealDuration/pingIntensity): sweep angle = f(time); reveal window = angular distance from sweep with decay; edges via 3×3 Sobel; ping trails at sweep-crossing bright points via time-windowed hash slots. Parity + removal + commit.

---

## Wave B — temporal CA sims (Tasks 13–14). Ping-pong half-float state at fixed sim res (matching Phase-2 REACT patterns: sim advances in update(), guarded initialize, releaseTargets true-inverse, temporalIds/temporalEffects, no captureFrame).

### Task 13: strand_tar + strand_extinction
- [ ] TAR: spreading tar mask CA — state texture holds mask strength; per step: seed from dark source regions past `threshold`, spread to neighbors at `spreadSpeed` up to `coverage`; display: tar-black with glossy highlights per CPU look (read `tarSpreadEffect.ts` for its exact spread rule — CPU uses max-of-neighbors; that's a 3×3 max filter in GLSL). EXTINCTION: edge-erosion decay inward (erosionSpeed/decayStages/coverage) — state = erosion depth map advancing from borders; display = staged decay palette per CPU. Parity + removals + commit.

### Task 14: strand_path (chiralPath particles)
- [ ] Optical-flow particle trails (particleCount/trailLength/flowSpeed): agent state texture (like Phase-2 SLIME but simpler — particles follow frame-diff flow), trail accumulation buffer with decay; frame-diff needs a prevFrame capture (this one DOES use captureFrame — register in the gated capture block). If parity within budget fails, escape hatch. Parity + removal + commit.

---

### Task 15: Teardown, regression, perf proof

- [ ] Delete `src/components/overlays/StrandOverlay.tsx` + `src/components/overlays/strand/` (all 16 ported) and remove from OverlayContainer; AcidOverlay: strip all ported dispatches + the dead `dotsEffect.ts` import/file, keep ONLY decomp (+ preserveVideo passthrough if decomp needs it); update AcidOverlay to skip its readback entirely when decomp is disabled. If any effect took the keep-CPU escape hatch, keep its dispatch and adjust this task accordingly.
- [ ] Regression: scripted sweep enabling each of the 27 ported effects (+decomp) one at a time — renders, param sweep changes visuals, disable restores; stacks: TAR+HALF+SORT (the Phase-1 baseline overlay stack), 3 strand effects together, effect-order drag moves a ported effect within the chain (they're now reorderable — NEW capability, verify one reorder visually).
- [ ] Perf proof (the point of Phase 3): with TAR + HALF + Stipple enabled, measure GPU-readback count/sec (Task-6-Phase-1 instrumentation method) — strand/acid readbacks must be GONE (only Stipple's remains, via shared readback); record before/after + pipeline avg-ms in `docs/plans/phase1-perf-baseline.md` "Phase 3" section.
- [ ] Docs: CLAUDE.md — remove/adjust any overlay-specific effect guidance made stale by the deletion.
- [ ] Build; commit `gpu: phase 3 teardown — strand/acid overlays retired`; final whole-branch review (most capable model) then superpowers:finishing-a-development-branch.
