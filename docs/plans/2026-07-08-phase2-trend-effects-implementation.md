# Phase 2: 16 Trend Effects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 16 new GPU effects (2025-26 Instagram/TikTok + TouchDesigner trends) into the reserved grid slots on the VISION, MOTION, and DESTROY pages.

**Architecture:** One new zustand store (`trendStore`) holds all 16 effects' state. Grid/param-UI/Canvas/paramSync wiring lands first (safe by construction: `updateEffects` filters ids whose `getEffectById` returns null, so pre-wired buttons no-op until each effect class registers). Each effect is then one self-contained task: a `postprocessing.Effect` subclass in `src/effects/glitch-engine/`, pipeline registration, and a paramSync push line — turning exactly one grid button live per task.

**Tech Stack:** three ^0.182 + postprocessing ^6.38 (GLSL fragment shaders; `NOISE_GLSL` utils in `src/effects/glitch-engine/glsl-utils.ts`), zustand 5, React 18.

**Spec:** `docs/plans/2026-07-07-optimization-trend-effects-design.md` (Phase 2 section). For LIQUID/CRYSTL/RIPPLE/FRACTL, `docs/plans/2026-03-20-anima-morph-effects.md` is authoritative for shader approach and parameters.

**A deliberate deviation from the usual plan format:** shader BODIES are specified as algorithm recipes + uniform contracts, not verbatim GLSL. Phase 1's Task 8 proved that pre-written shader code drafted blind routinely fails the in-browser visual gate; for creative visual output the gate is "looks right on live video", which only in-browser iteration satisfies. Everything else (ids, params, ranges, defaults, store slices, wiring points, verification) is exact. Implementer tasks therefore need a mid-tier model, not the cheapest.

## Global Constraints

- Every task ends with `npm run build` passing (`tsc -b && vite build`).
- Browser verification per effect task (see "Standard effect verification" below); zero new console errors (pre-existing React key-spread warnings from ParamBlock/DragNumberBlock/VerticalFaderBlock are excluded).
- No new pages; `uiStore` page limits unchanged. No new runtime dependencies.
- Params must be modulation-routable: expose them through the same Knob/`paramId` conventions existing effects use.
- Every effect has a `mix` (dry/wet) param, wired through `effectMix` like existing effects (`mix: getMix('<id>')` in paramSync).
- Temporal effects (marked TEMPORAL below) MUST: create render targets only in a guarded `initialize()` (`if (this.<firstTarget>) return` after `super.initialize`), implement `releaseTargets()` as the true inverse of `initialize()` (dispose+null targets AND materials/geometry, reset has-data flags), and be registered in `EffectPipeline.updateEffects`'s `temporalIds`/`temporalEffects` maps and `render()`'s gated `captureFrame` block. `EchoTrailEffect.ts` is the canonical template.
- Commit per task with prefix `fx:`.

## Standard effect verification (referenced by every effect task)

1. `npm run build` — exit 0.
2. Fresh dev server (`lsof -ti:5173 | xargs kill; npm run dev &`) — **required**: zustand store access via `browser_evaluate` dynamic import silently writes to a phantom store copy after any HMR invalidation (see the warning at the end of `docs/plans/phase1-perf-baseline.md`).
3. Playwright: viewport 2560×1440; load the image programmatically (`new Image()` with src `/@fs/Users/kevin/Documents/web/strand-tracer/anima-morph/IMG_9153.PNG`, await onload, then `mediaStore.setImageElement(img)`, `mediaStore.setSource('file')`, `recordingStore.setSource('file')`).
4. Navigate the grid to the effect's page tab (VISION / MOTION / DESTROY), click the effect's button (real click). Screenshot: canvas must differ visibly from the source screenshot and must not be black.
5. Sweep the primary param (store setter is fine on a fresh server): two clearly different values → two visibly different screenshots.
6. Disable the effect → canvas returns to source. Re-enable → effect returns (for TEMPORAL effects this exercises release/re-init).
7. Card check: effect card appears in the left stack with its compact knobs; remove button disables it.

---

### Task 0: Branch

- [ ] `git checkout -b fx/phase2-trend-effects` from master (verify `git status` clean first; untracked `anima-morph/`, mobile plan docs, and `.playwright-mcp/` are expected and stay untracked).

---

### Task 1: trendStore

**Files:** Create `src/stores/trendStore.ts`

**Interfaces (produces — later tasks rely on these exact names):** `useTrendStore` with, for each effect below: `<camel>Enabled: boolean`, `set<Pascal>Enabled(v: boolean)`, `<camel>Params: <Pascal>Params`, `update<Pascal>Params(p: Partial<...>)` — following `motionStore.ts`'s shape (immutable spread updates so paramSync's reference-equality checks fire). Also `DEFAULT_<CONST>_PARAMS` exports.

**The 16 effects and their params (exact — this table is the single source of truth for Tasks 1, 4, and each effect task):**

| id | camel | label | page | color | params (name: range = default) | compact knobs |
|----|-------|-------|------|-------|-------------------------------|----------------|
| `halation` | halation | HALATE | VISION | `#ff9e80` | threshold: 0–1 = 0.75; radius: 4–64 = 24; redBias: 0–1 = 0.6; amount: 0–1 = 0.6; mix = 1 | amount, threshold, radius |
| `y2k_digicam` | y2k | Y2K | VISION | `#ffd54f` | flash: 0–1 = 0.7; vignette: 0–1 = 0.6; grain: 0–1 = 0.4; resDown: 1–8 = 2; mix = 1 | flash, grain, vignette |
| `thermal` | thermal | THERML | VISION | `#ff5252` | palette: 0–2 = 0 (0 thermal / 1 nightvision / 2 amber); gain: 0.5–2 = 1; grain: 0–1 = 0.3; vignette: 0–1 = 0.5; mix = 1 | gain, palette, grain |
| `dreamcore` | dreamcore | DREAM | VISION | `#b39ddb` | bloom: 0–1 = 0.6; radius: 4–64 = 32; pastel: 0–1 = 0.5; haze: 0–1 = 0.3; drift: 0–2 = 0.5; mix = 1 | bloom, pastel, haze |
| `anamorphic` | anamorphic | ANMRPH | VISION | `#64b5f6` | threshold: 0–1 = 0.8; streak: 0–1 = 0.7; tint: 0–1 = 0.7; squeeze: 0–0.3 = 0.1; mix = 1 | streak, threshold, squeeze |
| `flow_smear` | flowSmear | FLOW | MOTION | `#99EE22` | strength: 0–100 = 40; decay: 0–1 = 0.9; blur: 0–1 = 0.3; mix = 1 | strength, decay, blur |
| `feedback_tunnel` | feedbackTunnel | TUNNEL | MOTION | `#7CB342` | zoom: 0.9–1.1 = 1.02; rotate: −5–5 = 0.8; decay: 0–1 = 0.92; hueShift: 0–30 = 6; mix = 1 | zoom, rotate, decay |
| `opium_trails` | opiumTrails | OPIUM | MOTION | `#558B2F` | decay: 0–1 = 0.9; crush: 0–1 = 0.5; desat: 0–1 = 0.4; mix = 1 | decay, crush, desat |
| `rutt_etra` | ruttEtra | RUTT | MOTION | `#9CCC65` | lines: 16–128 = 64; depth: 0–100 = 40; tilt: 0–60 = 30; glow: 0–1 = 0.4; mix = 1 | lines, depth, tilt |
| `reaction_diffusion` | reactionDiffusion | REACT | MOTION | `#C0CA33` | feed: 0.01–0.1 = 0.037; kill: 0.04–0.07 = 0.06; speed: 1–8 = 4; seedAmt: 0–1 = 0.4; colorize: 0–1 = 0.6; mix = 1 | feed, kill, speed |
| `physarum` | physarum | SLIME | MOTION | `#AED581` | agents: 10000–300000 = 100000; sensorAngle: 10–60 = 30; sensorDist: 4–32 = 12; decay: 0.8–0.99 = 0.95; deposit: 0–1 = 0.6; lumaBias: 0–1 = 0.5; mix = 1 | agents, sensorAngle, decay |
| `kaleidoscope` | kaleidoscope | KALEID | DESTROY | `#ff6699` | segments: 2–16 = 6; spin: −2–2 = 0.3; offset: 0–1 = 0; mix = 1 | segments, spin, offset |
| `liquid_morph` | liquidMorph | LIQUID | DESTROY | `#4ecdc4` | speed: 0.1–3 = 0.8; scale: 1–20 = 6; intensity: 0–1 = 0.5; chromeAmount: 0–1 = 0.7; mix = 1 | intensity, chromeAmount, speed |
| `crystallize` | crystallize | CRYSTL | DESTROY | `#a8e6cf` | cellCount: 8–128 = 32; shatter: 0–1 = 0.3; edgeGlow: 0–1 = 0.4; mix = 1 | cellCount, shatter, edgeGlow |
| `ripple_warp` | rippleWarp | RIPPLE | DESTROY | `#7b68ee` | frequency: 1–40 = 12; speed: 0.1–5 = 1.5; amplitude: 0–1 = 0.3; decay: 0–1 = 0.6; mix = 1 | frequency, amplitude, speed |
| `fractal_domain` | fractalDomain | FRACTL | DESTROY | `#ff6b9d` | iterations: 1–8 = 4; zoom: 1–3 = 1.6; spin: −2–2 = 0.4; mix = 1 | iterations, zoom, spin |

- [ ] Write the store with all 16 param interfaces, defaults, enabled flags, setters (model on `src/stores/motionStore.ts`). One store, no middleware (plain `create<T>()((set) => ...)`).
- [ ] `npm run build` → exit 0. Commit `fx: add trendStore for phase-2 trend effects`.

---

### Task 2: Effects config + routing

**Files:** Modify `src/config/effects.ts`, `src/stores/routingStore.ts`

- [ ] In `effects.ts`, replace exactly these reserved definitions with real ones (label/color/page from the Task 1 table; pick `row` values: 'color' for halation/thermal/dreamcore, 'texture' for y2k_digicam/anamorphic/crystallize, 'render' for the 6 MOTION effects, 'distortion' for kaleidoscope/liquid_morph/ripple_warp/fractal_domain; min/max = primary param's range):
  - VISION `reserved_v4`→`halation`, `v5`→`y2k_digicam`, `v6`→`thermal`, `v7`→`dreamcore`, `v8`→`anamorphic` (v9, v10 stay reserved)
  - MOTION `motion_reserved_5`→`flow_smear`, `_6`→`feedback_tunnel`, `_7`→`opium_trails`, `_8`→`rutt_etra`, `_9`→`reaction_diffusion`, `_10`→`physarum` (11–16 stay)
  - DESTROY `destruction_reserved_5`→`kaleidoscope`, `_6`→`liquid_morph`, `_7`→`crystallize`, `_8`→`ripple_warp`, `_9`→`fractal_domain` (10–16 stay)
- [ ] Check how `PerformanceGrid`/`EffectButton` special-case `row: 'reserved'` and confirm the replaced entries render as normal (colored, clickable) buttons.
- [ ] `routingStore.ts`: append all 16 ids to `defaultEffectOrder` (order: the table's order).
- [ ] Build → exit 0. Browser sanity: the 16 buttons render with labels/colors on their pages (clicking does nothing yet — no store wiring). Commit `fx: register 16 trend effects in grid config and routing order`.

---

### Task 3: Grid plumbing (enable/disable paths)

**Files:** Modify `src/components/performance/PerformanceGrid.tsx`, `src/hooks/useActiveEffects.ts`, `src/hooks/useEffectDisable.ts`

- [ ] `PerformanceGrid.tsx`: import `useTrendStore`; add all 16 cases to `getEffectState()` (enabled flag + toggle via the store's setter + primary param value/label per the table) and include trendStore flags in `pageHasActiveEffects()` for pages 1, 4, 5.
- [ ] `useActiveEffects.ts`: add the 16 enabled checks pushing `{ id, primaryValue, primaryLabel }` (primary = first compact knob in the table).
- [ ] `useEffectDisable.ts`: add 16 cases mapping id → `useTrendStore` setter.
- [ ] Build → exit 0. Browser: clicking each of the 16 buttons toggles its lit state and a card appears/disappears in the stack (card params still empty until Task 4; canvas unchanged until effect tasks). Commit `fx: wire trend effects into grid, card stack, and disable paths`.

---

### Task 4: Param UI

**Files:** Modify `src/components/performance/CompactEffectParams.tsx`, `src/components/performance/ExpandedParameterPanel.tsx`

- [ ] `CompactEffectParams.tsx`: one case per effect with the table's compact knobs (2–3 `Knob`s, ranges/defaults from the table, `paramId`s named `<id>.<param>` following the existing convention — read two existing cases first and match exactly).
- [ ] `ExpandedParameterPanel.tsx`: add the trend effects lookup (include the three config arrays' new entries) and one case per effect exposing ALL params from the table (SliderRow/SelectRow per existing patterns; `thermal.palette` is a 3-option select: THERMAL/NIGHTVIS/AMBER).
- [ ] Build → exit 0. Browser: each card shows its knobs; expanded panel shows full params; dragging knobs updates store values (verify via one effect's store in console on a fresh server). Commit `fx: compact + expanded parameter UI for trend effects`.

---

### Task 5: Canvas structural wiring + paramSync + pipeline enabled-map

**Files:** Modify `src/components/Canvas.tsx`, `src/effects/paramSync.ts`, `src/effects/EffectPipeline.ts`

- [ ] `Canvas.tsx`: subscribe to trendStore's 16 enabled flags ONLY (no params — params flow through paramSync); pass them into `pipeline.updateEffects({...})` as `halationEnabled: getEffectiveEnabled('halation', halationEnabled && !effectBypassed['halation'])` etc.; add the 16 flags to the structural effect's dependency array.
- [ ] `EffectPipeline.ts` `updateEffects`: add the 16 boolean fields to the config type and the 16 `enabledMap` entries. Do NOT add `getEffectById` cases yet (each effect task does its own — the null filter keeps pre-wired ids inert).
- [ ] `paramSync.ts`: add an EMPTY `pushTrend()` (each effect task adds its own `pipeline.<camel>?.updateParams({ ...s.<camel>Params, mix: getMix('<id>') })` line when its pipeline property exists), plus: a `useTrendStore.subscribe` block with reference-equality checks on all 16 param slices calling `pushTrend()`, `pushTrend()` in the initial push list, and `pushTrend()` in the effectMix re-push group.
- [ ] Build → exit 0 (the empty `pushTrend` compiles). Browser: enabling any trend effect leaves the canvas unchanged and logs no errors (null-filtered). Commit `fx: structural wiring and param-sync scaffolding for trend effects`.

---

## Wave 1 — single-pass shader effects (Tasks 6–12)

Every Wave-1 task follows the same shape — for each effect: create `src/effects/glitch-engine/<Pascal>Effect.ts` (a `postprocessing.Effect` subclass with uniforms for every param + `effectMix`, `updateParams()` writing uniforms in place, `dispose()`; model on `RGBSplitEffect.ts`; export from `glitch-engine/index.ts`); register in `EffectPipeline.ts` (typed property, constructor init, `getEffectById` case, `dispose()` call); add its `pushTrend` line in `paramSync.ts`. Then run the Standard effect verification. Time-animated shaders get a `time` uniform advanced in `update()` (see `NoiseEffect.ts` for the pattern). Use `NOISE_GLSL` helpers (valueNoise/fbm/curlNoise) — do not re-implement noise.

### Task 6: KALEID + RIPPLE (pure UV warps)

- [ ] **kaleidoscope**: polar fold — `uv→(r,θ)` about center; `θ = mod(θ + spin*time, 2π/segments)` with mirror on alternate segments (`abs(mod(θ, 2·seg) − seg)`); `offset` rotates the segment seam; sample source at folded UV; mix.
- [ ] **ripple_warp** (per anima-morph doc): `uv += normalize(uv−c) * sin(dist*frequency − time*speed) * amplitude * exp(−dist*decay*k)`; mix.
- [ ] Standard verification for both. Commit `fx: kaleidoscope + ripple warp effects`.

### Task 7: FRACTL (kaleidoscopic IFS)

- [ ] Per anima-morph doc: iterate `iterations`× { center UV, `abs()` fold, rotate by `spin*time + i*golden`, scale by `1/zoom`, recenter }; sample source at final UV. Guard: loop must be a compile-time max (8) with runtime break. Standard verification. Commit `fx: fractal domain effect`.

### Task 8: THERML + Y2K (camera looks)

- [ ] **thermal**: luminance → palette ramp. palette 0: GLSL-computed thermal gradient (black→purple→red→orange→yellow→white via smoothstep bands — no texture needed); palette 1: green tint `lum*(0.15,1,0.2)` + scanline-free but strong grain + circular vignette; palette 2: amber variant. `gain` scales lum pre-ramp; `grain` = hash noise re-seeded by time; `vignette` radial darkening.
- [ ] **y2k_digicam**: `flash` = center-weighted exposure lift with highlight clip + desaturated highlights; `vignette` darkens edges hard; `grain` heavy; `resDown` = quantize UV to a grid of `resolution/resDown` before sampling (fake low-res resample).
- [ ] Standard verification for both. Commit `fx: thermal/night-vision + y2k digicam effects`.

### Task 9: HALATE + ANMRPH (bright-pass glow/streak)

Both are single-pass multi-tap: bright-pass (`max(lum − threshold, 0)`), then a tap loop gathering glow. Keep taps bounded (≤16 per direction) and stride by `radius/taps` texels.

- [ ] **halation**: radial 12-tap disc blur of the bright-pass, tinted toward red by `redBias` (red channel gets ~1.5× the blur radius of green/blue — sample R at wider offsets); composite via screen blend scaled by `amount`.
- [ ] **anamorphic**: horizontal-only tap line (16 taps each side, stride `streak * 48/16` texels) of the bright-pass, tinted blue by `tint`, additive composite; `squeeze` scales UV.x about center before ALL sampling (the lens-squeeze look).
- [ ] Standard verification for both (verify streaks are horizontal even on the portrait test image). Commit `fx: halation glow + anamorphic streak effects`.

### Task 10: DREAM (Orton bloom)

- [ ] 13-tap disc blur at `radius`, screen-blended at `bloom` weight; `pastel`: lift shadows + compress highlights + desaturate toward lavender; `haze`: low-frequency `fbm(uv*2 + time*drift*0.05)` white overlay. Standard verification. Commit `fx: dreamcore bloom effect`.

### Task 11: LIQUID (chrome morph)

- [ ] Per anima-morph doc: curl-noise UV displacement (`curlNoise(uv*scale + time*speed)` × `intensity`), then chrome treatment scaled by `chromeAmount`: contrast boost, desaturate toward blue-teal, fake specular from displacement-field gradient magnitude. Standard verification. Commit `fx: liquid chrome morph effect`.

### Task 12: CRYSTL (voronoi shatter)

- [ ] Per anima-morph doc: jittered-grid voronoi over `cellCount` cells; sample source at each pixel's nearest cell center (`shatter` scales jitter); `edgeGlow` brightens near cell borders (distance-to-edge estimate from F2−F1). Per-pixel loop over the 3×3 neighbor cells only (never all cells). Standard verification. Commit `fx: crystallize effect`.

---

## Wave 2 — feedback/temporal effects (Tasks 13–14). TEMPORAL — follow the Global Constraints' temporal rules; template `EchoTrailEffect.ts`; register in `temporalIds`/`temporalEffects` + gated `captureFrame` in `EffectPipeline.render()`.

### Task 13: TUNNEL + OPIUM (feedback-decay pair)

- [ ] **feedback_tunnel**: trail target holds last output; each frame the shader samples the trail at UV transformed by inverse zoom/rotate about center, hue-rotated by `hueShift` degrees, times `decay`; new frame composites over. captureFrame copies output→trail (exactly EchoTrail's copy-pass mechanics).
- [ ] **opium_trails**: same trail mechanics, no transform: trail × `decay` under the new frame, then grade: `crush` = S-curve pulling blacks down, `desat` = saturation reduction. (This is EchoTrail's core with a grade stage — it must still look distinct: heavier, darker; verify side-by-side against ECHO.)
- [ ] Standard verification for both + off/on cycle mid-trail (release/re-init path) + confirm no cost when disabled (StatusBar). Commit `fx: feedback tunnel + opium trails effects`.

### Task 14: FLOW (optical-flow smear)

- [ ] TEMPORAL. Two targets: prevFrame + accumulation. Displacement = frame-diff magnitude (current vs prevFrame, 4-tap) along the luminance gradient direction, scaled by `strength` texels; the accumulation buffer is sampled at displaced UV × `decay` and composited with the current frame; `blur` soft-taps the accumulation read. The TD "painterly smear": moving regions drag paint, static regions stay sharp. Standard verification with a MOVING source: after the image checks, ALSO drag the crossfader/enable TUNNEL simultaneously to create motion, or wiggle a knob on an upstream effect (e.g. RIPPLE speed high) so the input animates — the smear must visibly follow motion. Commit `fx: optical-flow smear effect`.

---

## Wave 3 — sim/3D effects (Tasks 15–17)

### Task 15: REACT (Gray-Scott reaction-diffusion)

- [ ] TEMPORAL-adjacent (owns ping-pong sim targets; register releaseTargets + guarded initialize; does NOT need captureFrame — the sim advances in `update()`). Fixed sim resolution 512×288 half-float ping-pong pair; per frame run `speed` sim steps (each: 3×3 Laplacian, Gray-Scott update with `feed`/`kill`); seed B from source luminance edges × `seedAmt` each step; display pass maps B through a two-tone gradient (`colorize` blends sim-over-source vs source). Reference implementation math is standard Gray-Scott (Da=1.0, Db=0.5, dt=1.0). Standard verification + patterns must visibly GROW over ~5 s (compare screenshots 5 s apart). Commit `fx: reaction-diffusion effect`.

### Task 16: RUTT (scanline displacement)

- [ ] 3D vertex-displacement effect — template `PointCloudEffect.ts` (the in-repo precedent for an internal 3D scene rendered to a target then composited). Build `lines` horizontal line strips (LineSegments) across a plane; vertex shader displaces Z (and screen-Y) by sampled luminance × `depth`; camera tilted `tilt` degrees for the oblique oscilloscope look; `glow` = additive line brightness. Black background; `mix` composites over source. Rebuild geometry only when `lines` changes (guard in updateParams). Standard verification (lines must ripple with image brightness; knob-sweep `lines` low/high). Commit `fx: rutt-etra scanline effect`.

### Task 17: SLIME (physarum, WebGL2 GPGPU)

- [ ] The showpiece; hardest. Agent state (pos+heading) in float textures sized to `agents` (ceil(sqrt) square), ping-pong update pass implementing Jones' model (3 sensors at `sensorAngle`/`sensorDist`, turn toward strongest, step forward, wrap); trail map target: agents deposit `deposit` (rendered as GL_POINTS reading agent positions in the vertex shader), then decay×`decay` + 3×3 diffuse each frame; source luminance × `lumaBias` added to the trail so the mold "eats" the bright parts of the video; display pass tone-maps the trail over source by `mix`.
- [ ] Feature-detect: requires `EXT_color_buffer_float` (WebGL2 render-to-float). If unavailable, the effect passes input through unchanged and `console.warn`s once. Agent-count changes reallocate state textures (guard like RUTT's geometry rebuild).
- [ ] Register releaseTargets (all state + trail targets/materials) + guarded initialize. Standard verification + verify 100k agents ≥ 55 fps on this machine (StatusBar), and network structure visibly forms within ~5 s. Commit `fx: physarum slime-mold effect`.

---

### Task 18: Final regression, docs, review

- [ ] Full-grid regression: every one of the 16 effects on/off from the grid; one stacked scene per page (e.g. HALATE+ANMRPH; TUNNEL+FLOW; KALEID+LIQUID); presets save/load a trend effect; a modulation LFO routed to one trend param (e.g. `kaleidoscope.spin`) animates it.
- [ ] Perf: baseline scenario stack from `phase1-perf-baseline.md` still at pre-Phase-2 frame times; note each Wave-3 effect's individual cost in a new "Phase 2 effect costs" section.
- [ ] CLAUDE.md: no structural changes needed (checklist already covers the paramSync flow); add `trendStore` to the item-2/7 mentions if absent.
- [ ] Commit `fx: phase 2 wrap-up — regression + docs`. Then final whole-branch review (most capable model) and superpowers:finishing-a-development-branch.
